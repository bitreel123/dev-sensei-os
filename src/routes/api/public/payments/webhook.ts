import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";
import { getPlanEntry } from "@/lib/plan-map";

let _supabase: ReturnType<typeof createClient<Database>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

// Reset credits to the plan's monthly grant. Optionally preserve leftover top-ups
// (used on plan changes; NOT used on renewals — user chose "reset to monthly grant").
async function setPlanCredits(
  userId: string,
  env: PaddleEnv,
  plan: string,
  monthly: number,
  opts: { preserveLeftover: boolean },
) {
  const supabase = getSupabase();
  let balance = monthly;
  if (opts.preserveLeftover) {
    const { data: cur } = await supabase
      .from("user_credits")
      .select("balance, monthly_credits")
      .eq("user_id", userId)
      .eq("environment", env)
      .maybeSingle();
    const leftover = Math.max((cur?.balance ?? 0) - (cur?.monthly_credits ?? 0), 0);
    balance = monthly + leftover;
  }
  await supabase.from("user_credits").upsert(
    {
      user_id: userId,
      environment: env,
      plan,
      monthly_credits: monthly,
      balance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,environment" },
  );
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;
  const userId = customData?.userId;
  if (!userId) {
    console.error("[webhook] subscription.created missing customData.userId");
    return;
  }
  const item = items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const productId = item?.product?.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn("[webhook] skipping: missing importMeta.externalId", {
      rawPriceId: item?.price?.id,
      rawProductId: item?.product?.id,
    });
    return;
  }

  const supabase = getSupabase();

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      paddle_subscription_id: id,
      paddle_customer_id: customerId,
      product_id: productId,
      price_id: priceId,
      status,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "paddle_subscription_id" },
  );

  const entry = getPlanEntry(priceId);
  if (entry) {
    // On initial purchase, preserve any leftover top-up credits.
    await setPlanCredits(userId, env, entry.plan, entry.credits, { preserveLeftover: true });
  }
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange, items } = data;
  const supabase = getSupabase();

  const { data: prev } = await supabase
    .from("subscriptions")
    .select("user_id, price_id, current_period_start")
    .eq("paddle_subscription_id", id)
    .maybeSingle();

  const newPriceId = items?.[0]?.price?.importMeta?.externalId ?? prev?.price_id;
  const newPeriodStart = currentBillingPeriod?.startsAt ?? null;
  const planChanged = !!(prev && newPriceId && prev.price_id !== newPriceId);
  const periodRolled = !!(
    prev &&
    newPeriodStart &&
    prev.current_period_start &&
    new Date(newPeriodStart).getTime() > new Date(prev.current_period_start).getTime()
  );

  await supabase
    .from("subscriptions")
    .update({
      status,
      price_id: newPriceId,
      current_period_start: newPeriodStart,
      current_period_end: currentBillingPeriod?.endsAt,
      cancel_at_period_end: scheduledChange?.action === "cancel",
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", id)
    .eq("environment", env);

  if (!prev || !newPriceId) return;
  const entry = getPlanEntry(newPriceId);
  if (!entry) return;

  if (planChanged) {
    // Upgrade/downgrade: prorated switch, preserve leftover top-ups.
    await setPlanCredits(prev.user_id, env, entry.plan, entry.credits, {
      preserveLeftover: true,
    });
  } else if (periodRolled && (status === "active" || status === "trialing")) {
    // Renewal: reset to monthly grant, no rollover (per user choice).
    await setPlanCredits(prev.user_id, env, entry.plan, entry.credits, {
      preserveLeftover: false,
    });
  }
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  // Keep access until current_period_end (grace period).
  // A pg_cron sweep + on-mount reconcile flips user_credits back to Free after period_end.
  const supabase = getSupabase();
  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);
}

async function handleTransactionPaymentFailed(data: any, env: PaddleEnv) {
  // Mark the linked subscription as past_due so the app can show a dunning banner.
  const subId = data?.subscriptionId;
  if (!subId) return;
  const supabase = getSupabase();
  await supabase
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("paddle_subscription_id", subId)
    .eq("environment", env);
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    case EventName.TransactionPaymentFailed:
      await handleTransactionPaymentFailed(event.data, env);
      break;
    default:
      console.log("[webhook] unhandled:", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[webhook] error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
