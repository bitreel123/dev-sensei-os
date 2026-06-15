import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/fixdemy/header";
import { SiteFooter } from "@/components/fixdemy/footer";
import { FadeIn, AnimatedWords } from "@/components/fixdemy/animated-text";
import { Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing · Fixdemy" },
      { name: "description", content: "Free while in beta. Simple plans built for vibecoders, indie devs and teams." },
      { property: "og:title", content: "Pricing · Fixdemy" },
      { property: "og:description", content: "Free during beta. Honest pricing after." },
    ],
  }),
  component: PricingPage,
});

const tiers = [
  {
    name: "Free",
    price: "$0",
    sub: "While in beta",
    features: [
      "Real-time error detection",
      "Up to 50 fixes per day",
      "Lovable + Cursor connectors",
      "Local processing",
    ],
    cta: "Get started",
    href: "/signup",
    accent: false,
  },
  {
    name: "Pro",
    price: "$12",
    sub: "per month, billed yearly",
    features: [
      "Unlimited fixes",
      "All MCP connectors",
      "Semantic memory across projects",
      "Priority cloud reasoning",
      "Private mode",
    ],
    cta: "Start free trial",
    href: "/signup",
    accent: true,
  },
  {
    name: "Team",
    price: "Custom",
    sub: "For studios and agencies",
    features: [
      "Everything in Pro",
      "Shared issue history",
      "Org-wide MCP policies",
      "SAML SSO",
      "Dedicated support",
    ],
    cta: "Contact us",
    href: "/docs",
    accent: false,
  },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="pt-32 pb-12 mx-auto max-w-4xl px-5 text-center">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">
          Pricing
        </div>
        <h1 className="mt-3 text-[44px] sm:text-[64px] leading-[1.02] tracking-[-0.04em] font-medium">
          <AnimatedWords text="Honest pricing for honest debugging." />
        </h1>
        <p className="mt-5 max-w-xl mx-auto text-[14px] text-black/55">
          Free while we're in beta. After that, simple per-seat plans — no per-fix
          charges, ever.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-28">
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.07}>
              <div
                className={`rounded-2xl p-7 border h-full flex flex-col ${
                  t.accent ? "bg-black text-white border-black" : "bg-white border-black/10"
                }`}
              >
                <div className={`text-[12px] uppercase tracking-[0.2em] ${t.accent ? "text-white/50" : "text-black/40"}`}>
                  {t.name}
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-[44px] tracking-[-0.03em] font-medium">{t.price}</span>
                </div>
                <div className={`text-[12px] ${t.accent ? "text-white/55" : "text-black/45"}`}>
                  {t.sub}
                </div>
                <ul className="mt-7 space-y-2.5 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]">
                      <Check className={`h-3.5 w-3.5 mt-0.5 ${t.accent ? "text-white" : "text-black"}`} />
                      <span className={t.accent ? "text-white/85" : "text-black/75"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={t.href}
                  className={`mt-7 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-[13px] font-medium ${
                    t.accent
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-black text-white hover:bg-black/90"
                  }`}
                >
                  {t.cta}
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
