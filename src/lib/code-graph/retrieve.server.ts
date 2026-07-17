// Graph queries used by the mode router. All read-only, RLS-scoped.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { embedTexts, toPgVector } from "./embed.server";

export type RetrievedChunk = { path: string; content: string; similarity: number };

export async function semanticSearch(
  userId: string,
  repoId: string,
  query: string,
  limit = 10,
): Promise<RetrievedChunk[]> {
  const [emb] = await embedTexts([query]);
  const { data, error } = await supabaseAdmin.rpc("match_code_chunks", {
    p_repo_id: repoId,
    p_query: toPgVector(emb),
    p_limit: limit,
  });
  if (error) {
    // RPC uses SECURITY INVOKER — with admin client, user_id filter is not applied via RLS.
    // We enforce it explicitly here:
    const { data: fallback } = await supabaseAdmin
      .from("code_chunks")
      .select("content, code_files!inner(path)")
      .eq("repo_id", repoId)
      .eq("user_id", userId)
      .limit(limit);
    return (fallback ?? []).map((r) => {
      const row = r as { content: string; code_files: { path: string } };
      return { path: row.code_files.path, content: row.content, similarity: 0 };
    });
  }
  // Ownership check
  const { data: repoRow } = await supabaseAdmin
    .from("code_repos").select("user_id").eq("id", repoId).maybeSingle();
  if ((repoRow as { user_id: string } | null)?.user_id !== userId) return [];
  return (data as Array<{ path: string; content: string; similarity: number }>) ?? [];
}

export async function loadArchitectureSummary(userId: string, repoId: string): Promise<{
  filesByFolder: Record<string, number>;
  packageDeps: string[];
  routes: string[];
  tables: { reads: string[]; writes: string[] };
  topFiles: Array<{ path: string; symbols: number }>;
}> {
  const { data: files } = await supabaseAdmin
    .from("code_files").select("path")
    .eq("repo_id", repoId).eq("user_id", userId).limit(1000);
  const filesByFolder: Record<string, number> = {};
  for (const f of (files ?? []) as Array<{ path: string }>) {
    const folder = f.path.split("/").slice(0, 2).join("/");
    filesByFolder[folder] = (filesByFolder[folder] ?? 0) + 1;
  }

  const { data: edges } = await supabaseAdmin
    .from("code_edges")
    .select("kind, dst_external")
    .eq("repo_id", repoId).eq("user_id", userId).limit(2000);

  const packageDeps = new Set<string>();
  const routes = new Set<string>();
  const reads = new Set<string>();
  const writes = new Set<string>();
  for (const e of (edges ?? []) as Array<{ kind: string; dst_external: string | null }>) {
    if (!e.dst_external) continue;
    if (e.kind === "depends_on_package") packageDeps.add(e.dst_external);
    else if (e.kind === "defines_route") routes.add(e.dst_external);
    else if (e.kind === "reads_table") reads.add(e.dst_external);
    else if (e.kind === "writes_table") writes.add(e.dst_external);
  }

  const { data: sym } = await supabaseAdmin
    .from("code_symbols")
    .select("file_id, code_files!inner(path)")
    .eq("repo_id", repoId).eq("user_id", userId).limit(2000);
  const symCount: Record<string, { path: string; n: number }> = {};
  for (const s of (sym ?? []) as Array<{ file_id: string; code_files: { path: string } }>) {
    const key = s.file_id;
    symCount[key] = { path: s.code_files.path, n: (symCount[key]?.n ?? 0) + 1 };
  }
  const topFiles = Object.values(symCount).sort((a, b) => b.n - a.n).slice(0, 15)
    .map((x) => ({ path: x.path, symbols: x.n }));

  return {
    filesByFolder,
    packageDeps: Array.from(packageDeps).slice(0, 100),
    routes: Array.from(routes).slice(0, 50),
    tables: { reads: Array.from(reads), writes: Array.from(writes) },
    topFiles,
  };
}

export async function impactOf(
  userId: string,
  repoId: string,
  path: string,
): Promise<{ direct: string[]; transitive: string[] }> {
  const { data: fileRow } = await supabaseAdmin
    .from("code_files").select("id").eq("repo_id", repoId).eq("user_id", userId).eq("path", path).maybeSingle();
  const fileId = (fileRow as { id: string } | null)?.id;
  if (!fileId) return { direct: [], transitive: [] };

  const seen = new Set<string>([fileId]);
  const direct: string[] = [];
  let frontier: string[] = [fileId];

  for (let depth = 0; depth < 3 && frontier.length; depth++) {
    const { data } = await supabaseAdmin
      .from("code_edges")
      .select("src_file_id, code_files!code_edges_src_file_id_fkey(path)")
      .eq("repo_id", repoId).eq("user_id", userId)
      .eq("kind", "imports")
      .in("dst_file_id", frontier);
    const next: string[] = [];
    for (const r of (data ?? []) as Array<{ src_file_id: string; code_files: { path: string } }>) {
      if (seen.has(r.src_file_id)) continue;
      seen.add(r.src_file_id);
      next.push(r.src_file_id);
      if (depth === 0) direct.push(r.code_files.path);
    }
    frontier = next;
  }

  // Resolve remaining ids to paths for transitive list
  const transitiveIds = Array.from(seen).filter((id) => id !== fileId);
  const { data: pathRows } = await supabaseAdmin
    .from("code_files").select("id, path").in("id", transitiveIds);
  const transitive = ((pathRows ?? []) as Array<{ id: string; path: string }>)
    .map((r) => r.path)
    .filter((p) => !direct.includes(p));

  return { direct, transitive };
}
