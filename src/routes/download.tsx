import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";
import { FadeIn, AnimatedWords } from "@/components/jeradin/animated-text";
import { Apple, Globe, Monitor, Terminal, ArrowRight, Chrome } from "lucide-react";

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
    file: "jeradin-extension-v1.4.0.zip",
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

function DownloadPage() {
  const handle = (p: Platform) => {
    if (p.action.type === "download") {
      // Fetch + blob download works across preview + prod
      fetch(p.action.href)
        .then((r) => r.blob())
        .then((blob) => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "jeradin-extension-v1.4.0.zip";
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
                  {p.action.type === "download" ? "Install extension" : p.action.type === "link" ? "Open" : "Notify me"}
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

      {/* Browser security requires unpacking an extension that is not yet in the Chrome Web Store. */}
      <section className="mx-auto max-w-4xl px-5 pb-16">
        <div className="rounded-2xl border border-black/10 bg-white p-8">
          <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Install the extension</div>
          <h2 className="mt-2 text-[24px] tracking-[-0.02em] font-medium">Three steps · under 60 seconds.</h2>
          <ol className="mt-5 text-[13.5px] text-black/70 space-y-2 leading-relaxed list-decimal pl-5">
            <li>Click <b>Install extension</b> above and unzip the single downloaded package.</li>
            <li>Open <code className="font-mono text-black">chrome://extensions</code> and toggle <b>Developer mode</b> on (top-right).</li>
            <li>Click <b>Load unpacked</b> and select the unzipped folder. The Jeradin icon appears in your toolbar.</li>
          </ol>
          <p className="mt-4 text-[12.5px] text-black/50">Sign in on jeradin.com once; the installed extension links to your account automatically.</p>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-5 pb-24">
        <div className="mt-10 text-center">
          <p className="text-[13px] text-black/55">
            Need an account first?{" "}
            <Link to="/signup" search={{}} className="text-black underline underline-offset-4">Create one</Link>{" "}
            or{" "}
            <Link to="/login" search={{}} className="text-black underline underline-offset-4">sign in</Link>.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
