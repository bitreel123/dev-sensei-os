import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------------- Types ----------------
export type FileInput = { path: string; content: string };

export type ModuleCard = {
  name: string;
  path: string;
  role: string; // layman: "handles user login"
  keyExports: string[];
  dependsOn: string[]; // other module names
};

export type Suggestion = {
  file: string;
  line?: number | null;
  title: string; // short label
  problem: string; // what's wrong / what could be better, in plain English
  suggestion: string; // step-by-step change, PROSE only (no rewritten code)
  priority: "high" | "medium" | "low";
};

export type Reference = {
  kind: "repo" | "code" | "api";
  title: string;
  url: string;
  why: string; // 1 line, layman
};

export type SystemAnalysis = {
  projectSummary: string; // layman: "This is a chat app that…"
  stack: string[];
  laymanOverview: string; // 1-2 paragraphs
  mermaid: string; // graph TD ...
  modules: ModuleCard[];
  suggestions: Suggestion[];
  references: Reference[];
};

// ---------------- GitHub helpers ----------------
const GITHUB_API = "https://api.github.com";
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
  ".vercel",
  ".cache",
]);
const CODE_EXT = /\.(ts|tsx|js|jsx|py|go|rs|java|kt|rb|php|css|scss|json|toml|yml|yaml|md|sql|sh)$/i;
const MAX_FILES = 18;
const MAX_FILE_BYTES = 12_000;

