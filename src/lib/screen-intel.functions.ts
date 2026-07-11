import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------- Types ----------------
export type ScreenAnalysis = {
  summary: string;
  editor?: string | null;
  language?: string | null;
  errors: Array<{
    message: string;
    file?: string | null;
    line?: number | null;
    severity: "error" | "warning" | "info";
    source: "console" | "network" | "code" | "ui";
  }>;
  suspectFiles: string[];
  rootCauseHypothesis: string;
  observedCodeSnippet?: string | null;
};

export type FixSuggestion = {
  plainExplanation: string;
  whyItHappened: string;
  steps: Array<{
    file: string;
    change: string;
    codeAfter?: string;
  }>;
  additionalNotes?: string;
};

// ---------------- Gemini analysis ----------------
async function callGeminiVision(
  apiKey: string,
  imageBase64: string,
  userNote: string,
): Promise<ScreenAnalysis> {
  const systemPrompt = `You are a senior debugging engineer analyzing a screenshot of a developer's IDE / code editor / browser devtools.
Identify:
- what editor/IDE is visible (VS Code, Cursor, JetBrains, Lovable, browser devtools, etc.)
- programming language(s) on screen
- every visible error: console errors, red squiggles, terminal errors, failed network requests (4xx/5xx), stack traces
- which file(s) are the likely root cause — read tab names, file tree, breadcrumbs, terminal output
- the most likely root cause in one sentence
- copy any short code snippet visible near the error (max ~40 lines)

Return STRICT JSON matching this exact shape (no markdown, no prose outside JSON):
{
  "summary": string,
  "editor": string|null,
  "language": string|null,
  "errors": [{"message": string, "file": string|null, "line": number|null, "severity": "error"|"warning"|"info", "source": "console"|"network"|"code"|"ui"}],
  "suspectFiles": string[],
  "rootCauseHypothesis": string,
  "observedCodeSnippet": string|null
}`;

  const body = {
    model: "google/gemini-3.1-pro-preview",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: userNote
              ? `Developer note: ${userNote}\n\nAnalyze this screen frame.`
              : "Analyze this screen frame from a developer's workstation.",
          },
          { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
        ],
      },
    ],
    response_format: { type: "json_object" },
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini analysis failed [${res.status}]: ${txt}`);
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(text) as ScreenAnalysis;
  } catch {
    // Try to extract JSON block
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as ScreenAnalysis;
    throw new Error("Gemini returned unparseable output");
  }
}

// ---------------- Claude fix suggestion ----------------
async function callClaudeFix(
  anthropicKey: string,
  analysis: ScreenAnalysis,
  userNote: string,
): Promise<FixSuggestion> {
  const systemPrompt = `You are a friendly senior developer who explains bugs in plain English so anyone — including non-technical founders — can understand.

You will receive a structured analysis of what's on a developer's screen. Produce a clear, step-by-step fix guide.

Rules:
- Use simple language. Assume the reader is smart but not deeply technical.
- Explain WHY the error is happening in one short paragraph before listing steps.
- Every step names ONE file and describes the exact change to make.
- If you show code, keep it short and copy-pasteable.
- No jargon dumps. If you use a technical term, briefly define it in parentheses.

Return STRICT JSON only (no markdown fences), matching:
{
  "plainExplanation": string,          // 1-2 sentence layman summary of what's broken
  "whyItHappened": string,             // short paragraph, plain English
  "steps": [
    { "file": string, "change": string, "codeAfter": string|null }
  ],
  "additionalNotes": string|null       // optional extra tips
}`;

  const userText =
    `Developer's note: ${userNote || "(none)"}\n\n` +
    `Screen analysis from Gemini 3:\n` +
    JSON.stringify(analysis, null, 2);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Claude fix failed [${res.status}]: ${txt}`);
  }
  const json = await res.json();
  const text: string =
    json.content?.find?.((c: { type: string }) => c.type === "text")?.text ?? "";
  try {
    return JSON.parse(text) as FixSuggestion;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as FixSuggestion;
    throw new Error("Claude returned unparseable output");
  }
}

// ---------------- Orchestrator server fn ----------------
export const analyzeScreenAndSuggestFix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageBase64: string; note?: string }) => {
    if (!input?.imageBase64 || typeof input.imageBase64 !== "string") {
      throw new Error("imageBase64 is required");
    }
    // Strip data-URL prefix if the client accidentally sent one
    const cleaned = input.imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
    return { imageBase64: cleaned, note: (input.note ?? "").slice(0, 2000) };
  })
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");

    // Step 1 — Gemini 3 deep visual analysis
    const analysis = await callGeminiVision(lovableKey, data.imageBase64, data.note);

    // Step 2 — Claude plain-English fix guide (agentic hand-off)
    const fix = await callClaudeFix(anthropicKey, analysis, data.note);

    return { analysis, fix };
  });
