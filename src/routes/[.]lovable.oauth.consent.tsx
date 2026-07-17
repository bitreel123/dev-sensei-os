import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/jeradin/logo";

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthDetails = {
  client?: { name?: string; redirect_uri?: string } | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};
type OAuthResult = { data: OAuthDetails | null; error: { message: string } | null };
type SupabaseAuthOAuth = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = (supabase.auth as unknown as { oauth: SupabaseAuthOAuth }).oauth;

function isSafeReturn(next: string): boolean {
  return next.startsWith("/") && !next.startsWith("//");
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/login", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId =
      new URLSearchParams(location.search).get("authorization_id") ?? "";
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-xl">Could not load this authorization request</h1>
        <p className="text-white/60 text-sm">
          {String((error as Error)?.message ?? error)}
        </p>
      </div>
    </div>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: err } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an application";
  const redirectUri = details?.client?.redirect_uri;

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-white/15 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <LogoMark className="h-6 w-6 text-white" />
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
            Jeradin · authorize
          </div>
        </div>
        <h1
          className="text-[26px] leading-tight tracking-[-0.02em]"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Connect {clientName} to your account
        </h1>
        <p className="text-[13px] text-white/70">
          This lets {clientName} use Jeradin as you — read your profile and
          notifications, and view or change your active project repo.
        </p>
        <p className="text-[11px] text-white/40">
          This does not bypass Jeradin's permissions or backend policies.
        </p>
        {redirectUri ? (
          <div className="text-[11px] text-white/50 font-mono break-all border border-white/10 p-2">
            Redirect: {redirectUri}
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-[12px] text-red-400">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2 pt-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 bg-white text-black px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] hover:bg-white/90 disabled:opacity-50"
          >
            {busy ? "Working…" : "Approve"}
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 border border-white/25 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] hover:bg-white hover:text-black transition-colors disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}

export { isSafeReturn };
