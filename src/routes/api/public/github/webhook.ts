// GitHub push webhook — incrementally re-syncs a repo when someone pushes.
// Users register the URL manually on their GitHub repo (Settings → Webhooks)
// with content type application/json and their per-repo secret.
//
// URL: https://jeradin.com/api/public/github/webhook?repo_id=<uuid>

import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/github/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const repoId = url.searchParams.get("repo_id");
        if (!repoId) return json({ error: "missing repo_id" }, 400);

        const raw = await request.text();
        const sig = request.headers.get("x-hub-signature-256") ?? "";
        const event = request.headers.get("x-github-event") ?? "";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: repo } = await supabaseAdmin
          .from("code_repos")
          .select("id, user_id, webhook_secret")
          .eq("id", repoId)
          .maybeSingle();
        const row = repo as { id: string; user_id: string; webhook_secret: string | null } | null;
        if (!row) return json({ error: "unknown repo" }, 404);

        if (row.webhook_secret) {
          const expected = "sha256=" + createHmac("sha256", row.webhook_secret).update(raw).digest("hex");
          const a = Buffer.from(sig);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return json({ error: "bad signature" }, 401);
          }
        }

        if (event === "ping") return json({ ok: true, pong: true });
        if (event !== "push") return json({ ok: true, ignored: event });

        // Run incremental sync in the background; return 202 immediately.
        const { runIncrementalSync } = await import("@/lib/code-graph/ingest.server");
        void runIncrementalSync(row.user_id, row.id).catch((e) => {
          console.error("webhook sync failed:", e);
        });

        return json({ ok: true, queued: true }, 202);
      },
    },
  },
});
