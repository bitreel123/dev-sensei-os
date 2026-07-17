import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";
import { AnimatedWords, FadeIn } from "@/components/jeradin/animated-text";
import { Mail, MessageSquare, LifeBuoy, Send } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support · Jeradin" },
      { name: "description", content: "Get help with Jeradin. Contact our team at support@jeradin.com — we read every message." },
      { property: "og:title", content: "Support · Jeradin" },
      { property: "og:description", content: "Contact the Jeradin team. We reply within one business day." },
    ],
  }),
  component: SupportPage,
});

const SUPPORT_EMAIL = "support@jeradin.com";

function SupportPage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = encodeURIComponent(subject || "Jeradin support request");
    const b = encodeURIComponent(`${body}\n\n— ${name || "A Jeradin user"}`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${s}&body=${b}`;
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="pt-32 pb-10 mx-auto max-w-4xl px-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Support</div>
        <h1 className="mt-3 text-[44px] sm:text-[60px] leading-[1.02] tracking-[-0.04em] font-medium">
          <AnimatedWords text="Talk to a human." />
        </h1>
        <p className="mt-5 max-w-xl text-[15px] text-black/55 leading-relaxed">
          Bugs, billing, feature ideas, or just want to say hi — we read every message
          sent to <a href={`mailto:${SUPPORT_EMAIL}`} className="text-black underline underline-offset-4">{SUPPORT_EMAIL}</a>
          {" "}and reply within one business day.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-5 pb-8 grid md:grid-cols-3 gap-4">
        {[
          { icon: Mail, t: "Email us", b: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
          { icon: LifeBuoy, t: "Bug reports", b: "Include a screenshot + the URL", href: `mailto:${SUPPORT_EMAIL}?subject=Bug%20report` },
          { icon: MessageSquare, t: "Feature ideas", b: "Tell us what would unlock your workflow", href: `mailto:${SUPPORT_EMAIL}?subject=Feature%20idea` },
        ].map((c, i) => (
          <FadeIn key={c.t} delay={i * 0.05}>
            <a
              href={c.href}
              className="block h-full rounded-2xl border border-black/10 bg-white p-5 hover:border-black/30 transition-colors"
            >
              <c.icon className="h-4.5 w-4.5" />
              <div className="mt-3 text-[15px] font-medium tracking-tight">{c.t}</div>
              <div className="mt-1 text-[12.5px] text-black/55">{c.b}</div>
            </a>
          </FadeIn>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-24">
        <FadeIn>
          <form
            onSubmit={submit}
            className="rounded-2xl border border-black/10 bg-white p-8 space-y-4"
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Send a message</div>
            <h2 className="text-[22px] tracking-[-0.02em] font-medium">
              Write us — it lands in our inbox instantly.
            </h2>

            <div className="grid gap-3">
              <input
                required
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="rounded-lg border border-black/15 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-black"
              />
              <input
                required
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={120}
                className="rounded-lg border border-black/15 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-black"
              />
              <textarea
                required
                placeholder="How can we help?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={4000}
                rows={7}
                className="rounded-lg border border-black/15 bg-white px-3 py-2.5 text-[14px] outline-none focus:border-black resize-y"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-[11.5px] text-black/45">
                Opens your email client and sends to {SUPPORT_EMAIL}.
              </p>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-[13px] font-medium text-white hover:opacity-90"
              >
                <Send className="h-3.5 w-3.5" />
                {sent ? "Sent — check your email" : "Send message"}
              </button>
            </div>
          </form>
        </FadeIn>

        <p className="mt-6 text-center text-[12.5px] text-black/50">
          Prefer plain email?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-black underline underline-offset-4">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
