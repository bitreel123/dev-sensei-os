// Auto-routed screen intelligence.
//
// Two tiers behind one entry point (`runAutoScreenIntel`):
//   ⚡ Instant Mode  — Gemini 3 Flash, ~1–3s, for simple bugs
//                     (syntax, TS errors, missing imports, ESLint,
//                      undefined vars, small React warnings).
//   🧠 Smart Mode    — Gemini 3 Pro, ~5–8s, for anything the
//                     Flash pass rates as complex or low-confidence
//                     (hydration issues, race conditions, multi-file
//                      root causes, database/auth flow bugs).
//
// The user does not choose. The router uses Flash's self-reported
// `complexity` + `confidence` to decide, and the returned object
// carries a `tier` field the UI can show as a badge.

import { TAXONOMY_PROMPT, type Diagnosis, type FixPlan } from "./intel-shared";

const INSTANT_MODEL = "gemini-3.5-flash";        // fast triage + attempt
const SMART_MODEL = "gemini-3-pro-preview";      // deep reasoning (opt-in only)


const FAST_SYSTEM_PROMPT = `You are Jeradin's rapid debugging engineer. You look at a single screenshot of a developer's IDE, editor, browser devtools, or terminal, and in ONE response produce a dense, structured debugging report.

Optimise for speed AND information density. No preamble, no markdown fences — just STRICT JSON.

${TAXONOMY_PROMPT}

Return a JSON object with these EXACT top-level keys:

{
  "complexity": "simple"|"complex",              // "simple" = syntax/type/import/lint/undefined-var/small React warning that a Flash-tier model can fully resolve. "complex" = hydration, race conditions, multi-file root causes, auth/database flow, ambiguous stack traces, or anything you're not confident about.
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
    "errorTitle": string,
    "errorCategory": string,                      // broader label: Syntax | Runtime | Build | TypeScript | React | Network | API | Database | Security | Performance | Config | Dependency | Other
    "confidence": number,                         // 0-100 honest estimate
    "confidenceExplanation": string,
    "rootCause": string,
    "whyItHappened": string,
    "affectedFile": string|null,
    "affectedComponent": string|null,
    "suspectedCodeRegion": string|null,
    "plainExplanation": string,
    "technicalExplanation": string,
    "primaryFix": string,
    "alternativeFix": string|null,
    "bestPractice": string|null,
    "difficulty": "Easy"|"Medium"|"Hard",
    "estimatedFixTime": string,
    "sideEffects": string[],
    "nextDebuggingStep": string,
    "errorLinks": string|null,
    "recommendedActions": string[],
    "impact": [{ "area": string, "consequence": string }],
    "steps": [{ "file": string, "change": string, "codeAfter": string|null }],
    "references": [{ "title": string, "url": string }],
    "learnMode": string,
    "additionalNotes": string|null
  }
}

Rules:
- Be strict with \`complexity\`. Mark "complex" whenever the bug crosses multiple files, involves async/hydration/auth/database/build config, or you can't fully explain the root cause from the screen alone. When in doubt, choose "complex".
- Base every claim on what you can actually see. No hallucinated paths or line numbers — use null when unseen.
- \`errorCategory\` uses the broader label list; \`analysis.category\` uses the narrower taxonomy.
- \`suspectedCodeRegion\` quotes the visible highlighted code (max ~20 lines) or null.
- \`sideEffects\` concrete or []; \`errorLinks\` only when 2+ distinct errors appear.
- STRICT JSON only.`;

export type IntelTier = "instant" | "smart";

export type FastScreenIntel = {
  analysis: Diagnosis & Record<string, unknown>;
  fix: FixPlan;
  tier: IntelTier;              // which model produced this result
  modelId: string;              // exact model id used
  latencyMs: number;            // total time for the routed call (includes escalation)
  escalated: boolean;           // true when Instant → Smart happened
};

type RawIntel = {
  complexity?: "simple" | "complex";
  analysis: Diagnosis & Record<string, unknown>;
  fix: FixPlan;
};

