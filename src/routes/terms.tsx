import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · Jeradin" },
      { name: "description", content: "The terms that govern your use of Jeradin." },
      { property: "og:title", content: "Terms of Service · Jeradin" },
      { property: "og:description", content: "The terms that govern your use of Jeradin." },
      { property: "og:url", content: "https://jeradin.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://jeradin.com/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="pt-32 pb-16 mx-auto max-w-3xl px-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Legal</div>
        <h1 className="mt-3 text-[44px] sm:text-[56px] leading-[1.05] tracking-[-0.04em] font-medium">
          Terms of Service
        </h1>
        <p className="mt-4 text-[13px] text-black/50">Last updated: July 11, 2026</p>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-28 space-y-10 text-[15px] leading-[1.7] text-black/75">
        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">1. Who we are</h2>
          <p className="mt-3">
            These Terms of Service ("Terms") form a binding agreement between you and Jeradin
            ("Jeradin", "we", "us"), the operator of the Jeradin website and application available
            at jeradin.com (the "Service"). By creating an account, accessing, or using the Service
            you agree to these Terms. If you do not agree, do not use the Service.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">2. Eligibility and account</h2>
          <p className="mt-3">
            You must be at least 18 years old, or the age of majority in your jurisdiction, to use
            Jeradin. If you use the Service on behalf of an organisation, you represent that you
            have authority to bind that organisation to these Terms. You are responsible for keeping
            your credentials confidential and for all activity that occurs under your account. You
            agree to provide accurate information and keep it up to date.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">3. The Service</h2>
          <p className="mt-3">
            Jeradin is an AI debugging assistant that ingests screen recordings, stack traces,
            written descriptions and connected repository context to help diagnose software issues
            and propose fixes. Features, models and limits may change from time to time as we
            improve the Service.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">4. Acceptable use</h2>
          <p className="mt-3">You agree not to:</p>
          <ul className="mt-3 list-disc pl-6 space-y-1">
            <li>use the Service for unlawful, fraudulent, or abusive purposes;</li>
            <li>send spam, malware, or content that infringes intellectual property;</li>
            <li>probe, scan, scrape, or interfere with the security or integrity of the Service;</li>
            <li>reverse engineer, resell, or redistribute the Service or its outputs except as permitted;</li>
            <li>circumvent rate limits, quotas, or technical restrictions;</li>
            <li>submit content you do not have the right to submit.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">5. AI outputs and accuracy</h2>
          <p className="mt-3">
            Jeradin generates outputs using AI models. Outputs may be inaccurate, incomplete, or
            unsuitable for your specific situation. You are responsible for reviewing outputs before
            acting on them, and for any code, configuration, or decision you deploy based on them.
            Jeradin is not a substitute for qualified professional judgement in regulated fields.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">6. Your content</h2>
          <p className="mt-3">
            You retain ownership of content you submit (recordings, code, prompts, files). You grant
            Jeradin a worldwide, non-exclusive licence to host, process and transmit that content
            solely to provide and improve the Service. We will not sell your content, and we will
            not use private content to train third-party foundation models without your consent.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">7. Intellectual property</h2>
          <p className="mt-3">
            The Service, including its software, models, branding and documentation, is owned by
            Jeradin and its licensors and is protected by applicable IP laws. Subject to these Terms,
            we grant you a limited, non-exclusive, non-transferable right to use the Service within
            your selected plan.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">8. Payments and subscriptions</h2>
          <p className="mt-3">
            Paid plans are billed on a recurring basis (monthly or annually) and renew automatically
            until cancelled. Our order process is conducted by our online reseller Paddle.com.
            Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer
            service inquiries and handles returns. Payment, billing, tax, cancellation and refund
            mechanics are governed by Paddle's Buyer Terms at
            {" "}
            <a className="underline" href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noreferrer">paddle.com/legal/checkout-buyer-terms</a>.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">9. Suspension and termination</h2>
          <p className="mt-3">
            We may suspend or terminate your access if you materially breach these Terms, fail to
            pay, create security or fraud risk, or repeatedly violate our policies. You may cancel
            your subscription at any time. On termination your right to use the Service ends; we
            will delete or return your content in accordance with our Privacy Notice.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">10. Warranties and disclaimers</h2>
          <p className="mt-3">
            The Service is provided "as is" and "as available". We do not guarantee that the Service
            will be uninterrupted, error-free, or that outputs will meet your requirements. To the
            fullest extent permitted by law, we disclaim all implied warranties, including
            merchantability, fitness for a particular purpose and non-infringement.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">11. Limitation of liability</h2>
          <p className="mt-3">
            To the maximum extent permitted by law, Jeradin's aggregate liability arising out of or
            relating to the Service is limited to the fees you paid to us in the twelve (12) months
            preceding the event giving rise to the claim. We are not liable for indirect,
            incidental, special, consequential, or exemplary damages, including loss of profits,
            data, or goodwill. Nothing in these Terms excludes liability for fraud, death, or
            personal injury caused by negligence where such exclusion is prohibited by law.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">12. Indemnity</h2>
          <p className="mt-3">
            You will indemnify and hold Jeradin harmless from claims arising out of your content,
            your unlawful use of the Service, or your breach of these Terms.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">13. Changes to these Terms</h2>
          <p className="mt-3">
            We may update these Terms from time to time. Material changes will be notified via the
            Service or email. Continued use after the effective date constitutes acceptance.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">14. Governing law</h2>
          <p className="mt-3">
            These Terms are governed by the laws of the jurisdiction in which Jeradin is
            established, without regard to conflict-of-laws principles. Disputes will be resolved in
            the competent courts of that jurisdiction, unless a mandatory consumer protection law
            provides otherwise.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">15. Contact</h2>
          <p className="mt-3">
            Questions about these Terms? Reach us at{" "}
            <a className="underline" href="mailto:legal@jeradin.com">legal@jeradin.com</a>.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