async function gh<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
          "User-Agent": "jeradin-app",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function fetchRepoFiles(
  token: string,
  owner: string,
  repo: string,
): Promise<FileInput[]> {
  // Get default branch
  const meta = await gh<{ default_branch: string }>(`${GITHUB_API}/repos/${owner}/${repo}`, token);
  const tree = await gh<{ tree: Array<{ path: string; type: string; size: number }> }>(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${meta.default_branch}?recursive=1`,
    token,
  );

  const candidates = tree.tree
    .filter((n) => n.type === "blob")
    .filter((n) => !n.path.split("/").some((seg) => IGNORED_DIRS.has(seg)))
    .filter((n) => CODE_EXT.test(n.path))
    .filter((n) => n.size < MAX_FILE_BYTES)
    .sort((a, b) => {
      const priority = (path: string) =>
        /(^|\/)(package\.json|README\.md|vite\.config\.[jt]s|src\/routes\/|src\/lib\/|src\/components\/)/i.test(path) ? 0 : 1;
      return priority(a.path) - priority(b.path) || a.path.localeCompare(b.path);
    })
    .slice(0, MAX_FILES);

  const files: FileInput[] = [];
  // Fetch the bounded analysis set concurrently so repository reads do not dominate latency.
  const conc = MAX_FILES;
  for (let i = 0; i < candidates.length; i += conc) {
    const batch = candidates.slice(i, i + conc);
    const results = await Promise.all(
      batch.map(async (n) => {
        try {
          const raw = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${meta.default_branch}/${n.path}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (!raw.ok) return null;
          const content = await raw.text();
          return { path: n.path, content: content.slice(0, MAX_FILE_BYTES) };
        } catch {
          return null;
        }
      }),
    );
    for (const r of results) if (r) files.push(r);
  }
  return files;
}

// ---------------- Claude call with GitHub search tools ----------------
type ClaudeTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

const CLAUDE_TOOLS: ClaudeTool[] = [
  {
    name: "search_github_repos",
    description:
      "Search public GitHub repositories for reference projects, libraries, or examples relevant to the codebase being analyzed. Use to find similar open-source projects the developer can learn from.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query, e.g. 'react tanstack chat app'" },
        limit: { type: "number", description: "Max results (default 5, max 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "search_github_code",
    description:
      "Search actual code snippets across public GitHub. Use to find real-world examples of an API, pattern, or library usage.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Code search query, e.g. 'stripe webhook typescript'" },
        limit: { type: "number", description: "Max results (default 5, max 10)" },
      },
      required: ["query"],
    },
  },
];

async function runClaudeTool(
  name: string,
  input: Record<string, unknown>,
  ghToken: string,
): Promise<unknown> {
  const q = String(input.query ?? "");
  const limit = Math.min(Number(input.limit ?? 5), 10);
  if (name === "search_github_repos") {
    const j = await gh<{ items: Array<{ full_name: string; html_url: string; description: string; stargazers_count: number }> }>(
      `${GITHUB_API}/search/repositories?q=${encodeURIComponent(q)}&per_page=${limit}&sort=stars`,
      ghToken,
    );
    return j.items.map((r) => ({
      name: r.full_name,
      url: r.html_url,
      stars: r.stargazers_count,
      description: r.description,
    }));
  }
  if (name === "search_github_code") {
    const j = await gh<{ items: Array<{ name: string; path: string; html_url: string; repository: { full_name: string } }> }>(
      `${GITHUB_API}/search/code?q=${encodeURIComponent(q)}&per_page=${limit}`,
      ghToken,
    );
    return j.items.map((r) => ({
      repo: r.repository.full_name,
      path: r.path,
      url: r.html_url,
    }));
  }
  return { error: `unknown tool ${name}` };
}

const SYSTEM_PROMPT = `You are a senior staff engineer analyzing an entire codebase for a developer who may not be highly technical. Your job:

1. Explain the whole project in PLAIN ENGLISH (layman) — what it does, who it's for, how it makes money if applicable.
2. Produce a semantic map as a Mermaid \`graph TD\` diagram showing modules and how they depend on each other. Keep node labels short. No emojis. No custom colors. Max ~15 nodes.
3. List key modules with a one-line role in plain English, what they export, and what they depend on.
4. Give per-file SUGGESTIONS — one by one. DO NOT rewrite code. Only describe the change in prose: which file, roughly which line/area, what to change, and WHY. The developer will apply the change themselves.
5. Use the search tools only when the developer explicitly asks for external references or examples. Repository analysis itself should finish in one model pass.
6. Return references with a 1-line layman "why this helps".

Return STRICT JSON matching this schema (no markdown fences, no prose outside JSON):
{
  "projectSummary": string,
  "stack": string[],
  "laymanOverview": string,
  "mermaid": string,
  "modules": [{"name": string, "path": string, "role": string, "keyExports": string[], "dependsOn": string[]}],
  "suggestions": [{"file": string, "line": number|null, "title": string, "problem": string, "suggestion": string, "priority": "high"|"medium"|"low"}],
  "references": [{"kind": "repo"|"code"|"api", "title": string, "url": string, "why": string}]
}

Never include markdown code fences in the mermaid field. Start it directly with "graph TD".`;

async function callClaudeWithTools(
  anthropicKey: string,
  ghToken: string,
  files: FileInput[],
  projectHint: string,
): Promise<SystemAnalysis> {
  const filesBlock = files
    .map((f) => `--- FILE: ${f.path} ---\n${f.content}`)
    .join("\n\n")
    .slice(0, 120_000); // bound model input so first-token latency stays predictable

  const userText =
    (projectHint ? `Developer note: ${projectHint}\n\n` : "") +
    `Here are ${files.length} files from the codebase:\n\n${filesBlock}\n\n` +
    `Analyze the entire project. Use the search tools to find reference material. Return the JSON only.`;

  const messages: Array<{ role: "user" | "assistant"; content: unknown }> = [
    { role: "user", content: userText },
  ];

  // Most analyses finish in one pass; an optional external-reference search gets one follow-up.
  for (let turn = 0; turn < 2; turn++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 5000,
        system: SYSTEM_PROMPT,
        tools: CLAUDE_TOOLS,
        messages,
      }),
    });
    if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const content = json.content as Array<
      | { type: "text"; text: string }
      | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
    >;

    messages.push({ role: "assistant", content });

    const toolUses = content.filter((b) => b.type === "tool_use") as Array<{
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    }>;

    if (toolUses.length === 0 || json.stop_reason === "end_turn") {
      const text = (content.find((b) => b.type === "text") as { type: "text"; text: string } | undefined)?.text ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Claude returned no JSON");
      return JSON.parse(jsonMatch[0]) as SystemAnalysis;
    }

    const toolResults = await Promise.all(
      toolUses.map(async (tu) => {
        try {
          const result = await runClaudeTool(tu.name, tu.input, ghToken);
          return {
            type: "tool_result" as const,
            tool_use_id: tu.id,
            content: JSON.stringify(result).slice(0, 8000),
          };
        } catch (e) {
          return {
            type: "tool_result" as const,
            tool_use_id: tu.id,
            content: `Error: ${(e as Error).message}`,
            is_error: true,
          };
        }
      }),
    );
    messages.push({ role: "user", content: toolResults });
  }
  throw new Error("Claude tool loop exceeded max turns without a final answer.");
}

