import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { ArrowRight, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";
import { LogoWordmark } from "@/components/jeradin/logo";
import { MorphVisual } from "@/components/jeradin/morph-visual";
import { InteractiveGlobe } from "@/components/jeradin/interactive-globe";
import { BrandLogo, ALL_BRANDS, BrandName } from "@/components/jeradin/brand-logos";
import { HermesFeatures } from "@/components/jeradin/hermes-features";
import { IntelligenceFeatures } from "@/components/jeradin/intelligence-features";
import { JeradinPortal } from "@/components/jeradin/jeradin-portal";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jeradin — From idea to production. One intelligence layer." },
      {
        name: "description",
        content:
          "Jeradin is an AI powered systems intelligence platform helping developers, founders and engineers understand, build, debug, test and improve complex systems.",
      },
      { property: "og:title", content: "Jeradin — One intelligence layer" },
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
      <HermesFeatures />
      <Connector />
      <IntelligenceFeatures />
      <QuestionsWorthAnswering />
      <JeradinPortal />
      <SiteFooter />

    </div>
  );
}

const FAQ_ITEMS = [
  {
    question: "What is Jeradin?",
    answer: "Jeradin turns a screen, codebase, repository, document, or business idea into a clear diagnosis and an actionable plan. It explains what is happening, why it matters, and what to do next without assuming you are deeply technical.",
  },
  {
    question: "What does Jeradin actually do?",
    answer: "Jeradin combines Screen, Knowledge, System, and GitHub Intelligence. It can diagnose what is visible on your screen, research and validate an idea, review an entire codebase, or answer repository-specific questions with evidence from the real files.",
  },
  {
    question: "Can I use Jeradin if I am not a developer?",
    answer: "Yes. Founders and non-technical builders can use Knowledge Intelligence to validate ideas, compare markets, shape pricing, plan an MVP, and understand the technical decisions needed to launch.",
  },
  {
    question: "How does Screen Intelligence work?",
    answer: "Record or capture the problem you can see. Jeradin reads the interface, identifies likely errors and affected code, then opens Ask Jeradin directly on the tab you were working in with a step-by-step fix and IDE-coloured code suggestions.",
  },
  {
    question: "What is the difference between System and GitHub Intelligence?",
    answer: "System Intelligence reviews the health and architecture of an entire codebase. GitHub Intelligence connects to a selected repository for evidence-based answers about files, regressions, risks, pull requests, and the safest implementation path.",
  },
  {
    question: "Does Jeradin replace my coding tools?",
    answer: "No. Jeradin works alongside the tools you already use. It provides the second layer of judgment: understanding the system, validating decisions, detecting hidden risk, and translating recommendations for every person on the team.",
  },
  {
    question: "Can I use just one Intelligence capability?",
    answer: "Yes. Use only the capability that fits the work in front of you. Each one works independently, while using them together gives Jeradin broader context across the idea, interface, system, and repository.",
  },
  {
    question: "Who owns the code and ideas I analyze?",
    answer: "You do. Jeradin analyzes your material to produce the requested result; it does not claim ownership of your code, documents, product ideas, or generated recommendations.",
  },
  {
    question: "How do credits work?",
    answer: "Credits are charged only after an Intelligence prompt successfully produces a useful result. Screen Intelligence costs 2 credits, a Screen Deep Dive costs 5, and Knowledge, System, or GitHub Intelligence costs 5 credits per completed prompt.",
  },
];

