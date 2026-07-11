import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Policy · Jeradin" },
      { name: "description", content: "Jeradin's 30-day money-back guarantee, how to request a refund, and cancellation." },
      { property: "og:title", content: "Refund Policy · Jeradin" },
      { property: "og:description", content: "Jeradin's 30-day money-back guarantee, how to request a refund, and cancellation." },
      { property: "og:url", content: "https://jeradin.com/refunds" },
    ],
    links: [{ rel: "canonical", href: "https://jeradin.com/refunds" }],
  }),
  component: RefundsPage,
});

const toc = [
  ["1", "Overview"],
  ["2", "30-day money-back guarantee"],
  ["3", "Subscription renewals"],
  ["4", "Annual plans"],
  ["5", "One-time credit purchases"],
  ["6", "How to request a refund"],
  ["7", "Processing time"],
  ["8", "Cancelling your subscription"],
  ["9", "Exceptions"],
  ["10", "Chargebacks and disputes"],
  ["11", "Contact us"],
];

function RefundsPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="pt-32 pb-10 mx-auto max-w-3xl px-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Legal</div>
        <h1 className="mt-3 text-[44px] sm:text-[56px] leading-[1.05] tracking-[-0.04em] font-medium">
          Refund Policy
        </h1>
        <p className="mt-4 text-[13px] text-black/50">Effective July 11, 2026</p>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-16">
        <div className="rounded-lg border border-black/10 p-5 bg-black/[0.02]">
          <div className="text-[11px] uppercase tracking-[0.18em] text-black/50">Contents</div>
          <ol className="mt-3 grid sm:grid-cols-2 gap-x-8 gap-y-1 text-[13.5px] text-black/70">
            {toc.map(([n, t]) => (
              <li key={n}>
                <a href={`#s${n}`} className="hover:text-black">
                  <span className="text-black/40 mr-2">{n}.</span>{t}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-5 pb-28 space-y-12 text-[15.5px] leading-[1.75] text-black/80">
        <Section id="s1" n="1" title="Overview">
          <p>
            This Refund Policy explains when and how you can request a refund for Jeradin
            purchases. It supplements our{" "}
            <a className="underline" href="/terms">Terms of Service</a> and applies to all paid
            subscriptions, plan upgrades, and one-time credit purchases made through Jeradin's
            checkout. Refunds are processed by our reseller and Merchant of Record, Paddle.com.
          </p>
        </Section>

        <Section id="s2" n="2" title="30-day money-back guarantee">
          <p>
            We stand behind Jeradin. If you are not satisfied with your first paid subscription
            or your first one-time credit purchase, you may request a full refund within thirty
            (30) days of the original order date. No specific reason is required.
          </p>
        </Section>

        <Section id="s3" n="3" title="Subscription renewals">
          <p>
            Monthly and annual subscriptions renew automatically at the end of each billing
            period. If you are charged for a renewal you did not intend to keep, you may
            request a refund within fourteen (14) days of the renewal charge, provided you have
            not made substantial use of the plan during that period. "Substantial use" means
            using more than 20% of the credits included in the renewed billing period.
          </p>
        </Section>

        <Section id="s4" n="4" title="Annual plans">
          <p>
            Annual subscriptions cancelled after the 30-day money-back window are non-refundable
            for the remainder of the paid term, unless required by applicable consumer-protection
            law. Your access continues until the end of the paid term, after which the
            subscription will not renew.
          </p>
        </Section>

        <Section id="s5" n="5" title="One-time credit purchases">
          <p>
            Unused one-time credits are refundable within thirty (30) days of purchase.
            Credits that have already been consumed are non-refundable. Credits do not expire
            unless expressly stated at the time of the promotion.
          </p>
        </Section>

        <Section id="s6" n="6" title="How to request a refund">
          <p>You can request a refund in two ways:</p>
          <ol className="mt-3 list-decimal pl-6 space-y-2">
            <li>
              <b>Via Paddle</b>. Visit{" "}
              <a className="underline" href="https://paddle.net" target="_blank" rel="noreferrer">paddle.net</a>,
              enter the email address you used at checkout, locate the transaction, and follow
              the refund instructions.
            </li>
            <li>
              <b>Via Jeradin support</b>. Email{" "}
              <a className="underline" href="mailto:support@jeradin.com">support@jeradin.com</a>{" "}
              from the address associated with your account and include your order ID (found in
              your Paddle receipt). We will process eligible requests on your behalf.
            </li>
          </ol>
        </Section>

        <Section id="s7" n="7" title="Processing time">
          <p>
            Once a refund is approved, Paddle returns funds to the original payment method.
            The refund typically appears on your statement within 5–10 business days,
            depending on your bank or card issuer. Refunds are issued in the original currency
            of the transaction; we are not responsible for currency-conversion differences
            imposed by your bank.
          </p>
        </Section>

        <Section id="s8" n="8" title="Cancelling your subscription">
          <p>
            You can cancel your subscription at any time from your account settings, or via
            the Paddle customer portal linked from your receipt emails. Cancellation stops
            future renewals; your access continues until the end of the current paid period.
            Cancellation alone is not a refund request — if you want a refund for the current
            period, please follow the steps in section 6.
          </p>
        </Section>

        <Section id="s9" n="9" title="Exceptions">
          <p>
            Refunds may be denied where we have reasonable evidence of abuse of this policy,
            including repeated refund requests, fraudulent activity, or breach of our{" "}
            <a className="underline" href="/terms">Terms of Service</a>. Custom enterprise
            agreements, invoiced orders, and negotiated pricing are governed by the terms of
            the applicable order form and are not covered by this policy.
          </p>
        </Section>

        <Section id="s10" n="10" title="Chargebacks and disputes">
          <p>
            Please contact us before initiating a chargeback with your bank or card issuer.
            Chargebacks may result in temporary suspension of your account while we work with
            Paddle to resolve the dispute. We are happy to help you resolve billing issues
            directly and quickly.
          </p>
        </Section>

        <Section id="s11" n="11" title="Contact us">
          <p>
            Questions about a refund or a charge? Email{" "}
            <a className="underline" href="mailto:support@jeradin.com">support@jeradin.com</a>.
            For legal or policy questions, email{" "}
            <a className="underline" href="mailto:legal@jeradin.com">legal@jeradin.com</a>.
          </p>
        </Section>
      </article>
      <SiteFooter />
    </div>
  );
}

function Section({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24">
      <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Section {n}</div>
      <h2 className="mt-2 text-[24px] sm:text-[28px] leading-[1.15] tracking-[-0.02em] font-medium text-black">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}
