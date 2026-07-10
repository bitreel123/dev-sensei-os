import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/hooks/use-user-data";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import {
  openBillingPortal,
  cancelSubscription,
  reconcileExpiredCanceled,
} from "@/lib/account.functions";
import { toast } from "sonner";
import { PLAN_MAP } from "@/lib/plan-map";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account · Jeradin" },
      { name: "description", content: "Your Jeradin account, credits, and billing." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { credits, subscription, refetch } = useUserData(user?.id ?? null);
  const [busy, setBusy] = useState<"portal" | "cancel" | null>(null);

  // Redirect if signed out.
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  // Opportunistic reconcile on mount (catches expired-canceled subs before cron).
  useEffect(() => {
    if (!user) return;
    reconcileExpiredCanceled().then(({ updated }) => {
      if (updated > 0) refetch();
    }).catch(() => {});
  }, [user, refetch]);

  const env = getPaddleEnvironment();
  const entry = subscription?.price_id ? PLAN_MAP[subscription.price_id] : null;
  const cycle = entry?.cycle;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null;
  const isPastDue = subscription?.status === "past_due";
  const isCanceling = subscription?.cancel_at_period_end && subscription?.status !== "canceled";
  const isCanceled = subscription?.status === "canceled";

  async function handlePortal() {
    setBusy("portal");
    try {
      const { url } = await openBillingPortal({ data: { environment: env } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing portal");
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel your subscription? You'll keep access until the period end.")) return;
    setBusy("cancel");
    try {
      await cancelSubscription({ data: { environment: env } });
      toast.success("Subscription set to cancel at period end");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <PaymentTestModeBanner />
        <SiteHeader variant="dark" />
        <div className="pt-32 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <PaymentTestModeBanner />
      <SiteHeader variant="dark" />

      <div className="pt-24 pb-2 mx-auto max-w-[900px] px-5 flex items-center justify-between">
        <Link
          to="/chat"
          className="font-mono text-[11px] tracking-[0.22em] uppercase text-white/60 hover:text-white"
        >
          ← Home
        </Link>

        <button
          onClick={handleSignOut}
          className="border border-white/30 px-3 py-1.5 font-mono text-[11px] tracking-[0.22em] uppercase hover:bg-white hover:text-black transition-colors"
        >
          Sign out
        </button>
      </div>

      <section className="mx-auto max-w-[900px] px-5 pt-6 space-y-5">
        {isPastDue && (
          <div className="border border-red-500/50 bg-red-500/10 p-4 text-[13px] text-red-100">
            <strong className="font-mono uppercase tracking-[0.18em] text-[11px]">
              Payment failed
            </strong>{" "}
            — update your payment method to keep your plan.{" "}
            <button
              onClick={handlePortal}
              className="underline underline-offset-2 hover:text-white"
            >
              Update payment method
            </button>
          </div>
        )}

        {isCanceling && (
          <div className="border border-yellow-500/40 bg-yellow-500/5 p-4 text-[13px] text-yellow-100">
            Your plan is set to cancel on <strong>{periodEnd}</strong>. You'll keep access until then.
          </div>
        )}

        <div className="border border-white/15 bg-white/[0.02] p-6">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-white/60">
            Signed in as
          </div>
          <div className="mt-1 text-[20px]">{user.email}</div>
        </div>

        <div className="border border-white/15 bg-white/[0.02] p-6">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-white/60">
                Current plan
              </div>
              <div
                className="mt-1 text-[48px] leading-none capitalize"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                {credits?.plan ?? "free"}
              </div>
            </div>
            <Link
              to="/pricing"
              className="border border-white/30 px-3 py-1.5 font-mono text-[11px] tracking-[0.22em] uppercase hover:bg-white hover:text-black transition-colors"
            >
              Change plan
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
            <Stat label="Balance" value={`${credits?.balance ?? 0}`} />
            <Stat label="Monthly credits" value={`${credits?.monthly_credits ?? 0}`} />
            <Stat label="Billing cycle" value={cycle ?? "—"} />
            <Stat label="Renews" value={periodEnd ?? "—"} />
          </div>

          {subscription && !isCanceled && (
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={handlePortal}
                disabled={busy !== null}
                className="border border-white/30 px-4 py-2 font-mono text-[11px] tracking-[0.22em] uppercase hover:bg-white hover:text-black transition-colors disabled:opacity-50"
              >
                {busy === "portal" ? "Opening…" : "Manage billing"}
              </button>
              {!isCanceling && (
                <button
                  onClick={handleCancel}
                  disabled={busy !== null}
                  className="border border-white/20 px-4 py-2 font-mono text-[11px] tracking-[0.22em] uppercase text-white/70 hover:text-white hover:border-white/50 transition-colors disabled:opacity-50"
                >
                  {busy === "cancel" ? "Canceling…" : "Cancel plan"}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="pt-16">
        <SiteFooter />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
        {label}
      </div>
      <div className="mt-1 text-[15px] capitalize">{value}</div>
    </div>
  );
}
