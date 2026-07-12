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
export type Diagnosis = {
  category: DebugCategory;
  severity: "error" | "warning" | "info";
  summary: string;                       // 1-2 sentence, technical
  evidence: Array<{ source: string; snippet: string }>;
  suspectFiles: string[];
  hypothesis: string;                    // most likely root cause
};

export type FixStep = {
  file: string;
  change: string;
  codeAfter?: string | null;             // only when user likely can't write it
};

export type FixPlan = {
  plainExplanation: string;              // layman, 1-2 sentences
  whyItHappened: string;                 // layman paragraph
  steps: FixStep[];
  references?: Array<{ title: string; url: string }>;
  additionalNotes?: string | null;
};

// ---------- Claude "fixer" system prompt (shared) ----------
export const FIXER_SYSTEM_PROMPT = `You are a friendly senior engineer who explains bugs in plain English so anyone — including a non-technical founder — can understand.

You receive a structured DIAGNOSIS from an upstream analyst model. You produce a step-by-step fix plan.

${TAXONOMY_PROMPT}

Rules:
- Use simple language. If you must use a technical term, define it in parentheses the first time (e.g. "RLS (Row-Level Security)").
- Every step names ONE file and one clear change.
- Only include \`codeAfter\` for steps where the change is non-trivial or the user is unlikely to write it themselves. Prefer written explanation over code dumps.
- Use the GitHub search tools (search_github_repos, search_github_code) 1-4 times when it helps confirm the fix pattern; cite them in \`references\`.
- Return STRICT JSON only, matching:
{
  "plainExplanation": string,
  "whyItHappened": string,
  "steps": [{ "file": string, "change": string, "codeAfter": string|null }],
  "references": [{ "title": string, "url": string }],
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

// ---------- Gemini analyst caller (raw fetch to Lovable AI Gateway) ----------
export async function callGeminiAnalyst(
  lovableKey: string,
  systemPrompt: string,
  userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>,
): Promise<Diagnosis> {
  const body = {
    model: "google/gemini-3.1-pro-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    max_tokens: 8192,
    temperature: 0.2,
    response_format: { type: "json_object" },
  };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Gemini analyst failed [${res.status}]: ${(await res.text()).slice(0, 400)}`);
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? "";
  const finishReason = json.choices?.[0]?.finish_reason;
  if (!text && finishReason) {
    throw new Error(`Gemini analyst returned no content (finish reason: ${finishReason})`);
  }
  if (finishReason === "length" || finishReason === "MAX_TOKENS") {
    throw new Error("Gemini analyst response was cut off. Try a shorter recording or attach a screenshot of the error area.");
  }
  try {
    return JSON.parse(text) as Diagnosis;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as Diagnosis;
    throw new Error("Gemini analyst returned unparseable output");
  }
}

export const ANALYST_INSTRUCTIONS = `Return STRICT JSON only (no markdown fences) matching:
{
  "category": "runtime"|"api"|"database"|"auth"|"env"|"dependencies"|"performance"|"logs"|"deployment"|"ui"|"unknown",
  "severity": "error"|"warning"|"info",
  "summary": string,
  "evidence": [{ "source": string, "snippet": string }],
  "suspectFiles": string[],
  "hypothesis": string
}`;
