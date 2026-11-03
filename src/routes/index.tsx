import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, Activity, Bug, FileText, Database, Microscope, Globe2 } from "lucide-react";
import { motion } from "motion/react";
import { SiteHeader } from "@/components/jeradin/header";
import { SiteFooter } from "@/components/jeradin/footer";
import { LogoWordmark } from "@/components/jeradin/logo";
import { InteractiveGlobe } from "@/components/jeradin/interactive-globe";
import { Button } from "@/components/ui/button";

const OG = "https://jeradin.com/__l5e/assets-v1/ddade698-c63e-4fd5-ba1a-6e0f47399049/jeradin-og.png";
const DESC =
  "Jeradin is a virtual human platform for doctors, students and researchers. Rehearse procedures in 3D, see how diseases affect the body, and explore medical data and research in one place.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jeradin | Virtual Human, Medical Data and Research Intelligence" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Jeradin | The Virtual Human for Medicine and Research" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Jeradin | The Virtual Human for Medicine and Research" },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG },
    ],
    links: [{ rel: "canonical", href: "https://jeradin.com/" }],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader variant="dark" />
      <Hero />
      <Pillars />
      <DataSources />
      <Audiences />
      <HowItWorks />
      <Faq />
      <Cta />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-24">
      <InteractiveGlobe
        tone="light"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[1100px] w-[1100px] md:h-[1500px] md:w-[1500px]"
      />
      <div className="relative mx-auto max-w-5xl px-6 pt-16 text-center">
        <div className="flex justify-center scale-[0.85]"><LogoWordmark /></div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mt-5 font-serif text-[40px] sm:text-[62px] md:text-[76px] leading-[1] tracking-[-0.025em] font-medium"
        >
          The virtual human
          <br />
          for medicine and research.
        </motion.h1>
        <p className="mx-auto mt-6 max-w-2xl text-[15px] font-medium leading-relaxed text-white/75">
          Rehearse a procedure on a 3D human before the real one. Search any disease or virus and watch where it
          lives and how it spreads. See the research, medical data, news and public health signals behind it, then
          download a full report.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          <Link to="/signup" search={{}} className="inline-flex items-center gap-2 bg-white px-5 py-3 text-[13px] font-semibold text-black hover:bg-white/85">
            Explore the virtual human <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/pricing" className="inline-flex items-center border border-white/35 px-5 py-3 text-[13px] font-semibold hover:bg-white hover:text-black">
            See pricing
          </Link>
        </div>
        <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-white/45">
          Education, rehearsal and research tool. Not for live clinical decisions.
        </p>
      </div>
    </section>
  );
}

const PILLARS = [
  { icon: Activity, t: "3D procedure rehearsal", d: "Walk through an eye, liver, heart or brain procedure step by step on a labelled 3D body. See the landmarks, risk zones and tools before you ever touch a patient." },
  { icon: Bug, t: "Disease and virus mapping", d: "Type “rhinovirus” or “hepatitis B” and the virtual human lights up the organs it affects, how it enters, how it spreads and what symptoms follow." },
  { icon: Database, t: "Medical data intelligence", d: "Pull clinical trials, drug data, disease statistics and genetic information into one clear picture, linked to the exact body part it concerns." },
  { icon: Microscope, t: "Research synthesis", d: "Ask a question and Jeradin reads dozens of papers for you, shows where they agree, where they disagree, and what still needs testing in the lab." },
  { icon: Globe2, t: "Public health and social signals", d: "See outbreak news, public sentiment and SDG health indicators beside the science, so you understand the real world impact, not just the textbook." },
  { icon: FileText, t: "Downloadable dossiers", d: "Export a labelled report with 3D captures, steps, data tables, citations and suggested lab work. Keep it, share it, or take it to your team." },
];

