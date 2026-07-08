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

  // Upsert the subscription row
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

  // Grant plan credits — preserve leftover top-up balance above the previous monthly grant.
  const entry = getPlanEntry(priceId);
  if (entry) {
    const { data: current } = await supabase
      .from("user_credits")
      .select("balance, monthly_credits")
      .eq("user_id", userId)
      .maybeSingle();

    const prevMonthly = current?.monthly_credits ?? 0;
    const prevBalance = current?.balance ?? 0;
    const leftover = Math.max(prevBalance - prevMonthly, 0);

    await supabase.from("user_credits").upsert(
      {
        user_id: userId,
        plan: entry.plan,
        monthly_credits: entry.credits,
        balance: entry.credits + leftover,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange, items } = data;
  const supabase = getSupabase();

  await supabase
    .from("subscriptions")
    .update({
      status,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      cancel_at_period_end: scheduledChange?.action === "cancel",
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", id)
    .eq("environment", env);

  // Plan change (upgrade/downgrade): refresh price_id + grant new tier's credits.
  const newPriceId = items?.[0]?.price?.importMeta?.externalId;
  if (!newPriceId) return;

  const { data: row } = await supabase
    .from("subscriptions")
    .select("user_id, price_id")
    .eq("paddle_subscription_id", id)
    .maybeSingle();

  if (!row || row.price_id === newPriceId) return; // no plan change

  const entry = getPlanEntry(newPriceId);
  if (!entry) return;

  await supabase
    .from("subscriptions")
    .update({ price_id: newPriceId })
    .eq("paddle_subscription_id", id);

  const { data: credits } = await supabase
    .from("user_credits")
    .select("balance, monthly_credits")
    .eq("user_id", row.user_id as string)
    .maybeSingle();

  const prevMonthly = (credits?.monthly_credits as number | undefined) ?? 0;
  const prevBalance = (credits?.balance as number | undefined) ?? 0;
  const leftover = Math.max(prevBalance - prevMonthly, 0);

  await supabase.from("user_credits").upsert(
    {
      user_id: row.user_id as string,
      plan: entry.plan,
      monthly_credits: entry.credits,
      balance: entry.credits + leftover,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  // Keep access until current_period_end (grace period).
  // has_active_subscription() already treats canceled + future period_end as active.
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
