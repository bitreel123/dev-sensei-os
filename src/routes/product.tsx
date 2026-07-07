import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";
import { FadeIn, AnimatedWords } from "@/components/jeradin/animated-text";
import { DashboardMockup } from "@/components/jeradin/dashboard-mockup";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/product")({
  head: () => ({
    meta: [
      { title: "Product · Jeradin" },
      {
        name: "description",
        content:
          "Jeradin reads your screen, understands what your code is doing, and explains errors in real time — without ever touching your codebase.",
      },
      { property: "og:title", content: "Product · Jeradin" },
      {
        property: "og:description",
        content: "A read-only debugger that watches, understands and explains.",
      },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="pt-32 pb-20 mx-auto max-w-4xl px-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">
          Product
        </div>
        <h1 className="mt-3 text-[44px] sm:text-[64px] leading-[1.02] tracking-[-0.04em] font-medium">
          <AnimatedWords text="A debugger that lives on top of your screen." />
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] text-black/55 leading-relaxed">
          Jeradin uses on-device screen understanding and semantic code analysis to
          detect bugs in any vibecoding environment — Lovable, Cursor, Replit,
          Gemini and beyond. It points to the exact line. It explains the cause.
          It shows the correction. You stay in control.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <FadeIn>
          <DashboardMockup />
        </FadeIn>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-28 grid md:grid-cols-3 gap-10">
        {[
          {
            t: "Semantic, not syntactic",
            b: "Most linters catch typos. Jeradin catches intent mismatches — when your code runs but doesn't do what you meant.",
          },
          {
            t: "Zero write access",
            b: "Jeradin has no permission to edit, commit or push. It is, by design, observation-only.",
          },
          {
            t: "Local first",
            b: "Screen frames and stack traces are processed on-device when possible. Cloud is opt-in for heavy reasoning.",
          },
        ].map((x) => (
          <div key={x.t}>
            <h3 className="text-[16px] font-medium">{x.t}</h3>
            <p className="mt-2 text-[13.5px] text-black/55 leading-relaxed">{x.b}</p>
          </div>
        ))}
      </section>

      <section className="border-t border-black/5 bg-white">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center">
          <h2 className="text-[36px] tracking-[-0.03em] font-medium">
            Ready to never lose credits to a silent bug again?
          </h2>
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
