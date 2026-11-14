import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Activity, Database, FileText, Globe2, Layers, Menu, Plus, Minus, X, MoveUpRight } from "lucide-react";
import { motion, useReducedMotion, useScroll } from "motion/react";
import { Button } from "@/components/ui/button";
import biomedicalImage from "@/assets/biomedical-sand.jpg";
import anatomyImage from "@/assets/anatomy-research.jpg";
import grain from "@/assets/jeradin-grain.png.asset.json";
import { ScrollStatement, EvidenceAnimation } from "@/components/jeradin/landing-motion";

const Typography = lazy(() => import("@/components/jeradin/landing-typography"));
const TITLE = "Jeradin — Health Intelligence, Connected";
const DESC = "Explore Jeradin's health research workspace: biomedical evidence, structured data and educational human anatomy. Connect sources to a clearer understanding.";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESC },
      { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE }, { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: "https://jeradin.com/" }],
  }),
  component: Landing,
});

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.7 }}>{children}</motion.div>;
}
function Brand() { return <Link to="/" className="landing-brand" aria-label="Jeradin home"><span className="brand-symbol"><Activity size={22} strokeWidth={1.5} /></span>jeradin<span className="brand-dot">®</span></Link>; }
function LandingHeader() {
  const [menu, setMenu] = useState(false);
  return <header className="landing-header"><div className="landing-header-inner">
    <Brand />
    <nav className="landing-desktop-nav" aria-label="Main navigation"><a href="#platform">Platform</a><a href="#intelligence">Intelligence</a><a href="#anatomy">Human anatomy</a><Link to="/pricing">Pricing</Link></nav>
    <div className="landing-header-actions"><Button asChild variant="ghost" className="landing-login"><Link to="/login" search={{}}>Log in <ArrowUpRight /></Link></Button><Button asChild className="landing-nav-cta"><Link to="/signup" search={{}}>Get started <ArrowRight /></Link></Button><Button variant="ghost" size="icon" className="landing-menu" aria-label={menu ? "Close navigation" : "Open navigation"} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</Button></div>
    {menu && <nav className="landing-mobile-nav" aria-label="Mobile navigation"><a href="#platform" onClick={() => setMenu(false)}>Platform</a><a href="#intelligence" onClick={() => setMenu(false)}>Intelligence</a><a href="#anatomy" onClick={() => setMenu(false)}>Human anatomy</a><Link to="/pricing">Pricing</Link><Link to="/login" search={{}}>Log in</Link></nav>}
  </div></header>;
}
function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <section className="landing-hero">
    <img src={biomedicalImage} alt="Microscopic biological structures and interconnected cell membranes" width={1920} height={1088} className="landing-hero-image" fetchPriority="high" />
    <div className="landing-hero-content"><Reveal>

      <p className="landing-kicker hero-kicker">JERADIN / BIOMEDICAL INTELLIGENCE</p>
      <h1>Health intelligence.<br /><em>Human understanding.</em></h1>
      <p className="landing-hero-description">Connect the world's health evidence to the human body.<br className="desktop-break" /> Research, structured data, and anatomy. One clearer picture.</p>
      <div className="landing-hero-actions"><Button asChild size="lg"><Link to="/app">Explore the workspace <ArrowUpRight /></Link></Button><Button asChild variant="outline" size="lg"><a href="#platform">Discover Jeradin <ArrowRight /></a></Button></div>
    </Reveal></div>
    <div className="landing-hero-bottom"><span>FOR THE PEOPLE MOVING HEALTH FORWARD</span><a href="#platform">Explore below <span>↓</span></a></div>
    {mounted && <Suspense fallback={null}><Typography /></Suspense>}
  </section>;
}
const evidence = [
  { label: "Research", icon: FileText, title: "Go deeper than an answer.", body: "A biomedical question rarely has one simple answer. Jeradin’s research direction brings findings, methods, biological mechanisms and conflicting evidence into the same view—so you can understand the reasoning, not just read a summary.", detail: "Follow a condition from foundational knowledge to emerging investigations. Compare what different studies actually measured, recognize where conclusions diverge, and identify the questions that still deserve further work." },
  { label: "Development", icon: Activity, title: "Follow the path from idea to investigation.", body: "Understand the therapies being investigated, the mechanisms they target and the questions their studies are trying to answer. Connect treatment-development activity to the wider biological picture.", detail: "Jeradin is designed to connect investigational interventions, trial stages and disease pathways. These connections can inform a research direction; they do not prove that a substance is safe or effective." },
  { label: "Health signals", icon: Globe2, title: "A global picture. A deeper context.", body: "An emerging health event makes more sense when it is connected to location, time, previous incidents and scientific context. Jeradin’s vision is a continuously developing picture of health across regions.", detail: "Explore confirmed developments alongside emerging signals without treating them as equivalent. Planned monitoring will connect health updates, research and public discussion while keeping uncertainty and evidence quality visible." },
];
function Intelligence() {
  const [tab, setTab] = useState(0);
  const selected = evidence[tab];
  return <section id="intelligence" className="landing-section"><div className="landing-container">
    <Reveal className="landing-section-heading"><div><p className="landing-kicker">01 / EVIDENCE INTELLIGENCE</p><h2>Ask a question.<br /><em>Explore the whole picture.</em></h2></div><p>Diseases. Mechanisms. Treatments.<br />The relationships between them matter.</p></Reveal>
    <div className="landing-evidence-layout"><div className="landing-evidence-copy"><div className="landing-tabs" role="tablist" aria-label="Intelligence perspectives">{evidence.map((item, i) => <Button key={item.label} variant="ghost" role="tab" aria-selected={tab === i} aria-controls="evidence-content" id={`evidence-tab-${i}`} onClick={() => setTab(i)} className={tab === i ? "active" : ""}><item.icon size={16} />{item.label}</Button>)}</div><motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .4 }}><h3>{selected.title}</h3><p>{selected.body}</p><p>{selected.detail}</p><Button asChild variant="link" className="landing-text-link"><Link to="/app">Explore Jeradin <ArrowUpRight /></Link></Button></motion.div></div><div id="evidence-content" role="tabpanel" aria-labelledby={`evidence-tab-${tab}`}><EvidenceAnimation mode={tab} /></div></div>
  </div></section>;
}
const organs = [
  { name: "Brain", position: "brain", system: "NERVOUS SYSTEM", description: "Processes information and coordinates movement, memory and many automatic functions. Nerves connect its signals to the rest of the body." },
  { name: "Lungs", position: "lungs", system: "RESPIRATORY SYSTEM", description: "Exchange oxygen and carbon dioxide with the blood. Airways carry air to the lungs; the diaphragm helps power each breath." },
  { name: "Heart", position: "heart", system: "CARDIOVASCULAR SYSTEM", description: "Pumps blood through the lungs and body, connecting oxygen exchange with the delivery of nutrients to tissues." },
  { name: "Liver", position: "liver", system: "DIGESTIVE & METABOLIC SYSTEMS", description: "Processes nutrients, produces bile and helps metabolize medicines and other substances carried in the blood." },
  { name: "Kidneys", position: "kidneys", system: "URINARY SYSTEM", description: "Filter blood, regulate fluid and electrolyte balance, and remove waste through urine." },
  { name: "Trachea", position: "trachea", system: "RESPIRATORY SYSTEM", description: "Carries air from the upper airway toward the bronchi, which branch into the lungs." },
  { name: "Rib cage", position: "ribs", system: "SKELETAL SYSTEM", description: "Protects the heart and lungs and moves with the muscles involved in breathing." },
  { name: "Stomach", position: "stomach", system: "DIGESTIVE SYSTEM", description: "Mixes food with digestive secretions before passing it into the small intestine." },
  { name: "Intestines", position: "intestines", system: "DIGESTIVE SYSTEM", description: "The small intestine absorbs most nutrients. The large intestine absorbs water and forms stool." },
  { name: "Pelvis", position: "pelvis", system: "SKELETAL SYSTEM", description: "Supports the trunk, connects the spine to the legs and protects structures in the lower abdomen." },
  { name: "Arteries", position: "arteries", system: "CARDIOVASCULAR SYSTEM", description: "Carry blood away from the heart toward organs and tissues throughout the body." },
];
function Anatomy() {
  const [selected, setSelected] = useState(1);
  const [labels, setLabels] = useState(true);
  const part = organs[selected];
  return <section id="anatomy" className="landing-anatomy-section"><div className="landing-container landing-anatomy-layout"><div className="landing-anatomy-visual"><div className="anatomy-preview-header"><span className="landing-kicker">HUMAN ATLAS / EDUCATIONAL PREVIEW</span><Button variant="outline" size="sm" onClick={() => setLabels(!labels)} aria-pressed={labels}><Layers size={14} />{labels ? "Hide labels" : "Show labels"}</Button></div><div className="anatomy-breathing-art"><img src={anatomyImage} alt="Educational illustration of the human body with internal organs in natural colors" loading="lazy" width={1024} height={1024} /><div className={`anatomy-focus focus-${part.position}`} key={part.name} /><div className="anatomy-scan" /></div>{labels && <div className="landing-anatomy-labels">{organs.map((organ, i) => <Button key={organ.name} size="sm" variant={i === selected ? "default" : "outline"} className={`anatomy-label label-${organ.position}`} onClick={() => setSelected(i)} aria-pressed={i === selected}>{organ.name}<Plus size={12} /></Button>)}</div>}<div className="anatomy-preview-footer"><span>STANDARD ANATOMY · NOT A PATIENT DIGITAL TWIN</span><MoveUpRight size={16} /></div></div><Reveal className="landing-anatomy-copy"><p className="landing-kicker">02 / HUMAN ANATOMY</p><h2>Put knowledge<br /><em>in perspective.</em></h2><p>The body is not a collection of isolated parts. Explore the structures that sustain life, learn what each one does, and understand how respiratory, circulatory, digestive and nervous systems work together.</p><div className="landing-organ-detail" aria-live="polite"><span className="landing-kicker">{part.system}</span><h3>{part.name}</h3><p>{part.description}</p></div><Button asChild variant="outline" size="lg"><Link to="/app">Explore human anatomy <ArrowUpRight /></Link></Button><p>Our pathology-mapping direction will connect conditions to affected structures and explain routes of entry, biological pathways and effects on body systems. The aim is understandable science—not a prediction about an individual person.</p><small>An educational illustration, not a diagnostic model. Disease mapping and biological simulations require validated evidence.</small></Reveal></div></section>;
}
function Platform() {
  return <section id="platform" className="landing-platform-section"><div className="landing-container"><ScrollStatement /><Reveal className="platform-story"><p className="landing-kicker">THE JERADIN PLATFORM</p><h2>Research with context.<br /><em>Anatomy with meaning.</em></h2><p>Jeradin brings two perspectives into one workspace: intelligence that connects health knowledge, and an educational atlas that makes the biology understandable. Start with a condition, a body system or a research question. Move between the evidence and the anatomy without losing the thread.</p><p>We are building for the people who turn curiosity into progress: researchers examining disease mechanisms, students learning complex systems, and life-science teams exploring their next investigation.</p><a href="#intelligence" className="story-link">Discover the intelligence <ArrowUpRight size={18} /></a></Reveal><div className="landing-development-note"><span className="announcement-dot" /><p>The workspace and anatomy are previews. Automated intelligence, monitoring and research exports are in development.</p></div></div></section>;
}
function Pipeline() {
  const chapters = [
    ["01", "Make information usable.", "A paper, a trial record and a health update describe different pieces of the same landscape. Jeradin’s data direction connects conditions, interventions, body systems, geography and time into structured, searchable research knowledge.", "Designed for annotated datasets with traceable evidence and clear distinctions between scientific findings, reported events and public sentiment."],
    ["02", "Keep the question alive.", "Research does not stop when a report is written. Our monitoring direction is built around following topics over time, connecting new developments to previous findings and helping you revisit how the picture has changed.", "Planned topic subscriptions, notifications and research digests will bring relevant changes back to your saved work—not simply add more noise."],
    ["03", "Take the understanding further.", "The goal is research you can build on: readable dossiers for deeper study, structured datasets for analysis and a searchable history that preserves the context of your work.", "PDF reports and CSV / JSON datasets are planned. Research hypotheses remain questions for investigation and laboratory validation, not confirmed discoveries."],
  ];
  return <section className="landing-section landing-pipeline-section"><div className="landing-container"><Reveal><p className="landing-kicker">BUILT FOR THE NEXT QUESTION</p><h2>Beyond the search.<br /><em>Into your research.</em></h2></Reveal><div className="landing-research-chapters">{chapters.map(([n, title, body, detail]) => <Reveal className="research-chapter" key={n}><span className="chapter-number">{n}</span><div><h3>{title}</h3><p>{body}</p><p>{detail}</p></div><ArrowUpRight className="chapter-arrow" size={38} strokeWidth={1} /></Reveal>)}</div></div></section>;
}
function ResearchStory() {
  return <section className="landing-section landing-use-case"><div className="landing-container"><Reveal><p className="landing-kicker">ONE QUESTION / MANY CONNECTIONS</p><h2>What does it take to<br /><em>understand a condition?</em></h2></Reveal><div className="use-case-story"><Reveal><span className="story-overline">A BREAST CANCER RESEARCH JOURNEY</span><h3>Start with the biology.<br />Keep following the evidence.</h3></Reveal><Reveal><p>A search for breast cancer should do more than return documents. It should help you understand the tissue involved, the cellular mechanisms under investigation, and how different lines of research relate to each other.</p><p>Jeradin’s vision connects anatomical context with scientific findings, investigational treatments and drug-development questions. It brings supporting and contradictory evidence into view, so a compelling hypothesis does not hide the limits of what is known.</p><p>Save the context, revisit developments and, as export tools become available, take a structured dossier into your next stage of study. Digital exploration supports further research; it does not replace experimental validation.</p></Reveal></div></div></section>;
}
const faqs = [
  ["Who is Jeradin for?", "Researchers, biomedical and medical students, educators, and life science teams exploring scientific evidence and human anatomy."],
  ["What can I use today?", "The workspace and educational anatomy preview are available to explore. Automated biomedical retrieval, global monitoring, evidence dossiers, and structured exports are being developed; the examples on this page are not live generated research."],
  ["Does Jeradin diagnose or suggest treatment?", "No. Jeradin is for education and research, not personal diagnosis, treatment recommendations, or clinical decisions. A standard anatomical model cannot locate a disease in an individual person."],
  ["How does Jeradin handle uncertainty?", "The platform is being designed to distinguish research findings, investigational ideas and emerging health signals. Conflicting results, evidence limitations and the original context belong in the picture—not hidden behind a confident summary."],
  ["Will I be able to download datasets and reports?", "PDF research dossiers and structured CSV / JSON exports are part of the roadmap. Availability, included usage, and payment terms will be shown when those tools are ready. Public availability does not automatically permit redistribution or AI training."],
];
function Questions() { const [open, setOpen] = useState<number | null>(0); return <section className="landing-section"><div className="landing-container landing-faq-layout"><Reveal><p className="landing-kicker">A LITTLE MORE CLARITY</p><h2>Good questions.<br /><em>Clear answers.</em></h2></Reveal><div>{faqs.map(([q, a], i) => <article className="landing-faq-item" key={q}><Button variant="ghost" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} aria-controls={`faq-${i}`}><span>{q}</span>{open === i ? <Minus /> : <Plus />}</Button>{open === i && <p id={`faq-${i}`}>{a}</p>}</article>)}</div></div></section>; }
function Closing() { return <section className="landing-closing"><img src={biomedicalImage} alt="" loading="lazy" width={1920} height={1088} /><Reveal><p className="landing-kicker">A CLEARER PICTURE STARTS HERE</p><h2>Jeradin.<br /><em>For a healthier understanding.</em></h2><Button asChild size="lg"><Link to="/app">Explore the workspace <ArrowUpRight /></Link></Button></Reveal></section>; }
function Footer() { return <footer className="landing-footer"><div className="landing-container"><div className="landing-footer-top"><div><Brand /><p>Health evidence. Human anatomy.<br />Connected understanding.</p></div><div><span>EXPLORE</span><a href="#intelligence">Evidence intelligence</a><a href="#anatomy">Human anatomy</a><Link to="/pricing">Pricing</Link></div><div><span>JERADIN</span><Link to="/support">Contact & support</Link><Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms of service</Link></div></div><div className="landing-footer-bottom"><span>© 2026 Jeradin Labs</span><span>For education and research. Not clinical decision-making.</span><a href="#top">Back to top ↑</a></div></div></footer>; }
function Landing() { const { scrollYProgress } = useScroll(); return <div id="top" className="jeradin-landing"><div className="landing-grain" style={{ backgroundImage: `url(${grain.url})` }} aria-hidden="true" /><motion.div className="landing-scroll-progress" style={{ scaleX: scrollYProgress }} /><LandingHeader /><main><Hero /><Platform /><Intelligence /><Anatomy /><ResearchStory /><Pipeline /><Questions /><Closing /></main><Footer /></div>; }
