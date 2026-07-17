// Fast-path screen intelligence: single Gemini call that produces
// BOTH the analysis (what's on screen, errors, root cause) and the
// fix plan (plain English + steps + confidence). No Claude, no
// GitHub tools, no repo lookup — targets 2-5s end-to-end.

import { TAXONOMY_PROMPT, type Diagnosis, type FixPlan } from "./intel-shared";

const GEMINI_FAST_MODEL = "gemini-3.5-flash";

const FAST_SYSTEM_PROMPT = `You are Jeradin's rapid debugging engineer. You look at a single screenshot of a developer's IDE, editor, browser devtools, or terminal, and in ONE response produce both the diagnosis and a plain-English fix plan.

Optimise for speed and clarity. No preamble, no markdown fences — just STRICT JSON.

${TAXONOMY_PROMPT}

Return a JSON object with these EXACT top-level keys:

{
  "analysis": {
    "category": "runtime"|"api"|"database"|"auth"|"env"|"dependencies"|"performance"|"logs"|"deployment"|"ui"|"unknown",
    "severity": "error"|"warning"|"info",
    "summary": string,                            // 1-2 sentences, technical: what's on screen
    "evidence": [{ "source": string, "snippet": string }],
    "suspectFiles": string[],                     // file names/paths visible on screen
    "hypothesis": string,                         // most likely root cause, 1 sentence
    "stack": { "framework": string|null, "language": string|null, "database": string|null, "runtime": string|null, "buildTool": string|null },
    "context": { "currentFile": string|null, "cursorLine": number|null, "workflow": string|null, "ide": string|null, "browser": string|null },
    "affectedFunction": string|null,
    "affectedDependency": string|null,
    "editor": string|null,
    "language": string|null,
    "errors": [{ "message": string, "file": string|null, "line": number|null, "severity": "error"|"warning"|"info", "source": "console"|"network"|"code"|"ui" }],
    "observedCodeSnippet": string|null
  },
  "fix": {
    "plainExplanation": string,                   // layman, 1-2 sentences
    "technicalExplanation": string,               // precise, engineer-facing
    "whyItHappened": string,                      // 1 short paragraph, layman
    "recommendedActions": string[],               // 3-6 short imperative bullets
    "confidence": number,                         // 0-100 honest estimate
    "impact": [{ "area": string, "consequence": string }],
    "steps": [{ "file": string, "change": string, "codeAfter": string|null }],
    "references": [{ "title": string, "url": string }],
    "learnMode": string,                          // 2-4 sentence teaching paragraph
    "additionalNotes": string|null
  }
}

Rules:
- Base every claim on what you can actually see in the screenshot. No hallucinated file paths.
- Keep the "recommendedActions" short and directly actionable ("Restart the dev server", "Set the SUPABASE_URL env var").
- "steps" entries name one file with a clear change; include "codeAfter" only when the change is non-trivial.
- Skip GitHub/references unless you're highly confident about a specific docs URL.
- Return STRICT JSON only, no markdown, no commentary.`;

export type FastScreenIntel = {
  analysis: Diagnosis & Record<string, unknown>;
  fix: FixPlan;
};

export async function runFastScreenIntel(
  geminiKey: string,
  imageBase64: string,
  note?: string,
): Promise<FastScreenIntel> {
  const cleaned = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
  const userText = note?.trim()
    ? `Developer note: ${note.trim()}\n\nAnalyze this screen frame and return the combined analysis + fix JSON.`
    : "Analyze this screen frame and return the combined analysis + fix JSON.";

  const body = {
    systemInstruction: { parts: [{ text: FAST_SYSTEM_PROMPT }] },
    contents: [
      {
        role: "user",
        parts: [
          { text: userText },
          { inline_data: { mime_type: "image/png", data: cleaned } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FAST_MODEL}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini fast intel failed [${res.status}]: ${(await res.text()).slice(0, 400)}`);
  }

  const json = await res.json();
  const candidate = json.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");

  if (!text) throw new Error("Fast intel returned no content");

  let parsed: FastScreenIntel;
  try {
    parsed = JSON.parse(text) as FastScreenIntel;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Fast intel returned unparseable JSON");
    parsed = JSON.parse(m[0]) as FastScreenIntel;
  }

  // Defensive normalisation so the overlay never crashes.
  const a = (parsed.analysis ?? {}) as FastScreenIntel["analysis"];
  const f = (parsed.fix ?? {}) as FastScreenIntel["fix"];

  const analysis = {
    ...a,
    category: (a.category as Diagnosis["category"]) ?? "unknown",
    severity: (a.severity as Diagnosis["severity"]) ?? "info",
    summary: a.summary || "I analyzed the screen, but the model did not return a summary.",
    evidence: Array.isArray(a.evidence) ? a.evidence : [],
    suspectFiles: Array.isArray(a.suspectFiles) ? a.suspectFiles : [],
    hypothesis: a.hypothesis || "No root-cause hypothesis was returned.",
    rootCauseHypothesis: a.hypothesis || "No root-cause hypothesis was returned.",
    errors: Array.isArray((a as { errors?: unknown }).errors) ? (a as { errors: unknown[] }).errors : [],
    observedCodeSnippet: (a as { observedCodeSnippet?: string | null }).observedCodeSnippet ?? null,
    editor: (a as { editor?: string | null }).editor ?? null,
    language: (a as { language?: string | null }).language ?? null,
  } as FastScreenIntel["analysis"];

  const fix: FixPlan = {
    plainExplanation: f.plainExplanation || "The fixer did not return an explanation.",
    whyItHappened: f.whyItHappened || "No cause explanation was returned.",
    steps: Array.isArray(f.steps) ? f.steps : [],
    references: Array.isArray(f.references) ? f.references : [],
    additionalNotes: f.additionalNotes ?? null,
    technicalExplanation: f.technicalExplanation ?? null,
    recommendedActions: Array.isArray(f.recommendedActions) ? f.recommendedActions : [],
    confidence: typeof f.confidence === "number" ? Math.max(0, Math.min(100, Math.round(f.confidence))) : null,
    impact: Array.isArray(f.impact) ? f.impact : [],
    learnMode: f.learnMode ?? null,
  };

  return { analysis, fix };
}
