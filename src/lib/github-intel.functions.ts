import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";

// ---------------- Types ----------------
export type RepoRisk = {
  severity: "high" | "medium" | "low";
  title: string;
  detail: string; // plain English
  where?: string; // file / PR / dep name
};

export type RepoOpportunity = {
  title: string;
  detail: string;
  effort: "small" | "medium" | "large";
};

export type RepoPattern = {
  name: string;
  description: string; // plain English
  examples: string[]; // file paths or PR titles
};

export type GithubIntelReport = {
  repo: string;
  summary: string; // layman: what this project is + how healthy it looks
  activityScore: number; // 0-100
  risks: RepoRisk[];
  opportunities: RepoOpportunity[];
  patterns: RepoPattern[];
  dependencyNotes: Array<{ name: string; version: string; note: string }>;
  glossary: Array<{ term: string; meaning: string }>;
};

// ---------------- GitHub helpers ----------------
const GITHUB_API = "https://api.github.com";
async function gh<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok)
    throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

async function ghRaw(owner: string, repo: string, branch: string, path: string, token: string) {
  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  return res.text();
}

// ---------------- Server fn ----------------
export const runGithubIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { repo: string; focus?: string }) => {
    if (!input?.repo || !/^[^/]+\/[^/]+$/.test(input.repo))
      throw new Error("repo must be 'owner/name'");
    return { repo: input.repo, focus: (input.focus ?? "").slice(0, 1000) };
  })
  .handler(async ({ data, context }) => {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conn } = await supabaseAdmin
      .from("github_connections")
      .select("access_token")
      .eq("user_id", context.userId)
      .maybeSingle();
    const ghToken = (conn as { access_token?: string } | null)?.access_token;
    if (!ghToken) throw new Error("Connect GitHub first to analyze a repo.");

    const [owner, repoName] = data.repo.split("/");

    // ---------- Agentic tools ----------
    const tools = {
      get_repo_meta: tool({
        description: "Get repo metadata: default branch, stars, forks, open issues, last push date, size, language.",
        inputSchema: z.object({}),
        execute: async () =>
          gh<{
            default_branch: string;
            stargazers_count: number;
            forks_count: number;
            open_issues_count: number;
            pushed_at: string;
            size: number;
            language: string | null;
            description: string | null;
            license: { spdx_id: string } | null;
          }>(`/repos/${owner}/${repoName}`, ghToken),
      }),
      list_pull_requests: tool({
        description: "List recent pull requests. state: open|closed|all",
        inputSchema: z.object({
          state: z.enum(["open", "closed", "all"]).default("all"),
          limit: z.number().min(1).max(30).default(15),
        }),
        execute: async ({ state, limit }) => {
          const prs = await gh<
            Array<{ number: number; title: string; state: string; user: { login: string }; merged_at: string | null; created_at: string; html_url: string }>
          >(`/repos/${owner}/${repoName}/pulls?state=${state}&per_page=${limit}&sort=updated&direction=desc`, ghToken);
          return prs.map((p) => ({
            number: p.number,
            title: p.title,
            state: p.state,
            merged: !!p.merged_at,
            author: p.user?.login,
            url: p.html_url,
            created: p.created_at,
          }));
        },
      }),
      list_commits: tool({
        description: "List recent commits on the default branch.",
        inputSchema: z.object({ limit: z.number().min(1).max(30).default(20) }),
        execute: async ({ limit }) => {
          const commits = await gh<
            Array<{ sha: string; commit: { message: string; author: { name: string; date: string } }; html_url: string }>
          >(`/repos/${owner}/${repoName}/commits?per_page=${limit}`, ghToken);
          return commits.map((c) => ({
            sha: c.sha.slice(0, 7),
            message: c.commit.message.split("\n")[0].slice(0, 160),
            author: c.commit.author?.name,
            date: c.commit.author?.date,
            url: c.html_url,
          }));
        },
      }),
      list_issues: tool({
        description: "List recent open issues (excludes PRs).",
        inputSchema: z.object({ limit: z.number().min(1).max(30).default(15) }),
        execute: async ({ limit }) => {
          const issues = await gh<
            Array<{ number: number; title: string; user: { login: string }; created_at: string; html_url: string; pull_request?: unknown; labels: Array<{ name: string }> }>
          >(`/repos/${owner}/${repoName}/issues?state=open&per_page=${limit}`, ghToken);
          return issues
            .filter((i) => !i.pull_request)
            .map((i) => ({
              number: i.number,
              title: i.title,
              author: i.user?.login,
              labels: i.labels.map((l) => l.name),
              url: i.html_url,
              created: i.created_at,
            }));
        },
      }),
      get_dependencies: tool({
        description:
          "Reads package.json (JS/TS), requirements.txt (Python), Cargo.toml (Rust), or go.mod (Go) if present and returns declared dependencies.",
        inputSchema: z.object({}),
        execute: async () => {
          const meta = await gh<{ default_branch: string }>(`/repos/${owner}/${repoName}`, ghToken);
          const branch = meta.default_branch;
          const files = ["package.json", "requirements.txt", "Cargo.toml", "go.mod", "pyproject.toml"];
          const results: Record<string, string> = {};
          for (const f of files) {
            const t = await ghRaw(owner, repoName, branch, f, ghToken);
            if (t) results[f] = t.slice(0, 6000);
          }
          return results;
        },
      }),
      read_file: tool({
        description: "Read a file from the repo (max 20KB). Use to spot-check patterns Claude wants to verify.",
        inputSchema: z.object({ path: z.string() }),
        execute: async ({ path }) => {
          const meta = await gh<{ default_branch: string }>(`/repos/${owner}/${repoName}`, ghToken);
          const t = await ghRaw(owner, repoName, meta.default_branch, path, ghToken);
          if (!t) return { error: "file not found" };
          return { path, content: t.slice(0, 20_000) };
        },
      }),
    };

    // ---------- Claude Sonnet agent loop ----------
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    const claude = anthropic("claude-sonnet-4-5");

    const systemPrompt = `You are a senior engineer auditing a GitHub repository for a developer who may not be highly technical.

You have tools to read repo metadata, PRs, commits, issues, dependencies, and specific files. Call tools 4-10 times to build a complete picture BEFORE answering. Always call get_repo_meta first, then dependencies, then PRs + commits + issues, then read 1-3 key files if needed.

When done, return STRICT JSON only (no markdown fences, no prose outside JSON):
{
  "summary": string,                       // 2-3 sentences in plain English
  "activityScore": number,                 // 0-100. Recent commits/PRs = higher.
  "risks": [
    { "severity":"high"|"medium"|"low", "title":string, "detail":string, "where":string|null }
  ],
  "opportunities": [
    { "title":string, "detail":string, "effort":"small"|"medium"|"large" }
  ],
  "patterns": [
    { "name":string, "description":string, "examples":string[] }
  ],
  "dependencyNotes": [ { "name":string, "version":string, "note":string } ],
  "glossary": [ { "term":string, "meaning":string } ]   // define every abbreviation you use
}

Rules:
- Plain English. Assume the reader is smart but not deeply technical.
- Every finding is concrete and traceable (name PRs, files, or dep versions).
- Include 3-6 risks, 3-6 opportunities, 2-4 patterns.`;

    const userPrompt =
      `Repository: ${data.repo}` +
      (data.focus ? `\nExtra focus from the user: ${data.focus}` : "") +
      `\n\nAudit it now.`;

    const { text: claudeText } = await generateText({
      model: claude,
      system: systemPrompt,
      prompt: userPrompt,
      tools,
      stopWhen: stepCountIs(50),
    });

    const jsonMatch = claudeText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude returned no JSON payload.");
    const parsed = JSON.parse(jsonMatch[0]) as Omit<GithubIntelReport, "repo">;

    // Optional: Gemini re-writes summary in even simpler language
    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const gemini = gateway("google/gemini-3.1-flash-lite");
    const { text: laymanSummary } = await generateText({
      model: gemini,
      system:
        "Rewrite technical summaries in friendly plain English for a non-technical reader. Define every abbreviation the first time, e.g. 'PR (Pull Request — a proposed code change)'.",
      prompt: `Original summary of ${data.repo}:\n${parsed.summary}\n\nRewrite in 2-3 short sentences.`,
    });

    const report: GithubIntelReport = { repo: data.repo, ...parsed, summary: laymanSummary };
    return { report };
  });
