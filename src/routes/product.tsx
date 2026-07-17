import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";
import { FadeIn, AnimatedWords } from "@/components/jeradin/animated-text";
import { DashboardMockup } from "@/components/jeradin/dashboard-mockup";
import { ArrowRight, Eye, Zap, Shield, Cpu, Chrome, Globe } from "lucide-react";

export const Route = createFileRoute("/product")({
  head: () => ({
    meta: [
      { title: "Overview · Jeradin" },
      {
        name: "description",
        content:
          "Jeradin is a read-only debugging copilot. It watches your screen, understands what your code is doing, explains errors in plain English and hands you a fix in seconds.",
      },
      { property: "og:title", content: "Overview · Jeradin" },
      {
        property: "og:description",
        content: "A read-only debugger that watches, understands and explains — in 2 to 5 seconds.",
      },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 mx-auto max-w-4xl px-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Overview</div>
        <h1 className="mt-3 text-[44px] sm:text-[64px] leading-[1.02] tracking-[-0.04em] font-medium">
          <AnimatedWords text="Jeradin is your screen-aware debugging copilot." />
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] text-black/60 leading-relaxed">
          Point Jeradin at any tab, editor or terminal. In 2 to 5 seconds it tells you
          what's wrong, why it broke, which file is responsible, how confident it is,
          and exactly what to do next — without ever touching your codebase.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/download" className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-[13px] font-medium text-white hover:opacity-90">
            Get Jeradin <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link to="/docs" className="inline-flex items-center gap-2 rounded-full border border-black/15 px-5 py-3 text-[13px] font-medium text-black hover:bg-black/5">
            Read the docs
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <FadeIn>
          <DashboardMockup />
        </FadeIn>
      </section>

      {/* What is Jeradin */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">What it is</div>
        <h2 className="mt-2 text-[32px] tracking-[-0.02em] font-medium">A debugger that lives on top of your screen.</h2>
        <div className="mt-8 grid md:grid-cols-2 gap-8 text-[14px] text-black/65 leading-relaxed">
          <p>
            Most tools ask you to paste the error, describe the stack, and hope
            the model guesses. Jeradin watches the pixels — your IDE, your browser
            devtools, your build output, your terminal — and reasons about the whole
            frame at once. It sees what you see.
          </p>
          <p>
            Under the hood, Jeradin runs a two-tier intelligence pipeline. Simple
            mistakes (typos, missing imports, TypeScript friction, undefined vars)
            get an instant answer in about 2 seconds. Anything harder is escalated
            automatically to a deeper reasoning pass for hydration bugs, race
            conditions, cross-file causes and framework-specific quirks.
          </p>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-5xl px-5 pb-24 grid md:grid-cols-3 gap-8">
        {[
          { icon: Eye, t: "Sees the whole screen", b: "OCR + DOM + accessibility tree parsing. Jeradin reads editors, browser consoles, network panels and terminals as one context." },
          { icon: Zap, t: "Answers in 2–5 seconds", b: "Instant mode handles common bugs in the time it takes to blink. Smart mode kicks in automatically for anything ambiguous." },
          { icon: Shield, t: "Zero write access", b: "Jeradin has no permission to edit, commit, push or install. By design, it can only observe and suggest." },
          { icon: Cpu, t: "Root cause + fix", b: "Every report includes the root cause, the exact affected file, a confidence score, a primary fix and an alternative — plus side effects to watch for." },
          { icon: Chrome, t: "Runs where you already work", b: "Browser extension, web app, and desktop builds coming. One account, one connection token, every surface." },
          { icon: Globe, t: "Works across vibecoding tools", b: "Cursor, Lovable, Replit, Windsurf, Warp, Chrome DevTools, plain VS Code — if you can see it, Jeradin can debug it." },
        ].map((x) => (
          <div key={x.t}>
            <x.icon className="h-5 w-5" />
            <h3 className="mt-4 text-[16px] font-medium">{x.t}</h3>
            <p className="mt-2 text-[13.5px] text-black/55 leading-relaxed">{x.b}</p>
          </div>
        ))}
      </section>

      {/* How users use it */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">How you use it</div>
        <h2 className="mt-2 text-[32px] tracking-[-0.02em] font-medium">Three ways to run Jeradin.</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {[
            { t: "Chrome extension", b: "Install once, pin the icon, click Capture on any tab. Report appears inside the popup.", cta: "Install extension", to: "/download" },
            { t: "Web workspace", b: "Sign in at jeradin.com, drag a screenshot in or share your screen, and get the same report in the browser.", cta: "Open web app", to: "/app" },
            { t: "Desktop app", b: "Windows, macOS and Linux builds are in private beta. Join the waitlist and we'll ping you the moment it's ready.", cta: "Join waitlist", to: "/download" },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl border border-black/10 p-6 h-full flex flex-col">
              <div className="text-[15px] font-medium tracking-tight">{x.t}</div>
              <p className="mt-2 text-[13px] text-black/55 leading-relaxed flex-1">{x.b}</p>
              <Link to={x.to} className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-black hover:opacity-80">
                {x.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-black/5 bg-white">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center">
          <h2 className="text-[36px] tracking-[-0.03em] font-medium">
            Never lose an afternoon to a silent bug again.
          </h2>
          <p className="mt-4 text-[14px] text-black/55">Free during beta. No credit card.</p>
          <Link
            to="/download"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-[13px] font-medium text-white"
          >
            Download Jeradin <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
