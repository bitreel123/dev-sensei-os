import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";
import planFree from "@/assets/plan-free.jpg";
import planBasic from "@/assets/plan-basic.jpg";
import planPro from "@/assets/plan-pro.jpg";
import planElite from "@/assets/plan-elite.jpg";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing · Jeradin" },
      {
        name: "description",
        content:
          "Hybrid credit-based plans for Jeradin — real-time error, semantic, screen, knowledge and GitHub intelligence. Free, Basic, Pro and Elite tiers.",
      },
      { property: "og:title", content: "Pricing · Jeradin" },
      {
        property: "og:description",
        content: "Credit-based subscription plans for the Jeradin debugging copilot.",
      },
    ],
  }),
  component: PricingPage,
});

type TierId = "free" | "basic" | "pro" | "elite";

type Tier = {
  id: TierId;
  name: string;
  price: string;
  priceValue: number;
  sub: string;
  bonus?: string;
  image: string;
  credits: number;
  features: string[];
  ctaLabel?: string;
};

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    priceValue: 0,
    sub: "Forever",
    image: planFree,
    credits: 0,
    features: [
      "Real-Time Error Intelligence",
      "Standard rate limits",
      "$0 monthly credits",
      "Lovable + Cursor connectors",
      "Community support",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    price: "$8",
    priceValue: 8,
    sub: "Per month",
    bonus: "5% BONUS",
    image: planBasic,
    credits: 80,
    features: [
      "$8 monthly credits",
      "Real-Time Error Intelligence",
      "Semantic System Intelligence",
      "Screen Intelligence",
      "All MCP connectors",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$20",
    priceValue: 20,
    sub: "Per month",
    bonus: "10% BONUS",
    image: planPro,
    credits: 220,
    features: [
      "$22 monthly credits",
      "Everything in Basic",
      "Knowledge Discovery",
      "GitHub Intelligence",
      "Rollover cap up to $10",
      "Priority cloud reasoning",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    price: "$50",
    priceValue: 50,
    sub: "Per month",
    bonus: "15% BONUS",
    image: planElite,
    credits: 600,
    features: [
      "$57 monthly credits",
      "Everything in Pro",
      "Highest rate limits",
      "Rollover cap up to $30",
      "Shared team memory",
      "Dedicated support",
    ],
  },
];

const RANK: Record<TierId, number> = { free: 0, basic: 1, pro: 2, elite: 3 };
const STORAGE_KEY = "jeradin:billing";

type BillingState = { plan: TierId; credits: number };

function loadBilling(): BillingState {
  if (typeof window === "undefined") return { plan: "free", credits: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as BillingState;
  } catch {}
  return { plan: "free", credits: 0 };
}

function saveBilling(state: BillingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function PricingPage() {
  const [state, setState] = useState<BillingState>({ plan: "free", credits: 0 });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setState(loadBilling());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const currentTier = TIERS.find((t) => t.id === state.plan)!;

  function choose(tier: Tier) {
    if (tier.id === state.plan) return;
    const next: BillingState = { plan: tier.id, credits: tier.credits };
    setState(next);
    saveBilling(next);
    const action =
      RANK[tier.id] > RANK[state.plan] ? "Upgraded" : RANK[tier.id] < RANK[state.plan] ? "Downgraded" : "Switched";
    setToast(`${action} to ${tier.name} · ${tier.credits} credits loaded`);
  }

  function topUp(amount: number) {
    const next: BillingState = { plan: state.plan, credits: state.credits + amount };
    setState(next);
    saveBilling(next);
    setToast(`Topped up +${amount} credits`);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

      {/* Top bar mimic */}
      <div className="pt-24 pb-2 mx-auto max-w-[1400px] px-5 flex items-center justify-between">
        <Link
          to="/"
          className="font-mono text-[11px] tracking-[0.22em] uppercase text-white/60 hover:text-white"
        >
          ← Go back
        </Link>
        <div className="flex items-center gap-3 text-[12px]">
          <span className="text-white/60">Already have an account?</span>
          <Link
            to="/login"
            className="border border-white/70 px-3 py-1.5 font-mono text-[11px] tracking-[0.22em] uppercase hover:bg-white hover:text-black transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Current plan strip */}
      <section className="mx-auto max-w-[1400px] px-5 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-white/15 p-5">
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-white/60">
              Current plan
            </div>
            <div
              className="mt-1 font-serif text-[36px] leading-none"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {currentTier.name}
            </div>
            <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
              Balance · ${state.credits} credits
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => topUp(10)}
              disabled={state.plan === "free"}
              className="border border-white/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] hover:bg-white hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Top up +$10
            </button>
            <button
              onClick={() => topUp(50)}
              disabled={state.plan === "free"}
              className="border border-white/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] hover:bg-white hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Top up +$50
            </button>
          </div>
        </div>
      </section>

      {/* Plan grid */}
      <section className="mx-auto max-w-[1400px] px-5 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.map((t) => {
            const isCurrent = t.id === state.plan;
            const isUpgrade = RANK[t.id] > RANK[state.plan];
            const label = isCurrent
              ? "Your current plan"
              : isUpgrade
              ? "Upgrade"
              : "Downgrade";
            return (
              <article
                key={t.id}
                className="flex flex-col bg-[#1f21ff] text-white p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="bg-white/15 px-2.5 py-1 font-mono text-[10px] tracking-[0.22em] uppercase">
                    {t.name}
                  </span>
                  {t.bonus && (
                    <span className="border border-white/60 px-2.5 py-1 font-mono text-[10px] tracking-[0.22em] uppercase">
                      {t.bonus}
                    </span>
                  )}
                </div>

                <div className="mt-6">
                  <div
                    className="text-[64px] leading-none"
                    style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
                  >
                    {t.price}
                  </div>
                  <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/85">
                    {t.sub}
                  </div>
                </div>

                <div className="relative mt-6 aspect-square w-full overflow-hidden border border-white/20 bg-black">
                  <img
                    src={t.image}
                    alt={`${t.name} plan illustration`}
                    loading="lazy"
                    width={768}
                    height={768}
                    className="h-full w-full object-cover"
                  />
                </div>

                <ul className="mt-6 space-y-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/90 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-white/60">•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => choose(t)}
                  disabled={isCurrent}
                  className={`mt-6 w-full border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.25em] transition-colors ${
                    isCurrent
                      ? "border-white/30 text-white/50 cursor-not-allowed"
                      : "border-white text-white hover:bg-white hover:text-[#1f21ff]"
                  }`}
                >
                  {label}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 border border-white bg-black px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em]">
          {toast}
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
