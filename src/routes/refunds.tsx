import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Policy · Jeradin" },
      { name: "description", content: "Jeradin's 30-day money-back guarantee and refund process." },
      { property: "og:title", content: "Refund Policy · Jeradin" },
      { property: "og:description", content: "Jeradin's 30-day money-back guarantee and refund process." },
      { property: "og:url", content: "https://jeradin.com/refunds" },
    ],
    links: [{ rel: "canonical", href: "https://jeradin.com/refunds" }],
  }),
  component: RefundsPage,
});

function RefundsPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="pt-32 pb-16 mx-auto max-w-3xl px-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Legal</div>
        <h1 className="mt-3 text-[44px] sm:text-[56px] leading-[1.05] tracking-[-0.04em] font-medium">
          Refund Policy
        </h1>
        <p className="mt-4 text-[13px] text-black/50">Last updated: July 11, 2026</p>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-28 space-y-10 text-[15px] leading-[1.7] text-black/75">
        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">30-day money-back guarantee</h2>
          <p className="mt-3">
            We want you to be happy with Jeradin. If you are not satisfied with your purchase, you
            can request a full refund within thirty (30) days of your order date. This applies to
            new subscriptions and one-time credit purchases.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">Renewals</h2>
          <p className="mt-3">
            For subscription renewals (monthly or annual), you may request a refund within fourteen
            (14) days of the renewal charge if you have not made substantial use of the plan during
            that period.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">How to request a refund</h2>
          <p className="mt-3">
            Refunds are processed by our payment provider and Merchant of Record, Paddle. To request
            a refund:
          </p>
          <ol className="mt-3 list-decimal pl-6 space-y-1">
            <li>Visit <a className="underline" href="https://paddle.net" target="_blank" rel="noreferrer">paddle.net</a> and enter the email address you used at checkout.</li>
            <li>Locate the transaction and follow the refund instructions.</li>
            <li>Or email us at <a className="underline" href="mailto:support@jeradin.com">support@jeradin.com</a> with your order ID and we will help.</li>
          </ol>
          <p className="mt-3">
            Approved refunds are returned to the original payment method. It typically takes 5–10
            business days for the refund to appear on your statement, depending on your bank.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">Cancelling your subscription</h2>
          <p className="mt-3">
            You can cancel your subscription at any time from your account settings or via the
            Paddle customer portal. Cancellation stops future renewals; you keep access until the
            end of the current billing period.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">Contact</h2>
          <p className="mt-3">
            Questions about a refund? Reach us at{" "}
            <a className="underline" href="mailto:support@jeradin.com">support@jeradin.com</a>.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
