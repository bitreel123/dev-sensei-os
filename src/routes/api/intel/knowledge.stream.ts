import { createFileRoute } from "@tanstack/react-router";
import type { JsonValue } from "@/lib/intel-memory.server";

const GITHUB_API = "https://api.github.com";
const SEARCH_TIMEOUT_MS = 3_500;

export const Route = createFileRoute("/api/intel/knowledge/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyBearer, ndjsonStream, callClaudeJson, KNOWLEDGE_SECTIONS } = await import(
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

        let body: { question?: string; projectContext?: string; only?: string[]; sessionId?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }
        const question = (body.question ?? "").trim();
        const projectContext = (body.projectContext ?? "").slice(0, 60_000);
        const sessionId = typeof body.sessionId === "string" && /^[0-9a-f-]{36}$/i.test(body.sessionId) ? body.sessionId : undefined;
        if (question.length < 5) return new Response("Question must be at least 5 characters", { status: 400 });

        const { assertCreditsAvailable, INTEL_COST, chargeAndRemember, recallIntel, memoryPromptSuffix } = await import(
          "@/lib/intel-memory.server"
        );
        try {
          await assertCreditsAvailable(userId, INTEL_COST.knowledge);
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "Out of credits", { status: 402 });
        }

        const only = Array.isArray(body.only) && body.only.length > 0 ? new Set(body.only) : null;
        const sectionsToRun = only ? KNOWLEDGE_SECTIONS.filter((s) => only.has(s.id)) : KNOWLEDGE_SECTIONS;

        return ndjsonStream(async (emit) => {
          const startedAt = Date.now();
          emit({ type: "stage", id: "start", label: "Understanding your idea", status: "running" });

          // Parallel context: memory + optional live evidence for market/resources sections.
          const needsLiveEvidence = /\b(current|latest|market|trend|competitor|startup|idea|package|library|model|dataset)\b/i.test(question);

          const [memories, evidenceStr] = await Promise.all([
            recallIntel(userId, "knowledge", 5),
            (async () => {
              if (!needsLiveEvidence) return "";
              const q = question.slice(0, 180);
              const controller = { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) };
              const [repos, npm] = await Promise.allSettled([
                fetch(`${GITHUB_API}/search/repositories?q=${encodeURIComponent(q)}&per_page=3&sort=stars`, {
                  ...controller,
                  headers: { Accept: "application/vnd.github+json", "User-Agent": "jeradin-app" },
                }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))) as Promise<{
                  items: Array<{ full_name: string; html_url: string; description: string | null; stargazers_count: number }>;
                }>,
                fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}&size=3`, controller).then((r) =>
                  r.ok ? (r.json() as Promise<{ objects: Array<{ package: { name: string; description?: string; links: { npm: string } } }> }>) : Promise.reject(new Error(String(r.status))),
                ),
              ]);
              const sources: unknown[] = [];
              if (repos.status === "fulfilled")
                sources.push(
                  ...repos.value.items.map((i) => ({
                    kind: "repo",
                    title: i.full_name,
                    url: i.html_url,
                    description: i.description,
                    stars: i.stargazers_count,
                  })),
                );
              if (npm.status === "fulfilled")
                sources.push(
                  ...npm.value.objects.map((i) => ({
                    kind: "package",
                    title: i.package.name,
                    url: i.package.links.npm,
                    description: i.package.description,
                  })),
                );
              return sources.length ? `\n\nLive evidence (use only when relevant):\n${JSON.stringify(sources).slice(0, 5000)}` : "";
            })(),
          ]);
          const memory = memoryPromptSuffix(memories);
          const ctx = { question, projectContext, memory, evidence: evidenceStr };

          emit({ type: "stage", id: "start", label: "Understanding your idea", status: "done" });

          // Announce all pending sections up-front so the UI can render checklist immediately.
          for (const s of sectionsToRun) emit({ type: "stage", id: s.id, label: s.label, status: "running" });

          const results: Record<string, unknown> = {};
          let successCount = 0;

          // Fire every section in parallel; emit each as it resolves.
          await Promise.all(
            sectionsToRun.map(async (section) => {
              const spec = section.build(ctx);
              try {
                const parsed = await callClaudeJson<Record<string, unknown>>({
                  apiKey: anthropicKey,
                  system: spec.system,
                  user: spec.user,
                  maxTokens: spec.maxTokens,
                  timeoutMs: 35_000,
                });
                // Merge whichever known key(s) the section returned.
                let data: unknown = parsed;
                if (section.id === "intro") {
                  results.laymanSummary = parsed.laymanSummary ?? "";
                  results.recommendedStack = parsed.recommendedStack ?? [];
                  results.glossary = parsed.glossary ?? [];
                  results.nextSteps = parsed.nextSteps ?? [];
                  data = {
                    laymanSummary: results.laymanSummary,
                    recommendedStack: results.recommendedStack,
                    glossary: results.glossary,
                    nextSteps: results.nextSteps,
                  };
                } else {
                  const value = parsed[section.key];
                  if (value === undefined) throw new Error("Section missing expected field");
                  results[section.key] = value;
                  data = { [section.key]: value };
                }
                successCount += 1;
                emit({ type: "section", id: section.id, label: section.label, data });
                emit({ type: "stage", id: section.id, label: section.label, status: "done" });
              } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                emit({ type: "section-error", id: section.id, label: section.label, message });
                emit({ type: "stage", id: section.id, label: section.label, status: "error", message });
              }
            }),
          );

          // Only charge when we actually delivered a useful answer.
          if (successCount >= Math.max(1, Math.floor(sectionsToRun.length / 3)) && !only) {
            try {
              await chargeAndRemember(userId, "knowledge", INTEL_COST.knowledge, {
                sessionId,
                title: `Knowledge · ${question.slice(0, 180)}`,
                summary: typeof results.laymanSummary === "string" ? results.laymanSummary.slice(0, 800) : null,
                payload: {
                  report: results as unknown as JsonValue,
                  input: { question, projectContext },
                  stack: Array.isArray(results.recommendedStack) ? (results.recommendedStack as string[]).slice(0, 8) : [],
                  competitors: Array.isArray(results.competitors)
                    ? (results.competitors as Array<{ name?: string }>).slice(0, 6).map((c) => c.name ?? "")
                    : [],
                },
                tags: Array.isArray(results.recommendedStack) ? (results.recommendedStack as string[]).slice(0, 5) : [],
              });
            } catch (e) {
              const message = e instanceof Error ? e.message : String(e);
              console.error("[knowledge.stream] charge failed:", message);
              emit({ type: "error", message: `Billing failed: ${message}` });
            }
          }

          emit({
            type: "done",
            meta: {
              durationMs: Date.now() - startedAt,
              successCount,
              totalSections: sectionsToRun.length,
              usedLiveEvidence: needsLiveEvidence,
            },
          });
        });
      },
    },
  },
});
