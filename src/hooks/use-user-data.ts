import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";

export type UserCredits = {
  plan: string;
  monthly_credits: number;
  balance: number;
};

export type SubscriptionRow = {
  paddle_subscription_id: string;
  price_id: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
};

export function useUserData(userId: string | null) {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!userId) {
      setCredits(null);
      setSubscription(null);
      return;
    }
    setLoading(true);
    const env = getPaddleEnvironment();

    const [creditsRes, subRes] = await Promise.all([
      supabase
        .from("user_credits")
        .select("plan, monthly_credits, balance")
        .eq("user_id", userId)
        .eq("environment", env)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("paddle_subscription_id, price_id, status, cancel_at_period_end, current_period_end")
        .eq("user_id", userId)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setCredits(creditsRes.data ?? null);
    setSubscription(subRes.data ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime: refetch on any change to this user's credits or subscription.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`user-data-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_credits", filter: `user_id=eq.${userId}` },
        () => refetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  return { credits, subscription, loading, refetch };
}
