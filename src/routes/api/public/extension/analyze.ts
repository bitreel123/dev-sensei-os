// Public endpoint used by the Jeradin Chrome extension.
// Authenticates via Bearer <jex_...> personal access token,
// then runs the fast screen intelligence pipeline.

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
        // Cap payload at ~8MB of base64 to protect the model call.
        if (payload.imageBase64.length > 8 * 1024 * 1024) {
          return json({ error: "Screenshot too large (max ~6MB decoded)" }, 413);
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) return json({ error: "GEMINI_API_KEY not configured on server" }, 500);

        try {
          const result = await runFastScreenIntel(
            geminiKey,
            payload.imageBase64,
            (payload.note ?? "").slice(0, 2000),
          );
          return json({ ok: true, ...result });
        } catch (e) {
          return json({ error: (e as Error).message || "Analysis failed" }, 500);
        }
      },
    },
  },
});
