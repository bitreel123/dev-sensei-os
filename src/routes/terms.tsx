import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · Jeradin" },
      { name: "description", content: "The terms that govern your access to and use of Jeradin." },
      { property: "og:title", content: "Terms of Service · Jeradin" },
      { property: "og:description", content: "The terms that govern your access to and use of Jeradin." },
      { property: "og:url", content: "https://jeradin.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://jeradin.com/terms" }],
  }),
  component: TermsPage,
});

const toc = [
  ["1", "Agreement to these terms"],
  ["2", "The Service"],
  ["3", "Eligibility and account"],
  ["4", "Plans, billing and taxes"],
  ["5", "Free trials and credits"],
  ["6", "Acceptable use"],
  ["7", "Your content and inputs"],
  ["8", "AI outputs"],
  ["9", "Feedback"],
  ["10", "Intellectual property"],
  ["11", "Third-party services and integrations"],
  ["12", "Confidentiality"],
  ["13", "Privacy and security"],
  ["14", "Suspension and termination"],
  ["15", "Warranty disclaimer"],
  ["16", "Limitation of liability"],
  ["17", "Indemnification"],
  ["18", "Modifications to the Service and to these Terms"],
  ["19", "Governing law and disputes"],
  ["20", "Miscellaneous"],
  ["21", "Contact us"],
];

