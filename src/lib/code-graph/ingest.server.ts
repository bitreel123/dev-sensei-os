// Core ingestion — full scan and incremental update.
// Server-only. Called from server functions and the webhook route.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { chunkContent, parseFile, type ParsedFile } from "./parse.server";
import { embedTexts, toPgVector } from "./embed.server";
import { diffCommits, fetchFile, getRepoMeta, listRepoTree } from "./github.server";

async function getGithubToken(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("github_connections")
    .select("access_token")
    .eq("user_id", userId)
    .maybeSingle();
  const token = (data as { access_token?: string } | null)?.access_token;
  if (!token) throw new Error("GitHub not connected");
  return token;
}

async function upsertRepo(
  userId: string,
  fullName: string,
  defaultBranch: string,
): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("code_repos")
    .select("id")
    .eq("user_id", userId)
    .eq("full_name", fullName)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data, error } = await supabaseAdmin
    .from("code_repos")
    .insert({ user_id: userId, full_name: fullName, default_branch: defaultBranch })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

async function updateScan(scanId: string, patch: Partial<{
  status: string; phase: string | null; files_total: number; files_done: number;
  error: string | null; finished_at: string | null; repo_id: string;
}>) {
  await supabaseAdmin.from("code_scans").update(patch).eq("id", scanId);
}

// Ingest one file's parsed content + embeddings into the graph.
async function ingestFile(
  userId: string,
  repoId: string,
  parsed: ParsedFile,
  fileEmbedding: number[],
  chunkEmbeddings: Array<{ content: string; embedding: number[] }>,
): Promise<void> {
  // Upsert file
  const { data: fileRow, error: fileErr } = await supabaseAdmin
    .from("code_files")
    .upsert(
      {
        user_id: userId,
        repo_id: repoId,
        path: parsed.path,
        language: parsed.language,
        size: parsed.size,
        summary: parsed.symbols.slice(0, 8).map((s) => `${s.kind} ${s.name}`).join(", "),
        embedding: toPgVector(fileEmbedding),
      },
      { onConflict: "repo_id,path" },
    )
    .select("id")
    .single();
  if (fileErr) throw new Error(fileErr.message);
  const fileId = (fileRow as { id: string }).id;

  // Wipe symbols/edges/chunks tied to this file, then re-insert (idempotent).
  await supabaseAdmin.from("code_symbols").delete().eq("file_id", fileId);
  await supabaseAdmin.from("code_edges").delete().eq("src_file_id", fileId);
  await supabaseAdmin.from("code_chunks").delete().eq("file_id", fileId);

  if (parsed.symbols.length) {
    await supabaseAdmin.from("code_symbols").insert(
      parsed.symbols.map((s) => ({
        user_id: userId,
        repo_id: repoId,
        file_id: fileId,
        name: s.name,
        kind: s.kind,
        start_line: s.start_line ?? null,
        end_line: s.end_line ?? null,
        signature: s.signature ?? null,
        docstring: s.docstring ?? null,
      })),
    );
  }

  if (parsed.edges.length) {
    await supabaseAdmin.from("code_edges").insert(
      parsed.edges.map((e) => ({
        user_id: userId,
        repo_id: repoId,
        src_file_id: fileId,
        dst_external: e.dst_external,
        kind: e.kind,
      })),
    );
  }

  if (chunkEmbeddings.length) {
    await supabaseAdmin.from("code_chunks").insert(
      chunkEmbeddings.map((c, i) => ({
        user_id: userId,
        repo_id: repoId,
        file_id: fileId,
        chunk_index: i,
        content: c.content,
        embedding: toPgVector(c.embedding),
      })),
    );
  }
}

