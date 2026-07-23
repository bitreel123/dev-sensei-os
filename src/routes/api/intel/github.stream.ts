import { createFileRoute } from "@tanstack/react-router";
import type { JsonValue } from "@/lib/intel-memory.server";

export const Route = createFileRoute("/api/intel/github/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyBearer, ndjsonStream, callClaudeJson, GITHUB_SECTIONS, gatherGithubEvidence } = await import(
          "@/lib/intel-sections.server"
        );

        let userId: string;
        try {
          ({ userId } = await verifyBearer(request));
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "Unauthorized", { status: 401 });
        }

        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicKey) return new Response("ANTHROPIC_API_KEY not configured", { status: 500 });

        let body: { repo?: string; focus?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }
        const repo = (body.repo ?? "").trim();
        const focus = (body.focus ?? "").slice(0, 1000);
        if (!/^[^/]+\/[^/]+$/.test(repo)) return new Response("repo must be 'owner/name'", { status: 400 });

        const { assertCreditsAvailable, INTEL_COST, chargeAndRemember, recallIntel, memoryPromptSuffix } = await import(
          "@/lib/intel-memory.server"
        );
        try {
          await assertCreditsAvailable(userId, INTEL_COST.repo);
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "Out of credits", { status: 402 });
        }

        return ndjsonStream(async (emit) => {
          const startedAt = Date.now();

          emit({ type: "stage", id: "gather", label: "Gathering repo evidence", status: "running" });

          let evidence;
          let memory = "";
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const [{ data: conn }, memories] = await Promise.all([
              supabaseAdmin.from("github_connections").select("access_token").eq("user_id", userId).maybeSingle(),
              recallIntel(userId, "repo", 3),
            ]);
            const ghToken = (conn as { access_token?: string } | null)?.access_token;
            if (!ghToken) throw new Error("Connect GitHub first to analyze a repo.");
            const [owner, repoName] = repo.split("/");
            evidence = await gatherGithubEvidence(owner, repoName, ghToken, focus);
            memory = memoryPromptSuffix(memories);
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            emit({ type: "stage", id: "gather", label: "Gathering repo evidence", status: "error", message });
            emit({ type: "error", message });
            return;
          }
          emit({ type: "stage", id: "gather", label: "Repo evidence collected", status: "done" });

          // Emit repo id first so UI can render header immediately.
          emit({ type: "section", id: "repoId", label: "Repo", data: { repo } });

          for (const s of GITHUB_SECTIONS) emit({ type: "stage", id: s.id, label: s.label, status: "running" });

          const results: Record<string, unknown> = { repo };
          let successCount = 0;

          for (let i = 0; i < GITHUB_SECTIONS.length; i += 2) {
            await Promise.all(
              GITHUB_SECTIONS.slice(i, i + 2).map(async (section) => {
              const spec = section.build(evidence!, memory);
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
          }

          if (successCount >= 1) {
            try {
              await chargeAndRemember(userId, "repo", INTEL_COST.repo, {
                title: `Repo · ${repo}${focus ? ` — ${focus.slice(0, 70)}` : ""}`,
                summary: typeof results.summary === "string" ? (results.summary as string).slice(0, 800) : null,
                payload: {
                  report: results as unknown as JsonValue,
                  input: { repo, focus },
                  repo,
                  risks: Array.isArray(results.risks) ? (results.risks as Array<{ title?: string }>).slice(0, 5).map((r) => r.title ?? "") : [],
                  regression: (results.regression as { description?: string } | null)?.description ?? null,
                },
                tags: [repo],
              });
            } catch (e) {
              console.warn("[github.stream] charge failed:", e instanceof Error ? e.message : e);
            }
          }

          emit({ type: "done", meta: { durationMs: Date.now() - startedAt, successCount, repo } });
        });
      },
    },
  },
});
