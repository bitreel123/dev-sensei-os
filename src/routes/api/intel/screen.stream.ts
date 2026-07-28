// NDJSON streaming endpoint for Screen Intelligence.
// Emits progressive "Thinking / Reading screen / Understanding code / Finding
// errors / Generating fixes" stages while the Gemini call runs, then emits the
// `analysis` and `fix` sections as they become available.
import { createFileRoute } from "@tanstack/react-router";
import type { JsonValue } from "@/lib/intel-memory.server";

export const Route = createFileRoute("/api/intel/screen/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyBearer, ndjsonStream } = await import("@/lib/intel-sections.server");

        let userId: string;
        try {
          ({ userId } = await verifyBearer(request));
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "Unauthorized", { status: 401 });
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) return new Response("GEMINI_API_KEY not configured", { status: 500 });

        let body: { imageBase64?: string; note?: string; sessionId?: string; mode?: "fast" | "deep" };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }
        const imageBase64 = (body.imageBase64 ?? "").replace(/^data:image\/[a-zA-Z]+;base64,/, "");
        if (!imageBase64) return new Response("imageBase64 is required", { status: 400 });
        if (imageBase64.length > 10 * 1024 * 1024) {
          return new Response("Screenshot too large", { status: 413 });
        }
        const note = (body.note ?? "").slice(0, 2000);
        const sessionId =
          typeof body.sessionId === "string" && /^[0-9a-f-]{36}$/i.test(body.sessionId)
            ? body.sessionId
            : undefined;
        const mode = body.mode === "deep" ? ("deep" as const) : ("fast" as const);

        const {
          assertCreditsAvailable,
          chargeAndRemember,
          recallIntel,
          memoryPromptSuffix,
          INTEL_COST,
        } = await import("@/lib/intel-memory.server");
        const cost = mode === "deep" ? INTEL_COST.screen_deep : INTEL_COST.screen;
        try {
          await assertCreditsAvailable(userId, cost);
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "Out of credits", { status: 402 });
        }

        return ndjsonStream(async (emit) => {
          const startedAt = Date.now();

          const STAGES = [
            { id: "thinking", label: "Thinking" },
            { id: "reading", label: "Reading screen" },
            { id: "understanding", label: "Understanding code" },
            { id: "finding", label: "Finding errors" },
            { id: "fixing", label: "Generating fixes" },
          ];
          for (const s of STAGES) emit({ type: "stage", id: s.id, label: s.label, status: "running" });

          // Fast staged progress to keep the UI feeling alive during the single Gemini call.
          emit({ type: "stage", id: "thinking", label: "Thinking", status: "done" });
          emit({ type: "stage", id: "reading", label: "Reading screen", status: "done" });

          try {
            const [{ runProgressiveScreenIntel }, memories] = await Promise.all([
              import("@/lib/screen-intel-fast"),
              recallIntel(userId, "screen", 3),
            ]);
            emit({ type: "stage", id: "understanding", label: "Understanding code", status: "done" });

            const noteWithMemory = memoryPromptSuffix(memories)
              ? `${note}${memoryPromptSuffix(memories)}`
              : note;

            let analysisPayload: unknown = null;
            let fixPayload: unknown = null;

            const result = await runProgressiveScreenIntel(
              geminiKey,
              imageBase64,
              noteWithMemory,
              {
                onAnalysis: (analysis) => {
                  analysisPayload = analysis;
                  emit({ type: "section", id: "analysis", label: "Analysis", data: { analysis } });
                  emit({ type: "stage", id: "finding", label: "Finding errors", status: "done" });
                },
                onFix: (fix) => {
                  fixPayload = fix;
                  emit({ type: "section", id: "fix", label: "Fix", data: { fix } });
                  emit({ type: "stage", id: "fixing", label: "Generating fixes", status: "done" });
                },
                onAnalysisError: (message) => {
                  emit({ type: "section-error", id: "analysis", label: "Analysis", message });
                  emit({ type: "stage", id: "finding", label: "Finding errors", status: "error", message });
                },
                onFixError: (message) => {
                  emit({ type: "section-error", id: "fix", label: "Fix", message });
                  emit({ type: "stage", id: "fixing", label: "Generating fixes", status: "error", message });
                },
              },
              mode === "deep" ? "smart" : undefined,
            );

            try {
              await chargeAndRemember(userId, "screen", cost, {
                sessionId,
                title: result.analysis.summary?.slice(0, 200) || "Screen analysis",
                summary: result.fix.plainExplanation?.slice(0, 800) ?? null,
                payload: {
                  analysis: (analysisPayload ?? result.analysis) as unknown as JsonValue,
                  fix: (fixPayload ?? result.fix) as unknown as JsonValue,
                  tier: result.tier,
                },
                tags: result.analysis.category ? [result.analysis.category] : [],
              });
            } catch (e) {
              const message = e instanceof Error ? e.message : String(e);
              console.error("[screen.stream] charge failed:", message);
              emit({ type: "error", message: `Billing failed: ${message}` });
            }

            emit({
              type: "done",
              meta: { durationMs: Date.now() - startedAt, tier: result.tier, modelId: result.modelId },
            });
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            emit({ type: "error", message });
          }
        });
      },
    },
  },
});
