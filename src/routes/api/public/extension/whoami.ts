// Verifies the caller's session (Supabase access token OR legacy jex_ token)
// and returns the associated user email. Used by the extension popup.

import { createFileRoute } from "@tanstack/react-router";
import { resolveExtensionCaller } from "@/lib/extension-auth.server";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export const Route = createFileRoute("/api/public/extension/whoami")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const caller = await resolveExtensionCaller(request.headers.get("authorization"));
        if (!caller) return json({ error: "Not signed in" }, 401);
        return json({ ok: true, email: caller.email, userId: caller.userId });
      },
    },
  },
});
