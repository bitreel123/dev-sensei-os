import { createFileRoute } from "@tanstack/react-router";

// GitHub OAuth callback.
// Exchanges the code for an access token, then either:
//  - mode=connect: links GitHub to the currently signed-in Supabase user
//  - mode=login:   creates or finds a Supabase user for the GitHub email and
//                  signs them in via a magic-link redirect
export const Route = createFileRoute("/api/public/github/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const stateParam = url.searchParams.get("state");
        const cookieHeader = request.headers.get("cookie") ?? "";
        const cookies = Object.fromEntries(
          cookieHeader.split(/;\s*/).filter(Boolean).map((c) => {
            const i = c.indexOf("=");
            return i === -1 ? [c, ""] : [c.slice(0, i), c.slice(i + 1)];
          }),
        );

        const raw = cookies["gh_oauth"];
        if (!code || !stateParam || !raw) {
          return htmlError("Missing OAuth parameters.");
        }

        let parsed: { state: string; mode: "login" | "connect"; returnTo: string };
        try {
          parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
        } catch {
          return htmlError("Invalid OAuth state.");
        }

        if (parsed.state !== stateParam) {
          return htmlError("OAuth state mismatch. Please try again.");
        }

        const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          return htmlError("GitHub OAuth is not configured on the server.");
        }

        const origin = `${url.protocol}//${url.host}`;
        const redirectUri = `${origin}/api/public/github/callback`;

        // Exchange code for token
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
          }),
        });
        const tokenJson = (await tokenRes.json()) as {
          access_token?: string;
          scope?: string;
          error?: string;
          error_description?: string;
        };
        if (!tokenJson.access_token) {
          return htmlError(tokenJson.error_description ?? "GitHub token exchange failed.");
        }

        const accessToken = tokenJson.access_token;
        const scopes = tokenJson.scope ?? "";

        // Fetch user + primary verified email.
        // GitHub API REQUIRES a User-Agent header — without it, requests are rejected.
        const ghHeaders = {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "jeradin-app",
          "X-GitHub-Api-Version": "2022-11-28",
        };
        const [userRes, emailsRes] = await Promise.all([
          fetch("https://api.github.com/user", { headers: ghHeaders }),
          fetch("https://api.github.com/user/emails", { headers: ghHeaders }),
        ]);
        if (!userRes.ok) {
          const detail = await userRes.text().catch(() => "");
          return htmlError(`Could not read GitHub profile (${userRes.status}). ${detail.slice(0, 200)}`);
        }
        const ghUser = (await userRes.json()) as {
          id: number;
          login: string;
          avatar_url: string;
          email: string | null;
        };
        const emails = emailsRes.ok
          ? ((await emailsRes.json()) as Array<{ email: string; primary: boolean; verified: boolean }>)
          : [];
        const primary =
          emails.find((e) => e.primary && e.verified) ??
          emails.find((e) => e.verified) ??
          (ghUser.email ? { email: ghUser.email, primary: true, verified: true } : null);

        if (!primary?.email) {
          return htmlError("No verified email on your GitHub account. Add one and try again.");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let userId: string | null = null;

        if (parsed.mode === "connect") {
          // Trust the Supabase session cookie / bearer token on the request.
          const authHeader = request.headers.get("authorization");
          const accessJwt = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7)
            : cookies["sb-access-token"];
          if (accessJwt) {
            const { data } = await supabaseAdmin.auth.getUser(accessJwt);
            userId = data.user?.id ?? null;
          }
          if (!userId) {
            // Fallback: match by email if it exists in auth.users.
            const { data: list } = await supabaseAdmin.auth.admin.listUsers();
            userId = list?.users.find((u) => u.email?.toLowerCase() === primary.email.toLowerCase())?.id ?? null;
          }
          if (!userId) {
            return htmlError("Please sign in first, then connect GitHub.");
          }
        } else {
          // login mode: find or create the Supabase user for this GitHub email.
          const { data: list } = await supabaseAdmin.auth.admin.listUsers();
          const existing = list?.users.find(
            (u) => u.email?.toLowerCase() === primary.email.toLowerCase(),
          );
          if (existing) {
            userId = existing.id;
          } else {
            const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
              email: primary.email,
              email_confirm: true,
              user_metadata: {
                full_name: ghUser.login,
                avatar_url: ghUser.avatar_url,
                provider: "github",
              },
            });
            if (createErr || !created.user) {
              return htmlError(createErr?.message ?? "Could not create account.");
            }
            userId = created.user.id;
          }
        }

        // Upsert the GitHub connection.
        await supabaseAdmin.from("github_connections").upsert({
          user_id: userId,
          github_id: ghUser.id,
          login: ghUser.login,
          avatar_url: ghUser.avatar_url,
          scopes,
          access_token: accessToken,
          updated_at: new Date().toISOString(),
        });

        const clearCookie = "gh_oauth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax";

        if (parsed.mode === "connect") {
          return new Response(null, {
            status: 302,
            headers: { Location: parsed.returnTo || "/chat", "Set-Cookie": clearCookie },
          });
        }

        // login mode: generate a magic link and redirect the browser to it so
        // Supabase sets the session cookie, then lands the user on returnTo.
        const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: primary.email,
          options: { redirectTo: `${origin}${parsed.returnTo || "/chat"}` },
        });
        if (linkErr || !link.properties?.action_link) {
          return htmlError(linkErr?.message ?? "Could not start session.");
        }

        return new Response(null, {
          status: 302,
          headers: { Location: link.properties.action_link, "Set-Cookie": clearCookie },
        });
      },
    },
  },
});

function htmlError(msg: string) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>GitHub sign-in error</title>
    <div style="font-family:system-ui;background:#111;color:#eee;padding:40px;min-height:100vh">
      <h1 style="font-size:20px;margin:0 0 12px">GitHub sign-in failed</h1>
      <p style="opacity:.7;margin:0 0 20px">${escapeHtml(msg)}</p>
      <a href="/login" style="color:#8ab4ff">Back to sign in</a>
    </div>`,
    { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
