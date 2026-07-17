import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";
import { AnimatedWords } from "@/components/jeradin/animated-text";
import { ArrowRight, Mail } from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs · Jeradin" },
      { name: "description", content: "Install Jeradin, pair the extension, connect MCP, and read about the debugging engine. Technical documentation for developers." },
      { property: "og:title", content: "Docs · Jeradin" },
      { property: "og:description", content: "Quickstart, extension setup, MCP, engine internals, and support." },
    ],
  }),
  component: DocsPage,
});

const sections: Array<{ h: string; items: Array<[string, React.ReactNode]> }> = [
  {
    h: "Quickstart",
    items: [
      ["Install the extension", <>Download the ZIP from the <Link to="/download" className="underline">download page</Link>, unzip it, then in <code className="font-mono">chrome://extensions</code> enable <b>Developer mode</b> and click <b>Load unpacked</b>.</>],
      ["Pair your account", <>Sign in at <a href="https://jeradin.com" className="underline">jeradin.com</a>, open the <Link to="/extension" className="underline">extension page</Link>, generate a connection token, and paste it into the extension popup.</>],
      ["First capture", <>Open any tab, click the Jeradin icon in the toolbar, then click <b>Capture &amp; Analyze</b>. A structured report appears in ~2–5 seconds.</>],
    ],
  },
  {
    h: "Terminal install",
    items: [
      ["Fetch the bundle", <><code className="font-mono block break-all">curl -L https://jeradin.com/jeradin-extension.zip -o jeradin-extension.zip &amp;&amp; unzip jeradin-extension.zip -d jeradin-extension</code></>],
      ["Load unpacked", <>Open <code className="font-mono">chrome://extensions</code>, enable Developer mode, click Load unpacked, and select the <code className="font-mono">jeradin-extension</code> folder.</>],
    ],
  },
  {
    h: "Extension API",
    items: [
      ["Endpoint", <><code className="font-mono">POST https://jeradin.com/api/public/extension/analyze</code> — accepts a base64 PNG and returns a structured diagnosis + fix report.</>],
      ["Authentication", <>Header <code className="font-mono">Authorization: Bearer &lt;connection_token&gt;</code>. Tokens are per-account and can be revoked on the extension page anytime.</>],
      ["Response shape", <>Returns <code className="font-mono">{`{ tier, analysis, fix, latencyMs }`}</code>. <code className="font-mono">tier</code> is <code className="font-mono">"instant"</code> or <code className="font-mono">"smart"</code> depending on which model handled the request.</>],
    ],
  },
  {
    h: "MCP Connector",
    items: [
      ["Endpoint", <>Jeradin exposes an MCP server at <code className="font-mono">https://jeradin.com/mcp</code>. Point any MCP-compatible client at that URL.</>],
      ["Permissions", "MCP connections are read-only and scoped to your workspace. Jeradin never gets write access to your repo."],
      ["Available tools", "list-notifications, get-profile, get-active-repo, set-active-repo. More coming."],
    ],
  },
  {
    h: "Engine",
    items: [
      ["Two-tier routing", "Every capture starts in Instant mode. If the model self-reports low confidence or high complexity, Jeradin transparently escalates to Smart mode. You always get the best available answer."],
      ["Screen understanding", "OCR + DOM accessibility tree parsing feeds a vision-language model. Jeradin reasons about the whole frame, not just the copied text."],
      ["Privacy", "Frames are sent to Jeradin only when you press capture. They are never used for training and are discarded after the report is returned."],
    ],
  },
  {
    h: "Support",
    items: [
      ["Contact us", <>Email <a className="underline" href="mailto:support@jeradin.com">support@jeradin.com</a> or use the <Link to="/support" className="underline">support form</Link>. We reply within one business day.</>],
      ["Bug reports", "Include the tab URL, a screenshot, and the report ID from the extension footer if available."],
      ["Status", "For outages, check status updates on the support page."],
    ],
  },
];

function DocsPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="pt-32 pb-12 mx-auto max-w-4xl px-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Docs</div>
        <h1 className="mt-3 text-[44px] sm:text-[64px] leading-[1.02] tracking-[-0.04em] font-medium">
          <AnimatedWords text="Install, connect, debug — the technical guide." />
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] text-black/60 leading-relaxed">
          Everything you need to run Jeradin end-to-end. If something's missing,
          ping <a href="mailto:support@jeradin.com" className="underline">support@jeradin.com</a>.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-28 space-y-16">
        {sections.map((s) => (
          <div key={s.h}>
            <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">{s.h}</div>
            <div className="mt-4 divide-y divide-black/5 border-y border-black/5">
              {s.items.map(([t, b], idx) => (
                <div key={idx} className="py-5 grid md:grid-cols-[240px_1fr] gap-4">
                  <div className="text-[15px] font-medium tracking-tight">{t}</div>
                  <div className="text-[13.5px] text-black/60 leading-relaxed">{b}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-black/10 bg-black text-white p-8 flex items-start gap-4">
          <Mail className="h-5 w-5 mt-0.5" />
          <div className="flex-1">
            <div className="text-[15px] font-medium">Still stuck?</div>
            <p className="mt-1 text-[13px] text-white/70">We read every message sent to support@jeradin.com.</p>
          </div>
          <Link to="/support" className="inline-flex items-center gap-2 rounded-full bg-white text-black px-4 py-2 text-[12.5px] font-medium">
            Contact support <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
