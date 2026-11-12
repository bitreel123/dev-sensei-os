import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Activity, Database, FileText, Globe2, Layers, Menu, Plus, Minus, X, MoveUpRight, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import biomedicalImage from "@/assets/biomedical-sand.jpg";
import anatomyImage from "@/assets/anatomy-research.jpg";

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
      <a href="#platform" className="landing-announcement"><span className="announcement-dot" /> A new perspective on health intelligence <ArrowUpRight size={14} /></a>
      <p className="landing-kicker hero-kicker">JERADIN / BIOMEDICAL INTELLIGENCE</p>
      <h1>Health intelligence.<br /><em>Human understanding.</em></h1>
      <p className="landing-hero-description">Connect the world's health evidence to the human body.<br className="desktop-break" /> Research, structured data, and anatomy. One clearer picture.</p>
      <div className="landing-hero-actions"><Button asChild size="lg"><Link to="/app">Explore the workspace <ArrowUpRight /></Link></Button><Button asChild variant="outline" size="lg"><a href="#platform">Discover Jeradin <ArrowRight /></a></Button></div>
    </Reveal></div>
    <div className="landing-hero-bottom"><span>FOR THE PEOPLE MOVING HEALTH FORWARD</span><a href="#platform">Explore below <span>↓</span></a></div>
    {mounted && <Suspense fallback={null}><Typography /></Suspense>}
  </section>;
}
const sources = [
  ["PubMed", "https://pubmed.ncbi.nlm.nih.gov/"], ["Europe PMC", "https://europepmc.org/"],
  ["ClinicalTrials.gov", "https://clinicaltrials.gov/"], ["openFDA", "https://open.fda.gov/"], ["WHO", "https://www.who.int/data"],
];
function SourceBand() {
  return <section className="landing-source-band"><div className="landing-container"><p>THE OPEN SCIENCE LANDSCAPE</p><div>{sources.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noreferrer">{name}<ArrowUpRight size={12} /></a>)}</div><small>Independent public sources. No affiliation or endorsement implied.</small></div></section>;
}
const evidence = [
  { label: "Literature", icon: FileText, title: "Follow the science. Not just the headline.", body: "Explore published findings, compare methods, and trace each claim back to its original paper.", sources: [["PubMed", "Biomedical literature & abstracts", "https://pubmed.ncbi.nlm.nih.gov/?term=breast+cancer"], ["Europe PMC", "Life science research & open access", "https://europepmc.org/search?query=breast%20cancer"]], tag: "PUBLISHED EVIDENCE", query: "Breast cancer · mechanisms & evidence" },
  { label: "Clinical trials", icon: Activity, title: "See where research is moving.", body: "Discover study designs, trial phases, recruitment status, and the treatments being investigated.", sources: [["ClinicalTrials.gov", "Study records, phases & recruitment", "https://clinicaltrials.gov/search?cond=Breast%20Cancer"], ["WHO ICTRP", "International trial registration portal", "https://trialsearch.who.int/"]], tag: "TRIAL REGISTRIES", query: "Breast cancer · investigational treatments" },
  { label: "Health signals", icon: Globe2, title: "Put health events in context.", body: "Connect official outbreak reports and public health updates with historical evidence. Separate confirmed facts from emerging signals.", sources: [["WHO Disease Outbreak News", "Official international outbreak reports", "https://www.who.int/emergencies/disease-outbreak-news"], ["WHO Global Health Observatory", "Population-level health indicators", "https://www.who.int/data/gho"]], tag: "PUBLIC HEALTH SOURCES", query: "Global health · outbreaks & context" },
];
function Intelligence() {
  const [tab, setTab] = useState(0);
  const selected = evidence[tab];
  return <section id="intelligence" className="landing-section"><div className="landing-container">
    <Reveal className="landing-section-heading"><div><p className="landing-kicker">01 / EVIDENCE INTELLIGENCE</p><h2>From scattered sources.<br /><em>To connected knowledge.</em></h2></div><p>Health research doesn't happen in one place.<br />Your understanding should.</p></Reveal>
    <div className="landing-evidence-layout"><div className="landing-evidence-copy"><div className="landing-tabs" role="tablist" aria-label="Evidence sources">{evidence.map((item, i) => <Button key={item.label} variant="ghost" role="tab" aria-selected={tab === i} aria-controls="evidence-content" id={`evidence-tab-${i}`} onClick={() => setTab(i)} className={tab === i ? "active" : ""}><item.icon size={16} />{item.label}</Button>)}</div><Reveal><h3>{selected.title}</h3><p>{selected.body}</p><ul className="landing-check-list"><li><ShieldCheck size={16} />Source provenance, not unsupported answers</li><li><Layers size={16} />Evidence, context, and uncertainty together</li><li><Database size={16} />A foundation for research-ready datasets</li></ul><Button asChild variant="link" className="landing-text-link"><Link to="/app">Open the research workspace <ArrowUpRight /></Link></Button></Reveal></div>
    <div className="landing-evidence-display" id="evidence-content" role="tabpanel" aria-labelledby={`evidence-tab-${tab}`}><div className="evidence-window-bar"><span><span /> JERADIN / RESEARCH</span><span>SOURCE PREVIEW</span></div><div className="evidence-query"><Globe2 size={18} /><span>{selected.query}</span><ArrowUpRight size={16} /></div><div className="evidence-summary"><p className="landing-kicker">{selected.tag}</p><h4>A question is just<br />the beginning.</h4><p>Follow the original sources. Understand what is known, what is being studied, and what remains uncertain.</p></div><div className="evidence-source-list">{selected.sources.map(([name, detail, url], i) => <a href={url} key={name} target="_blank" rel="noreferrer"><span className="source-number">0{i + 1}</span><span><strong>{name}</strong><small>{detail}</small></span><ArrowUpRight size={18} /></a>)}</div><div className="evidence-display-footer"><span>ILLUSTRATIVE WORKSPACE · ORIGINAL SOURCES</span><FileText size={16} /></div></div></div>
  </div></section>;
}
const organs = [
  { name: "Brain", position: "brain", system: "NERVOUS SYSTEM", description: "Processes information, coordinates movement, and supports memory, emotion, and many automatic body functions." },
  { name: "Lungs", position: "lungs", system: "RESPIRATORY SYSTEM", description: "Exchange oxygen and carbon dioxide with the blood. The diaphragm and airways help move air into and out of the lungs." },
  { name: "Heart", position: "heart", system: "CARDIOVASCULAR SYSTEM", description: "Pumps blood through the lungs and the rest of the body, delivering oxygen and nutrients and carrying away waste." },
  { name: "Liver", position: "liver", system: "DIGESTIVE & METABOLIC SYSTEMS", description: "Processes nutrients, produces bile, and helps metabolize medicines and other substances carried in the blood." },
  { name: "Kidneys", position: "kidneys", system: "URINARY SYSTEM", description: "Filter the blood, regulate fluid and electrolyte balance, and remove waste through urine." },
];
function Anatomy() {
  const [selected, setSelected] = useState(1);
  const [labels, setLabels] = useState(true);
  const part = organs[selected];
  return <section id="anatomy" className="landing-anatomy-section"><div className="landing-container landing-anatomy-layout"><div className="landing-anatomy-visual"><div className="anatomy-preview-header"><span className="landing-kicker">HUMAN ATLAS / EDUCATIONAL PREVIEW</span><Button variant="outline" size="sm" onClick={() => setLabels(!labels)} aria-pressed={labels}><Layers size={14} />{labels ? "Hide labels" : "Show labels"}</Button></div><img src={anatomyImage} alt="Educational illustration of the human body with internal organs in natural colors" loading="lazy" width={1024} height={1024} />{labels && <div className="landing-anatomy-labels">{organs.map((organ, i) => <Button key={organ.name} size="sm" variant={i === selected ? "default" : "outline"} className={`anatomy-label label-${organ.position}`} onClick={() => setSelected(i)} aria-pressed={i === selected}>{organ.name}<Plus size={12} /></Button>)}</div>}<div className="anatomy-preview-footer"><span>STANDARD ANATOMY · NOT A PATIENT DIGITAL TWIN</span><MoveUpRight size={16} /></div></div><Reveal className="landing-anatomy-copy"><p className="landing-kicker">02 / HUMAN ANATOMY</p><h2>Put knowledge<br /><em>in perspective.</em></h2><p>Understand the body behind the research. Explore anatomical structures, their functions, and the systems that connect them.</p><div className="landing-organ-detail" aria-live="polite"><span className="landing-kicker">{part.system}</span><h3>{part.name}</h3><p>{part.description}</p></div><Button asChild variant="outline" size="lg"><Link to="/app">Explore human anatomy <ArrowUpRight /></Link></Button><small>An educational illustration, not a diagnostic model. Disease mapping and biological simulations require validated evidence.</small></Reveal></div></section>;
}
function Platform() {
  return <section id="platform" className="landing-platform-section"><div className="landing-container"><Reveal><p className="landing-kicker">THE JERADIN PLATFORM</p><h2>Two perspectives.<br /><em>One research workspace.</em></h2><p className="platform-intro">Building a bridge between health information<br className="desktop-break" /> and the people working to understand it.</p></Reveal><div className="landing-pillar-grid"><Reveal><span className="pillar-index">01</span><Database size={28} strokeWidth={1} /><h3>Evidence intelligence</h3><p>A research direction built around finding, structuring, and connecting scientific literature, clinical trials, and global health signals.</p><a href="#intelligence">Explore the evidence <ArrowUpRight size={18} /></a></Reveal><Reveal><span className="pillar-index">02</span><Activity size={28} strokeWidth={1} /><h3>Human anatomy</h3><p>An educational body explorer that makes biological structures, organ functions, and their connections easier to understand.</p><a href="#anatomy">Explore the human body <ArrowUpRight size={18} /></a></Reveal></div><div className="landing-development-note"><span className="announcement-dot" /><p>Explore the anatomy and workspace preview today. Automated source monitoring, cited health synthesis, and PDF / CSV / JSON exports are in development.</p></div></div></section>;
}
const pipeline = [
  ["01", "Discover", "Scientific literature, trial registries, official health reports, and responsibly sourced public signals."],
  ["02", "Structure", "Connect diseases, body systems, interventions, locations, and dates—with source attribution."],
  ["03", "Understand", "Bring evidence and anatomy together. Make uncertainty visible, not invisible."],
  ["04", "Build on it", "A roadmap for saved dossiers, update alerts, and PDF, CSV, and JSON research exports."],
];
function Pipeline() { return <section className="landing-section landing-pipeline-section"><div className="landing-container"><Reveal className="landing-section-heading"><div><p className="landing-kicker">THE DIRECTION / CONNECTED BY DESIGN</p><h2>Information in.<br /><em>Understanding out.</em></h2></div><p>Not another wall of information.<br />A foundation you can build on.</p></Reveal><div className="landing-pipeline">{pipeline.map(([n, name, text]) => <Reveal key={n}><div><span>{n}</span><ArrowRight size={22} strokeWidth={1} /></div><h3>{name}</h3><p>{text}</p></Reveal>)}</div></div></section>; }
const faqs = [
  ["Who is Jeradin for?", "Researchers, biomedical and medical students, educators, and life science teams exploring scientific evidence and human anatomy."],
  ["What can I use today?", "The workspace and educational anatomy preview are available to explore. Automated biomedical retrieval, global monitoring, evidence dossiers, and structured exports are being developed; the examples on this page are not live generated research."],
  ["Does Jeradin diagnose or suggest treatment?", "No. Jeradin is for education and research, not personal diagnosis, treatment recommendations, or clinical decisions. A standard anatomical model cannot locate a disease in an individual person."],
  ["Where will the data come from?", "The planned evidence pipeline focuses on public scientific literature, trial registries, and official public health sources, with source links, collection dates, and licensing checks. News and social signals must be distinguished from validated scientific evidence."],
  ["Will I be able to download datasets and reports?", "PDF research dossiers and structured CSV / JSON exports are part of the roadmap. Availability, included usage, and payment terms will be shown when those tools are ready. Public availability does not automatically permit redistribution or AI training."],
];
function Questions() { const [open, setOpen] = useState<number | null>(0); return <section className="landing-section"><div className="landing-container landing-faq-layout"><Reveal><p className="landing-kicker">A LITTLE MORE CLARITY</p><h2>Good questions.<br /><em>Clear answers.</em></h2></Reveal><div>{faqs.map(([q, a], i) => <article className="landing-faq-item" key={q}><Button variant="ghost" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} aria-controls={`faq-${i}`}><span>{q}</span>{open === i ? <Minus /> : <Plus />}</Button>{open === i && <p id={`faq-${i}`}>{a}</p>}</article>)}</div></div></section>; }
function Closing() { return <section className="landing-closing"><img src={biomedicalImage} alt="" loading="lazy" width={1920} height={1088} /><Reveal><p className="landing-kicker">A CLEARER PICTURE STARTS HERE</p><h2>Jeradin.<br /><em>For a healthier understanding.</em></h2><Button asChild size="lg"><Link to="/app">Explore the workspace <ArrowUpRight /></Link></Button></Reveal></section>; }
function Footer() { return <footer className="landing-footer"><div className="landing-container"><div className="landing-footer-top"><div><Brand /><p>Health evidence. Human anatomy.<br />Connected understanding.</p></div><div><span>EXPLORE</span><a href="#intelligence">Evidence intelligence</a><a href="#anatomy">Human anatomy</a><Link to="/pricing">Pricing</Link></div><div><span>JERADIN</span><Link to="/support">Contact & support</Link><Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms of service</Link></div></div><div className="landing-footer-bottom"><span>© 2026 Jeradin Labs</span><span>For education and research. Not clinical decision-making.</span><a href="#top">Back to top ↑</a></div></div></footer>; }
function Landing() { return <div id="top" className="jeradin-landing"><LandingHeader /><main><Hero /><SourceBand /><Platform /><Intelligence /><Anatomy /><Pipeline /><Questions /><Closing /></main><Footer /></div>; }
