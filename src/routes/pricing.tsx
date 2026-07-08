import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
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
          "Feature-based monthly credit plans for Jeradin — real-time error, semantic, screen, knowledge and GitHub intelligence.",
      },
      { property: "og:title", content: "Pricing · Jeradin" },
      {
        property: "og:description",
        content: "Monthly credit plans for the Jeradin debugging copilot.",
      },
    ],
  }),
  component: PricingPage,
});

type TierId = "free" | "basic" | "pro" | "elite";

type CreditOption = { credits: number; price: number };

type Tier = {
  id: TierId;
  name: string;
  tagline: string;
  image: string;
  options: CreditOption[]; // first entry is the default
  features: string[];
  perks: string[];
};

const YEARLY_DISCOUNT = 0.2; // 20% off = ~2 months free

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Try Jeradin with zero commitment.",
    image: planFree,
    options: [{ credits: 5, price: 0 }],
    features: [
      "5 monthly credits",
      "Real-Time Error Intelligence",
      "Lovable + Cursor connectors",
      "Community support",
    ],
    perks: ["Standard rate limits", "1 workspace"],
  },
  {
    id: "basic",
    name: "Basic",
    tagline: "For solo builders shipping every day.",
    image: planBasic,
    options: [
      { credits: 80, price: 8 },
      { credits: 200, price: 18 },
      { credits: 500, price: 40 },
    ],
    features: [
      "Everything in Free",
      "Semantic System Intelligence",
      "Screen Intelligence",
      "All MCP connectors",
      "Email support",
    ],
    perks: ["On-demand top-ups", "Credit rollover up to 1 month"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For power users and small teams.",
    image: planPro,
    options: [
      { credits: 220, price: 20 },
      { credits: 600, price: 50 },
      { credits: 1500, price: 110 },
    ],
    features: [
      "Everything in Basic",
      "Knowledge Discovery",
      "GitHub Intelligence",
      "Priority cloud reasoning",
      "3 team seats",
    ],
    perks: ["Rollover cap up to 2 months", "Priority support"],
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "For teams operating at scale.",
    image: planElite,
    options: [
      { credits: 600, price: 50 },
      { credits: 1500, price: 120 },
      { credits: 4000, price: 300 },
    ],
    features: [
      "Everything in Pro",
      "Highest rate limits",
      "Shared team memory",
      "SSO + role management",
      "Unlimited seats",
    ],
    perks: ["Rollover cap up to 3 months", "Dedicated support"],
  },
];

const RANK: Record<TierId, number> = { free: 0, basic: 1, pro: 2, elite: 3 };
const STORAGE_KEY = "jeradin:billing";
const TOPUP_RATE = 10; // 1 USD = 10 credits

type Cycle = "monthly" | "yearly";

type BillingState = {
  plan: TierId;
  cycle: Cycle;
  monthlyCredits: number; // included with the plan
  balance: number; // usable credits (monthly + top-ups)
};

const DEFAULT_STATE: BillingState = {
  plan: "free",
  cycle: "monthly",
  monthlyCredits: 5,
  balance: 5,
};

function loadBilling(): BillingState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<BillingState>) };
  } catch {}
  return DEFAULT_STATE;
}

