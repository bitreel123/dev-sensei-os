// Shared taxonomy + types + GitHub tools reused across the intel server fns.
// All three intel pipelines follow the same shape:
//   1) Gemini 3 Pro = analyst → produces structured `Diagnosis`
//   2) Claude Sonnet 4.5 = fixer → produces `FixPlan` (step-by-step, plain English)

import { tool } from "ai";
import { z } from "zod";

// ---------- Backend-debugging taxonomy ----------
export const DEBUG_CATEGORIES = [
  "runtime",       // exceptions, crashes, unhandled errors
  "api",           // 400/401/403/404/500 responses
  "database",      // failed queries, migrations, connections
  "auth",          // JWT, OAuth, sessions
  "env",           // missing env vars, secrets, config
  "dependencies",  // package conflicts, version mismatches
  "performance",   // slow endpoints, inefficient queries
  "logs",          // root-cause hunting from log lines
  "deployment",    // Docker, cloud config, CI/CD
  "ui",            // React/frontend render issues
  "unknown",
] as const;
export type DebugCategory = (typeof DEBUG_CATEGORIES)[number];

export const TAXONOMY_PROMPT = `You classify every problem into ONE category from this list:
- runtime: exceptions, crashes, unhandled errors, undefined references
- api: HTTP 4xx/5xx responses, request/response mismatches
- database: failed queries, migrations, connection issues, RLS
- auth: JWT, OAuth, sessions, cookies, permissions
- env: missing environment variables, misconfigured secrets
- dependencies: package conflicts, version mismatches, missing modules
- performance: slow endpoints, N+1 queries, memory leaks
- logs: hunting the root cause from log output
- deployment: Docker, cloud config, CI/CD, build failures
- ui: rendering issues, hydration, styling bugs
- unknown: does not fit above`;

// ---------- Shared shapes ----------
export type DetectedStack = {
  framework?: string | null;
  language?: string | null;
  database?: string | null;
  runtime?: string | null;
  buildTool?: string | null;
};

export type ScreenContext = {
  currentFile?: string | null;
  cursorLine?: number | null;
  workflow?: string | null;   // e.g. "npm run dev", "debugging login flow"
  ide?: string | null;
  browser?: string | null;
};

export type Diagnosis = {
  category: DebugCategory;
  severity: "error" | "warning" | "info";
  summary: string;                       // 1-2 sentence, technical
  evidence: Array<{ source: string; snippet: string }>;
  suspectFiles: string[];
  hypothesis: string;                    // most likely root cause
  // Optional richer context (Screen Intelligence uses these; other pipelines may omit)
  stack?: DetectedStack;
  context?: ScreenContext;
  affectedFunction?: string | null;
  affectedDependency?: string | null;
};

export type FixStep = {
  file: string;
  change: string;
  codeAfter?: string | null;             // only when user likely can't write it
};

export type ImpactArea = {
  area: string;                          // e.g. "Authentication", "Dashboard"
  consequence: string;                   // what breaks if not fixed
};

export type FixPlan = {
  plainExplanation: string;              // layman, 1-2 sentences
  whyItHappened: string;                 // layman paragraph
  steps: FixStep[];
  references?: Array<{ title: string; url: string }>;
  additionalNotes?: string | null;
  // Optional richer output (Screen Intelligence uses these)
  technicalExplanation?: string | null;
  recommendedActions?: string[];         // short imperative bullets
  confidence?: number | null;            // 0-100
  impact?: ImpactArea[];                 // areas affected if unfixed
  learnMode?: string | null;             // teaching paragraph — the "why", not just the fix
};


// ---------- Claude "fixer" system prompt (shared) ----------
export const FIXER_SYSTEM_PROMPT = `You are a friendly senior engineer who explains bugs in plain English so anyone — including a non-technical founder — can understand.

You receive a structured DIAGNOSIS from an upstream analyst model. You produce a rich, human fix plan that helps a developer reach the correct solution fast AND understand *why*.

${TAXONOMY_PROMPT}

Rules:
- Use simple language in \`plainExplanation\`. If you must use a technical term, define it in parentheses the first time (e.g. "RLS (Row-Level Security)").
- \`technicalExplanation\` is the same thing said precisely for an engineer.
- \`recommendedActions\` are 3-6 short imperative bullets ("Update the environment variable", "Restart the dev server", "Clear the Next.js cache"). No file paths, no code.
- Every \`steps\` entry names ONE file and one clear change. Only include \`codeAfter\` when the change is non-trivial or the user is unlikely to write it themselves.
- \`confidence\` is your honest 0-100 estimate that this diagnosis + fix is correct.
- \`impact\` lists user-visible areas that break if this stays unfixed (e.g. "Authentication", "Dashboard", "API"), each with a one-sentence consequence.
- \`learnMode\` is a short teaching paragraph (2-4 sentences) — teach the underlying concept, not just the fix.
- Use the GitHub search tools (search_github_repos, search_github_code) 1-4 times when it helps confirm the fix pattern; cite them in \`references\`.
- Return STRICT JSON only, matching:
{
  "plainExplanation": string,
  "technicalExplanation": string,
  "whyItHappened": string,
  "recommendedActions": string[],
  "confidence": number,
  "impact": [{ "area": string, "consequence": string }],
  "steps": [{ "file": string, "change": string, "codeAfter": string|null }],
  "references": [{ "title": string, "url": string }],
  "learnMode": string,
  "additionalNotes": string|null
}`;


