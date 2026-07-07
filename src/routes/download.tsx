import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";
import { FadeIn, AnimatedWords } from "@/components/jeradin/animated-text";
import { Apple, Globe, Monitor, Terminal, ArrowRight, Chrome } from "lucide-react";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download Jeradin" },
      { name: "description", content: "Download Jeradin for Windows, macOS, Linux, or use it directly in the browser." },
      { property: "og:title", content: "Download Jeradin" },
      { property: "og:description", content: "Get Jeradin on every platform — free during beta." },
    ],
  }),
  component: DownloadPage,
});

const platforms = [
  { icon: Monitor, name: "Windows", sub: "Windows 10 & 11 · 64-bit", file: "Jeradin-Setup-0.1.exe", primary: true },
  { icon: Apple, name: "macOS", sub: "Apple Silicon & Intel · 13+", file: "Jeradin-0.1.dmg" },
  { icon: Terminal, name: "Linux", sub: "AppImage · Debian · RPM", file: "Jeradin-0.1.AppImage" },
  { icon: Globe, name: "Web", sub: "Run in browser — no install", file: "Open web app" },
  { icon: Chrome, name: "Chrome Extension", sub: "Lightweight overlay", file: "Add to Chrome" },
];

function DownloadPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <SiteHeader />
      <section className="pt-32 pb-12 mx-auto max-w-4xl px-5 text-center">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/40">Download</div>
        <h1 className="mt-3 text-[44px] sm:text-[64px] leading-[1.02] tracking-[-0.04em] font-medium">
          <AnimatedWords text="Pick your platform." />
        </h1>
        <p className="mt-5 max-w-md mx-auto text-[14px] text-black/55">
          Free during beta. ~28MB. Auto-updates. No telemetry on by default.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-28">
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
                  className={`mt-6 inline-flex items-center justify-between rounded-full px-4 py-2.5 text-[12.5px] font-medium ${
                    p.primary ? "bg-white text-black" : "bg-black text-white"
                  }`}
                >
                  Download
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <div className={`mt-3 text-[11px] font-mono ${p.primary ? "text-white/40" : "text-black/40"}`}>
                  {p.file}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <div className="mt-14 text-center">
          <p className="text-[13px] text-black/55">
            Need an account first?{" "}
            <Link to="/signup" className="text-black underline underline-offset-4">
              Create one
            </Link>{" "}
            or{" "}
            <Link to="/login" className="text-black underline underline-offset-4">
              sign in
            </Link>
            .
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
