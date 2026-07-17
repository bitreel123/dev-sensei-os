// Server functions for the code intelligence graph (System panel).
// Ingestion + mode router. All handlers are auth-gated.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ------------- Types (shared with UI) -------------
export const INTEL_MODES = [
  "architecture",
  "dependency",
  "impact",
  "dataflow",
  "business",
  "knowledge",
  "security",
  "performance",
  "debt",
  "refactor",
] as const;
export type IntelMode = (typeof INTEL_MODES)[number];

export type CodeRepoRow = {
  id: string;
  full_name: string;
  default_branch: string;
  last_scanned_sha: string | null;
  last_scanned_at: string | null;
  file_count: number;
  symbol_count: number;
  edge_count: number;
};

export type ScanStatusRow = {
  id: string;
  repo_id: string;
  status: "pending" | "running" | "done" | "error";
  phase: string | null;
  files_total: number;
  files_done: number;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

export type IntelResult = {
  mode: IntelMode;
  headline: string;
  summary: string;
  mermaid?: string | null;
  sections: Array<{ title: string; bullets: string[] }>;
  findings: Array<{
    title: string;
    file?: string | null;
    line?: number | null;
    severity?: "high" | "medium" | "low";
    detail: string;
    suggestion: string;
  }>;
  citations: Array<{ path: string }>;
};

// ------------- List / get repo -------------
export const listCodeRepos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("code_repos")
      .select("id, full_name, default_branch, last_scanned_sha, last_scanned_at, file_count, symbol_count, edge_count")
      .eq("user_id", context.userId)
      .order("last_scanned_at", { ascending: false, nullsFirst: false });
    return { repos: (data ?? []) as CodeRepoRow[] };
  });

// ------------- Start scan -------------
export const startCodeScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fullName: string }) => {
    if (!/^[^/\s]+\/[^/\s]+$/.test(input.fullName)) throw new Error("fullName must be 'owner/repo'");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runFullScan } = await import("./code-graph/ingest.server");

    // Create or find repo row
    let { data: repo } = await supabaseAdmin
      .from("code_repos")
      .select("id")
      .eq("user_id", context.userId)
      .eq("full_name", data.fullName)
      .maybeSingle();

    if (!repo) {
      const inserted = await supabaseAdmin
        .from("code_repos")
        .insert({ user_id: context.userId, full_name: data.fullName, default_branch: "main" })
        .select("id")
        .single();
      if (inserted.error) throw new Error(inserted.error.message);
      repo = inserted.data;
    }
    const repoId = (repo as { id: string }).id;

    const scan = await supabaseAdmin
      .from("code_scans")
      .insert({ user_id: context.userId, repo_id: repoId, status: "pending", phase: "queued" })
      .select("id")
      .single();
    if (scan.error) throw new Error(scan.error.message);
    const scanId = (scan.data as { id: string }).id;

    // Fire and forget — Workers keep the handler alive via waitUntil implicit
    // in TanStack Start. Await here so long scans complete before the request
    // returns; the UI polls status regardless.
    void runFullScan(context.userId, data.fullName, scanId).catch((e) => {
      console.error("scan crashed:", e);
    });

    return { scanId, repoId };
  });

// ------------- Poll scan status -------------
export const getScanStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scanId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("code_scans")
      .select("id, repo_id, status, phase, files_total, files_done, error, started_at, finished_at")
      .eq("id", data.scanId)
      .eq("user_id", context.userId)
      .maybeSingle();
    return { scan: (row ?? null) as ScanStatusRow | null };
  });

// ------------- Re-sync (incremental) -------------
export const resyncCodeRepo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { repoId: string }) => input)
  .handler(async ({ data, context }) => {
    const { runIncrementalSync } = await import("./code-graph/ingest.server");
    return runIncrementalSync(context.userId, data.repoId);
  });

// ------------- Mode router -------------
const MODE_PROMPTS: Record<IntelMode, { role: string; format: string }> = {
  architecture: {
    role: "senior software architect",
    format: "Return a plain-English overview of how this codebase is structured, plus a Mermaid graph TD diagram of the top layers/folders. Group by responsibility.",
  },
  dependency: {
    role: "dependency & supply-chain analyst",
    format: "Identify heavy dependencies, likely-unused packages, and risky versions. Bullet the top 10 concerns with actionable next steps.",
  },
  impact: {
    role: "change-impact analyst",
    format: "For the given file, explain what breaks if it changes: direct importers, transitive dependents, and any tests/data flows affected. Rank by risk.",
  },
  dataflow: {
    role: "data-flow analyst",
    format: "Trace which routes/functions read and write each database table. Include a Mermaid diagram (graph LR) of route → table.",
  },
  business: {
    role: "product engineer explaining the codebase to a non-technical stakeholder",
    format: "Describe the main user-facing features in plain English, mapped to the routes/handlers that implement them.",
  },
  knowledge: {
    role: "codebase question-answering assistant",
    format: "Answer the user's question grounded in the retrieved chunks. Cite file paths inline.",
  },
  security: {
    role: "security engineer",
    format: "List findings with severity (high/medium/low), file, line, and a concrete fix. Focus on auth gaps, missing input validation, secret leakage, missing RLS.",
  },
  performance: {
    role: "performance engineer",
    format: "Identify hotspots: N+1 patterns, missing indexes, oversized bundles, expensive renders. Suggest concrete fixes.",
  },
  debt: {
    role: "technical debt auditor",
    format: "Score debt hotspots (0-10) and list the top 10 files with the highest debt. Include TODOs, dead exports, oversized modules.",
  },
  refactor: {
    role: "refactoring specialist",
    format: "Recommend 5-10 concrete refactors with before/after intent (prose only, no code). Prioritize by ROI.",
  },
};