// ---------- GitHub tools for Claude ----------
const GITHUB_API = "https://api.github.com";

async function gh<T>(url: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

export function buildGithubTools(ghToken?: string) {
  return {
    search_github_repos: tool({
      description: "Search public GitHub repositories that solve a similar problem or use a similar library. Use to find reference implementations.",
      inputSchema: z.object({
        query: z.string().describe("e.g. 'nextjs supabase auth middleware'"),
        limit: z.number().describe("1-10").default(5),
      }),
      execute: async ({ query, limit }) => {
        const j = await gh<{
          items: Array<{ full_name: string; html_url: string; description: string | null; stargazers_count: number }>;
        }>(`${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&per_page=${limit}&sort=stars`, ghToken);
        return j.items.map((r) => ({ name: r.full_name, url: r.html_url, stars: r.stargazers_count, description: r.description }));
      },
    }),
    search_github_code: tool({
      description: "Search actual code snippets across public GitHub. Use to confirm a fix pattern or API usage.",
      inputSchema: z.object({
        query: z.string(),
        limit: z.number().describe("1-10").default(5),
      }),
      execute: async ({ query, limit }) => {
        const j = await gh<{
          items: Array<{ path: string; html_url: string; repository: { full_name: string } }>;
        }>(`${GITHUB_API}/search/code?q=${encodeURIComponent(query)}&per_page=${limit}`, ghToken);
        return j.items.map((r) => ({ repo: r.repository.full_name, path: r.path, url: r.html_url }));
      },
    }),
  };
}

// ---------- Gemini caller (raw fetch to Google's native Generative Language API) ----------
// Uses GEMINI_API_KEY from Google AI Studio directly — no Lovable gateway.
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_ANALYST_MODEL = "gemini-3.1-pro-preview";
const GEMINI_TEXT_MODEL = "gemini-3.1-pro-preview";

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

function toGeminiParts(
  userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>,
): GeminiPart[] {
  return userContent.map((c) => {
    if (c.type === "text") return { text: c.text };
    const url = c.image_url.url;
    const m = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!m) throw new Error("Only base64 data URLs are supported for images");
    return { inline_data: { mime_type: m[1], data: m[2] } };
  });
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  parts: GeminiPart[],
  opts: { json?: boolean; maxOutputTokens?: number; temperature?: number } = {},
): Promise<string> {
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      // Gemini 3.x Pro consumes many "thoughts" tokens before visible output;
      // keep a generous ceiling so a big analyst JSON isn't cut off.
      maxOutputTokens: opts.maxOutputTokens ?? 16384,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  const res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Gemini ${model} failed [${res.status}]: ${(await res.text()).slice(0, 400)}`);
  }
  const json = await res.json();
  const candidate = json.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const text = (candidate?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) {
    throw new Error(`Gemini ${model} returned no content (finish reason: ${finishReason ?? "unknown"})`);
  }
  if (finishReason === "MAX_TOKENS") {
    throw new Error(`Gemini ${model} response was cut off. Try a shorter input.`);
  }
  return text;
}

export async function callGeminiAnalyst(
  apiKey: string,
  systemPrompt: string,
  userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>,
): Promise<Diagnosis> {
  const text = await callGemini(apiKey, GEMINI_ANALYST_MODEL, systemPrompt, toGeminiParts(userContent), {
    json: true,
  });
  try {
    return JSON.parse(text) as Diagnosis;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as Diagnosis;
    throw new Error("Gemini analyst returned unparseable output");
  }
}

export async function callGeminiText(
  apiKey: string,
  systemPrompt: string,
  userText: string,
): Promise<string> {
  return callGemini(apiKey, GEMINI_TEXT_MODEL, systemPrompt, [{ text: userText }], {
    maxOutputTokens: 2048,
    temperature: 0.4,
  });
}

export const ANALYST_INSTRUCTIONS = `Return STRICT JSON only (no markdown fences) matching:
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
  "affectedDependency": string|null
}`;
