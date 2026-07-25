import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import {
  listExtensionTokens,
  createExtensionToken,
  revokeExtensionToken,
} from "@/lib/extension-tokens.functions";
import { Chrome, Copy, Check, Download, Trash2, Loader2, KeyRound, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/extension")({
  head: () => ({
    meta: [
      { title: "Jeradin Chrome Extension · Debug any tab in seconds" },
      {
        name: "description",
        content:
          "Install the Jeradin browser extension to capture any screen and get an instant AI diagnosis, plain-English fix, and confidence score in 2–5 seconds.",
      },
      { property: "og:title", content: "Jeradin Chrome Extension" },
      {
        property: "og:description",
        content: "Instant screen intelligence for developers, right in your browser.",
      },
    ],
  }),
  component: ExtensionPage,
});

function ExtensionPage() {
  const { user, loading } = useAuth();
  const load = useServerFn(listExtensionTokens);
  const create = useServerFn(createExtensionToken);
  const revoke = useServerFn(revokeExtensionToken);

  const [tokens, setTokens] = useState<
    Array<{ id: string; label: string; created_at: string; last_used_at: string | null; revoked_at: string | null }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    load({})
      .then((r) => setTokens(r.tokens))
      .catch(() => setTokens([]));
  }, [user, load]);

  async function generate() {
    setBusy(true);
    try {
      const r = await create({ data: { label: "Chrome extension" } });
      setNewToken(r.token);
      const list = await load({});
      setTokens(list.tokens);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await revoke({ data: { id } });
    const list = await load({});
    setTokens(list.tokens);
  }

  async function copyToken() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/70 hover:text-white">
            ← Jeradin
          </Link>
          <div className="inline-flex items-center gap-2 rounded bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-orange-300">
            <Chrome className="h-3 w-3" /> Chrome extension
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        <section>
          <h1 className="text-4xl font-semibold tracking-tight">Debug any tab in 2–5 seconds.</h1>
          <p className="mt-3 text-white/70 text-[15px] leading-relaxed max-w-2xl">
            The Jeradin extension captures the current tab, sends it to your Jeradin
            workspace, and returns a full diagnosis, plain-English root cause,
            recommended actions, and a confidence score — right in the popup.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/60 mb-3">
            <Download className="h-3.5 w-3.5" /> Step 1 · Download
          </div>
          <a
            href="/jeradin-screen-intelligence-extension.zip"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-sm font-medium"
            download
          >
            <Download className="h-4 w-4" /> Install extension v1.4.0
          </a>
          <ol className="mt-4 text-[13.5px] text-white/70 space-y-1.5 leading-relaxed list-decimal pl-5">
            <li>Unzip the file.</li>
            <li>
              Open <code className="font-mono text-white/90">chrome://extensions</code> in Chrome,
              Edge, Brave, or Arc.
            </li>
            <li>
              Enable <b>Developer mode</b> (toggle top-right), then click <b>Load unpacked</b>
              and select the unzipped folder.
            </li>
          </ol>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/60 mb-3">
            <KeyRound className="h-3.5 w-3.5" /> Step 2 · Sign in on jeradin.com
          </div>
          {loading ? (
            <div className="text-white/50 text-sm">Checking your session…</div>
          ) : !user ? (
            <div className="text-sm text-white/70">
              <Link to="/login" search={{}} className="underline">Sign in</Link> to your Jeradin account.
              The extension automatically picks up your session — no tokens to copy or paste.
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[13.5px] text-white/70 leading-relaxed">
                You're signed in. Open the extension popup and it will detect your jeradin.com
                session automatically. Advanced: generate a legacy connection token below if you
                need to pair a headless or non-browser client.
              </p>
              <button
                onClick={generate}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-white text-black hover:bg-white/90 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Generate connection token
              </button>

              {newToken && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-mono uppercase tracking-widest mb-2">
                    <ShieldCheck className="h-3.5 w-3.5" /> Copy this now — it won't be shown again
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-[11px] break-all bg-black/60 border border-white/10 rounded px-2 py-1.5 text-white/90">
                      {newToken}
                    </code>
                    <button
                      onClick={copyToken}
                      className="inline-flex items-center gap-1 rounded bg-white/10 hover:bg-white/20 px-2 py-1.5 text-xs"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {tokens.length > 0 && (
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50 mb-2">
                    Existing tokens
                  </div>
                  <ul className="space-y-1.5">
                    {tokens.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center gap-3 rounded border border-white/10 bg-white/[0.02] px-3 py-2 text-[12.5px]"
                      >
                        <span className="flex-1 truncate">
                          <span className={t.revoked_at ? "line-through text-white/40" : "text-white/85"}>
                            {t.label}
                          </span>
                          <span className="ml-2 text-white/40 font-mono text-[10.5px]">
                            {new Date(t.created_at).toLocaleDateString()}
                            {t.last_used_at ? ` · used ${new Date(t.last_used_at).toLocaleDateString()}` : ""}
                            {t.revoked_at ? " · revoked" : ""}
                          </span>
                        </span>
                        {!t.revoked_at && (
                          <button
                            onClick={() => remove(t.id)}
                            className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-red-400"
                            aria-label="Revoke token"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60 mb-3">
            Step 3 · Analyze any tab
          </div>
          <ol className="text-[13.5px] text-white/70 space-y-1.5 leading-relaxed list-decimal pl-5">
            <li>Open the tab you want to debug.</li>
            <li>Click the Jeradin extension icon in the toolbar.</li>
            <li>Click <b>Capture & Analyze</b>. Results appear in the popup within a few seconds.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
