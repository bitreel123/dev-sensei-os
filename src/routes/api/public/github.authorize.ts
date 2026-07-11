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
      GET: async ({ request }) => {
        const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
        if (!clientId) {
          return new Response("GitHub OAuth is not configured", { status: 500 });
        }

        const url = new URL(request.url);
        const mode = url.searchParams.get("mode") === "connect" ? "connect" : "login";
        const returnTo = url.searchParams.get("return_to") ?? "/chat";

        const state = randomBytes(24).toString("hex");
        const payload = JSON.stringify({ state, mode, returnTo });
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

        return new Response(null, {
          status: 302,
          headers: {
            Location: authorize.toString(),
            "Set-Cookie": `gh_oauth=${cookieValue}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
          },
        });
      },
    },
  },
});
