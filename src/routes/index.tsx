import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { SiteHeader } from "@/components/fixdemy/header";
import { SiteFooter } from "@/components/fixdemy/footer";
import { LogoWordmark } from "@/components/fixdemy/logo";
import { CursorHalo } from "@/components/fixdemy/cursor-halo";
import { DashboardMockup } from "@/components/fixdemy/dashboard-mockup";
import { BrandLogo, BrandName, ALL_BRANDS, type BrandKey } from "@/components/fixdemy/brand-logos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fixdemy — Debug what you vibecode" },
      {
        name: "description",
        content:
          "A read-only debugger that watches every vibecoding tool and every IDE. Catches errors live, explains them, never writes your code.",
      },
      { property: "og:title", content: "Fixdemy — Debug what you vibecode" },
      {
        property: "og:description",
        content:
          "A read-only debugger that watches every vibecoding tool and every IDE.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      <CursorHalo />
      <SiteHeader />
      <Hero />
      <LogoStrip />
      <ValueGrid />
      <LiveMockup />
      <DevAngle />
      <WorkflowBand />
      <Connector />
      <CTA />
      <SiteFooter />
    </div>
  );
}

/* ------------------------------ Hero ------------------------------ */

function Hero() {
  // Build headline word-by-word reveal (antigravity-style: each letter rises slightly)
  return (
    <section className="relative pt-44 pb-24">
      <div className="relative mx-auto max-w-6xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <LogoWordmark />
        </motion.div>

        <h1 className="mt-6 text-[44px] sm:text-[68px] md:text-[88px] leading-[0.98] tracking-[-0.045em] font-bold text-black">
          <RisingLine text="Debug what you" delay={0.05} />
          <br />
          <RisingLine text="vibecode." delay={0.35} />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="mx-auto mt-7 max-w-[520px] text-[14.5px] text-black leading-relaxed"
        >
          Fixdemy is the read-only debugger for vibecoders and developers.
          It watches your screen, catches the error, and tells you the fix.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.05 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-2"
        >
          <Link
            to="/download"
            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-[13px] font-medium text-white hover:bg-black/85 transition-colors"
          >
            <DownloadGlyph /> Download for Windows
          </Link>
          <Link
            to="/product"
            className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] px-4 py-2.5 text-[13px] font-medium text-black hover:bg-black/[0.08] transition-colors"
          >
            Explore use cases
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function RisingLine({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="inline-block overflow-hidden align-bottom">
      <motion.span
        className="inline-block"
        initial={{ y: "108%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay }}
      >
        {text}
      </motion.span>
    </span>
  );
}

function DownloadGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2v9m0 0 3-3m-3 3L5 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* --------------------------- Logo strip --------------------------- */

function LogoStrip() {
  const brands: BrandKey[] = ["lovable", "cursor", "replit", "gemini", "v0", "bolt", "windsurf", "vscode"];
  return (
    <section className="border-y border-black/10 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {brands.map((b, i) => (
            <motion.div
              key={b}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="flex items-center gap-2 text-black"
            >
              <BrandLogo brand={b} className="h-5 w-5" />
              <span className="text-[13.5px] font-medium tracking-tight">
                {BrandName(b)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Value grid --------------------------- */

function ValueGrid() {
  const items = [
    {
      tag: "01",
      title: "Watches.",
      body: "Reads your editor, terminal and browser. Locally first.",
    },
    {
      tag: "02",
      title: "Catches.",
      body: "Flags the file and line the second an error appears.",
    },
    {
      tag: "03",
      title: "Explains.",
      body: "Plain-language semantics. Why it broke. What to change.",
    },
    {
      tag: "04",
      title: "Never writes.",
      body: "Read-only by design. You apply the fix, in your tool.",
    },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 pt-28 pb-20">
      <div className="grid md:grid-cols-2 gap-12 items-end">
        <h2 className="text-[40px] sm:text-[56px] leading-[1] tracking-[-0.035em] font-bold text-black">
          A debugger that sits on top of every vibecoding tool.
        </h2>
        <p className="text-[14.5px] text-black/70 leading-relaxed max-w-md md:justify-self-end">
          One install. Bridges to Lovable, Cursor, Replit, Gemini, Windsurf, v0
          and your IDE. Fixdemy never touches your code.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-px bg-black/10 border border-black/10">
        {items.map((it, i) => (
          <motion.div
            key={it.tag}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className="bg-white p-6 min-h-[180px] flex flex-col justify-between"
          >
            <span className="text-[11px] font-mono text-black/50">{it.tag}</span>
            <div>
              <h3 className="text-[22px] font-bold tracking-tight text-black">
                {it.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-black/65">
                {it.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- Live mockup --------------------------- */

function LiveMockup() {
  return (
    <section className="bg-[#f6f6f4]">
      <div className="mx-auto max-w-7xl px-6 py-28">
        <div className="grid md:grid-cols-12 gap-10 items-end mb-12">
          <div className="md:col-span-8">
            <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
              The interface
            </span>
            <h2 className="mt-3 text-[40px] sm:text-[56px] leading-[1] tracking-[-0.035em] font-bold text-black">
              Quiet panel. Loud signal.
            </h2>
          </div>
          <p className="md:col-span-4 text-[14px] text-black/70 leading-relaxed">
            Sits next to your editor. Lights up only when something actually
            needs your attention.
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <DashboardMockup />
        </motion.div>
      </div>
    </section>
  );
}

/* --------------------------- Dev angle --------------------------- */

function DevAngle() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-28">
      <div className="grid md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
            Not just for vibecoders
          </span>
          <h2 className="mt-3 text-[40px] sm:text-[52px] leading-[1] tracking-[-0.035em] font-bold text-black">
            Built for developers too.
          </h2>
        </div>
        <div className="md:col-span-7">
          <p className="text-[15px] text-black leading-relaxed">
            Open it next to VS Code, JetBrains or Zed. Fixdemy reads your
            stack traces, surfaces the offending line, and explains the bug in
            plain English — faster than searching Stack Overflow, cheaper than
            another AI prompt.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-px bg-black/10 border border-black/10">
            {[
              { k: "0.4s", v: "Average time to flag a runtime error." },
              { k: "100%", v: "Read-only. Your repo is never modified." },
              { k: "12+", v: "Editors and vibecoding tools supported." },
              { k: "0", v: "Credits burnt on debugging the same bug twice." },
            ].map((s) => (
              <div key={s.k} className="bg-white p-5">
                <div className="text-[28px] font-bold tracking-tight text-black">
                  {s.k}
                </div>
                <div className="mt-1 text-[12.5px] text-black/65 leading-relaxed">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Workflow band --------------------------- */

function WorkflowBand() {
  const steps = [
    { n: "01", t: "You vibecode.", b: "Build in Lovable, Cursor, Replit, Gemini. Fixdemy runs in the background." },
    { n: "02", t: "Something breaks.", b: "Stack trace, blank screen, hydration warning — caught the instant it appears." },
    { n: "03", t: "We explain it.", b: "Which file. Which line. Why it broke. What to change." },
    { n: "04", t: "You apply it.", b: "Copy or send the fix back to the tool. Your code, your hands." },
  ];
  return (
    <section className="bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-28">
        <div className="grid md:grid-cols-12 gap-10 items-end mb-14">
          <h2 className="md:col-span-8 text-[40px] sm:text-[56px] leading-[1] tracking-[-0.035em] font-bold">
            Four steps. Zero wasted credits.
          </h2>
          <p className="md:col-span-4 text-[14px] text-white/65 leading-relaxed">
            The loop is short on purpose. Build, break, understand, ship.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-white/10 border border-white/10">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="bg-black p-6 min-h-[220px] flex flex-col justify-between"
            >
              <span className="text-[11px] font-mono text-white/45">{s.n}</span>
              <div>
                <h3 className="text-[22px] font-bold tracking-tight">{s.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/65">
                  {s.b}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Connector --------------------------- */

function Connector() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-28">
      <div className="grid md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-5">
          <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
            Universal connector
          </span>
          <h2 className="mt-3 text-[40px] sm:text-[52px] leading-[1] tracking-[-0.035em] font-bold text-black">
            One MCP. Every tool.
          </h2>
          <p className="mt-5 text-[14.5px] text-black/70 leading-relaxed max-w-md">
            Fixdemy speaks Model Context Protocol. Install once, then bridge to
            anything — scoped, revocable, transparent.
          </p>
          <Link
            to="/docs"
            className="mt-7 inline-flex items-center gap-1.5 text-[13px] font-semibold text-black hover:underline underline-offset-4"
          >
            Read the MCP docs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="md:col-span-7">
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.18)]">
            <div className="grid grid-cols-3 gap-3">
              {ALL_BRANDS.map((b, i) => (
                <motion.div
                  key={b}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                  className="group aspect-square rounded-xl border border-black/10 bg-white flex flex-col items-center justify-center gap-2 hover:border-black hover:bg-black/[0.02] transition-colors cursor-pointer"
                >
                  <BrandLogo brand={b} className="h-7 w-7" />
                  <span className="text-[11.5px] font-medium text-black">
                    {BrandName(b)}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-black/45">
              <span>fixdemy.mcp · v0.1</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-black animate-pulse" />
                listening
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- CTA --------------------------- */

function CTA() {
  return (
    <section className="border-t border-black/10">
      <div className="mx-auto max-w-5xl px-6 py-28 text-center">
        <h2 className="text-[44px] sm:text-[72px] leading-[0.98] tracking-[-0.04em] font-bold text-black">
          Ship without the loops.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[14px] text-black/70">
          Free during beta. Windows, macOS, Linux and Web.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/download"
            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-[13px] font-medium text-white hover:bg-black/85"
          >
            <DownloadGlyph /> Download Fixdemy
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] px-4 py-2.5 text-[13px] font-medium text-black hover:bg-black/[0.08]"
          >
            Create an account
          </Link>
        </div>
      </div>
    </section>
  );
}
