import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";
import { FadeIn, AnimatedWords } from "@/components/jeradin/animated-text";
import { Monitor, Eye, Brain, GitBranch, ArrowRight, Chrome, Terminal, KeyRound } from "lucide-react";

export const Route = createFileRoute("/workflow")({
  head: () => ({
    meta: [
      { title: "Workflow · Jeradin" },
      {
        name: "description",
        content:
          "How Jeradin works: capture, understand, explain, fix. See the four-step debugging loop and learn how to install Jeradin in under 60 seconds.",
      },
      { property: "og:title", content: "Workflow · Jeradin" },
      { property: "og:description", content: "The debugging loop that keeps you shipping." },
    ],
  }),
  component: WorkflowPage,
});

const steps = [
  {
    icon: Monitor,
    n: "01 · Capture",
    t: "Point Jeradin at the screen you're stuck on.",
    b: "Click the extension icon, drop a screenshot into the web app, or hit the desktop hotkey. Jeradin grabs the current frame of whatever you're looking at — an editor, a browser, a devtools panel, a terminal — and treats it as one unified context.",
  },
  {
    icon: Eye,
    n: "02 · Understand",
    t: "The Jeradin agent reads the frame like a senior engineer.",
    b: "It extracts stack traces, console errors, network failures, file paths, cursor positions and highlighted code. It figures out which framework you're in, which file is on screen, and what the visible code is trying to do — before it says a word about the bug.",
  },
  {
    icon: Brain,
    n: "03 · Explain",
    t: "You get a full report in 2 to 5 seconds.",
    b: "Root cause, why it happened, the exact affected file, a confidence score with an explanation, a plain-English fix, an alternative approach, difficulty rating, estimated fix time, side effects to watch for, and the next debugging step. No stack-trace paste required.",
  },
  {
    icon: GitBranch,
    n: "04 · Hand back",
    t: "Apply the fix in your own tool — Jeradin never writes.",
    b: "Copy the suggestion, send it to Cursor or Lovable as a ready-made prompt, or paste it straight into your editor. Jeradin has no permission to touch your code, your repo, or your deployments. You stay fully in control.",
  },
];

function WorkflowPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />

      <section className="pt-32 pb-14 mx-auto max-w-4xl px-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Workflow</div>
        <h1 className="mt-3 text-[44px] sm:text-[64px] leading-[1.02] tracking-[-0.04em] font-medium">
          <AnimatedWords text="Capture. Understand. Explain. Fix." />
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] text-black/60 leading-relaxed">
          Jeradin sits quietly beside your editor and only speaks when it has
          something useful to say. Here's exactly what happens between the moment
          you hit capture and the moment you're unblocked.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="grid gap-px bg-black/5 border border-black/5">
          {steps.map((s, i) => (
            <FadeIn key={s.n} delay={i * 0.05}>
              <div className="bg-white p-10 grid md:grid-cols-[200px_1fr] gap-8">
                <div>
                  <s.icon className="h-5 w-5" />
                  <div className="mt-4 text-[11px] uppercase tracking-[0.2em] text-black/40">{s.n}</div>
                </div>
                <div>
                  <h3 className="text-[22px] tracking-[-0.02em] font-medium">{s.t}</h3>
                  <p className="mt-3 text-[14px] text-black/60 leading-relaxed">{s.b}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* What the agent does */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Inside the agent</div>
        <h2 className="mt-2 text-[32px] tracking-[-0.02em] font-medium">What the Jeradin agent actually does.</h2>
        <div className="mt-8 grid md:grid-cols-2 gap-8 text-[14px] text-black/65 leading-relaxed">
          <p>
            The agent runs a two-tier pipeline. An <b>Instant</b> tier handles the
            simple stuff — typos, missing imports, TypeScript friction, lint
            warnings, undefined variables — in around two seconds. A <b>Smart</b>
            tier takes over automatically for anything that crosses files or
            involves hydration, async flow, auth, database or build config.
          </p>
          <p>
            Every report is structured: category, severity, affected file, a root
            cause you can quote, a confidence score you can trust, a primary fix
            and an alternative. If two errors on screen are actually the same
            problem in disguise, Jeradin links them and tells you which one to
            solve first.
          </p>
        </div>
      </section>

      {/* Install */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Install</div>
        <h2 className="mt-2 text-[32px] tracking-[-0.02em] font-medium">Set up in under 60 seconds.</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {[
            { icon: Chrome, t: "1. Add the extension", b: "Download the Jeradin extension bundle, unzip it, and load it in chrome://extensions with Developer mode on." },
            { icon: KeyRound, t: "2. Pair your account", b: "Sign in on jeradin.com and generate a connection token. Paste it into the extension popup once — that's it." },
            { icon: Terminal, t: "3. Capture something", b: "Open any tab you want to debug, click the Jeradin icon, hit Capture. A full report lands in the popup in seconds." },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl border border-black/10 p-6 h-full flex flex-col">
              <x.icon className="h-5 w-5" />
              <div className="mt-4 text-[15px] font-medium tracking-tight">{x.t}</div>
              <p className="mt-2 text-[13px] text-black/55 leading-relaxed">{x.b}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link to="/download" className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-[13px] font-medium text-white hover:opacity-90">
            Install Jeradin <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