function saveBilling(state: BillingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function yearlyMonthlyPrice(monthly: number) {
  return Math.round(monthly * (1 - YEARLY_DISCOUNT));
}
function yearlyTotal(monthly: number) {
  return yearlyMonthlyPrice(monthly) * 12;
}

function PricingPage() {
  const [state, setState] = useState<BillingState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [selectedOption, setSelectedOption] = useState<Record<TierId, number>>({
    free: 0,
    basic: 0,
    pro: 0,
    elite: 0,
  });
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(10);

  useEffect(() => {
    setState(loadBilling());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const currentTier = useMemo(
    () => TIERS.find((t) => t.id === state.plan)!,
    [state.plan]
  );

  function choose(tier: Tier) {
    const opt = tier.options[selectedOption[tier.id]] ?? tier.options[0];
    if (tier.id === state.plan && opt.credits === state.monthlyCredits) return;
    const prevRank = RANK[state.plan];
    const nextRank = RANK[tier.id];
    // preserve any leftover top-up balance above the previous monthly grant
    const leftover = Math.max(state.balance - state.monthlyCredits, 0);
    const next: BillingState = {
      plan: tier.id,
      monthlyCredits: opt.credits,
      balance: opt.credits + leftover,
    };
    setState(next);
    saveBilling(next);
    const action =
      nextRank > prevRank
        ? "Upgraded"
        : nextRank < prevRank
        ? "Downgraded"
        : "Switched";
    setToast(`${action} to ${tier.name} · ${opt.credits} monthly credits`);
  }

  function confirmTopUp() {
    if (state.plan === "free") {
      setToast("Upgrade to a paid plan to top up");
      setTopupOpen(false);
      return;
    }
    const usd = Math.max(1, Math.floor(topupAmount));
    const added = usd * TOPUP_RATE;
    const next: BillingState = {
      ...state,
      balance: state.balance + added,
    };
    setState(next);
    saveBilling(next);
    setTopupOpen(false);
    setToast(`Topped up +${added} credits ($${usd})`);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-white/15 bg-white/[0.02] p-5">
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-white/60">
              Current plan
            </div>
            <div
              className="mt-1 text-[36px] leading-none"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {currentTier.name}
            </div>
            <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
              Balance · {hydrated ? state.balance : 0} credits ·{" "}
              {hydrated ? state.monthlyCredits : 0} monthly
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTopupOpen(true)}
              disabled={state.plan === "free"}
              className="border border-white/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] hover:bg-white hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Top up
            </button>
          </div>
        </div>
      </section>

      {/* Plan grid — Lovable-style dark cards with credit selector */}
      <section className="mx-auto max-w-[1400px] px-5 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.map((t) => {
            const optIdx = selectedOption[t.id] ?? 0;
            const opt = t.options[optIdx];
            const isCurrent =
              t.id === state.plan && opt.credits === state.monthlyCredits;
            const isUpgrade = RANK[t.id] > RANK[state.plan];
            const label = isCurrent
              ? "Your current plan"
              : isUpgrade
              ? "Upgrade"
              : t.id === state.plan
              ? "Switch plan"
              : "Downgrade";

            return (
              <article
                key={t.id}
                className="flex flex-col border border-white/15 bg-white/[0.03] p-5 hover:border-white/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-white/70">
                    {t.name}
                  </span>
                </div>

                <p className="mt-2 text-[13px] text-white/60 leading-snug min-h-[36px]">
                  {t.tagline}
                </p>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <div
                    className="text-[56px] leading-none"
                    style={{
                      fontFamily: "'Instrument Serif', serif",
                      fontWeight: 400,
                    }}
                  >
                    ${opt.price}
                  </div>
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/60">
                    /mo
                  </div>
                </div>

                {/* Credit selector */}
                <div className="mt-4">
                  <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
                    Monthly credits
                  </label>
                  <select
                    value={optIdx}
                    onChange={(e) =>
                      setSelectedOption((s) => ({
                        ...s,
                        [t.id]: Number(e.target.value),
                      }))
                    }
                    disabled={t.options.length === 1}
                    className="mt-1.5 w-full bg-black border border-white/25 px-3 py-2.5 font-mono text-[12px] text-white focus:outline-none focus:border-white disabled:opacity-60"
                  >
                    {t.options.map((o, i) => (
                      <option key={i} value={i} className="bg-black text-white">
                        {o.credits} credits · ${o.price}/mo
                      </option>
                    ))}
                  </select>
                </div>

                {/* Image */}
                <div className="relative mt-5 aspect-square w-full overflow-hidden border border-white/15 bg-black">
                  <img
                    src={t.image}
                    alt={`${t.name} plan illustration`}
                    loading="lazy"
                    width={768}
                    height={768}
                    className="h-full w-full object-cover"
                  />
                </div>

                <button
                  onClick={() => choose(t)}
                  disabled={isCurrent}
                  className={`mt-5 w-full border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.25em] transition-colors ${
                    isCurrent
                      ? "border-white/25 text-white/50 cursor-not-allowed bg-white/5"
                      : "border-white text-black bg-white hover:bg-white/90"
                  }`}
                >
                  {label}
                </button>

                <ul className="mt-6 space-y-2.5 text-[13px] text-white/85 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 mt-0.5 text-white/70 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {t.perks.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-white/10 space-y-1.5">
                    {t.perks.map((p) => (
                      <div
                        key={p}
                        className="font-mono text-[10.5px] uppercase tracking-[0.15em] text-white/50"
                      >
                        · {p}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-white/50 text-center">
          Monthly credits · No daily reset · Top up anytime · Cancel anytime
        </p>
      </section>

      {/* Top-up modal */}
      {topupOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-5">
          <div className="w-full max-w-md border border-white/20 bg-black p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/60">
              Top up credits
            </div>
            <div
              className="mt-2 text-[28px] leading-none"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Add credits to your balance
            </div>
            <p className="mt-3 text-[13px] text-white/60">
              ${topupAmount} = {topupAmount * TOPUP_RATE} credits. One-time
              charge, credits never expire.
            </p>

            <div className="mt-5 flex gap-2">
              {[10, 25, 50, 100].map((v) => (
                <button
                  key={v}
                  onClick={() => setTopupAmount(v)}
                  className={`flex-1 border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
                    topupAmount === v
                      ? "border-white bg-white text-black"
                      : "border-white/30 text-white hover:border-white"
                  }`}
                >
                  ${v}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
                Custom amount (USD)
              </label>
              <input
                type="number"
                min={1}
                value={topupAmount}
                onChange={(e) => setTopupAmount(Number(e.target.value) || 0)}
                className="mt-1.5 w-full bg-black border border-white/25 px-3 py-2.5 font-mono text-[13px] text-white focus:outline-none focus:border-white"
              />
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setTopupOpen(false)}
                className="flex-1 border border-white/30 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] hover:border-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmTopUp}
                className="flex-1 border border-white bg-white text-black px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] hover:bg-white/90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 border border-white bg-black px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em]">
          {toast}
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