async function callClaudeForMode(
  systemPrompt: string,
  userPrompt: string,
): Promise<IntelResult> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 6000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json() as { content: Array<{ type: string; text?: string }> };
  const text = j.content.find((b) => b.type === "text")?.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Model returned no JSON");
  return JSON.parse(match[0]) as IntelResult;
}

export const runIntelMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    repoId: string;
    mode: IntelMode;
    question?: string;
    focusPath?: string;
  }) => {
    if (!INTEL_MODES.includes(input.mode)) throw new Error("Invalid mode");
    return input;
  })
  .handler(async ({ data, context }): Promise<IntelResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadArchitectureSummary, semanticSearch, impactOf } = await import("./code-graph/retrieve.server");

    // Verify ownership
    const { data: repo } = await supabaseAdmin
      .from("code_repos")
      .select("id, full_name, file_count")
      .eq("id", data.repoId)
      .eq("user_id", context.userId)
      .maybeSingle();
    const repoRow = repo as { id: string; full_name: string; file_count: number } | null;
    if (!repoRow) throw new Error("Repo not found or not owned");
    if (repoRow.file_count === 0) throw new Error("Scan the repo first — no files ingested yet.");

    const mode = data.mode;
    const prompt = MODE_PROMPTS[mode];
    const arch = await loadArchitectureSummary(context.userId, repoRow.id);

    // Retrieve mode-specific context
    let contextBlock = "";
    let citations: Array<{ path: string }> = [];

    if (mode === "impact") {
      if (!data.focusPath) throw new Error("focusPath is required for impact mode");
      const impact = await impactOf(context.userId, repoRow.id, data.focusPath);
      contextBlock = [
        `Focus file: ${data.focusPath}`,
        `Direct importers (${impact.direct.length}): ${impact.direct.slice(0, 30).join(", ")}`,
        `Transitive dependents (${impact.transitive.length}): ${impact.transitive.slice(0, 60).join(", ")}`,
      ].join("\n");
      citations = [{ path: data.focusPath }, ...impact.direct.slice(0, 5).map((p) => ({ path: p }))];
    } else if (mode === "dependency") {
      contextBlock = `Packages depended on:\n${arch.packageDeps.join("\n")}`;
    } else if (mode === "dataflow") {
      contextBlock = [
        `Routes (${arch.routes.length}): ${arch.routes.join(", ")}`,
        `Tables read: ${arch.tables.reads.join(", ")}`,
        `Tables written: ${arch.tables.writes.join(", ")}`,
      ].join("\n");
    } else {
      // Semantic retrieval for the rest
      const query = data.question?.trim() || `${mode} overview of the repository ${repoRow.full_name}`;
      const chunks = await semanticSearch(context.userId, repoRow.id, query, 10);
      contextBlock = chunks
        .map((c) => `--- FILE: ${c.path} ---\n${c.content}`)
        .join("\n\n")
        .slice(0, 60_000);
      citations = chunks.slice(0, 6).map((c) => ({ path: c.path }));
    }

    const systemPrompt = `You are a ${prompt.role} analyzing the repository "${repoRow.full_name}".
${prompt.format}

Return STRICT JSON (no markdown fences, no prose outside JSON):
{
  "mode": "${mode}",
  "headline": string,
  "summary": string,
  "mermaid": string | null,
  "sections": [{ "title": string, "bullets": string[] }],
  "findings": [{ "title": string, "file": string|null, "line": number|null, "severity": "high"|"medium"|"low", "detail": string, "suggestion": string }],
  "citations": [{ "path": string }]
}
Never include code fences in mermaid. Keep node labels short.`;

    const userPrompt = [
      `Repository overview:`,
      `- Files: ${repoRow.file_count}`,
      `- Top folders: ${Object.entries(arch.filesByFolder).slice(0, 12).map(([k, v]) => `${k}(${v})`).join(", ")}`,
      `- Routes: ${arch.routes.slice(0, 20).join(", ") || "none detected"}`,
      `- Top files by symbols: ${arch.topFiles.slice(0, 10).map((f) => `${f.path}(${f.symbols})`).join(", ")}`,
      ``,
      data.question ? `User question: ${data.question}` : "",
      ``,
      `--- MODE-SPECIFIC CONTEXT ---`,
      contextBlock,
    ].filter(Boolean).join("\n");

    const result = await callClaudeForMode(systemPrompt, userPrompt);
    if (!result.citations?.length) result.citations = citations;
    return result;
  });
