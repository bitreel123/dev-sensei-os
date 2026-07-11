import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · Jeradin" },
      { name: "description", content: "How Jeradin collects, uses, shares and protects your personal data." },
      { property: "og:title", content: "Privacy Policy · Jeradin" },
      { property: "og:description", content: "How Jeradin collects, uses, shares and protects your personal data." },
      { property: "og:url", content: "https://jeradin.com/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://jeradin.com/privacy" }],
  }),
  component: PrivacyPage,
});

const toc = [
  ["1", "Who we are"],
  ["2", "Scope"],
  ["3", "Personal data we collect"],
  ["4", "How we use personal data"],
  ["5", "Legal bases (EEA/UK)"],
  ["6", "Cookies and similar technologies"],
  ["7", "How we share personal data"],
  ["8", "AI training and model use"],
  ["9", "International data transfers"],
  ["10", "Data retention"],
  ["11", "Security"],
  ["12", "Your rights"],
  ["13", "Children"],
  ["14", "Third-party links"],
  ["15", "Changes to this policy"],
  ["16", "Contact us"],
];

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="pt-32 pb-10 mx-auto max-w-3xl px-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Legal</div>
        <h1 className="mt-3 text-[44px] sm:text-[56px] leading-[1.05] tracking-[-0.04em] font-medium">
          Privacy Policy
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
        <Section id="s1" n="1" title="Who we are">
          <p>
            This Privacy Policy explains how Jeradin ("<b>Jeradin</b>", "<b>we</b>", "<b>us</b>",
            "<b>our</b>"), the operator of the website at jeradin.com and the associated Jeradin
            software products (collectively, the "<b>Service</b>"), collects, uses, shares and
            protects personal data. Jeradin acts as the data controller of personal data
            processed through the Service, except where we act as a data processor on behalf of
            a customer (for example, when a business account submits end-user data through our
            APIs).
          </p>
        </Section>

        <Section id="s2" n="2" title="Scope">
          <p>
            This policy applies to personal data we process when you visit our website, create
            or use a Jeradin account, install our desktop apps or browser extensions, connect
            third-party tools, contact our support team, or otherwise interact with the
            Service. It does not apply to third-party products or websites that we do not
            operate, even when linked from our Service.
          </p>
        </Section>

        <Section id="s3" n="3" title="Personal data we collect">
          <p>We collect the following categories of personal data:</p>
          <ul className="mt-3 list-disc pl-6 space-y-2">
            <li>
              <b>Account data</b> — name, email address, password hash, profile photo,
              organisation, role, and authentication identifiers when you sign in with Google
              or GitHub.
            </li>
            <li>
              <b>Content data</b> — screen recordings, screenshots, uploaded files, log files,
              stack traces, code snippets, prompts, chat history, and metadata about connected
              repositories or MCP tools that you submit to the Service.
            </li>
            <li>
              <b>Usage data</b> — pages viewed, features used, actions taken, credit
              consumption, referrer URLs, session identifiers, timestamps, and approximate
              location derived from your IP address.
            </li>
            <li>
              <b>Device and technical data</b> — IP address, browser type and version,
              operating system, device identifiers, screen resolution, language settings, and
              diagnostic information.
            </li>
            <li>
              <b>Communications</b> — the content of messages you send to our support, sales,
              or community channels, and metadata about those messages.
            </li>
            <li>
              <b>Payment data</b> — handled by our reseller and Merchant of Record, Paddle. We
              receive limited transaction metadata such as plan, billing country, currency,
              tax status, last four digits of the card, and card brand. We do not receive or
              store full card numbers.
            </li>
            <li>
              <b>Marketing data</b> — preferences you set for our newsletters or product
              updates, and engagement events such as opens and clicks when technically
              possible.
            </li>
          </ul>
        </Section>

        <Section id="s4" n="4" title="How we use personal data">
          <ul className="mt-3 list-disc pl-6 space-y-2">
            <li>To create your account, authenticate you, and provide the Service.</li>
            <li>To generate AI outputs based on the content and prompts you submit.</li>
            <li>To operate our billing, invoicing, and tax processes through Paddle.</li>
            <li>To secure the Service, prevent abuse and fraud, and enforce our Terms.</li>
            <li>To troubleshoot issues, monitor performance, and improve the Service.</li>
            <li>To communicate with you about the Service, including service messages,
              security alerts, and — where permitted — product updates and marketing.</li>
            <li>To comply with legal, regulatory, tax and accounting obligations.</li>
            <li>To conduct research and analytics using aggregated or de-identified data.</li>
          </ul>
        </Section>

        <Section id="s5" n="5" title="Legal bases (EEA/UK)">
          <p>
            If you are in the European Economic Area or the United Kingdom, we rely on the
            following legal bases under the GDPR / UK GDPR:
          </p>
          <ul className="mt-3 list-disc pl-6 space-y-1.5">
            <li><b>Performance of a contract</b> — to create and operate your account and provide the Service you request.</li>
            <li><b>Legitimate interests</b> — to secure the Service, prevent fraud, improve our products, and market to existing customers, where such interests are not overridden by your rights.</li>
            <li><b>Consent</b> — for non-essential cookies, certain marketing, and any processing where we ask for it.</li>
            <li><b>Legal obligation</b> — to comply with tax, accounting, and other laws.</li>
          </ul>
        </Section>

        <Section id="s6" n="6" title="Cookies and similar technologies">
          <p>
            We use strictly necessary cookies for authentication and session management. We use
            analytics cookies to understand how the Service is used, and we may use limited
            marketing cookies to measure the effectiveness of our campaigns. Where required by
            law, we ask for consent before setting non-essential cookies, and you can manage
            your preferences via the cookie banner or your browser settings.
          </p>
        </Section>

        <Section id="s7" n="7" title="How we share personal data">
          <p>We share personal data with the following categories of recipients:</p>
          <ul className="mt-3 list-disc pl-6 space-y-2">
            <li>
              <b>Infrastructure providers</b> — cloud hosting, database, storage, logging and
              observability vendors that run the Service under our instructions.
            </li>
            <li>
              <b>AI model providers</b> — third-party inference APIs used to generate Outputs,
              acting as data processors under contractual safeguards.
            </li>
            <li>
              <b>Merchant of Record</b> — Paddle.com Market Ltd, which acts as an independent
              controller for payment, invoicing, sales tax, VAT and fraud prevention.
            </li>
            <li>
              <b>Analytics and support tools</b> — product analytics, error tracking, session
              replay (where enabled), and helpdesk platforms used to operate the Service.
            </li>
            <li>
              <b>Professional advisers</b> — legal, accounting, audit, and insurance advisers
              subject to duties of confidentiality.
            </li>
            <li>
              <b>Corporate transactions</b> — if we are involved in a merger, acquisition,
              financing, or sale of assets, personal data may be transferred to the counterparty
              subject to standard confidentiality obligations.
            </li>
            <li>
              <b>Public authorities</b> — where required by law, court order, or to protect
              rights, property, or safety.
            </li>
          </ul>
          <p className="mt-3">We do not sell your personal data, and we do not share it for cross-context behavioural advertising.</p>
        </Section>

        <Section id="s8" n="8" title="AI training and model use">
          <p>
            Content you submit through a paid workspace, or that you mark as private, is not
            used to train third-party foundation models. We may use aggregated or de-identified
            usage signals — statistics that do not identify you or your content — to evaluate
            and improve Jeradin's own models, retrieval systems, and prompts. Where we plan any
            new use of your personal data for model training, we will notify you and, where
            required, obtain your consent.
          </p>
        </Section>

        <Section id="s9" n="9" title="International data transfers">
          <p>
            Jeradin operates globally, and your personal data may be transferred to, and
            processed in, countries other than your country of residence, including the United
            States. Where we transfer personal data out of the EEA, the UK, or Switzerland to a
            country not covered by an adequacy decision, we rely on Standard Contractual
            Clauses and, where appropriate, supplementary measures to protect the data.
          </p>
        </Section>

        <Section id="s10" n="10" title="Data retention">
          <p>
            We retain personal data only for as long as reasonably necessary to fulfil the
            purposes set out in this policy, including to provide the Service, comply with
            legal, tax and accounting obligations, resolve disputes, and enforce our
            agreements. Content data associated with an active account is retained for the
            lifetime of that account, and is deleted or anonymised within ninety (90) days
            after account closure, unless a longer retention period is required by law or is
            necessary to establish, exercise, or defend legal claims. Billing records are kept
            for the period required by applicable tax law (typically 6 to 10 years).
          </p>
        </Section>

        <Section id="s11" n="11" title="Security">
          <p>
            We implement appropriate technical and organisational measures designed to protect
            personal data against unauthorised access, alteration, disclosure, or destruction.
            These include encryption in transit (TLS), encryption at rest for supported
            stores, least-privilege access controls, audit logging, environment isolation,
            code review, and secure development practices. Despite our efforts, no system is
            completely secure. Please report suspected vulnerabilities to{" "}
            <a className="underline" href="mailto:security@jeradin.com">security@jeradin.com</a>.
          </p>
        </Section>

        <Section id="s12" n="12" title="Your rights">
          <p>Subject to applicable law, you have the right to:</p>
          <ul className="mt-3 list-disc pl-6 space-y-1.5">
            <li>request access to your personal data;</li>
            <li>request correction of inaccurate or incomplete data;</li>
            <li>request deletion of personal data ("right to be forgotten");</li>
            <li>request restriction of processing or object to processing based on legitimate interests;</li>
            <li>request portability of data you provided in a structured, machine-readable format;</li>
            <li>withdraw consent at any time, without affecting the lawfulness of prior processing;</li>
            <li>lodge a complaint with your local supervisory authority.</li>
          </ul>
          <p className="mt-3">
            To exercise any right, email{" "}
            <a className="underline" href="mailto:privacy@jeradin.com">privacy@jeradin.com</a>.
            We respond within one (1) month, or sooner where required by law.
          </p>
        </Section>

        <Section id="s13" n="13" title="Children">
          <p>
            The Service is not directed to children under 16, and we do not knowingly collect
            personal data from children. If you believe a child has provided us with personal
            data, please contact us and we will delete it.
          </p>
        </Section>

        <Section id="s14" n="14" title="Third-party links">
          <p>
            The Service may contain links to third-party sites or services. This policy does
            not apply to those third parties. Please review their privacy policies before
            providing them with your personal data.
          </p>
        </Section>

        <Section id="s15" n="15" title="Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. When we make material
            changes, we will notify you by email or in-product at least fourteen (14) days
            before they take effect, unless a shorter period is required by law.
          </p>
        </Section>

        <Section id="s16" n="16" title="Contact us">
          <p>
            For privacy questions or to exercise your rights, contact{" "}
            <a className="underline" href="mailto:privacy@jeradin.com">privacy@jeradin.com</a>.
            For security matters, contact{" "}
            <a className="underline" href="mailto:security@jeradin.com">security@jeradin.com</a>.
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