// ---------------- Server function ----------------
export const analyzeSystem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      source: "github" | "upload";
      repo?: string; // "owner/name"
      files?: FileInput[];
      projectHint?: string;
    }) => {
      if (input.source === "github") {
        if (!input.repo || !/^[^/]+\/[^/]+$/.test(input.repo))
          throw new Error("repo must be 'owner/name'");
      } else {
        if (!Array.isArray(input.files) || input.files.length === 0)
          throw new Error("files required for upload source");
        if (input.files.length > MAX_FILES)
          throw new Error(`Too many files (max ${MAX_FILES})`);
      }
      return { ...input, projectHint: (input.projectHint ?? "").slice(0, 2000) };
    },
  )
  .handler(async ({ data, context }) => {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");

    // Get GitHub token (needed for both sources — upload source still uses tools)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conn } = await supabaseAdmin
      .from("github_connections")
      .select("access_token")
      .eq("user_id", context.userId)
      .maybeSingle();
    const ghToken = (conn as { access_token?: string } | null)?.access_token ?? "";
    if (!ghToken && data.source === "github") {
      throw new Error("Connect GitHub first to analyze a repo.");
    }

    let files: FileInput[];
    if (data.source === "github") {
      const [owner, repo] = data.repo!.split("/");
      files = await fetchRepoFiles(ghToken, owner, repo);
      if (files.length === 0) throw new Error("No analyzable files found in that repo.");
    } else {
      files = data.files!.map((f) => ({
        path: f.path,
        content: (f.content ?? "").slice(0, MAX_FILE_BYTES),
      }));
    }

    const analysis = await callClaudeWithTools(
      anthropicKey,
      ghToken,
      files,
      data.projectHint ?? "",
    );

    const { chargeAndRemember, INTEL_COST } = await import("./intel-memory.server");
    await chargeAndRemember(context.userId, "system", INTEL_COST.system, {
      title: analysis.projectSummary?.slice(0, 200) || "System analysis",
      summary: analysis.laymanOverview?.slice(0, 800) ?? null,
      payload: { stack: analysis.stack, moduleCount: analysis.modules?.length ?? 0, source: data.source, repo: data.repo ?? null },
      tags: analysis.stack?.slice(0, 6) ?? [],
    });

    return { analysis, filesAnalyzed: files.length };
  });

// List the caller's GitHub repos so the UI can offer a picker.
export const listMyGithubRepos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conn } = await supabaseAdmin
      .from("github_connections")
      .select("access_token")
      .eq("user_id", context.userId)
      .maybeSingle();
    const token = (conn as { access_token?: string } | null)?.access_token;
    if (!token) return { repos: [] as Array<{ full_name: string; private: boolean }> };
    const repos = await gh<Array<{ full_name: string; private: boolean; updated_at: string }>>(
      `${GITHUB_API}/user/repos?per_page=100&sort=updated`,
      token,
    );
    return {
      repos: repos.map((r) => ({ full_name: r.full_name, private: r.private })),
    };
  });
