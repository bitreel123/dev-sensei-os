import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/hooks/use-user-data";
import { usePaddleCheckout } from "@/hooks/use-paddle-checkout";
import { PLAN_MAP, type PlanId } from "@/lib/plan-map";
import { toast } from "sonner";
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

type CreditOption = { credits: number; price: number; priceIdMonthly?: string; priceIdYearly?: string };

type Tier = {
  id: PlanId;
  name: string;
  tagline: string;
  image: string;
  options: CreditOption[];
  features: string[];
  perks: string[];
};

const YEARLY_DISCOUNT = 0.2;
const RANK: Record<PlanId, number> = { free: 0, basic: 1, pro: 2, elite: 3 };

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Try Jeradin with zero commitment.",
    image: planFree,
    options: [{ credits: 5, price: 0 }],
    features: ["5 monthly credits", "Real-Time Error Intelligence", "Lovable + Cursor connectors", "Community support"],
    perks: ["Standard rate limits", "1 workspace"],
  },
  {
    id: "basic",
    name: "Basic",
    tagline: "For solo builders shipping every day.",
    image: planBasic,
    options: [
      { credits: 80, price: 8, priceIdMonthly: "basic_80_monthly", priceIdYearly: "basic_80_yearly" },
      { credits: 200, price: 18, priceIdMonthly: "basic_200_monthly", priceIdYearly: "basic_200_yearly" },
      { credits: 500, price: 40, priceIdMonthly: "basic_500_monthly", priceIdYearly: "basic_500_yearly" },
    ],
    features: ["Everything in Free", "Semantic System Intelligence", "Screen Intelligence", "All MCP connectors", "Email support"],
    perks: ["On-demand top-ups", "Credit rollover up to 1 month"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For power users and small teams.",
    image: planPro,
    options: [
      { credits: 220, price: 20, priceIdMonthly: "pro_220_monthly", priceIdYearly: "pro_220_yearly" },
      { credits: 600, price: 50, priceIdMonthly: "pro_600_monthly", priceIdYearly: "pro_600_yearly" },
      { credits: 1500, price: 110, priceIdMonthly: "pro_1500_monthly", priceIdYearly: "pro_1500_yearly" },
    ],
    features: ["Everything in Basic", "Knowledge Discovery", "GitHub Intelligence", "Priority cloud reasoning", "3 team seats"],
    perks: ["Rollover cap up to 2 months", "Priority support"],
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "For teams operating at scale.",
    image: planElite,
    options: [
      { credits: 600, price: 50, priceIdMonthly: "elite_600_monthly", priceIdYearly: "elite_600_yearly" },
      { credits: 1500, price: 120, priceIdMonthly: "elite_1500_monthly", priceIdYearly: "elite_1500_yearly" },
      { credits: 4000, price: 300, priceIdMonthly: "elite_4000_monthly", priceIdYearly: "elite_4000_yearly" },
    ],
    features: ["Everything in Pro", "Highest rate limits", "Shared team memory", "SSO + role management", "Unlimited seats"],
    perks: ["Rollover cap up to 3 months", "Dedicated support"],
  },
];

type Cycle = "monthly" | "yearly";

function yearlyMonthlyPrice(monthly: number) {
  return Math.round(monthly * (1 - YEARLY_DISCOUNT));
}
function yearlyTotal(monthly: number) {
  return yearlyMonthlyPrice(monthly) * 12;
}