function Pillars() {
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/50">What Jeradin does</span>
        <h2 className="mt-3 max-w-3xl text-[32px] sm:text-[44px] font-semibold leading-[1.05] tracking-[-0.03em]">
          One body. Every piece of medical knowledge mapped onto it.
        </h2>
        <div className="mt-12 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map(({ icon: Icon, t, d }) => (
            <div key={t} className="bg-black p-7">
              <Icon className="h-5 w-5 text-white/80" />
              <h3 className="mt-4 text-[17px] font-semibold">{t}</h3>
              <p className="mt-2 text-[14px] font-medium leading-relaxed text-white/65">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const SOURCES = [
  ["PubMed and PMC", "Over 36 million research papers"],
  ["ClinicalTrials.gov", "Global clinical trial records"],
  ["Europe PMC", "Open access life science literature"],
  ["openFDA", "Drug labels, side effects and recalls"],
  ["WHO Global Health Observatory", "Country level health statistics"],
  ["UN SDG data", "Health and wellbeing indicators"],
  ["UniProt and PDB", "Proteins and molecular structures"],
  ["NCBI Gene and ClinVar", "Genes and genetic variants"],
  ["Disease outbreak news", "Live outbreak reports and public sentiment"],
];

function DataSources() {
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-20 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/50">Built on trusted data</span>
          <h2 className="mt-3 text-[30px] sm:text-[40px] font-semibold leading-[1.05] tracking-[-0.03em]">
            Real sources. Real citations.
          </h2>
          <p className="mt-5 text-[14px] font-medium leading-relaxed text-white/65">
            Every answer is grounded in open medical and scientific databases, and every claim links back to where it
            came from. No guessing, no made up facts.
          </p>
        </div>
        <div className="md:col-span-7 grid gap-px bg-white/10 sm:grid-cols-2">
          {SOURCES.map(([n, d]) => (
            <div key={n} className="bg-black p-5">
              <div className="text-[14px] font-semibold">{n}</div>
              <div className="mt-1 text-[12.5px] font-medium text-white/55">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const AUDIENCES = [
  "Doctors and surgeons",
  "Medical students and residents",
  "Medical researchers",
  "Biochemistry and biomedical researchers",
  "Pharmacy professionals",
  "Pharmaceutical and drug research companies",
  "Universities and research institutions",
  "Medical educators",
];

function Audiences() {
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/50">Who it is for</span>
        <h2 className="mt-3 text-[30px] sm:text-[40px] font-semibold tracking-[-0.03em]">Made for people who study the human body.</h2>
        <div className="mt-8 flex flex-wrap gap-2.5">
          {AUDIENCES.map((a) => (
            <span key={a} className="border border-white/20 px-4 py-2 text-[13px] font-semibold">{a}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  ["Ask", "Type a procedure, disease, drug or research question in plain words."],
  ["See", "The virtual human shows the exact body parts involved, with real labels."],
  ["Understand", "Read the steps, data, research and public health picture side by side."],
  ["Download", "Export a full dossier and decide what lab work to do next."],
];

function HowItWorks() {
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/50">How it works</span>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <div key={t} className="border-t border-white/25 pt-5">
              <div className="font-mono text-[12px] text-white/45">0{i + 1}</div>
              <div className="mt-2 text-[20px] font-semibold">{t}</div>
              <p className="mt-2 text-[14px] font-medium text-white/65">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQ_ITEMS = [
  { q: "What is Jeradin?", a: "Jeradin is a virtual human and medical intelligence platform. It combines a labelled 3D human body with medical data, research papers and public health information so you can learn, rehearse and research in one place." },
  { q: "Is this used during real surgery?", a: "No. Jeradin is for learning, preparation and research. It helps you rehearse and understand a procedure beforehand. Real clinical decisions always stay with qualified professionals and your institution's protocols." },
  { q: "Where does the medical data come from?", a: "From open, trusted sources such as PubMed, ClinicalTrials.gov, openFDA, WHO and UN SDG data, plus outbreak news. Every result shows its citations." },
  { q: "Do you use real patient data?", a: "No. The virtual human is a standard anatomical model. You never need to upload patient records to use Jeradin." },
  { q: "Can I download my research?", a: "Yes. Every result can be exported as a dossier with 3D captures, labels, steps, data tables and references." },
  { q: "How does payment work?", a: "You can start free, then choose a monthly plan or buy credits. Credits are only used when a result is successfully generated." },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-4xl px-6 py-20">
        <div className="border-b border-white/20 pb-3 font-mono text-[11px] uppercase text-white/55">Questions worth answering</div>
        {FAQ_ITEMS.map((f, i) => (
          <article key={f.q} className="border-b border-white/20">
            <Button
              variant="ghost"
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? null : i)}
              className="h-auto w-full justify-between rounded-none px-0 py-4 text-left text-white hover:bg-transparent hover:text-white"
            >
              <span className="whitespace-normal text-[15px] font-semibold">{f.q}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </Button>
            {open === i && <p className="pb-6 pr-10 text-[14px] font-medium leading-7 text-white/65">{f.a}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-[38px] sm:text-[60px] font-bold leading-[1] tracking-[-0.04em]">Practise on the virtual human first.</h2>
        <p className="mx-auto mt-5 max-w-md text-[14px] font-medium text-white/65">Start free. No patient data needed.</p>
        <Link to="/signup" search={{}} className="mt-8 inline-flex items-center gap-2 bg-white px-5 py-3 text-[13px] font-semibold text-black hover:bg-white/85">
          Get started free <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
