import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Bug, ChevronDown, Database, Dna, Droplet, FileText, Microscope, PanelLeftClose, PanelLeftOpen, Radio, Search, Send, Bot, UserRound, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "./logo";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/hooks/use-user-data";
import { DashboardAnatomy } from "./dashboard-anatomy";
import { pathogenTour, researchTour } from "./dashboard-tour-data";

type View = "search" | "pathogen" | "datasets";
const researchUpdates = [
  { category: "Oncology", title: "Lung cancer research: connecting molecular changes to treatment targets", summary: "A reading brief on cell growth, tumour biology and the questions researchers investigate when evaluating targeted treatments.", age: "Sample update 01" },
  { category: "Neurology", title: "Alzheimer’s research: biomarkers and early detection", summary: "An evidence brief exploring how researchers study biological markers, alongside the limits of screening and interpretation.", age: "Sample update 02" },
  { category: "Drug discovery", title: "Cancer treatment combinations: efficacy and safety", summary: "A research brief comparing study design, treatment response and adverse effects before conclusions are drawn.", age: "Sample update 03" },
];
const pathogenUpdates = [
  { category: "Malaria", title: "Malaria research: tracing the parasite from entry to blood stage", summary: "An educational brief connecting mosquito transmission, the liver stage, blood-cell infection and immune response.", age: "Sample update 01" },
  { category: "Virology", title: "Respiratory viruses: transmission and tissue response", summary: "A pathogen brief covering entry through the airways and the local immune response. Findings depend on the specific virus.", age: "Sample update 02" },
  { category: "Microbiology", title: "Antimicrobial resistance: mechanisms under investigation", summary: "A reading brief on how microbes evade treatments and how resistance is studied across populations.", age: "Sample update 03" },
];
const nav = [{ id: "search" as View, label: "Search Explorer", icon: Search, to: "/app" as const }, { id: "pathogen" as View, label: "Pathogen Mapping", icon: Bug, to: "/pathogen" as const }, { id: "datasets" as View, label: "Datasets", icon: Database, to: "/datasets" as const }];
const soon = [{ label: "AI Assistant", icon: Bot }];

function UpdateFeed({ view }: { view: View }) {
  const updates = view === "search" ? researchUpdates : pathogenUpdates;
  return <section className="jd-update-feed" aria-label="Incoming report updates">
    <div className="jd-section-head"><h2>Incoming updates</h2><span className="jd-tag">Sample preview</span></div>
    {updates.map(u => <article className="jd-update" key={u.title}><div className="jd-update-meta"><span>{u.category}</span><small>{u.age}</small></div><h3>{u.title}</h3><p>{u.summary}</p></article>)}
  </section>;
}

function SearchView() {
  return <>
    <div className="jd-section-head"><h2>Research report</h2><span className="jd-tag">Sample preview</span></div>
    <article className="jd-report">
      <div className="jd-report-body">
        <div className="jd-chips"><span>Oncology</span><span>Lung cancer</span><span>Educational brief</span></div>
        <h3>Lung cancer: from cell changes to treatment research</h3>
        <p>Connect the biology of lung cancer with the evidence researchers use to study treatment targets, response and safety.</p>
        <h4>Key findings</h4>
        <ul className="jd-findings"><li><Dna />Changes in growth signals can allow cells to multiply abnormally.</li><li><Microscope />Molecular testing helps distinguish tumour subtypes.</li><li><FileText />Study outcomes need context: design, comparison groups and follow-up.</li></ul>
        <h4>Past to present</h4>
        <ol className="jd-timeline">{[["Foundations", "Cell and tissue biology"], ["Molecular research", "Growth signals and mutations"], ["Treatment studies", "Targeted therapies"], ["Current questions", "Response and resistance"]].map(([a, b]) => <li key={a}><strong>{a}</strong><small>{b}</small></li>)}</ol>
        <h4>Reading the evidence</h4><p>Distinguish a biological explanation from a demonstrated treatment benefit. This sample report has no retrieved publications or verified study results attached.</p>
        <div className="jd-report-actions"><Button disabled title="Exports are not connected yet"><FileText />Download dossier</Button></div>
      </div>
      <div className="jd-report-anatomy"><DashboardAnatomy stages={researchTour} /></div>
    </article>
    <UpdateFeed view="search" />
  </>;
}

function PathogenView() {
  return <>
    <div className="jd-section-head"><h2>Pathogen report</h2><span className="jd-tag">Sample preview</span></div>
    <article className="jd-report jd-path-report">
      <div className="jd-report-body">
        <div className="jd-chips"><span>Malaria</span><span>Parasite</span><span>Educational brief</span></div>
        <h3>Plasmodium falciparum: entry, spread and impact</h3>
        <p>Malaria parasites move through distinct stages in the liver and blood. The body illustration follows that sequence automatically.</p>
        <dl className="jd-facts"><div><dt>Transmission</dt><dd>Infected Anopheles mosquito</dd></div><div><dt>Early multiplication</dt><dd>Liver cells</dd></div><div><dt>Blood stage</dt><dd>Red blood cells</dd></div></dl>
        <h4>Disease progression</h4>
        <ol className="jd-timeline">{[["Entry", "Mosquito bite"], ["Liver stage", "Parasites multiply"], ["Blood stage", "Red blood cells infected"], ["Response", "Immune defence"]].map(([a, b]) => <li key={a}><strong>{a}</strong><small>{b}</small></li>)}</ol>
        <h4>Organ connections</h4><ul className="jd-findings"><li><Droplet />Red blood cell infection can contribute to fever and anaemia.</li><li><Dna />The spleen helps filter infected cells from the blood.</li><li><Microscope />Severe infection may affect several organs; individual risk is not shown here.</li></ul>
        <h4>Research focus</h4><p>Vaccine development, parasite biology and treatment resistance are distinct research questions. This sample contains no live outbreak counts or measured organ-risk scores.</p>
        <div className="jd-report-actions"><Button disabled title="Exports are not connected yet"><FileText />Download dossier</Button></div>
      </div>
      <div className="jd-report-anatomy"><DashboardAnatomy stages={pathogenTour} /></div>
    </article>
    <section className="jd-pathways-band"><h2>Biological pathways</h2><div><span>Parasite replication</span><span>Red blood cell invasion</span><span>Immune response</span></div></section>
    <UpdateFeed view="pathogen" />
  </>;
}

