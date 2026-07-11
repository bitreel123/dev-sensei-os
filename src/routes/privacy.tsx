import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · Jeradin" },
      { name: "description", content: "How Jeradin collects, uses and protects your personal data." },
      { property: "og:title", content: "Privacy Policy · Jeradin" },
      { property: "og:description", content: "How Jeradin collects, uses and protects your personal data." },
      { property: "og:url", content: "https://jeradin.com/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://jeradin.com/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="pt-32 pb-16 mx-auto max-w-3xl px-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Legal</div>
        <h1 className="mt-3 text-[44px] sm:text-[56px] leading-[1.05] tracking-[-0.04em] font-medium">
          Privacy Policy
        </h1>
        <p className="mt-4 text-[13px] text-black/50">Last updated: July 11, 2026</p>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-28 space-y-10 text-[15px] leading-[1.7] text-black/75">
        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">1. Who we are</h2>
          <p className="mt-3">
            This Privacy Notice explains how Jeradin ("Jeradin", "we", "us"), the operator of
            jeradin.com (the "Service"), collects and handles personal data. Jeradin acts as the
            data controller for personal data processed through the Service.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">2. Data we collect</h2>
          <ul className="mt-3 list-disc pl-6 space-y-1">
            <li><b>Account data</b> — name, email address, password hash, and authentication identifiers (e.g. Google or GitHub sign-in).</li>
            <li><b>Content data</b> — screen recordings, screenshots, logs, stack traces, prompts, files and connected repository metadata you submit.</li>
            <li><b>Usage data</b> — pages visited, features used, session identifiers, approximate location derived from IP.</li>
            <li><b>Device data</b> — browser type, operating system, device identifiers, IP address.</li>
            <li><b>Support data</b> — messages you send to our support team.</li>
            <li><b>Billing data</b> — handled by our reseller Paddle; we receive limited transaction metadata (plan, status, country, last four digits of card).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">3. How we use data</h2>
          <ul className="mt-3 list-disc pl-6 space-y-1">
            <li>To create your account, authenticate you and provide the Service (legal basis: contract).</li>
            <li>To generate AI outputs based on the content you submit (legal basis: contract).</li>
            <li>To secure the Service, prevent fraud and abuse (legal basis: legitimate interests).</li>
            <li>To improve the Service, debug issues and analyse aggregate usage (legal basis: legitimate interests).</li>
            <li>To communicate service messages, and — where permitted — marketing you can opt out of (legal basis: legitimate interests or consent).</li>
            <li>To comply with legal obligations, including tax and accounting (legal basis: legal obligation).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">4. Who we share data with</h2>
          <ul className="mt-3 list-disc pl-6 space-y-1">
            <li><b>Infrastructure providers</b> — hosting, database and storage vendors that run the Service.</li>
            <li><b>AI model providers</b> — third-party inference APIs used to generate outputs, under data-processing agreements.</li>
            <li><b>Merchant of Record</b> — Paddle.com Market Ltd handles payments, subscription management, invoicing and tax compliance.</li>
            <li><b>Analytics and support tools</b> — product analytics and helpdesk tools used to operate the Service.</li>
            <li><b>Professional advisers</b> — legal, accounting and audit advisers when necessary.</li>
            <li><b>Authorities</b> — when required by law, court order, or to protect rights and safety.</li>
          </ul>
          <p className="mt-3">We do not sell your personal data.</p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">5. International transfers</h2>
          <p className="mt-3">
            Where personal data is transferred outside your country of residence (including the
            UK/EEA), we rely on appropriate safeguards such as Standard Contractual Clauses or
            adequacy decisions.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">6. Data retention</h2>
          <p className="mt-3">
            We keep personal data only for as long as needed to provide the Service, comply with
            legal obligations, resolve disputes and enforce agreements. Content data (recordings,
            files) is retained for the life of your account and deleted or anonymised within a
            reasonable period after account closure. Billing records are kept for the period
            required by tax and accounting law.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">7. Your rights</h2>
          <p className="mt-3">
            Depending on your jurisdiction you may have the right to access, rectify, erase,
            restrict or port your personal data, to object to processing, and to withdraw consent.
            EEA/UK users have the right to lodge a complaint with their supervisory authority. To
            exercise any right, contact{" "}
            <a className="underline" href="mailto:privacy@jeradin.com">privacy@jeradin.com</a>. We
            respond within one month.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">8. Security</h2>
          <p className="mt-3">
            We apply appropriate technical and organisational measures, including encryption in
            transit, access controls, least-privilege permissions and regular reviews of our
            security posture. No system is perfectly secure — please report vulnerabilities to{" "}
            <a className="underline" href="mailto:security@jeradin.com">security@jeradin.com</a>.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">9. Cookies</h2>
          <p className="mt-3">
            We use strictly necessary cookies for authentication and session management, and
            analytics cookies to understand product usage. Where required by law, we ask for consent
            before setting non-essential cookies. You can manage preferences through your browser or
            our cookie banner.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">10. Changes</h2>
          <p className="mt-3">
            We may update this Privacy Notice from time to time. Material changes will be notified
            in-product or by email.
          </p>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-black">11. Contact</h2>
          <p className="mt-3">
            Privacy questions:{" "}
            <a className="underline" href="mailto:privacy@jeradin.com">privacy@jeradin.com</a>.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