// Resolve relative imports/edges to file_ids in a second pass.
async function linkEdges(repoId: string): Promise<void> {
  // Load file id map (path → id)
  const { data: files } = await supabaseAdmin
    .from("code_files")
    .select("id, path")
    .eq("repo_id", repoId);
  const byPath = new Map<string, string>();
  for (const f of (files ?? []) as Array<{ id: string; path: string }>) byPath.set(f.path, f.id);

  const resolve = (fromPath: string, spec: string): string | null => {
    if (!spec) return null;
    let target = spec;
    if (spec.startsWith("@/")) target = `src/${spec.slice(2)}`;
    if (spec.startsWith(".")) {
      const parts = fromPath.split("/").slice(0, -1);
      for (const seg of spec.split("/")) {
        if (seg === "..") parts.pop();
        else if (seg !== ".") parts.push(seg);
      }
      target = parts.join("/");
    }
    // Try common extensions
    for (const ext of ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js"]) {
      const cand = target + ext;
      const id = byPath.get(cand);
      if (id) return id;
    }
    return null;
  };

  // Fetch unresolved import edges
  const { data: edges } = await supabaseAdmin
    .from("code_edges")
    .select("id, src_file_id, dst_external")
    .eq("repo_id", repoId)
    .eq("kind", "imports")
    .is("dst_file_id", null);

  if (!edges?.length) return;

  const srcById = new Map<string, string>();
  for (const f of (files ?? []) as Array<{ id: string; path: string }>) srcById.set(f.id, f.path);

  for (const e of edges as Array<{ id: string; src_file_id: string; dst_external: string }>) {
    const fromPath = srcById.get(e.src_file_id) ?? "";
    const dstId = resolve(fromPath, e.dst_external);
    if (dstId) {
      await supabaseAdmin.from("code_edges").update({ dst_file_id: dstId }).eq("id", e.id);
    }
  }
}

