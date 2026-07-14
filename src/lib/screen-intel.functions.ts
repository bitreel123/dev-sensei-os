import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";
import {
  ANALYST_INSTRUCTIONS,
  FIXER_SYSTEM_PROMPT,
  TAXONOMY_PROMPT,
  buildGithubTools,
  callGeminiAnalyst,
  type Diagnosis,
  type FixPlan,
} from "./intel-shared";

// Kept for backward compatibility with existing UI code.
export type ScreenAnalysis = Diagnosis & {
  editor?: string | null;
  language?: string | null;
  errors: Array<{
    message: string;
    file?: string | null;
    line?: number | null;
    severity: "error" | "warning" | "info";
    source: "console" | "network" | "code" | "ui";
  }>;
  observedCodeSnippet?: string | null;
  // legacy alias used by UI
  rootCauseHypothesis?: string;
  suspectFiles: string[];
};

export type FixSuggestion = FixPlan;

export const analyzeScreenAndSuggestFix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageBase64: string; note?: string }) => {
    if (!input?.imageBase64 || typeof input.imageBase64 !== "string") {
      throw new Error("imageBase64 is required");
    }
    const cleaned = input.imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
    return { imageBase64: cleaned, note: (input.note ?? "").slice(0, 2000) };
  })
  .handler(async ({ data, context }) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const screenAnalystSystem = `You are a senior debugging engineer analyzing a screenshot of a developer's IDE, code editor, browser devtools, or terminal.

${TAXONOMY_PROMPT}

Extract:
- editor/IDE visible (VS Code, Cursor, JetBrains, Lovable, browser devtools, terminal)
- programming language(s) on screen
- every visible error: console errors, red squiggles, terminal output, failed network requests (4xx/5xx), stack traces
- likely suspect file names from tabs / file tree / breadcrumbs / stack traces
- a one-sentence hypothesis of the root cause

${ANALYST_INSTRUCTIONS}

Additional fields for this specific analyst:
- "editor": string|null
- "language": string|null
- "errors": [{"message": string, "file": string|null, "line": number|null, "severity": "error"|"warning"|"info", "source": "console"|"network"|"code"|"ui"}]
- "observedCodeSnippet": string|null   (short, ~40 lines max)`;

    const normalizeScreenAnalysis = (value: ScreenAnalysis): ScreenAnalysis => ({
      ...value,
      category: value.category ?? "unknown",
      severity: value.severity ?? "info",
      summary: value.summary || "I analyzed the screen, but the model did not return a summary.",
      evidence: Array.isArray(value.evidence) ? value.evidence : [],
      suspectFiles: Array.isArray(value.suspectFiles) ? value.suspectFiles : [],
      hypothesis: value.hypothesis || value.rootCauseHypothesis || "No root-cause hypothesis was returned.",
      rootCauseHypothesis: value.rootCauseHypothesis || value.hypothesis || "No root-cause hypothesis was returned.",
      errors: Array.isArray(value.errors) ? value.errors : [],
      observedCodeSnippet: value.observedCodeSnippet ?? null,
      editor: value.editor ?? null,
      language: value.language ?? null,
    });

    const normalizeFixPlan = (value: FixPlan): FixPlan => ({
      plainExplanation: value.plainExplanation || "The fixer completed, but did not return a plain-English explanation.",
      whyItHappened: value.whyItHappened || "No cause explanation was returned.",
      steps: Array.isArray(value.steps) ? value.steps : [],
      references: Array.isArray(value.references) ? value.references : [],
      additionalNotes: value.additionalNotes ?? null,
    });

    // Step 1 — Gemini 3 Pro visual analyst
    const analysis = normalizeScreenAnalysis((await callGeminiAnalyst(lovableKey, screenAnalystSystem, [
      {
        type: "text",
        text: data.note
          ? `Developer note: ${data.note}\n\nAnalyze this screen frame.`
          : "Analyze this screen frame from a developer's workstation.",
      },
      { type: "image_url", image_url: { url: `data:image/png;base64,${data.imageBase64}` } },
    ])) as ScreenAnalysis);

    // Legacy field alias for the UI
    analysis.rootCauseHypothesis = analysis.hypothesis;

    // Step 2 — Claude Sonnet fixer with GitHub tools (agentic)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conn } = await supabaseAdmin
      .from("github_connections")
      .select("access_token")
      .eq("user_id", context.userId)
      .maybeSingle();
    const ghToken = (conn as { access_token?: string } | null)?.access_token;

    const anthropic = createAnthropic({ apiKey: anthropicKey });
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-5"),
      system: FIXER_SYSTEM_PROMPT,
      prompt:
        `Developer note: ${data.note || "(none)"}\n\n` +
        `Diagnosis from upstream Gemini analyst:\n${JSON.stringify(analysis, null, 2)}\n\n` +
        `Produce the fix plan JSON.`,
      tools: buildGithubTools(ghToken),
      stopWhen: stepCountIs(50),
    });

    let fix: FixPlan;
    try {
      fix = normalizeFixPlan(JSON.parse(text) as FixPlan);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Claude fixer returned unparseable output");
      fix = normalizeFixPlan(JSON.parse(m[0]) as FixPlan);
    }

    return { analysis, fix };
  });
