import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Eye, Zap, ShieldCheck, Plug, Apple, Globe } from "lucide-react";
import { SiteHeader } from "@/components/fixdemy/header";
import { SiteFooter } from "@/components/fixdemy/footer";
import { AnimatedWords, FadeUp, FadeIn } from "@/components/fixdemy/animated-text";
import { ParticleField } from "@/components/fixdemy/particles";
import { DashboardMockup } from "@/components/fixdemy/dashboard-mockup";
import { LogoMark } from "@/components/fixdemy/logo";
import { motion } from "motion/react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fixdemy — The read-only debugger for vibecoded apps" },
      {
        name: "description",
        content:
          "Fixdemy watches your screen while you build with Lovable, Cursor, Replit and Gemini. It catches bugs in real time, explains them in plain language, and shows you exactly where to fix them.",
      },
      { property: "og:title", content: "Fixdemy — Read-only debugger for vibecoded apps" },
      {
        property: "og:description",
        content:
          "A diagnostic layer that watches, reads and explains. Never writes a line of your code.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />
      <Hero />
      <LogoBar />
      <Features />
      <WorkflowSection />
      <MockupSection />
      <IntegrationSection />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-24">
      <ParticleField className="absolute inset-0 h-full w-full opacity-70" />
      <div className="relative mx-auto max-w-5xl px-5 text-center">
        <FadeUp delay={0.1}>
          <div className="inline-flex items-center gap-2 text-[12px] text-black/60">
            <LogoMark className="h-3.5 w-3.5" />
            Fixdemy
          </div>
        </FadeUp>

        <h1 className="mt-6 text-[44px] sm:text-[64px] md:text-[78px] leading-[1.02] tracking-[-0.04em] font-medium">
          <AnimatedWords text="See the bug" delay={0.15} />
          <br />
          <span className="text-black/40">
            <AnimatedWords text="before it costs you credits." delay={0.55} />
          </span>
        </h1>

        <FadeUp delay={1.2}>
          <p className="mx-auto mt-7 max-w-xl text-[15px] text-black/55 leading-relaxed">
            Fixdemy is a read-only debugging copilot. It watches your screen while you
            vibecode in Lovable, Cursor, Replit or Gemini — and tells you exactly where
            the error is, what it means, and how to fix it. It never touches your code.
          </p>
        </FadeUp>

        <FadeUp delay={1.4}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              to="/download"
              className="group inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-[13px] font-medium text-white transition-all hover:scale-[1.02]"
            >
              Download for Windows
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/product"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-[13px] font-medium text-black hover:bg-black/[0.03]"
            >
              See how it works
            </Link>
          </div>
        </FadeUp>

        <FadeUp delay={1.6}>
          <div className="mt-6 text-[11px] text-black/40">
            Also on macOS · Linux · Web · Chrome extension
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

function LogoBar() {
  const items = ["Lovable", "Cursor", "Replit", "Gemini", "v0", "Bolt", "Windsurf"];
  return (
    <FadeIn>
      <section className="border-y border-black/5 bg-white py-10">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center text-[11px] uppercase tracking-[0.2em] text-black/40">
            Connects to the tools you already vibecode in
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {items.map((i) => (
              <span
                key={i}
                className="text-[15px] font-medium tracking-tight text-black/35 hover:text-black/70 transition-colors"
              >
                {i}
              </span>
            ))}
          </div>
        </div>
      </section>
    </FadeIn>
  );
}

function Features() {
  const features = [
    {
      icon: Eye,
      title: "Watches your screen",
      body: "A lightweight observer reads what's on your editor, terminal and browser preview. Nothing is uploaded — analysis happens locally first.",
    },
    {
      icon: Zap,
      title: "Catches errors live",
      body: "The moment a stack trace, hydration error or console warning appears, Fixdemy flags the exact file and line — not a vague suggestion.",
    },
    {
      icon: ShieldCheck,
      title: "Read-only, by design",
      body: "Fixdemy will never write, commit or modify your code. It shows you the fix; you decide what to apply, inside the tool you already use.",
    },
    {
      icon: Plug,
      title: "Plugs into every tool",
      body: "Bridge to Lovable, Cursor, Replit, Gemini, VS Code and JetBrains via a single MCP connector. One install, every workflow.",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-28">
      <FadeIn>
        <div className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">
            What it does
          </div>
          <h2 className="mt-3 text-[36px] sm:text-[48px] leading-[1.05] tracking-[-0.03em] font-medium">
            A debugger that sits on top of every vibecoding tool.
          </h2>
        </div>
      </FadeIn>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-px bg-black/5 border border-black/5">
        {features.map((f, i) => (
          <FadeIn key={f.title} delay={i * 0.05}>
            <div className="bg-white p-8 h-full">
              <f.icon className="h-5 w-5" />
              <h3 className="mt-5 text-[18px] font-medium tracking-tight">
                {f.title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-black/55">
                {f.body}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

function WorkflowSection() {
  const steps = [
    {
      n: "01",
      title: "You vibecode",
      body: "Build in Lovable, Cursor, Replit, Gemini — wherever you ship from. Fixdemy runs quietly in the background.",
    },
    {
      n: "02",
      title: "Something breaks",
      body: "A stack trace, a blank screen, a hydration warning — Fixdemy spots it the second it appears on screen.",
    },
    {
      n: "03",
      title: "We explain it",
      body: "Plain-language semantics: what's wrong, why it's wrong, which line, which file, which fix.",
    },
    {
      n: "04",
      title: "You apply, in-place",
      body: "Copy the fix or send it directly back to the tool you came from. We never touch your code.",
    },
  ];
  return (
    <section className="bg-black text-white py-28">
      <div className="mx-auto max-w-6xl px-5">
        <FadeIn>
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">
              Workflow
            </div>
            <h2 className="mt-3 text-[36px] sm:text-[48px] leading-[1.05] tracking-[-0.03em] font-medium">
              Four steps. Zero credits wasted on bugs.
            </h2>
          </div>
        </FadeIn>
        <div className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <FadeIn key={s.n} delay={i * 0.08}>
              <div className="border-t border-white/15 pt-5">
                <div className="text-[11px] font-mono text-white/40">{s.n}</div>
                <h3 className="mt-2 text-[17px] font-medium tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/55">
                  {s.body}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

function MockupSection() {
  return (
    <section className="bg-[#fafafa] py-28">
      <div className="mx-auto max-w-6xl px-5">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">
              The interface
            </div>
            <h2 className="mt-3 text-[36px] sm:text-[48px] leading-[1.05] tracking-[-0.03em] font-medium">
              A quiet panel. A loud signal.
            </h2>
            <p className="mt-4 text-[14px] text-black/55">
              Fixdemy sits beside your editor and lights up only when something needs
              your attention. No noise. No clutter.
            </p>
          </div>
        </FadeIn>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14"
        >
          <DashboardMockup />
        </motion.div>
      </div>
    </section>
  );
}

function IntegrationSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-28">
      <div className="grid md:grid-cols-2 gap-14 items-center">
        <FadeIn>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">
              Universal connector
            </div>
            <h2 className="mt-3 text-[36px] sm:text-[44px] leading-[1.05] tracking-[-0.03em] font-medium">
              One MCP. Every vibecoding tool.
            </h2>
            <p className="mt-4 text-[14px] text-black/55 leading-relaxed">
              Fixdemy speaks Model Context Protocol. Install once, and a single click
              bridges it to Lovable, Cursor, Replit, Gemini, Windsurf, v0, VS Code or
              your IDE of choice. Connections are scoped and revocable.
            </p>
            <div className="mt-6 flex gap-2">
              <Link
                to="/docs"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-black hover:underline underline-offset-4"
              >
                Read the MCP docs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="relative rounded-2xl border border-black/10 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.2)]">
            <div className="grid grid-cols-3 gap-3">
              {["Lovable", "Cursor", "Replit", "Gemini", "Windsurf", "v0", "VS Code", "Bolt", "Zed"].map(
                (t, i) => (
                  <motion.div
                    key={t}
                    initial={{ opacity: 0, scale: 0.94 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.04 }}
                    className="aspect-square rounded-xl border border-black/10 flex flex-col items-center justify-center gap-2 hover:border-black transition-colors cursor-pointer group"
                  >
                    <div className="h-6 w-6 rounded-md bg-black/5 group-hover:bg-black transition-colors" />
                    <span className="text-[11px] text-black/60 group-hover:text-black">
                      {t}
                    </span>
                  </motion.div>
                )
              )}
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] text-black/40 font-mono">
              <span>fixdemy.mcp · v0.1</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-black animate-pulse" />
                listening
              </span>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="border-t border-black/5 bg-white">
      <div className="mx-auto max-w-5xl px-5 py-28 text-center">
        <FadeIn>
          <h2 className="text-[44px] sm:text-[64px] leading-[1.02] tracking-[-0.04em] font-medium">
            Stop guessing.
            <br />
            <span className="text-black/40">Start shipping.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-[14px] text-black/55">
            Fixdemy is free during beta. Download it for Windows, macOS, Linux or use
            it directly in the browser.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              to="/download"
              className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-[13px] font-medium text-white hover:scale-[1.02] transition-all"
            >
              <Apple className="h-3.5 w-3.5" />
              Download for Mac
            </Link>
            <Link
              to="/download"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-[13px] font-medium text-black hover:bg-black/[0.03]"
            >
              <Globe className="h-3.5 w-3.5" />
              Open in browser
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-[13px] font-medium text-black hover:bg-black/[0.03]"
            >
              Create an account
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
