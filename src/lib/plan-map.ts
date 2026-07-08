// Maps human-readable price IDs to plan tier + monthly credit grant.
// Single source of truth used by both the webhook (server) and the pricing UI (client).

export type PlanId = "free" | "basic" | "pro" | "elite";
export type BillingCycle = "monthly" | "yearly";

export type PlanEntry = {
  plan: PlanId;
  credits: number;
  cycle: BillingCycle;
};

export const PLAN_MAP: Record<string, PlanEntry> = {
  basic_80_monthly: { plan: "basic", credits: 80, cycle: "monthly" },
  basic_80_yearly: { plan: "basic", credits: 80, cycle: "yearly" },
  basic_200_monthly: { plan: "basic", credits: 200, cycle: "monthly" },
  basic_200_yearly: { plan: "basic", credits: 200, cycle: "yearly" },
  basic_500_monthly: { plan: "basic", credits: 500, cycle: "monthly" },
  basic_500_yearly: { plan: "basic", credits: 500, cycle: "yearly" },
  pro_220_monthly: { plan: "pro", credits: 220, cycle: "monthly" },
  pro_220_yearly: { plan: "pro", credits: 220, cycle: "yearly" },
  pro_600_monthly: { plan: "pro", credits: 600, cycle: "monthly" },
  pro_600_yearly: { plan: "pro", credits: 600, cycle: "yearly" },
  pro_1500_monthly: { plan: "pro", credits: 1500, cycle: "monthly" },
  pro_1500_yearly: { plan: "pro", credits: 1500, cycle: "yearly" },
  elite_600_monthly: { plan: "elite", credits: 600, cycle: "monthly" },
  elite_600_yearly: { plan: "elite", credits: 600, cycle: "yearly" },
  elite_1500_monthly: { plan: "elite", credits: 1500, cycle: "monthly" },
  elite_1500_yearly: { plan: "elite", credits: 1500, cycle: "yearly" },
  elite_4000_monthly: { plan: "elite", credits: 4000, cycle: "monthly" },
  elite_4000_yearly: { plan: "elite", credits: 4000, cycle: "yearly" },
};

export function getPlanEntry(priceId: string): PlanEntry | null {
  return PLAN_MAP[priceId] ?? null;
}
