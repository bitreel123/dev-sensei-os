import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "crypto";

// Initiates the GitHub OAuth flow.
// Query params:
//   mode=login   -> sign in / sign up via GitHub, then redirect to /chat
//   mode=connect -> link GitHub to the current signed-in user, then redirect to /chat
// Sets a short-lived state cookie for CSRF protection.
export const Route = createFileRoute("/api/public/github/authorize")({
  server: {
    handlers: {
      GET: async ({ request }) => createAuthorization(request, null),
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization") ?? "";
        const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
        if (!token) return new Response("Please sign in first.", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !data.user) return new Response("Your session expired. Please sign in again.", { status: 401 });

        return createAuthorization(request, data.user.id, true);
      },
    },
  },
});

async function createAuthorization(request: Request, userId: string | null, json = false) {
        const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
        if (!clientId) {
          return new Response("GitHub OAuth is not configured", { status: 500 });
        }

        const url = new URL(request.url);
        const mode = url.searchParams.get("mode") === "connect" ? "connect" : "login";
        const returnTo = url.searchParams.get("return_to") ?? "/chat";
        if (mode === "connect" && !userId) {
          return new Response("Please sign in first.", { status: 401 });
        }

        const state = randomBytes(24).toString("hex");
        const payload = JSON.stringify({ state, mode, returnTo, userId });
        const cookieValue = Buffer.from(payload).toString("base64url");

        const origin = `${url.protocol}//${url.host}`;
        const redirectUri = `${origin}/api/public/github/callback`;

        // repo scope so we can read private repos for Repo Intelligence.
        // read:user + user:email so we can create the account for login mode.
        const scopes = "read:user user:email repo";

        const authorize = new URL("https://github.com/login/oauth/authorize");
        authorize.searchParams.set("client_id", clientId);
        authorize.searchParams.set("redirect_uri", redirectUri);
        authorize.searchParams.set("scope", scopes);
        authorize.searchParams.set("state", state);
        authorize.searchParams.set("allow_signup", "true");

        return new Response(json ? JSON.stringify({ authorizeUrl: authorize.toString() }) : null, {
          status: json ? 200 : 302,
          headers: {
            ...(json ? { "Content-Type": "application/json" } : { Location: authorize.toString() }),
            "Set-Cookie": `gh_oauth=${cookieValue}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
          },
        });
}
