import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { SiteHeader } from "@/components/fixdemy/header";
import { SiteFooter } from "@/components/fixdemy/footer";
import { LogoWordmark } from "@/components/fixdemy/logo";
import { ParticleField } from "@/components/fixdemy/particles";
import { MorphVisual } from "@/components/fixdemy/morph-visual";
import { BrandLogo, ALL_BRANDS, BrandName } from "@/components/fixdemy/brand-logos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fixdemy — From idea to production. One intelligence layer." },
      {
        name: "description",
        content:
          "Fixdemy is an AI powered systems intelligence platform helping developers, founders and engineers understand, build, debug, test and improve complex systems.",
      },
      { property: "og:title", content: "Fixdemy — One intelligence layer" },
      {
        property: "og:description",
        content:
          "AI powered systems intelligence across software, AI, infrastructure, hardware and data.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      <SiteHeader />
      <Hero />
      <OperatingSystem />
      <SystemVisual />
      <Connector />
      <CTA />
      <SiteFooter />
    </div>
  );
}

/* ------------------------------ Hero ------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden pt-40 pb-28">
      <ParticleField className="absolute inset-0 h-full w-full" />
      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <div className="scale-[0.85] origin-center">
            <LogoWordmark />
          </div>
        </motion.div>

        <h1 className="mt-5 text-[34px] sm:text-[48px] md:text-[60px] leading-[1.02] tracking-[-0.035em] font-semibold text-black">
          <RisingLine text="From idea to production." delay={0.05} />
          <br />
          <RisingLine text="One intelligence layer." delay={0.3} />
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-2"
        >
          <Link
            to="/download"
            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-[13px] font-medium text-white hover:bg-black/85 transition-colors"
          >
            <DownloadGlyph /> Download for Windows
          </Link>
          <Link
            to="/product"
            className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] px-4 py-2.5 text-[13px] font-medium text-black hover:bg-black/[0.08] transition-colors"
          >
            Explore use cases
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function RisingLine({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="inline-block overflow-hidden align-bottom">
      <motion.span
        className="inline-block"
        initial={{ y: "108%" }}
        animate={{ y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay }}
      >
        {text}
      </motion.span>
    </span>
  );
}

function DownloadGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 2v9m0 0 3-3m-3 3L5 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* --------------------- The AI operating system --------------------- */

function OperatingSystem() {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-28 pb-20">
      <div className="grid md:grid-cols-2 gap-12 items-end">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-[40px] sm:text-[56px] leading-[1] tracking-[-0.035em] font-bold text-black"
        >
          The AI operating system for great builders.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-[14.5px] text-black/70 leading-relaxed max-w-md md:justify-self-end"
        >
          Fixdemy is an AI powered systems intelligence platform that helps
          developers, founders, engineers, and teams understand, build, debug,
          test, and improve complex systems across software, AI, infrastructure,
          hardware and data.
        </motion.p>
      </div>
    </section>
  );
}

/* --------------------- Gigantic animated character --------------------- */

function SystemVisual() {
  return (
    <section className="relative bg-black text-white overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-32">
        {/* Floating card on top */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-md rounded-[6px] border border-white/15 bg-black/60 backdrop-blur-md p-6"
        >
          <p className="text-[13.5px] leading-relaxed text-white/85">
            Fixdemy understands your entire system, not just your code. Connect
            repositories, applications, databases, APIs, infrastructure,
            hardware projects and AI workflows to receive real-time
            intelligence, diagnostics, architecture guidance and automated
            recommendations.
          </p>
          <Link
            to="/product"
            className="mt-5 inline-flex items-center gap-2 border border-white/30 px-3.5 py-2 text-[12px] font-mono tracking-wide hover:bg-white hover:text-black transition-colors"
          >
            About our product <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>

        {/* Gigantic morphing visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative -mt-24 md:-mt-32"
        >
          <MorphVisual />
        </motion.div>
      </div>
    </section>
  );
}

/* --------------------------- Connector --------------------------- */

function Connector() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-28">
      <div className="grid md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-5">
          <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-black/50">
            Universal connector
          </span>
          <h2 className="mt-3 text-[40px] sm:text-[52px] leading-[1] tracking-[-0.035em] font-bold text-black">
            One layer. Every tool.
          </h2>
          <p className="mt-5 text-[14.5px] text-black/70 leading-relaxed max-w-md">
            Fixdemy speaks Model Context Protocol. Install once, then bridge to
            anything — scoped, revocable, transparent.
          </p>
          <Link
            to="/docs"
            className="mt-7 inline-flex items-center gap-1.5 text-[13px] font-semibold text-black hover:underline underline-offset-4"
          >
            Read the MCP docs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="md:col-span-7">
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.18)]">
            <div className="grid grid-cols-3 gap-3">
              {ALL_BRANDS.map((b, i) => (
                <motion.div
                  key={b}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                  className="group aspect-square rounded-xl border border-black/10 bg-white flex flex-col items-center justify-center gap-2 hover:border-black hover:bg-black/[0.02] transition-colors cursor-pointer"
                >
                  <BrandLogo brand={b} className="h-7 w-7" />
                  <span className="text-[11.5px] font-medium text-black">
                    {BrandName(b)}
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-black/45">
              <span>fixdemy.mcp · v0.1</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-black animate-pulse" />
                listening
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- CTA --------------------------- */

function CTA() {
  return (
    <section className="border-t border-black/10">
      <div className="mx-auto max-w-5xl px-6 py-28 text-center">
        <h2 className="text-[44px] sm:text-[72px] leading-[0.98] tracking-[-0.04em] font-bold text-black">
          Ship without the loops.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[14px] text-black/70">
          Free during beta. Windows, macOS, Linux and Web.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/download"
            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-[13px] font-medium text-white hover:bg-black/85"
          >
            <DownloadGlyph /> Download Fixdemy
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] px-4 py-2.5 text-[13px] font-medium text-black hover:bg-black/[0.08]"
          >
            Create an account
          </Link>
        </div>
      </div>
    </section>
  );
}