function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="pt-32 pb-10 mx-auto max-w-3xl px-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Legal</div>
        <h1 className="mt-3 text-[44px] sm:text-[56px] leading-[1.05] tracking-[-0.04em] font-medium">
          Terms of Service
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
        <Section id="s1" n="1" title="Agreement to these terms">
          <p>
            These Terms of Service ("<b>Terms</b>") are a binding legal agreement between you
            ("<b>you</b>", "<b>customer</b>") and <b>Jeradin</b>, the seller and legal entity
            operating under the business name "Jeradin" ("<b>Jeradin</b>", "<b>we</b>",
            "<b>us</b>", "<b>our</b>"), the operator of the website at jeradin.com and the
            associated software products, applications, browser extensions, desktop apps, APIs,
            and connectors we provide (collectively, the "<b>Service</b>"). Jeradin can be
            contacted for legal matters at{" "}
            <a className="underline" href="mailto:legal@jeradin.com">legal@jeradin.com</a>. By
            creating an account, clicking to accept, downloading, installing, or otherwise
            using the Service you agree to be bound by these Terms and by any additional
            policies referenced here, including our{" "}
            <a className="underline" href="/privacy">Privacy Policy</a> and{" "}
            <a className="underline" href="/refunds">Refund Policy</a>. If you do not agree, you
            must not use the Service.
          </p>
          <p>
            If you use the Service on behalf of an organisation, you represent and warrant that
            you have authority to bind that organisation to these Terms and that references to
            "you" include that organisation.
          </p>
        </Section>


        <Section id="s2" n="2" title="The Service">
          <p>
            Jeradin is an AI debugging assistant for software developers. It ingests information
            you provide — including screen recordings, screenshots, error messages, stack traces,
            log files, natural-language descriptions, and connected repository metadata — and
            uses artificial-intelligence models to help you diagnose issues, understand code
            behaviour, and propose fixes. The Service is provided on a subscription basis with
            usage-based credits, and may be delivered through a web application, native desktop
            apps, browser extensions, and Model Context Protocol (MCP) connectors.
          </p>
          <p>
            Features, models, quotas, and interfaces evolve over time. We may add, modify, or
            remove features, and we may change how the Service is delivered so long as the core
            functionality of your paid plan is preserved during your current billing period.
          </p>
        </Section>

        <Section id="s3" n="3" title="Eligibility and account">
          <p>
            You must be at least 18 years old, or the age of majority in your jurisdiction,
            whichever is higher, to create an account. You agree to provide accurate,
            current, and complete information during registration and to keep that information
            up to date. You are responsible for maintaining the confidentiality of your
            credentials and for all activity that occurs under your account. You must notify us
            promptly at{" "}
            <a className="underline" href="mailto:security@jeradin.com">security@jeradin.com</a>{" "}
            of any suspected unauthorised access.
          </p>
        </Section>

        <Section id="s4" n="4" title="Plans, billing and taxes">
          <p>
            Paid subscriptions are billed in advance on a recurring basis (monthly or annual) and
            automatically renew at the then-current price for successive periods of the same
            length, unless cancelled before the next renewal date. One-time credit purchases are
            charged when the order is placed and are non-recurring.
          </p>
          <p>
            <b>Merchant of Record.</b> Our order process is conducted by our online reseller
            Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides
            all customer service inquiries and handles returns. Payment, invoicing, sales tax,
            VAT, GST and similar transaction taxes are collected and remitted by Paddle in
            accordance with Paddle's Buyer Terms, available at{" "}
            <a className="underline" href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noreferrer">
              paddle.com/legal/checkout-buyer-terms
            </a>.
          </p>
          <p>
            <b>Price changes.</b> We may change subscription prices from time to time. Changes
            take effect at the start of the next renewal term and we will give you reasonable
            notice by email or in-product before they apply to you.
          </p>
        </Section>

        <Section id="s5" n="5" title="Free trials and credits">
          <p>
            We may make free trials, promotional credits, or beta features available at our
            discretion. Trials automatically convert to a paid plan at the end of the trial
            period unless you cancel. Promotional credits have no cash value, are non-transferable,
            and may expire.
          </p>
        </Section>

        <Section id="s6" n="6" title="Acceptable use">
          <p>You agree not to, and not to attempt to:</p>
          <ul className="mt-3 list-disc pl-6 space-y-1.5">
            <li>use the Service in violation of applicable law or third-party rights;</li>
            <li>send spam, malware, ransomware, phishing, or other malicious content;</li>
            <li>submit content that infringes intellectual-property or privacy rights;</li>
            <li>probe, scan, or test the vulnerability of the Service, or breach its security or authentication;</li>
            <li>interfere with or disrupt the integrity or performance of the Service;</li>
            <li>reverse engineer, decompile, disassemble, or attempt to derive the source code, models, or algorithms of the Service, except to the extent this restriction is prohibited by law;</li>
            <li>resell, sublicense, rent, or otherwise commercially exploit the Service or its outputs in a manner that competes with us, without our written consent;</li>
            <li>use the Service to generate content that promotes hate, violence, self-harm, sexual exploitation of minors, or unlawful surveillance;</li>
            <li>use automated means to scrape, harvest, or otherwise extract data from the Service, other than through documented APIs and within their rate limits;</li>
            <li>circumvent quotas, credit systems, throttling, or other technical restrictions.</li>
          </ul>
        </Section>

        <Section id="s7" n="7" title="Your content and inputs">
          <p>
            "<b>Customer Content</b>" means the recordings, screenshots, logs, code snippets,
            files, prompts, metadata, and other materials you or your users submit to the
            Service. You retain all right, title and interest in and to Customer Content. You
            grant us a worldwide, non-exclusive, royalty-free licence to host, copy, transmit,
            display and process Customer Content solely to (a) provide, secure, and improve the
            Service for you, (b) comply with legal obligations, and (c) enforce these Terms.
          </p>
          <p>
            You represent and warrant that you have all rights, consents, and permissions
            necessary for us to process Customer Content as contemplated by these Terms, and
            that Customer Content does not violate any law or third-party right.
          </p>
          <p>
            We do not sell Customer Content. We do not use Customer Content that you have
            marked private, or that resides in a paid workspace, to train third-party
            foundation models. Aggregated or de-identified data derived from usage of the
            Service may be used to operate, secure, and improve the Service.
          </p>
        </Section>

        <Section id="s8" n="8" title="AI outputs">
          <p>
            The Service uses artificial-intelligence models to generate suggestions, code,
            diagnoses, summaries and other outputs ("<b>Outputs</b>"). As between you and us,
            and to the extent permitted by law, you own Outputs generated for you, subject to
            your compliance with these Terms and any applicable third-party rights in the
            underlying inputs and training data.
          </p>
          <p>
            <b>Accuracy.</b> Outputs may be inaccurate, incomplete, biased, or otherwise
            unsuitable for your purpose. Outputs are not professional advice. You are solely
            responsible for evaluating Outputs, testing suggested code, and deciding whether to
            rely on or deploy them. You should not rely on Outputs in high-risk situations
            (including medical, legal, financial, safety-critical or regulated professional
            contexts) without independent verification by a qualified professional.
          </p>
          <p>
            <b>Similar outputs.</b> Given the nature of generative models, other users may
            receive similar or identical Outputs. We do not grant exclusivity over any Output.
          </p>
        </Section>

        <Section id="s9" n="9" title="Feedback">
          <p>
            If you send us feedback, suggestions, ideas, or bug reports, you grant us a
            perpetual, irrevocable, worldwide, royalty-free licence to use, reproduce, modify
            and exploit that feedback for any purpose, without any obligation to you.
          </p>
        </Section>

        <Section id="s10" n="10" title="Intellectual property">
          <p>
            The Service, including all software, models, weights, documentation, designs, logos,
            and brand elements, is owned by Jeradin or its licensors and is protected by
            copyright, trademark, and other intellectual-property laws. Subject to your
            compliance with these Terms and payment of applicable fees, we grant you a limited,
            non-exclusive, non-transferable, non-sublicensable right to access and use the
            Service during your subscription term for your internal business or personal use.
          </p>
          <p>
            All rights not expressly granted are reserved. No rights or licences are granted by
            implication, estoppel, or otherwise.
          </p>
        </Section>

        <Section id="s11" n="11" title="Third-party services and integrations">
          <p>
            The Service may enable you to connect to or use third-party products and services,
            including GitHub, code hosts, cloud providers, and MCP-compatible tools ("<b>Third-Party
            Services</b>"). Third-Party Services are governed by their own terms and privacy
            policies. We are not responsible for Third-Party Services, and enabling them may
            share Customer Content with the relevant provider at your direction.
          </p>
        </Section>

        <Section id="s12" n="12" title="Confidentiality">
          <p>
            Each party may disclose to the other information that is marked as confidential or
            that a reasonable person would understand to be confidential ("<b>Confidential
            Information</b>"). The receiving party will (i) use Confidential Information only to
            perform under these Terms, (ii) protect it with at least the degree of care it uses
            for its own confidential information (and no less than reasonable care), and
            (iii) not disclose it except to personnel and advisers with a need to know who are
            bound by confidentiality obligations no less protective than these Terms.
          </p>
        </Section>

        <Section id="s13" n="13" title="Privacy and security">
          <p>
            Our processing of personal data is described in our{" "}
            <a className="underline" href="/privacy">Privacy Policy</a>. We implement and
            maintain reasonable administrative, technical, and physical safeguards designed to
            protect Customer Content, including encryption in transit, access controls, and
            logging. No system is perfectly secure; please report suspected vulnerabilities to{" "}
            <a className="underline" href="mailto:security@jeradin.com">security@jeradin.com</a>.
          </p>
        </Section>

        <Section id="s14" n="14" title="Suspension and termination">
          <p>
            You may cancel your subscription at any time from your account settings or the
            Paddle customer portal. Cancellation stops future renewals; you keep access until
            the end of the current paid period.
          </p>
          <p>
            We may suspend or terminate your access, in whole or in part, if (a) you materially
            breach these Terms, (b) your account is more than fifteen (15) days past due,
            (c) your use presents a security, fraud, or legal risk, or (d) we are required to
            do so by law. We will use reasonable efforts to notify you before suspension when
            practicable. On termination, your right to use the Service ends and we may delete
            Customer Content in accordance with our Privacy Policy.
          </p>
        </Section>

        <Section id="s15" n="15" title="Warranty disclaimer">
          <p>
            THE SERVICE AND ALL OUTPUTS ARE PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT
            WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. TO THE
            MAXIMUM EXTENT PERMITTED BY LAW, JERADIN AND ITS LICENSORS DISCLAIM ALL WARRANTIES,
            INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
            TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
            UNINTERRUPTED, ERROR-FREE, SECURE, OR THAT OUTPUTS WILL BE ACCURATE OR RELIABLE.
          </p>
        </Section>

        <Section id="s16" n="16" title="Limitation of liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL JERADIN OR ITS LICENSORS
            BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR
            EXEMPLARY DAMAGES, INCLUDING LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS
            OPPORTUNITY, WHETHER OR NOT ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p>
            OUR AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE
            WILL NOT EXCEED THE FEES YOU PAID TO US FOR THE SERVICE IN THE TWELVE (12) MONTHS
            IMMEDIATELY BEFORE THE EVENT GIVING RISE TO THE CLAIM. NOTHING IN THESE TERMS
            EXCLUDES OR LIMITS LIABILITY FOR FRAUD, DEATH, OR PERSONAL INJURY CAUSED BY
            NEGLIGENCE, OR ANY OTHER LIABILITY THAT CANNOT BE EXCLUDED BY LAW.
          </p>
        </Section>

        <Section id="s17" n="17" title="Indemnification">
          <p>
            You will defend, indemnify and hold harmless Jeradin, its affiliates, and its
            personnel from and against any third-party claims, damages, liabilities, costs, and
            expenses (including reasonable legal fees) arising out of or related to (a) your
            Customer Content, (b) your use of the Service in violation of these Terms or
            applicable law, or (c) your infringement or misappropriation of any third-party
            right.
          </p>
        </Section>

        <Section id="s18" n="18" title="Modifications to the Service and to these Terms">
          <p>
            We may modify these Terms from time to time. If we make material changes we will
            notify you by email or in-product at least fourteen (14) days before they take
            effect. Your continued use of the Service after the effective date constitutes
            acceptance of the updated Terms. If you do not agree, you must stop using the
            Service and may cancel your subscription.
          </p>
        </Section>

        <Section id="s19" n="19" title="Governing law and disputes">
          <p>
            These Terms are governed by the laws of the jurisdiction in which Jeradin is
            established, without regard to its conflict-of-laws rules. The parties submit to
            the exclusive jurisdiction of the competent courts of that jurisdiction, except
            that either party may seek injunctive relief in any court of competent jurisdiction
            to protect its intellectual-property rights. If you are a consumer, this clause
            does not deprive you of the protection of mandatory rules of the country where you
            reside.
          </p>
        </Section>

        <Section id="s20" n="20" title="Miscellaneous">
          <p>
            These Terms, together with the Privacy Policy and Refund Policy, are the entire
            agreement between the parties regarding the Service and supersede all prior
            agreements. If any provision is held unenforceable, the remaining provisions will
            remain in full force. Our failure to enforce a right is not a waiver. You may not
            assign these Terms without our prior written consent; we may assign them in
            connection with a merger, acquisition, or sale of assets. Neither party is liable
            for delays or failures due to events beyond its reasonable control.
          </p>
        </Section>

        <Section id="s21" n="21" title="Contact us">
          <p>
            Questions about these Terms? Email{" "}
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
