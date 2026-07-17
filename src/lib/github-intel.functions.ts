import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { callGeminiText } from "./intel-shared";

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

export type CommitInsight = {
  sha: string;
  title: string;
  what: string;
  why: string;
  risk: "high" | "medium" | "low";
  files: string[];
  breaking: boolean;
  date?: string;
  author?: string;
};

export type PRInsight = {
  number: number;
  title: string;
  purpose: string;
  architectureImpact: string;
  risks: string[];
  reviewSuggestions: string[];
  missingTests: boolean;
  author?: string;
  url?: string;
};

export type EvolutionStep = { version: string; change: string; when?: string };
export type EvolutionThread = { topic: string; timeline: EvolutionStep[] };

export type RegressionFinding = {
  description: string;
  likelyCommit?: string;
  files: string[];
  confidence: number; // 0-100
  reasoning: string;
};

export type ContributorArea = { area: string; owner: string; share: string };

export type BranchDiff = { branch: string; vs: string; summary: string; differences: string[] };

export type ReleaseInsight = {
  version: string;
  newApis: number;
  breakingChanges: number;
  databaseChanges: number;
  migrationRequired: boolean;
  risk: "high" | "medium" | "low";
  notes: string;
};

export type RepoHealth = {
  overall: number; // 0-100
  commits: "healthy" | "needs attention" | "poor";
  reviews: "healthy" | "needs attention" | "poor";
  testing: "healthy" | "needs attention" | "poor";
  security: "healthy" | "needs attention" | "poor";
  documentation: "healthy" | "needs attention" | "poor";
};