async function callGeminiIntel(
  geminiKey: string,
  model: string,
  imageBase64: string,
  note?: string,
): Promise<RawIntel> {
  const cleaned = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
  const userText = note?.trim()
    ? `Developer note: ${note.trim()}\n\nAnalyze this screen frame and return the combined complexity + analysis + fix JSON.`
    : "Analyze this screen frame and return the combined complexity + analysis + fix JSON.";

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
      maxOutputTokens: 16384,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini ${model} failed [${res.status}]: ${(await res.text()).slice(0, 400)}`);
  }

  const json = await res.json();
  const candidate = json.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");

  if (!text) throw new Error(`Gemini ${model} returned no content`);

  try {
    return JSON.parse(text) as RawIntel;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error(`Gemini ${model} returned unparseable JSON`);
    return JSON.parse(m[0]) as RawIntel;
  }
}

function normalizeIntel(raw: RawIntel): { analysis: FastScreenIntel["analysis"]; fix: FixPlan; complexity: "simple" | "complex" } {
  const a = (raw.analysis ?? {}) as FastScreenIntel["analysis"];
  const f = (raw.fix ?? {}) as FixPlan;

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

  const complexity = raw.complexity === "complex" ? "complex" : "simple";
  return { analysis, fix, complexity };
}

/**
 * Auto-routed screen intelligence.
 *
 * - Runs Instant Mode (Flash) first. Simple bugs return in ~1–3s.
 * - Escalates to Smart Mode (Pro) automatically when Flash rates the
 *   bug as complex OR its confidence is below the threshold. The Pro
 *   answer replaces the Flash draft entirely.
 *
 * `forceTier` lets callers override the router (e.g. the overlay's
 * existing Deep Dive button can still request "smart" directly).
 */
export async function runAutoScreenIntel(
  geminiKey: string,
  imageBase64: string,
  note?: string,
  forceTier?: IntelTier,
): Promise<FastScreenIntel> {
  const started = Date.now();

  // Explicit override — skip the router.
  if (forceTier === "smart") {
    const raw = await callGeminiIntel(geminiKey, SMART_MODEL, imageBase64, note);
    const { analysis, fix } = normalizeIntel(raw);
    return { analysis, fix, tier: "smart", modelId: SMART_MODEL, latencyMs: Date.now() - started, escalated: false };
  }

  // Default path: run Flash only. Fastest response (~1–3s). Escalation to
  // Pro is opt-in via `forceTier: "smart"` (e.g. the overlay's Deep Dive
  // button) so normal analyses stay snappy.
  const flashRaw = await callGeminiIntel(geminiKey, INSTANT_MODEL, imageBase64, note);
  const flash = normalizeIntel(flashRaw);
  return {
    analysis: flash.analysis,
    fix: flash.fix,
    tier: "instant",
    modelId: INSTANT_MODEL,
    latencyMs: Date.now() - started,
    escalated: false,
  };

}

/** Backwards-compat alias so existing callers keep working. */
export const runFastScreenIntel = runAutoScreenIntel;

// ---------------------------------------------------------------------------
// Progressive streaming variant used by /api/intel/screen/stream.
// Runs two Gemini Flash calls in parallel (analysis + fix) so each section
// paints the moment it lands, matching the Knowledge / System intel UX.
// ---------------------------------------------------------------------------

const ANALYSIS_ONLY_PROMPT = `You are Jeradin's rapid screen analyst. Look at ONE screenshot of a developer's IDE, editor, browser devtools, or terminal and produce the ANALYSIS section only.

${TAXONOMY_PROMPT}

Return STRICT JSON:
{
  "category": "runtime"|"api"|"database"|"auth"|"env"|"dependencies"|"performance"|"logs"|"deployment"|"ui"|"unknown",
  "severity": "error"|"warning"|"info",
  "summary": string,
  "evidence": [{ "source": string, "snippet": string }],
  "suspectFiles": string[],
  "hypothesis": string,
  "stack": { "framework": string|null, "language": string|null, "database": string|null, "runtime": string|null, "buildTool": string|null },
  "context": { "currentFile": string|null, "cursorLine": number|null, "workflow": string|null, "ide": string|null, "browser": string|null },
  "affectedFunction": string|null,
  "affectedDependency": string|null,
  "editor": string|null,
  "language": string|null,
  "errors": [{ "message": string, "file": string|null, "line": number|null, "severity": "error"|"warning"|"info", "source": "console"|"network"|"code"|"ui" }],
  "observedCodeSnippet": string|null
}

Rules: base everything on what's actually visible; null when unseen; no markdown or preamble.`;

const FIX_ONLY_PROMPT = `You are Jeradin's rapid fix planner. Look at ONE screenshot of a developer's IDE/editor/devtools/terminal and produce a rich, human FIX section that GUIDES the developer.

Return STRICT JSON:
{
  "errorTitle": string,
  "errorCategory": string,
  "confidence": number,
  "confidenceExplanation": string,
  "rootCause": string,
  "whyItHappened": string,
  "affectedFile": string|null,
  "affectedComponent": string|null,
  "suspectedCodeRegion": string|null,
  "plainExplanation": string,
  "technicalExplanation": string,
  "primaryFix": string,
  "alternativeFix": string|null,
  "bestPractice": string|null,
  "difficulty": "Easy"|"Medium"|"Hard",
  "estimatedFixTime": string,
  "sideEffects": string[],
  "nextDebuggingStep": string,
  "errorLinks": string|null,
  "recommendedActions": string[],
  "impact": [{ "area": string, "consequence": string }],
  "steps": [{ "file": string, "change": string, "codeAfter": string|null }],
  "references": [{ "title": string, "url": string }],
  "learnMode": string,
  "additionalNotes": string|null
}

Rules:
- \`plainExplanation\` speaks TO the developer in plain English ("Your component is trying to read X before Y is ready. Do this…"), 2-4 sentences.
- \`steps[].codeAfter\` must be the FULL corrected block, ready to paste, whenever a code change is required.
- \`learnMode\` teaches the underlying concept in 2-4 sentences so the same class of bug does not repeat.
- \`recommendedActions\` = 3-6 short imperative bullets.
- \`nextDebuggingStep\` = what to try next if the primary fix does not work.
- No hallucinated paths. Null when unseen. STRICT JSON only, no markdown or preamble.`;

async function callGeminiJson(
  geminiKey: string,
  model: string,
  systemPrompt: string,
  imageBase64: string,
  note?: string,
): Promise<unknown> {
  const cleaned = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
  const userText = note?.trim()
    ? `Developer note: ${note.trim()}\n\nAnalyze this screen frame and return the JSON.`
    : "Analyze this screen frame and return the JSON.";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
          {
            role: "user",
            parts: [
              { text: userText },
              { inline_data: { mime_type: "image/png", data: cleaned } },
            ],
          },
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 12288, responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini ${model} failed [${res.status}]: ${(await res.text()).slice(0, 400)}`);
  }
  const json = await res.json();
  const text = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) throw new Error(`Gemini ${model} returned no content`);
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error(`Gemini ${model} returned unparseable JSON`);
    return JSON.parse(m[0]);
  }
}

export type ProgressiveCallbacks = {
  onAnalysis: (analysis: FastScreenIntel["analysis"]) => void;
  onFix: (fix: FixPlan) => void;
  onAnalysisError?: (message: string) => void;
  onFixError?: (message: string) => void;
};

/**
 * Runs analysis + fix in parallel against one screenshot, invoking each
 * callback the moment its section resolves. Returns the combined result.
 */
export async function runProgressiveScreenIntel(
  geminiKey: string,
  imageBase64: string,
  note: string | undefined,
  cb: ProgressiveCallbacks,
  forceTier?: IntelTier,
): Promise<FastScreenIntel> {
  const started = Date.now();
  const model = forceTier === "smart" ? SMART_MODEL : INSTANT_MODEL;

  const analysisPromise = (async () => {
    const raw = (await callGeminiJson(geminiKey, model, ANALYSIS_ONLY_PROMPT, imageBase64, note)) as Diagnosis &
      Record<string, unknown>;
    const norm = normalizeIntel({ analysis: raw, fix: {} as FixPlan }).analysis;
    cb.onAnalysis(norm);
    return norm;
  })().catch((e) => {
    const message = e instanceof Error ? e.message : String(e);
    cb.onAnalysisError?.(message);
    throw e;
  });

  const fixPromise = (async () => {
    const raw = (await callGeminiJson(geminiKey, model, FIX_ONLY_PROMPT, imageBase64, note)) as FixPlan;
    const norm = normalizeIntel({ analysis: {} as Diagnosis, fix: raw }).fix;
    cb.onFix(norm);
    return norm;
  })().catch((e) => {
    const message = e instanceof Error ? e.message : String(e);
    cb.onFixError?.(message);
    throw e;
  });

  const [analysis, fix] = await Promise.all([analysisPromise, fixPromise]);
  return {
    analysis,
    fix,
    tier: forceTier === "smart" ? "smart" : "instant",
    modelId: model,
    latencyMs: Date.now() - started,
    escalated: false,
  };
}