function QuestionsWorthAnswering() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section className="border-y border-white/15 bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-20 md:py-24">
        <div className="border-b border-white/20 pb-3 font-mono text-[11px] uppercase text-white/55">
          Questions worth answering
        </div>
        <div>
          {FAQ_ITEMS.map((item, index) => {
            const open = openIndex === index;
            return (
              <article key={item.question} className="border-b border-white/20">
                <Button
                  type="button"
                  variant="ghost"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="h-auto w-full justify-between rounded-none px-0 py-4 text-left text-white hover:bg-transparent hover:text-white"
                >
                  <span className="whitespace-normal text-[15px] font-medium sm:text-[16px]">{item.question}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-white/55 transition-transform ${open ? "rotate-180" : ""}`} />
                </Button>
                {open && (
                  <p className="max-w-3xl pb-6 pr-10 text-[14px] leading-7 text-white/60">
                    {item.answer}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Hero ------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16">
      <div className="relative">
        {/* Interactive globe behind */}
        <InteractiveGlobe className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[720px] w-[720px] md:h-[880px] md:w-[880px]" />

        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-16 text-center">
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

          <h1 className="mt-5 font-serif text-[42px] sm:text-[64px] md:text-[78px] leading-[0.98] tracking-[-0.025em] font-medium text-black">
            <RisingLine text="The intelligence layer" delay={0.05} />
            <br />
            <RisingLine text="for modern builders." delay={0.25} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="mx-auto mt-6 max-w-xl text-[14.5px] text-black/70 leading-relaxed"
          >
            Understand, build, debug and ship complex systems with one
            connected AI layer across software, infrastructure and data.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            className="mt-8 flex flex-col items-center gap-5"
          >
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Link
                to="/download"
                className="inline-flex items-center gap-2 bg-black px-4 py-2.5 text-[13px] font-medium text-white hover:bg-black/85 transition-colors"
              >
                <DownloadGlyph /> Download for Windows
              </Link>
              <Link
                to="/download"
                className="inline-flex items-center gap-2 border border-black/30 px-4 py-2.5 text-[11.5px] font-medium text-black hover:bg-black hover:text-white transition-colors"
              >
                Install as extension
              </Link>
            </div>


            <InstallTerminal />
          </motion.div>

        </div>

        {/* Large product video — full bleed */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-6 w-full max-w-[1600px] px-3 sm:px-6"
        >
          <div className="overflow-hidden rounded-xl border border-black/10 bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.45)]">
            <video
              src="https://7fmuvik1thzhlkvi.public.blob.vercel-storage.com/Jeradin.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Jeradin product demo"
              className="block h-auto w-full"
            />
          </div>
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

function InstallTerminal() {
  const [os, setOs] = useState<"mac" | "win">("mac");
  const [copied, setCopied] = useState(false);
  const cmd =
    os === "mac"
      ? "curl -fsSL https://get.jeradin.dev/install.sh | sh"
      : "irm https://get.jeradin.dev/install.ps1 | iex";
  const prefix = os === "mac" ? "curl" : "irm";
  const rest = cmd.slice(prefix.length);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  return (
    <div className="w-full max-w-[440px] text-left">
      <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-black/50">
        Install via terminal
      </div>
      <div className="rounded-md border border-black/15 bg-white overflow-hidden">
        <div className="flex items-center gap-1 border-b border-black/10 px-2 pt-2 font-mono text-[11px]">
          {(["mac", "win"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setOs(k)}
              className={`px-2.5 py-1 rounded-t-sm transition-colors ${
                os === k
                  ? "bg-black/[0.06] text-black"
                  : "text-black/50 hover:text-black"
              }`}
            >
              {k === "mac" ? "macOS / Linux" : "Windows"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 font-mono text-[12px]">
          <span className="text-black/45">{prefix}</span>
          <span className="text-black truncate">{rest}</span>
          <button
            onClick={copy}
            aria-label="Copy command"
            className="ml-auto rounded p-1 text-black/50 hover:text-black hover:bg-black/[0.06] transition-colors"
          >
            {copied ? (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="5" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3 11V4a1 1 0 0 1 1-1h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
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

/* --------------------- The AI operating system + Mission --------------------- */

function OperatingSystem() {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-16 pb-20">
      <div className="grid md:grid-cols-2 gap-12 items-end">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-[36px] sm:text-[48px] leading-[1] tracking-[-0.035em] font-bold text-black"
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
          Jeradin is an AI powered systems intelligence platform that helps
          developers, founders, engineers, and teams understand, build, debug,
          test, and improve complex systems across software, AI, infrastructure,
          hardware and data.
        </motion.p>
      </div>

      {/* Mission section — image-3 style */}
      <div className="mt-24 border-t border-black/15 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 font-mono text-[12px] text-black/70"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center border border-black/40 text-[11px]">
            1
          </span>
          <span className="inline-flex items-center border border-black/40 px-2 py-0.5 tracking-wide">
            Mission
          </span>
        </motion.div>

        <motion.h3
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-5xl text-[34px] sm:text-[44px] md:text-[54px] leading-[1.05] tracking-[-0.025em] font-medium text-black"
        >
          Engineering cycles are still measured in months and years. Complex
          systems continue to grow faster than humans can understand them.
        </motion.h3>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mt-10 max-w-xl bg-black text-white p-7"
        >
          <p className="text-[13.5px] leading-relaxed text-white/85">
            Jeradin changes that. We embed an intelligence layer directly into
            the way teams build — compressing the distance between an idea, a
            working system, and what ships to production. Designed for the
            engineers, founders and operators redefining what is possible.
          </p>
          <Link
            to="/product"
            className="mt-6 inline-flex items-center gap-3 border border-white/40 px-3.5 py-2 text-[12px] font-mono tracking-wide hover:bg-white hover:text-black transition-colors"
          >
            About Us <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* --------------------- Gigantic animated character --------------------- */

function SystemVisual() {
  return (
    <section className="relative bg-black text-white overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <MorphVisual />
        </motion.div>

      </div>
    </section>
  );
}

/* --------------------------- Connector --------------------------- */

const WORKFLOWS = [
  "Lovable integration",
  "Replit workflow",
  "Cursor workflow",
  "Bolt workflows",
  "Architecture suggestion",
  "Deployment guidance",
];

function Connector() {
  return (
    <section className="bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-14 md:py-16">

        <div className="grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-6">
            <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/50">
              Universal connector
            </span>
            <h2 className="mt-3 text-[32px] sm:text-[42px] leading-[1.02] tracking-[-0.03em] font-semibold text-white">
              One layer. Every tool.
            </h2>
            <p className="mt-5 text-[14px] text-white/65 leading-relaxed max-w-md">
              Jeradin works alongside any AI coding tool to validate decisions,
              detect mistakes, explain failures and keep projects moving from
              ideas to production.
            </p>

            <Link
              to="/docs"
              className="mt-7 inline-flex items-center gap-1.5 text-[13px] font-medium text-white hover:underline underline-offset-4"
            >
              Read the MCP docs <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="md:col-span-6">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 max-w-md md:ml-auto">
              <div className="grid grid-cols-3 gap-2">
                {ALL_BRANDS.map((b, i) => (
                  <motion.div
                    key={b}
                    initial={{ opacity: 0, scale: 0.96 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.04 }}
                    className="group aspect-square rounded-lg border border-white/10 bg-white/[0.02] flex flex-col items-center justify-center gap-1.5 hover:border-white/40 hover:bg-white/[0.05] transition-colors cursor-pointer"
                  >
                    <BrandLogo brand={b} variant="light" className="h-5 w-5" />
                    <span className="text-[10px] font-medium text-white/80">
                      {BrandName(b)}
                    </span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between px-1 text-[10px] font-mono text-white/40">
                <span>jeradin.mcp · v0.1</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse" />
                  listening
                </span>
              </div>
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
            <DownloadGlyph /> Download Jeradin
          </Link>
          <Link
            to="/signup"
            search={{}}
            className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] px-4 py-2.5 text-[13px] font-medium text-black hover:bg-black/[0.08]"
          >
            Create an account
          </Link>
        </div>
      </div>
    </section>
  );
}