export type HistoricalAnswer = {
  question: string;
  answer: string;
  commit?: string;
  pr?: string;
  date?: string;
  reason?: string;
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
  // ---- New Repo Intelligence sections ----
  commitIntel?: CommitInsight[];
  prIntel?: PRInsight[];
  evolution?: EvolutionThread[];
  regression?: RegressionFinding | null;
  contributors?: ContributorArea[];
  branches?: BranchDiff[];
  releases?: ReleaseInsight[];
  health?: RepoHealth;
  historical?: HistoricalAnswer[];
  memory?: string[]; // durable notes about why the repo looks the way it does
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
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");
    if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

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
      list_branches: tool({
        description: "List branches on the repo.",
        inputSchema: z.object({ limit: z.number().min(1).max(50).default(20) }),
        execute: async ({ limit }) => {
          const b = await gh<Array<{ name: string; commit: { sha: string } }>>(
            `/repos/${owner}/${repoName}/branches?per_page=${limit}`,
            ghToken,
          );
          return b.map((x) => ({ name: x.name, sha: x.commit.sha.slice(0, 7) }));
        },
      }),
      compare_branches: tool({
        description: "Compare two branches (base...head): commits, files changed, additions/deletions.",
        inputSchema: z.object({ base: z.string(), head: z.string() }),
        execute: async ({ base, head }) => {
          const c = await gh<{
            status: string;
            ahead_by: number;
            behind_by: number;
            total_commits: number;
            files: Array<{ filename: string; status: string; additions: number; deletions: number }>;
          }>(`/repos/${owner}/${repoName}/compare/${base}...${head}`, ghToken);
          return {
            status: c.status,
            ahead_by: c.ahead_by,
            behind_by: c.behind_by,
            total_commits: c.total_commits,
            files: (c.files ?? []).slice(0, 30),
          };
        },
      }),
      list_releases: tool({
        description: "List releases (tags with notes) for the repo.",
        inputSchema: z.object({ limit: z.number().min(1).max(20).default(10) }),
        execute: async ({ limit }) => {
          const rels = await gh<
            Array<{ tag_name: string; name: string; published_at: string; body: string; html_url: string }>
          >(`/repos/${owner}/${repoName}/releases?per_page=${limit}`, ghToken);
          return rels.map((r) => ({
            tag: r.tag_name,
            name: r.name,
            published: r.published_at,
            notes: (r.body ?? "").slice(0, 2000),
            url: r.html_url,
          }));
        },
      }),
      list_contributors: tool({
        description: "List top contributors and their commit counts.",
        inputSchema: z.object({ limit: z.number().min(1).max(30).default(15) }),
        execute: async ({ limit }) => {
          const cs = await gh<Array<{ login: string; contributions: number }>>(
            `/repos/${owner}/${repoName}/contributors?per_page=${limit}`,
            ghToken,
          );
          return cs.map((c) => ({ login: c.login, commits: c.contributions }));
        },
      }),
      get_commit_detail: tool({
        description: "Get a single commit's diff: files changed with additions/deletions.",
        inputSchema: z.object({ sha: z.string() }),
        execute: async ({ sha }) => {
          const c = await gh<{
            sha: string;
            commit: { message: string; author: { name: string; date: string } };
            files: Array<{ filename: string; status: string; additions: number; deletions: number; patch?: string }>;
          }>(`/repos/${owner}/${repoName}/commits/${sha}`, ghToken);
          return {
            sha: c.sha.slice(0, 7),
            message: c.commit.message.slice(0, 500),
            author: c.commit.author?.name,
            date: c.commit.author?.date,
            files: (c.files ?? []).slice(0, 20).map((f) => ({
              filename: f.filename,
              status: f.status,
              additions: f.additions,
              deletions: f.deletions,
              patch: (f.patch ?? "").slice(0, 1500),
            })),
          };
        },
      }),
      get_pr_files: tool({
        description: "List files changed in a pull request.",
        inputSchema: z.object({ number: z.number() }),
        execute: async ({ number }) => {
          const files = await gh<
            Array<{ filename: string; status: string; additions: number; deletions: number }>
          >(`/repos/${owner}/${repoName}/pulls/${number}/files?per_page=30`, ghToken);
          return files.slice(0, 30);
        },
      }),
    };

    // ---------- Claude Sonnet agent loop ----------
    const anthropic = createAnthropic({ apiKey: anthropicKey });
    const claude = anthropic("claude-sonnet-4-5");

    const systemPrompt = `You are a senior engineer performing REPO INTELLIGENCE on a GitHub repository. Your job is to understand how the software has evolved over time — commits, PRs, branches, releases, contributors, regressions — and explain it in plain English.

Use the available tools aggressively. Recommended sequence (5-15 tool calls):
1. get_repo_meta
2. get_dependencies
3. list_commits, list_pull_requests, list_issues
4. list_branches, list_releases, list_contributors
5. Read 1-3 key files with read_file if needed (auth, main entry, config)
6. get_commit_detail on 1-3 suspicious commits (recent breaking changes, regressions)
7. compare_branches when the user asks about diffs between branches
8. get_pr_files for high-impact PRs

If the user's focus mentions a regression / "worked last week" / bug, actively hunt for the introducing commit via list_commits + get_commit_detail on likely candidates.

When done, return STRICT JSON only (no markdown fences, no prose outside JSON). Every field is optional except summary, activityScore, risks, opportunities, patterns, dependencyNotes, glossary — fill the new sections whenever the tool data supports them:
{
  "summary": string,
  "activityScore": number,
  "risks": [{ "severity":"high"|"medium"|"low", "title":string, "detail":string, "where":string|null }],
  "opportunities": [{ "title":string, "detail":string, "effort":"small"|"medium"|"large" }],
  "patterns": [{ "name":string, "description":string, "examples":string[] }],
  "dependencyNotes": [{ "name":string, "version":string, "note":string }],
  "glossary": [{ "term":string, "meaning":string }],

  "commitIntel": [
    { "sha":string, "title":string, "what":string, "why":string,
      "risk":"high"|"medium"|"low", "files":string[], "breaking":boolean,
      "date":string|null, "author":string|null }
  ],                                     // 4-8 most meaningful recent commits (not just newest)
  "prIntel": [
    { "number":number, "title":string, "purpose":string, "architectureImpact":string,
      "risks":string[], "reviewSuggestions":string[], "missingTests":boolean,
      "author":string|null, "url":string|null }
  ],                                     // 3-6 notable PRs
  "evolution": [
    { "topic":string, "timeline":[{ "version":string, "change":string, "when":string|null }] }
  ],                                     // 1-3 threads (e.g. Auth: v1 → JWT → OAuth → Session → RBAC)
  "regression": {                        // null if nothing suspected
    "description":string, "likelyCommit":string|null, "files":string[],
    "confidence":number, "reasoning":string
  } | null,
  "contributors": [
    { "area":string, "owner":string, "share":string }
  ],                                     // e.g. { area:"Payments", owner:"john", share:"64%" }
  "branches": [
    { "branch":string, "vs":string, "summary":string, "differences":string[] }
  ],                                     // only when compare data was collected
  "releases": [
    { "version":string, "newApis":number, "breakingChanges":number,
      "databaseChanges":number, "migrationRequired":boolean,
      "risk":"high"|"medium"|"low", "notes":string }
  ],
  "health": {
    "overall":number,
    "commits":"healthy"|"needs attention"|"poor",
    "reviews":"healthy"|"needs attention"|"poor",
    "testing":"healthy"|"needs attention"|"poor",
    "security":"healthy"|"needs attention"|"poor",
    "documentation":"healthy"|"needs attention"|"poor"
  },
  "historical": [
    { "question":string, "answer":string, "commit":string|null, "pr":string|null,
      "date":string|null, "reason":string|null }
  ],                                     // 0-3 historical questions answered from the timeline
  "memory": string[]                     // 3-6 durable notes: why architecture changed, prior bugs, prior fixes
}

Rules:
- Plain English throughout. Assume a smart but non-deeply-technical reader.
- Every finding is traceable (SHA, PR#, file path, dep version).
- Include 3-6 risks, 3-6 opportunities, 2-4 patterns.
- For regressions: only set "regression" when evidence supports it; state confidence honestly.
- Never invent SHAs or PR numbers you did not observe via tools.`;

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
    const laymanSummary = await callGeminiText(
      geminiKey,
      "Rewrite technical summaries in friendly plain English for a non-technical reader. Define every abbreviation the first time, e.g. 'PR (Pull Request — a proposed code change)'.",
      `Original summary of ${data.repo}:\n${parsed.summary}\n\nRewrite in 2-3 short sentences.`,
    );

    const report: GithubIntelReport = { repo: data.repo, ...parsed, summary: laymanSummary };

    const { chargeAndRemember, INTEL_COST } = await import("./intel-memory.server");
    await chargeAndRemember(context.userId, "repo", INTEL_COST.repo, {
      title: `${data.repo}${data.focus ? ` — ${data.focus.slice(0, 80)}` : ""}`,
      summary: laymanSummary?.slice(0, 800) ?? null,
      payload: {
        repo: data.repo,
        risks: (parsed.risks ?? []).slice(0, 5).map((r) => r.title),
        regression: parsed.regression?.description ?? null,
      },
      tags: [data.repo],
    });

    return { report };
  });
