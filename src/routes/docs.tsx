import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";
import { AnimatedWords } from "@/components/jeradin/animated-text";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs · Jeradin" },
      { name: "description", content: "Install Jeradin, connect your MCP, and read about the debugging engine." },
      { property: "og:title", content: "Docs · Jeradin" },
      { property: "og:description", content: "Quickstart, MCP setup and engine internals." },
    ],
  }),
  component: DocsPage,
});

const sections = [
  {
    h: "Quickstart",
    items: [
      ["Install Jeradin", "Download for Windows, macOS or Linux. Sign in. Approve screen reading. You're done."],
      ["Connect a vibecoding tool", "Open the Connectors panel, pick Lovable, Cursor, Replit or Gemini, and click Bridge."],
      ["First detection", "Break something on purpose — Jeradin will flag it within a second."],
    ],
  },
  {
    h: "MCP Connector",
    items: [
      ["What is MCP?", "Model Context Protocol — a small, open spec that lets Jeradin talk to any vibecoding tool that exposes one."],
      ["Permissions", "Connections are read-only and revocable. Jeradin never gets write access to your repo."],
      ["Self-hosting", "Run the bridge on your own machine in air-gapped environments."],
    ],
  },
  {
    h: "Engine",
    items: [
      ["Screen reader", "On-device OCR + DOM accessibility tree parsing."],
      ["Semantic layer", "A small reasoning model maps stack traces to intent — not just keywords."],
      ["Privacy", "Frames stay local unless you opt-in to cloud reasoning for hard cases."],
    ],
  },
];

function DocsPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="pt-32 pb-12 mx-auto max-w-4xl px-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">
          Docs
        </div>
        <h1 className="mt-3 text-[44px] sm:text-[64px] leading-[1.02] tracking-[-0.04em] font-medium">
          <AnimatedWords text="Everything you need to install, connect and debug." />
        </h1>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-28 space-y-16">
        {sections.map((s) => (
          <div key={s.h}>
            <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">
              {s.h}
            </div>
            <div className="mt-4 divide-y divide-black/5 border-y border-black/5">
              {s.items.map(([t, b]) => (
                <div key={t} className="py-5 grid md:grid-cols-[240px_1fr] gap-4">
                  <div className="text-[15px] font-medium tracking-tight">{t}</div>
                  <div className="text-[13.5px] text-black/60 leading-relaxed">{b}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
      <SiteFooter />
    </div>
  );
}