// -------------------- Full scan --------------------
export async function runFullScan(
  userId: string,
  fullName: string,
  scanId: string,
): Promise<void> {
  try {
    const [owner, repo] = fullName.split("/");
    const token = await getGithubToken(userId);

    await updateScan(scanId, { status: "running", phase: "listing tree" });
    const meta = await getRepoMeta(token, owner, repo);
    const repoId = await upsertRepo(userId, fullName, meta.default_branch);
    await supabaseAdmin
      .from("code_scans")
      .update({ repo_id: repoId })
      .eq("id", scanId);

    const tree = await listRepoTree(token, owner, repo, meta.latest_sha);
    await updateScan(scanId, { files_total: tree.length, phase: "downloading files" });

    // Wipe stale rows (full re-scan is authoritative).
    await supabaseAdmin.from("code_chunks").delete().eq("repo_id", repoId);
    await supabaseAdmin.from("code_edges").delete().eq("repo_id", repoId);
    await supabaseAdmin.from("code_symbols").delete().eq("repo_id", repoId);
    await supabaseAdmin.from("code_files").delete().eq("repo_id", repoId);

    let done = 0;
    const BATCH = 8;
    for (let i = 0; i < tree.length; i += BATCH) {
      const slice = tree.slice(i, i + BATCH);

      // Download + parse concurrently
      const parsed: ParsedFile[] = [];
      const downloads = await Promise.all(
        slice.map((n) => fetchFile(token, owner, repo, meta.default_branch, n.path)),
      );
      for (let k = 0; k < slice.length; k++) {
        const content = downloads[k];
        if (!content) continue;
        parsed.push(parseFile(slice[k].path, content));
      }

      if (parsed.length === 0) {
        done += slice.length;
        await updateScan(scanId, { files_done: done });
        continue;
      }

      // Build embed inputs: 1 summary per file + N chunks per file
      const fileSummaries = parsed.map((p) => {
        const preview = p.content.slice(0, 500);
        const syms = p.symbols.slice(0, 15).map((s) => `${s.kind} ${s.name}`).join(", ");
        return `File: ${p.path}\nLanguage: ${p.language}\nSymbols: ${syms}\n\n${preview}`;
      });
      const chunkArrays = parsed.map((p) => chunkContent(p.content));
      const chunkFlat = chunkArrays.flat();
      const allEmbeddings = await embedTexts([...fileSummaries, ...chunkFlat]);
      const fileEmbeds = allEmbeddings.slice(0, fileSummaries.length);
      const chunkEmbeds = allEmbeddings.slice(fileSummaries.length);

      // Persist per file
      let cursor = 0;
      for (let idx = 0; idx < parsed.length; idx++) {
        const p = parsed[idx];
        const nChunks = chunkArrays[idx].length;
        const chunks = chunkArrays[idx].map((content, j) => ({
          content,
          embedding: chunkEmbeds[cursor + j],
        }));
        cursor += nChunks;
        try {
          await ingestFile(userId, repoId, p, fileEmbeds[idx], chunks);
        } catch (e) {
          console.warn(`ingest ${p.path} failed:`, (e as Error).message);
        }
      }

      done += slice.length;
      await updateScan(scanId, { files_done: done });
    }

    await updateScan(scanId, { phase: "linking edges" });
    await linkEdges(repoId);

    // Aggregate counts
    const [{ count: fc }, { count: sc }, { count: ec }] = await Promise.all([
      supabaseAdmin.from("code_files").select("*", { count: "exact", head: true }).eq("repo_id", repoId),
      supabaseAdmin.from("code_symbols").select("*", { count: "exact", head: true }).eq("repo_id", repoId),
      supabaseAdmin.from("code_edges").select("*", { count: "exact", head: true }).eq("repo_id", repoId),
    ]);

    await supabaseAdmin.from("code_repos").update({
      last_scanned_sha: meta.latest_sha,
      last_scanned_at: new Date().toISOString(),
      file_count: fc ?? 0,
      symbol_count: sc ?? 0,
      edge_count: ec ?? 0,
    }).eq("id", repoId);

    await supabaseAdmin.from("code_snapshots").insert({
      user_id: userId,
      repo_id: repoId,
      sha: meta.latest_sha,
      file_count: fc ?? 0,
      symbol_count: sc ?? 0,
      edge_count: ec ?? 0,
    });

    await updateScan(scanId, {
      status: "done",
      phase: "complete",
      finished_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("runFullScan failed:", e);
    await updateScan(scanId, {
      status: "error",
      error: (e as Error).message.slice(0, 500),
      finished_at: new Date().toISOString(),
    });
  }
}

// -------------------- Incremental update --------------------
export async function runIncrementalSync(
  userId: string,
  repoId: string,
): Promise<{ updated: number; removed: number; skipped: boolean }> {
  const { data: repoRow } = await supabaseAdmin
    .from("code_repos")
    .select("full_name, default_branch, last_scanned_sha")
    .eq("id", repoId)
    .maybeSingle();
  const row = repoRow as { full_name: string; default_branch: string; last_scanned_sha: string | null } | null;
  if (!row) throw new Error("Repo not found");
  const token = await getGithubToken(userId);
  const [owner, name] = row.full_name.split("/");
  const meta = await getRepoMeta(token, owner, name);

  if (!row.last_scanned_sha || row.last_scanned_sha === meta.latest_sha) {
    return { updated: 0, removed: 0, skipped: true };
  }

  const diff = await diffCommits(token, owner, name, row.last_scanned_sha, meta.latest_sha);
  const changed = [...diff.added, ...diff.modified];

  // Remove deleted files
  if (diff.removed.length) {
    await supabaseAdmin.from("code_files")
      .delete()
      .eq("repo_id", repoId)
      .in("path", diff.removed);
  }

  // Re-ingest changed files
  if (changed.length) {
    const contents = await Promise.all(
      changed.map((p) => fetchFile(token, owner, name, meta.default_branch, p)),
    );
    const parsed: ParsedFile[] = [];
    for (let i = 0; i < changed.length; i++) {
      const c = contents[i];
      if (c) parsed.push(parseFile(changed[i], c));
    }
    if (parsed.length) {
      const summaries = parsed.map((p) => `File: ${p.path}\n${p.content.slice(0, 500)}`);
      const chunkArrays = parsed.map((p) => chunkContent(p.content));
      const allEmbeds = await embedTexts([...summaries, ...chunkArrays.flat()]);
      const fileE = allEmbeds.slice(0, summaries.length);
      const chunkE = allEmbeds.slice(summaries.length);
      let cursor = 0;
      for (let i = 0; i < parsed.length; i++) {
        const nChunks = chunkArrays[i].length;
        const chunks = chunkArrays[i].map((content, j) => ({
          content,
          embedding: chunkE[cursor + j],
        }));
        cursor += nChunks;
        await ingestFile(userId, repoId, parsed[i], fileE[i], chunks);
      }
      await linkEdges(repoId);
    }
  }

  await supabaseAdmin.from("code_repos").update({
    last_scanned_sha: meta.latest_sha,
    last_scanned_at: new Date().toISOString(),
  }).eq("id", repoId);

  return { updated: changed.length, removed: diff.removed.length, skipped: false };
}
