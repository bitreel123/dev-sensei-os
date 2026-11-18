import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Activity, FileText, Globe2, Layers, Menu, Plus, Minus, X, MoveUpRight } from "lucide-react";
import { motion, useReducedMotion, useScroll } from "motion/react";
import { Button } from "@/components/ui/button";
import biomedicalImage from "@/assets/biomedical-sand.jpg";
import anatomyImage from "@/assets/anatomy-research.jpg";
import grain from "@/assets/jeradin-grain.png.asset.json";
import { ScrollStatement, EvidenceAnimation } from "@/components/jeradin/landing-motion";

const AnatomyWalkthrough = lazy(() => import("@/components/jeradin/anatomy-walkthrough"));
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
  { label: "Research", icon: FileText, title: "Evidence. Not just answers.", body: "Connect findings, mechanisms and conflicting results to the question that matters." },
  { label: "Development", icon: Activity, title: "Follow the science forward.", body: "Explore investigational therapies, disease pathways and the research behind them." },
  { label: "Health signals", icon: Globe2, title: "Global signals. Scientific context.", body: "Our monitoring vision connects emerging events to locations, past incidents and evidence." },
];
function Intelligence() {
  const [tab, setTab] = useState(0);
  const selected = evidence[tab];
  return <section id="intelligence" className="landing-section"><div className="landing-container">
    <Reveal className="landing-section-heading"><div><p className="landing-kicker">01 / EVIDENCE INTELLIGENCE</p><h2>Ask a question.<br /><em>Explore the whole picture.</em></h2></div><p>Diseases. Mechanisms. Treatments.<br />The relationships between them matter.</p></Reveal>
    <div className="landing-evidence-layout"><div className="landing-evidence-copy"><div className="landing-tabs" role="tablist" aria-label="Intelligence perspectives">{evidence.map((item, i) => <Button key={item.label} variant="ghost" role="tab" aria-selected={tab === i} aria-controls="evidence-content" id={`evidence-tab-${i}`} onClick={() => setTab(i)} className={tab === i ? "active" : ""}><item.icon size={16} />{item.label}</Button>)}</div><motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .4 }}><h3>{selected.title}</h3><p>{selected.body}</p><Button asChild variant="link" className="landing-text-link"><Link to="/app">Explore Jeradin <ArrowUpRight /></Link></Button></motion.div></div><div id="evidence-content" role="tabpanel" aria-labelledby={`evidence-tab-${tab}`}><EvidenceAnimation mode={tab} /></div></div>
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const points: [number, number][] = [[48,9],[45,33],[53,39],[43,48],[55,54],[48,25],[39,35],[54,49],[48,61],[48,78],[56,66]];
  return <section id="anatomy" className="landing-anatomy-section"><div className="landing-container landing-anatomy-layout"><div className="landing-anatomy-visual"><div className="anatomy-preview-header"><span className="landing-kicker">HUMAN ATLAS / EDUCATIONAL PREVIEW</span><Button variant="outline" size="sm" onClick={() => setLabels(!labels)} aria-pressed={labels}><Layers size={14} />{labels ? "Hide labels" : "Show labels"}</Button></div><div className="anatomy-breathing-art"><img src={anatomyImage} alt="Educational illustration of the human body with internal organs in natural colors" loading="lazy" width={1024} height={1024} /><div className={`anatomy-focus focus-${part.position}`} key={part.name} /><div className="anatomy-scan" />{mounted && <Suspense fallback={null}><AnatomyWalkthrough count={organs.length} selected={selected} onSelect={setSelected} point={points[selected]} /></Suspense>}</div>{labels && <div className="landing-anatomy-labels">{organs.filter((_, i) => i === selected).map((organ) => <Button key={organ.name} size="sm" variant="default" className={`anatomy-label label-${organ.position}`} onClick={() => setSelected(selected)} aria-pressed={true}>{organ.name}<Plus size={12} /></Button>)}</div>}<div className="anatomy-preview-footer"><span>STANDARD ANATOMY · NOT A PATIENT DIGITAL TWIN</span><MoveUpRight size={16} /></div></div><Reveal className="landing-anatomy-copy"><p className="landing-kicker">02 / HUMAN ANATOMY</p><h2>Put knowledge<br /><em>in perspective.</em></h2><p>Explore the body. Understand each part. See how its systems connect.</p><div key={part.name} className="landing-organ-detail anatomy-detail-enter" aria-live="polite"><span className="landing-kicker">{part.system}</span><h3>{part.name}</h3><p>{part.description}</p></div><Button asChild variant="outline" size="lg"><Link to="/app">Explore human anatomy <ArrowUpRight /></Link></Button><p>Coming next: conditions, pathways and their effects on the body.</p><small>Educational anatomy. Not a diagnostic model.</small></Reveal></div></section>;
}
function Platform() {
  return <section id="platform" className="landing-platform-section"><div className="landing-container"><ScrollStatement /><Reveal className="platform-story"><p className="landing-kicker">THE JERADIN PLATFORM</p><h2>Research with context.<br /><em>Anatomy with meaning.</em></h2><p>One workspace for health evidence and the human body. Built for researchers, students and life-science teams.</p><a href="#intelligence" className="story-link">Discover the intelligence <ArrowUpRight size={18} /></a></Reveal><div className="landing-development-note"><span className="announcement-dot" /><p>The workspace and anatomy are previews. Automated intelligence, monitoring and research exports are in development.</p></div></div></section>;
}
function Pipeline() {
  const chapters = [
    ["01", "Information. Connected.", "Planned annotated datasets connect conditions, interventions and health events—with traceable evidence."],
    ["02", "Research that keeps moving.", "Planned topic alerts and digests bring new developments back to your saved questions."],
    ["03", "Take the next step.", "PDF dossiers and CSV / JSON exports are on the roadmap. Hypotheses still need laboratory validation."],
  ];
  return <section className="landing-section landing-pipeline-section"><div className="landing-container"><Reveal><p className="landing-kicker">BUILT FOR THE NEXT QUESTION</p><h2>Beyond the search.<br /><em>Into your research.</em></h2></Reveal><div className="landing-research-chapters">{chapters.map(([n, title, body]) => <Reveal className="research-chapter" key={n}><span className="chapter-number">{n}</span><div><h3>{title}</h3><p>{body}</p></div><ArrowUpRight className="chapter-arrow" size={38} strokeWidth={1} /></Reveal>)}</div></div></section>;
}
function ResearchStory() {
  return <section className="landing-section landing-use-case"><div className="landing-container"><Reveal><p className="landing-kicker">ONE QUESTION / MANY CONNECTIONS</p><h2>What does it take to<br /><em>understand a condition?</em></h2></Reveal><div className="use-case-story"><Reveal><span className="story-overline">A BREAST CANCER RESEARCH JOURNEY</span><h3>Start with the biology.<br />Keep following the evidence.</h3></Reveal><Reveal><p>From breast tissue to cellular pathways, connect the biology with emerging therapies and conflicting findings.</p><p>Our vision: a cited dossier that carries the whole picture into your next investigation.</p></Reveal></div></div></section>;
}
const faqs = [
  ["Who is Jeradin for?", "Researchers, students, educators and life-science teams."],
  ["What can I use today?", "Explore the workspace and anatomy preview; automated search, monitoring and exports are still in development."],
  ["Does Jeradin diagnose or suggest treatment?", "No—Jeradin supports education and research, not diagnosis, treatment or clinical decisions."],
  ["How does Jeradin handle uncertainty?", "Our evidence tools are being designed to show conflicting findings, limitations and source context."],
  ["Can I download datasets and reports?", "PDF, CSV and JSON exports are planned, with usage and reuse terms published when available."],
];
function Questions() { const [open, setOpen] = useState<number | null>(0); return <section className="landing-section"><div className="landing-container landing-faq-layout"><Reveal><p className="landing-kicker">A LITTLE MORE CLARITY</p><h2>Good questions.<br /><em>Clear answers.</em></h2></Reveal><div>{faqs.map(([q, a], i) => <article className="landing-faq-item" key={q}><Button variant="ghost" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} aria-controls={`faq-${i}`}><span>{q}</span>{open === i ? <Minus /> : <Plus />}</Button>{open === i && <p id={`faq-${i}`}>{a}</p>}</article>)}</div></div></section>; }
function Closing() { return <section className="landing-closing"><img src={biomedicalImage} alt="" loading="lazy" width={1920} height={1088} /><Reveal><p className="landing-kicker">A CLEARER PICTURE STARTS HERE</p><h2>Jeradin.<br /><em>For a healthier understanding.</em></h2><Button asChild size="lg"><Link to="/app">Explore the workspace <ArrowUpRight /></Link></Button></Reveal></section>; }
function Footer() { return <footer className="landing-footer"><div className="landing-container"><div className="landing-footer-top"><div><Brand /><p>Health evidence. Human anatomy.<br />Connected understanding.</p></div><div><span>EXPLORE</span><a href="#intelligence">Evidence intelligence</a><a href="#anatomy">Human anatomy</a><Link to="/pricing">Pricing</Link></div><div><span>JERADIN</span><Link to="/support">Contact & support</Link><Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms of service</Link></div></div><div className="landing-footer-bottom"><span>© 2026 Jeradin Labs</span><span>For education and research. Not clinical decision-making.</span><a href="#top">Back to top ↑</a></div></div></footer>; }
function Landing() { const { scrollYProgress } = useScroll(); return <div id="top" className="jeradin-landing"><div className="landing-grain" style={{ backgroundImage: `url(${grain.url})` }} aria-hidden="true" /><motion.div className="landing-scroll-progress" style={{ scaleX: scrollYProgress }} /><LandingHeader /><main><Hero /><Platform /><Intelligence /><Anatomy /><ResearchStory /><Pipeline /><Questions /><Closing /></main><Footer /></div>; }
