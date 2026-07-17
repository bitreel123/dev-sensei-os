// Verifies an extension bearer token and returns the associated user email.
// Used by the extension popup to confirm it's paired.

import { createFileRoute } from "@tanstack/react-router";
import { resolveExtensionTokenUserId } from "@/lib/extension-tokens.functions";

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
        const auth = request.headers.get("authorization") ?? "";
        const m = auth.match(/^Bearer\s+(jex_[A-Za-z0-9_-]+)$/);
        if (!m) return json({ error: "Missing token" }, 401);

        const resolved = await resolveExtensionTokenUserId(m[1]);
        if (!resolved) return json({ error: "Token is revoked or unknown" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.auth.admin.getUserById(resolved.userId);
        return json({
          ok: true,
          email: data.user?.email ?? null,
          userId: resolved.userId,
        });
      },
    },
  },
});
