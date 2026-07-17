import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";
import { FadeIn, AnimatedWords } from "@/components/jeradin/animated-text";
import { Apple, Globe, Monitor, Terminal, ArrowRight, Chrome, Check, Copy } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download Jeradin" },
      { name: "description", content: "Install Jeradin as a Chrome extension, launch the web app, or grab the desktop build for Windows, macOS and Linux." },
      { property: "og:title", content: "Download Jeradin" },
      { property: "og:description", content: "Get Jeradin on every platform — free during beta." },
    ],
  }),
  component: DownloadPage,
});

type Platform = {
  icon: typeof Monitor;
  name: string;
  sub: string;
  file: string;
  action: { type: "download"; href: string } | { type: "link"; href: string } | { type: "waitlist" };
  primary?: boolean;
};

const platforms: Platform[] = [
  {
    icon: Chrome,
    name: "Chrome Extension",
    sub: "Chrome · Edge · Brave · Arc",
    file: "jeradin-extension.zip",
    action: { type: "download", href: "/jeradin-extension.zip" },
    primary: true,
  },
  {
    icon: Globe,
    name: "Web App",
    sub: "Run in browser — no install",
    file: "Open the workspace",
    action: { type: "link", href: "/app" },
  },
  {
    icon: Monitor,
    name: "Windows",
    sub: "Windows 10 & 11 · 64-bit · Beta",
    file: "Join Windows waitlist",
    action: { type: "waitlist" },
  },
  {
    icon: Apple,
    name: "macOS",
    sub: "Apple Silicon & Intel · Beta",
    file: "Join macOS waitlist",
    action: { type: "waitlist" },
  },
  {
    icon: Terminal,
    name: "Linux",
    sub: "AppImage · Debian · RPM · Beta",
    file: "Join Linux waitlist",
    action: { type: "waitlist" },
  },
];

const TERMINAL_CMD = `curl -L https://jeradin.com/jeradin-extension.zip -o jeradin-extension.zip && unzip jeradin-extension.zip -d jeradin-extension`;

function DownloadPage() {
  const [copied, setCopied] = useState(false);

  const handle = (p: Platform) => {
    if (p.action.type === "download") {
      // Fetch + blob download works across preview + prod
      fetch(p.action.href)
        .then((r) => r.blob())
        .then((blob) => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "jeradin-extension.zip";
          a.click();
          URL.revokeObjectURL(a.href);
        })
        .catch(() => {
          window.location.href = p.action.type === "download" ? p.action.href : "/";
        });
    } else if (p.action.type === "link") {
      window.location.href = p.action.href;
    } else {
      window.location.href =
        "mailto:support@jeradin.com?subject=Jeradin%20desktop%20waitlist&body=Please%20notify%20me%20when%20the%20desktop%20build%20is%20available.";
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(TERMINAL_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="pt-32 pb-12 mx-auto max-w-4xl px-5 text-center">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Download</div>
        <h1 className="mt-3 text-[44px] sm:text-[64px] leading-[1.02] tracking-[-0.04em] font-medium">
          <AnimatedWords text="Pick your platform." />
        </h1>
        <p className="mt-5 max-w-md mx-auto text-[14px] text-black/55">
          Free during beta. Extension is live today · desktop builds land next.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((p, i) => (
            <FadeIn key={p.name} delay={i * 0.05}>
              <div
                className={`rounded-2xl border p-6 h-full flex flex-col ${
                  p.primary ? "border-black bg-black text-white" : "border-black/10 bg-white"
                }`}
              >
                <p.icon className="h-5 w-5" />
                <div className="mt-4 text-[17px] font-medium tracking-tight">{p.name}</div>
                <div className={`text-[12px] ${p.primary ? "text-white/55" : "text-black/45"}`}>{p.sub}</div>
                <button
                  onClick={() => handle(p)}
                  className={`mt-6 inline-flex items-center justify-between rounded-full px-4 py-2.5 text-[12.5px] font-medium transition-opacity hover:opacity-90 ${
                    p.primary ? "bg-white text-black" : "bg-black text-white"
                  }`}
                >
                  {p.action.type === "download" ? "Download" : p.action.type === "link" ? "Open" : "Notify me"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <div className={`mt-3 text-[11px] font-mono ${p.primary ? "text-white/40" : "text-black/40"}`}>
                  {p.file}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Extension install guide */}
      <section className="mx-auto max-w-4xl px-5 pb-16">
        <div className="rounded-2xl border border-black/10 bg-white p-8">
          <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Install the extension</div>
          <h2 className="mt-2 text-[24px] tracking-[-0.02em] font-medium">Three steps · under 60 seconds.</h2>
          <ol className="mt-5 text-[13.5px] text-black/70 space-y-2 leading-relaxed list-decimal pl-5">
            <li>Click <b>Download</b> above and unzip <code className="font-mono text-black">jeradin-extension.zip</code>.</li>
            <li>Open <code className="font-mono text-black">chrome://extensions</code> and toggle <b>Developer mode</b> on (top-right).</li>
            <li>Click <b>Load unpacked</b> and select the unzipped folder. The Jeradin icon appears in your toolbar.</li>
          </ol>
          <p className="mt-4 text-[12.5px] text-black/50">
            Then open <Link to="/extension" className="underline underline-offset-4">the extension pairing page</Link> to generate a connection token and link it to your account.
          </p>
        </div>
      </section>

      {/* Terminal install */}
      <section className="mx-auto max-w-4xl px-5 pb-24">
        <div className="rounded-2xl border border-black/10 bg-black text-white p-8">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/40">Install via terminal</div>
          <h2 className="mt-2 text-[24px] tracking-[-0.02em] font-medium">Prefer the CLI?</h2>
          <p className="mt-2 text-[13.5px] text-white/60">
            Fetch and unpack the extension bundle in one command:
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3">
            <code className="flex-1 font-mono text-[12px] text-white/90 break-all">{TERMINAL_CMD}</code>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1 rounded bg-white/10 hover:bg-white/20 px-2 py-1.5 text-[11.5px]"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-4 text-[12px] text-white/40 font-mono">
            Then load the <span className="text-white/70">jeradin-extension</span> folder as unpacked in chrome://extensions.
          </p>
        </div>

        <div className="mt-10 text-center">
          <p className="text-[13px] text-black/55">
            Need an account first?{" "}
            <Link to="/signup" className="text-black underline underline-offset-4">Create one</Link>{" "}
            or{" "}
            <Link to="/login" className="text-black underline underline-offset-4">sign in</Link>.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
