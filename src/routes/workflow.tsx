import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";
import { FadeIn, AnimatedWords } from "@/components/jeradin/animated-text";
import { Monitor, Eye, Brain, GitBranch } from "lucide-react";

export const Route = createFileRoute("/workflow")({
  head: () => ({
    meta: [
      { title: "Workflow · Jeradin" },
      {
        name: "description",
        content:
          "How Jeradin fits into your vibecoding loop: observe, detect, explain, hand back. Read-only by design.",
      },
      { property: "og:title", content: "Workflow · Jeradin" },
      {
        property: "og:description",
        content: "The four-step debugging loop that keeps your credits intact.",
      },
    ],
  }),
  component: WorkflowPage,
});

const steps = [
  {
    icon: Monitor,
    n: "01 · Observe",
    t: "Jeradin quietly records your editor, terminal and preview frames.",
    b: "A lightweight observer captures only what's visible on your active vibecoding workspace. Nothing leaves your machine without permission.",
  },
  {
    icon: Eye,
    n: "02 · Detect",
    t: "It reads stack traces, console errors and visual anomalies the moment they appear.",
    b: "Hydration mismatches, undefined props, broken routes, missing awaits, infinite loops — flagged before you notice them yourself.",
  },
  {
    icon: Brain,
    n: "03 · Explain",
    t: "A semantic engine translates raw errors into plain language.",
    b: "Not a stack trace. A sentence: 'user is undefined because useUser() hasn't resolved yet — add optional chaining on line 42.'",
  },
  {
    icon: GitBranch,
    n: "04 · Hand back",
    t: "Send the suggested fix back to your vibecoding tool — or copy it manually.",
    b: "Jeradin never writes. It offers a one-click prompt that lands in Lovable, Cursor or your IDE so you can apply the fix in your own flow.",
  },
];

function WorkflowPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="pt-32 pb-16 mx-auto max-w-4xl px-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">
          Workflow
        </div>
        <h1 className="mt-3 text-[44px] sm:text-[64px] leading-[1.02] tracking-[-0.04em] font-medium">
          <AnimatedWords text="Observe. Detect. Explain. Hand back." />
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] text-black/55 leading-relaxed">
          A loop designed for the way vibecoders actually work — fast, visual,
          interruption-driven. Jeradin stays out of the way until it has something
          worth saying.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-28">
        <div className="grid gap-px bg-black/5 border border-black/5">
          {steps.map((s, i) => (
            <FadeIn key={s.n} delay={i * 0.05}>
              <div className="bg-white p-10 grid md:grid-cols-[200px_1fr] gap-8">
                <div>
                  <s.icon className="h-5 w-5" />
                  <div className="mt-4 text-[11px] uppercase tracking-[0.2em] text-black/40">
                    {s.n}
                  </div>
                </div>
                <div>
                  <h3 className="text-[22px] tracking-[-0.02em] font-medium">{s.t}</h3>
                  <p className="mt-3 text-[14px] text-black/55 leading-relaxed">{s.b}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