function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const { credits, subscription, refetch } = useUserData(user?.id ?? null);
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();

  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [selectedOption, setSelectedOption] = useState<Record<PlanId, number>>({
    free: 0,
    basic: 0,
    pro: 0,
    elite: 0,
  });

  // Success toast + refetch after Paddle checkout redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast.success("Payment successful — credits granted");
      // Give the webhook a moment, then refetch a few times.
      const timers = [800, 2000, 4500].map((ms) =>
        setTimeout(() => refetch(), ms),
      );
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
      return () => timers.forEach(clearTimeout);
    }
  }, [refetch]);

  const currentPlan: PlanId = (credits?.plan as PlanId) ?? "free";
  const currentPriceId = subscription?.price_id;
  const currentCycle: Cycle | null = currentPriceId
    ? PLAN_MAP[currentPriceId]?.cycle ?? null
    : null;

  const currentTier = useMemo(
    () => TIERS.find((t) => t.id === currentPlan)!,
    [currentPlan],
  );

  async function choose(tier: Tier) {
    if (!user) {
      toast("Sign in to subscribe", {
        action: { label: "Sign in", onClick: () => (window.location.href = "/login") },
      });
      return;
    }
    if (tier.id === "free") {
      toast("You're on the Free plan by default");
      return;
    }
    const opt = tier.options[selectedOption[tier.id]] ?? tier.options[0];
    const priceId = cycle === "yearly" ? opt.priceIdYearly : opt.priceIdMonthly;
    if (!priceId) return toast.error("Price not available");
    try {
      await openCheckout({
        priceId,
        userId: user.id,
        customerEmail: user.email ?? undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed to open");
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <PaymentTestModeBanner />
      <SiteHeader />

      <div className="pt-24 pb-2 mx-auto max-w-[1400px] px-5 flex items-center justify-between">
        <Link
          to="/"
          className="font-mono text-[11px] tracking-[0.22em] uppercase text-white/60 hover:text-white"
        >
          ← Go back
        </Link>
        <div className="flex items-center gap-3 text-[12px]">
          {user ? (
            <span className="text-white/60 font-mono text-[11px] tracking-[0.15em] uppercase">
              {user.email}
            </span>
          ) : (
            <>
              <span className="text-white/60">Already have an account?</span>
              <Link
                to="/login"
                className="border border-white/70 px-3 py-1.5 font-mono text-[11px] tracking-[0.22em] uppercase hover:bg-white hover:text-black transition-colors"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Current plan strip */}
      <section className="mx-auto max-w-[1400px] px-5 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-white/15 bg-white/[0.02] p-5">
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-white/60">
              {user ? "Current plan" : "Not signed in"}
            </div>
            <div
              className="mt-1 text-[36px] leading-none"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {user ? currentTier.name : "Free (preview)"}
            </div>
            <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70">
              {user
                ? `Balance · ${credits?.balance ?? 0} credits · ${credits?.monthly_credits ?? 0} monthly${currentCycle ? ` · billed ${currentCycle}` : " · no billing"}${subscription?.cancel_at_period_end ? " · cancels at period end" : ""}`
                : "Sign in to see your real balance"}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-10">
        {/* Cycle toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex border border-white/25 p-1">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`px-5 py-2 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors ${
                  cycle === c ? "bg-white text-black" : "text-white/70 hover:text-white"
                }`}
              >
                {c}
                {c === "yearly" && (
                  <span className="ml-2 text-[9.5px] tracking-[0.18em] opacity-80">
                    −{Math.round(YEARLY_DISCOUNT * 100)}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.map((t) => {
            const optIdx = selectedOption[t.id] ?? 0;
            const opt = t.options[optIdx];
            const isFree = t.id === "free";
            const effectiveCycle: Cycle = isFree ? "monthly" : cycle;
            const displayPrice =
              effectiveCycle === "yearly" ? yearlyMonthlyPrice(opt.price) : opt.price;

            const activePriceId =
              effectiveCycle === "yearly" ? opt.priceIdYearly : opt.priceIdMonthly;
            const isCurrent =
              user != null &&
              ((isFree && currentPlan === "free" && !subscription) ||
                (activePriceId && activePriceId === currentPriceId));
            const isUpgrade = RANK[t.id] > RANK[currentPlan];
            const label = !user
              ? isFree
                ? "Free by default"
                : "Sign in to subscribe"
              : isCurrent
                ? "Your current plan"
                : isFree
                  ? "Downgrade"
                  : isUpgrade
                    ? "Upgrade"
                    : t.id === currentPlan
                      ? "Switch plan"
                      : "Downgrade";

            const disabled =
              (isCurrent ?? false) ||
              checkoutLoading ||
              authLoading ||
              (isFree && !user);

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
                    style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
                  >
                    ${displayPrice}
                  </div>
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/60">
                    /mo
                  </div>
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45 min-h-[14px]">
                  {isFree
                    ? "Forever"
                    : effectiveCycle === "yearly"
                      ? `$${yearlyTotal(opt.price)} billed yearly · save $${(opt.price - displayPrice) * 12}`
                      : "Billed monthly"}
                </div>

                <div className="mt-4">
                  <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
                    Monthly credits
                  </label>
                  <select
                    value={optIdx}
                    onChange={(e) =>
                      setSelectedOption((s) => ({ ...s, [t.id]: Number(e.target.value) }))
                    }
                    disabled={t.options.length === 1}
                    className="mt-1.5 w-full bg-black border border-white/25 px-3 py-2.5 font-mono text-[12px] text-white focus:outline-none focus:border-white disabled:opacity-60"
                  >
                    {t.options.map((o, i) => {
                      const p =
                        effectiveCycle === "yearly" ? yearlyMonthlyPrice(o.price) : o.price;
                      return (
                        <option key={i} value={i} className="bg-black text-white">
                          {o.credits} credits · ${p}/mo
                        </option>
                      );
                    })}
                  </select>
                </div>

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
                  disabled={disabled}
                  className={`mt-5 w-full border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.25em] transition-colors ${
                    disabled
                      ? "border-white/25 text-white/50 cursor-not-allowed bg-white/5"
                      : "border-white text-black bg-white hover:bg-white/90"
                  }`}
                >
                  {checkoutLoading ? "Opening…" : label}
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
          Monthly credits · Prorated upgrades · Access kept until period end on cancel
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
