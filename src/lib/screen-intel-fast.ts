// Fast-path screen intelligence: single Gemini call that produces a rich,
// information-dense analysis + fix plan in one shot. No Claude, no GitHub,
// no repo lookup — targets 2-5s end-to-end.

import { TAXONOMY_PROMPT, type Diagnosis, type FixPlan } from "./intel-shared";

const GEMINI_FAST_MODEL = "gemini-3.5-flash";

const FAST_SYSTEM_PROMPT = `You are Jeradin's rapid debugging engineer. You look at a single screenshot of a developer's IDE, editor, browser devtools, or terminal, and in ONE response produce a dense, structured debugging report.

Optimise for speed AND information density. No preamble, no markdown fences — just STRICT JSON.

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
    "errorTitle": string,                         // short human title, e.g. "Undefined variable in login handler"
    "errorCategory": string,                      // broader label: Syntax | Runtime | Build | TypeScript | React | Network | API | Database | Security | Performance | Config | Dependency | Other
    "confidence": number,                         // 0-100 honest estimate
    "confidenceExplanation": string,              // 1-2 sentences: why you believe this diagnosis is correct (what visible evidence supports it, what would lower confidence)
    "rootCause": string,                          // 1 sentence, precise
    "whyItHappened": string,                      // 1 short paragraph, layman
    "affectedFile": string|null,                  // best-guess file path from the screen
    "affectedComponent": string|null,             // function / component / class name
    "suspectedCodeRegion": string|null,           // the exact code region highlighted from the screenshot (short)
    "plainExplanation": string,                   // layman, 1-2 sentences
    "technicalExplanation": string,               // precise, engineer-facing
    "primaryFix": string,                         // the recommended fix, 1-3 sentences
    "alternativeFix": string|null,                // one alternative approach, or null
    "bestPractice": string|null,                  // best-practice recommendation to prevent recurrence
    "difficulty": "Easy"|"Medium"|"Hard",
    "estimatedFixTime": string,                   // e.g. "2 minutes", "15 minutes", "1 hour"
    "sideEffects": string[],                      // 0-4 possible side effects of applying the primary fix
    "nextDebuggingStep": string,                  // single concrete next action if the fix doesn't work
    "errorLinks": string|null,                    // if multiple errors are visible, describe how they relate; else null
    "recommendedActions": string[],               // 3-6 short imperative bullets
    "impact": [{ "area": string, "consequence": string }],
    "steps": [{ "file": string, "change": string, "codeAfter": string|null }],
    "references": [{ "title": string, "url": string }],
    "learnMode": string,                          // 2-4 sentence teaching paragraph
    "additionalNotes": string|null
  }
}

Rules:
- Base every claim on what you can actually see in the screenshot. No hallucinated file paths, functions, or line numbers — use null when you cannot see it.
- \`errorCategory\` uses the broader label list above (Syntax, Runtime, Build, TypeScript, React, Network, API, Database, Security, Performance, Config, Dependency, Other). \`analysis.category\` uses the narrower taxonomy.
- \`suspectedCodeRegion\` quotes the visible highlighted code (max ~20 lines). If no code is visible, use null.
- \`sideEffects\` should be concrete ("May break existing sessions", "Requires re-running migrations"). Empty array if none.
- \`errorLinks\` only when 2+ distinct errors appear on screen; otherwise null.
- Keep \`recommendedActions\` short and directly actionable.
- \`steps\` entries name one file with a clear change; include \`codeAfter\` only when the change is non-trivial.
- Skip \`references\` unless you're highly confident about a specific docs URL.
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
      maxOutputTokens: 6144,
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
    errors: Array.isArray((a as unknown as { errors?: unknown }).errors)
      ? (a as unknown as { errors: unknown[] }).errors
      : [],
    observedCodeSnippet: (a as { observedCodeSnippet?: string | null }).observedCodeSnippet ?? null,
    editor: (a as { editor?: string | null }).editor ?? null,
    language: (a as { language?: string | null }).language ?? null,
  } as FastScreenIntel["analysis"];

  const allowedDifficulty = new Set(["Easy", "Medium", "Hard"]);
  const rawDifficulty = (f as { difficulty?: string | null }).difficulty ?? null;
  const difficulty = rawDifficulty && allowedDifficulty.has(rawDifficulty)
    ? (rawDifficulty as "Easy" | "Medium" | "Hard")
    : null;

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
    // Fast-mode richer fields
    errorTitle: (f as { errorTitle?: string | null }).errorTitle ?? null,
    errorCategory: (f as { errorCategory?: string | null }).errorCategory ?? null,
    rootCause: (f as { rootCause?: string | null }).rootCause ?? null,
    affectedFile: (f as { affectedFile?: string | null }).affectedFile ?? null,
    affectedComponent: (f as { affectedComponent?: string | null }).affectedComponent ?? null,
    suspectedCodeRegion: (f as { suspectedCodeRegion?: string | null }).suspectedCodeRegion ?? null,
    primaryFix: (f as { primaryFix?: string | null }).primaryFix ?? null,
    alternativeFix: (f as { alternativeFix?: string | null }).alternativeFix ?? null,
    bestPractice: (f as { bestPractice?: string | null }).bestPractice ?? null,
    difficulty,
    estimatedFixTime: (f as { estimatedFixTime?: string | null }).estimatedFixTime ?? null,
    sideEffects: Array.isArray((f as { sideEffects?: unknown }).sideEffects)
      ? ((f as { sideEffects: unknown[] }).sideEffects.filter((s) => typeof s === "string") as string[])
      : [],
    nextDebuggingStep: (f as { nextDebuggingStep?: string | null }).nextDebuggingStep ?? null,
    errorLinks: (f as { errorLinks?: string | null }).errorLinks ?? null,
    confidenceExplanation: (f as { confidenceExplanation?: string | null }).confidenceExplanation ?? null,
  };

  return { analysis, fix };
}
