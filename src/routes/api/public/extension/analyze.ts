// Public endpoint used by the Jeradin Chrome extension.
// Authenticates via Bearer <jex_...> personal access token,
// then runs the fast screen intelligence pipeline and bills the caller.

import { createFileRoute } from "@tanstack/react-router";
import { resolveExtensionCaller } from "@/lib/extension-auth.server";
import { runFastScreenIntel } from "@/lib/screen-intel-fast";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export const Route = createFileRoute("/api/public/extension/analyze")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const caller = await resolveExtensionCaller(request.headers.get("authorization"));
        if (!caller) return json({ error: "Not signed in. Open jeradin.com and sign in." }, 401);

        let payload: { imageBase64?: string; note?: string };
        try {
          payload = (await request.json()) as { imageBase64?: string; note?: string };
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        if (!payload.imageBase64 || typeof payload.imageBase64 !== "string") {
          return json({ error: "imageBase64 is required" }, 400);
        }
        if (payload.imageBase64.length > 8 * 1024 * 1024) {
          return json({ error: "Screenshot too large (max ~6MB decoded)" }, 413);
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) return json({ error: "GEMINI_API_KEY not configured on server" }, 500);

        const { assertCreditsAvailable, chargeAndRemember, INTEL_COST } = await import(
          "@/lib/intel-memory.server"
        );
        const cost = INTEL_COST.screen;
        try {
          await assertCreditsAvailable(caller.userId, cost);
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : "Out of credits" }, 402);
        }

        const note = (payload.note ?? "").slice(0, 2000);
        try {
          const result = await runFastScreenIntel(geminiKey, payload.imageBase64, note);
          try {
            await chargeAndRemember(caller.userId, "screen", cost, {
              title: result.analysis.summary?.slice(0, 200) || "Screen analysis (extension)",
              summary: result.fix.plainExplanation?.slice(0, 800) ?? null,
              payload: {
                hypothesis: result.analysis.hypothesis,
                category: result.analysis.category,
                severity: result.analysis.severity,
                source: "extension",
              },
              tags: result.analysis.category ? [result.analysis.category, "extension"] : ["extension"],
            });
          } catch (billErr) {
            console.error("[extension/analyze] billing failed:", billErr);
          }
          return json({ ok: true, ...result });
        } catch (e) {
          return json({ error: (e as Error).message || "Analysis failed" }, 500);
        }
      },
    },
  },
});