export function HealthDashboard({ view = "search", children }: { view?: View; children?: ReactNode }) {
  const { user } = useAuth();
  const { credits } = useUserData(user?.id ?? null);
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const [searchNotice, setSearchNotice] = useState(false);
  const [ask, setAsk] = useState("");
  const name = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "Your account";
  const updates = view === "pathogen" ? pathogenUpdates : researchUpdates;
  useEffect(() => {
    if (!mobileNav) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileNav(false); };
    const resize = () => { if (window.innerWidth >= 1024) setMobileNav(false); };
    window.addEventListener("keydown", close);
    window.addEventListener("resize", resize);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", close); window.removeEventListener("resize", resize); };
  }, [mobileNav]);
  const toggle = () => { if (window.innerWidth < 1024) setMobileNav(s => !s); else setCollapsed(c => !c); };
  const openAssistant = () => { if (!ask.trim()) return; void navigate({ to: user ? "/chat" : "/login", search: user ? { view: "assistant", q: ask.trim() } : {} }); };
  return <div className={`jd-dash ${collapsed ? "is-collapsed" : ""}`}>
    {mobileNav && <div className="jd-backdrop" onClick={() => setMobileNav(false)} />}
    <aside id="dashboard-sidebar" className={`jd-side ${mobileNav ? "is-open" : ""}`}>
      <div className="jd-side-heading"><Link to="/" className="jd-brand"><LogoMark className="h-9 w-9 shrink-0 object-contain" /><span className="jd-copy"><strong>Jeradin</strong><small>Health Intelligence</small></span></Link><Button className="jd-mobile-close" variant="ghost" size="icon" onClick={() => setMobileNav(false)} aria-label="Close menu"><X /></Button></div>
      <nav aria-label="Dashboard pages">{nav.map(n => <Button asChild variant="ghost" key={n.id} className={view === n.id ? "is-active" : ""}><Link to={n.to} title={n.label} aria-current={view === n.id ? "page" : undefined} onClick={() => setMobileNav(false)}><n.icon /><span className="jd-copy">{n.label}</span></Link></Button>)}
        {soon.map(n => <Button variant="ghost" key={n.label} title={`${n.label} (coming soon)`} disabled><n.icon /><span className="jd-copy">{n.label}</span></Button>)}</nav>
      <div className="jd-side-note jd-copy">Public evidence.<br />Human understanding.</div>
      <Link to={user ? "/account" : "/login"} className="jd-profile"><span className="jd-avatar"><UserRound /></span><span className="jd-copy"><strong>{name}</strong><small>{user ? (credits?.plan ?? "Member") : "Sign in"}</small></span><ChevronDown className="jd-copy" /></Link>
    </aside>
    <div className="jd-main">
      <header className="jd-top"><Button variant="outline" size="icon" className="jd-icon" onClick={toggle} aria-label="Toggle sidebar" aria-controls="dashboard-sidebar" aria-expanded={mobileNav || !collapsed}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>
        <div className="jd-ticker"><span className="jd-live"><Radio />Sample updates</span><div className="jd-ticker-track"><div>{[...updates, ...updates].map((t, i) => <span key={i}>{t.title}</span>)}</div></div></div>
      </header>
      <main className="jd-content">{children ?? <><div className="jd-page-title"><div><small>Jeradin / {view === "search" ? "Research" : "Pathogens"}</small><h1>{view === "search" ? "Search Explorer" : "Pathogen Mapping"}</h1></div><span className="jd-tag">Sample preview</span></div>
        <form className="jd-search" onSubmit={e => { e.preventDefault(); setSearchNotice(true); }}><Search /><input value={query} onChange={e => { setQuery(e.target.value); setSearchNotice(false); }} placeholder={view === "search" ? "Search conditions, medicines or research" : "Search pathogens or transmission"} aria-label={view === "search" ? "Search research" : "Search pathogens"} /><Button type="submit" aria-label="Search" title="Search"><span className="jd-search-word">Search</span><ArrowRight /></Button></form>
        {searchNotice && <p className="jd-preview-notice" role="status">{query.trim() ? `Search for “${query.trim()}” is not connected yet.` : "Search is not connected yet."} Reports below are sample content.</p>}
        {view === "search" ? <SearchView /> : <PathogenView />}
        <form className="jd-ask" onSubmit={e => { e.preventDefault(); openAssistant(); }}><div><Microscope /><span><strong>Ask Jeradin AI</strong><small>Research and education only. Not medical advice.</small></span></div><div className="jd-ask-input"><input value={ask} onChange={e => setAsk(e.target.value)} placeholder="Ask about this research…" aria-label="Ask Jeradin" /><Button type="submit" size="icon" aria-label="Send" disabled={!ask.trim()}><Send /></Button></div></form></>}
      </main>
    </div>
  </div>;
}
