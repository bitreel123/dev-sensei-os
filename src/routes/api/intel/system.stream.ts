import { createFileRoute } from "@tanstack/react-router";
import type { JsonValue } from "@/lib/intel-memory.server";

const GITHUB_API = "https://api.github.com";
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage", ".vercel", ".cache"]);
const CODE_EXT = /\.(ts|tsx|js|jsx|py|go|rs|java|kt|rb|php|css|scss|json|toml|yml|yaml|md|sql|sh)$/i;
const MAX_FILES = 18;
const MAX_FILE_BYTES = 12_000;
const GITHUB_TIMEOUT_MS = 6_000;

type FileInput = { path: string; content: string };

async function gh<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "jeradin-app",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

async function fetchRepoFiles(token: string, owner: string, repo: string): Promise<FileInput[]> {
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
      const priority = (p: string) =>
        /(^|\/)(package\.json|README\.md|vite\.config\.[jt]s|src\/routes\/|src\/lib\/|src\/components\/)/i.test(p) ? 0 : 1;
      return priority(a.path) - priority(b.path) || a.path.localeCompare(b.path);
    })
    .slice(0, MAX_FILES);

  const results = await Promise.all(
    candidates.map(async (n) => {
      try {
        const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${meta.default_branch}/${n.path}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
        });
        if (!raw.ok) return null;
        return { path: n.path, content: (await raw.text()).slice(0, MAX_FILE_BYTES) };
      } catch {
        return null;
      }
    }),
  );
  return results.filter((f): f is FileInput => f !== null);
}

export const Route = createFileRoute("/api/intel/system/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyBearer, ndjsonStream, callClaudeJson, SYSTEM_SECTIONS } = await import("@/lib/intel-sections.server");

        let userId: string;
        try {
          ({ userId } = await verifyBearer(request));
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "Unauthorized", { status: 401 });
        }

        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicKey) return new Response("ANTHROPIC_API_KEY not configured", { status: 500 });

        type Body = { source?: "github" | "upload"; repo?: string; files?: FileInput[]; projectHint?: string; sessionId?: string };
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }
        const source = body.source === "upload" ? "upload" : "github";
        const hint = (body.projectHint ?? "").slice(0, 2000);
        const sessionId = typeof body.sessionId === "string" && /^[0-9a-f-]{36}$/i.test(body.sessionId) ? body.sessionId : undefined;
        if (source === "github" && (!body.repo || !/^[^/]+\/[^/]+$/.test(body.repo))) {
          return new Response("repo must be 'owner/name'", { status: 400 });
        }
        if (source === "upload" && (!Array.isArray(body.files) || body.files.length === 0)) {
          return new Response("files required for upload source", { status: 400 });
        }

        const { assertCreditsAvailable, INTEL_COST, chargeAndRemember } = await import("@/lib/intel-memory.server");
        try {
          await assertCreditsAvailable(userId, INTEL_COST.system);
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "Out of credits", { status: 402 });
        }

        return ndjsonStream(async (emit) => {
          const startedAt = Date.now();

          // Stage 1: fetch files
          emit({ type: "stage", id: "fetch", label: source === "github" ? "Reading repository files" : "Reading uploaded files", status: "running" });
          let files: FileInput[];
          try {
            if (source === "github") {
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
              const { data: conn } = await supabaseAdmin
                .from("github_connections")
                .select("access_token")
                .eq("user_id", userId)
                .maybeSingle();
              const ghToken = (conn as { access_token?: string } | null)?.access_token;
              if (!ghToken) throw new Error("Connect GitHub first to analyze a repo.");
              const [owner, repoName] = body.repo!.split("/");
              files = await fetchRepoFiles(ghToken, owner, repoName);
              if (files.length === 0) throw new Error("No analyzable files found in that repo.");
            } else {
              files = body.files!.slice(0, MAX_FILES).map((f) => ({ path: f.path, content: (f.content ?? "").slice(0, MAX_FILE_BYTES) }));
            }
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            emit({ type: "stage", id: "fetch", label: "Reading files", status: "error", message });
            emit({ type: "error", message });
            return;
          }
          emit({ type: "stage", id: "fetch", label: `Read ${files.length} files`, status: "done" });
          emit({ type: "section", id: "files", label: "Files analyzed", data: { filesAnalyzed: files.length } });

          const filesBlock = files.map((f) => `--- FILE: ${f.path} ---\n${f.content}`).join("\n\n").slice(0, 90_000);

          // Announce sections up-front so UI can paint checklist.
          for (const s of SYSTEM_SECTIONS) emit({ type: "stage", id: s.id, label: s.label, status: "running" });

          const results: Record<string, unknown> = { stack: [], modules: [], suggestions: [], references: [] };
          let successCount = 0;

          await Promise.all(
            SYSTEM_SECTIONS.map(async (section) => {
              const spec = section.build({ filesBlock, hint });
              try {
                const parsed = await callClaudeJson<Record<string, unknown>>({
                  apiKey: anthropicKey,
                  system: spec.system,
                  user: spec.user,
                  maxTokens: spec.maxTokens,
                  timeoutMs: 40_000,
                });
                const extracted = section.extract(parsed);
                Object.assign(results, extracted);
                successCount += 1;
                emit({ type: "section", id: section.id, label: section.label, data: extracted });
                emit({ type: "stage", id: section.id, label: section.label, status: "done" });
              } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                emit({ type: "section-error", id: section.id, label: section.label, message });
                emit({ type: "stage", id: section.id, label: section.label, status: "error", message });
              }
            }),
          );

          if (successCount >= 1) {
            try {
              await chargeAndRemember(userId, "system", INTEL_COST.system, {
                title: `System · ${body.repo ?? (results.projectSummary as string | undefined)?.slice(0, 160) ?? "uploaded codebase"}`,
                summary: (results.laymanOverview as string | undefined)?.slice(0, 800) ?? null,
                payload: {
                  report: results as unknown as JsonValue,
                  filesAnalyzed: files.length,
                  input: { source, repo: body.repo ?? null, projectHint: hint },
                  stack: Array.isArray(results.stack) ? (results.stack as string[]).slice(0, 8) : [],
                  moduleCount: Array.isArray(results.modules) ? results.modules.length : 0,
                  source,
                  repo: body.repo ?? null,
                },
                tags: Array.isArray(results.stack) ? (results.stack as string[]).slice(0, 6) : [],
              });
            } catch (e) {
              console.warn("[system.stream] charge failed:", e instanceof Error ? e.message : e);
            }
          }

          emit({ type: "done", meta: { durationMs: Date.now() - startedAt, successCount, filesAnalyzed: files.length } });
        });
      },
    },
  },
});
