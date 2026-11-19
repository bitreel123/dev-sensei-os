import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Activity, ArrowLeft, ArrowRight, Bell, BookOpen, Bug, CheckCircle2, ChevronDown, Database, Dna, Droplet, FileText, Microscope, PanelLeftClose, PanelLeftOpen, Radio, Search, Send, Sparkles, Timer, UserRound, X } from "lucide-react";
import anatomyImage from "@/assets/anatomy-research.jpg";
import { Button } from "@/components/ui/button";
import { LogoMark } from "./logo";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/hooks/use-user-data";

// UI preview only. All report content below is illustrative sample content, not live research.
type View = "search" | "pathogen";
const ORGAN_POINTS: Record<string, [number, number]> = { Brain:[48,9], Lungs:[50,33], Breast:[56,35], Heart:[53,39], Liver:[43,48], Spleen:[57,50], "Lymph nodes":[40,30], "Red blood cells":[56,66] };
const ticker = ["WHO updates mpox guidance", "Malaria cases reported rising in parts of Africa", "CAR-T lymphoma trial reports new response data", "Universal flu vaccine enters new trial phase"];
const nav = [
  { id: "search" as View, label: "Search Explorer", icon: Search },
  { id: "pathogen" as View, label: "Pathogen Mapping", icon: Bug },
];
const soon = [{ label: "Educational Hub", icon: BookOpen }, { label: "Datasets", icon: Database }, { label: "AI Assistant", icon: Sparkles }];

function Anatomy({ organs, active, onPick }: { organs: string[]; active: string; onPick: (o: string) => void }) {
  return <div className="jd-anatomy">
    <img src={anatomyImage} alt="Jeradin educational human anatomy with naturally coloured organs" />
    {organs.map(o => { const p = ORGAN_POINTS[o]; if (!p) return null; return <button key={o} type="button" onClick={() => onPick(o)} className={`jd-hotspot ${o === active ? "is-active" : ""}`} style={{ left: `${p[0]}%`, top: `${p[1]}%` }} aria-label={o}><span /></button>; })}
    {ORGAN_POINTS[active] && <span className="jd-callout" style={{ top: `${ORGAN_POINTS[active][1]}%` }}>{active}</span>}
  </div>;
}

function SearchView({ goPathogen }: { goPathogen: () => void }) {
  const organs = ["Breast", "Lungs", "Heart", "Lymph nodes"];
  const [organ, setOrgan] = useState(organs[0]);
  return <>
    <div className="jd-section-head"><h2>Incoming Report</h2><span className="jd-tag">Sample preview</span></div>
    <article className="jd-report">
      <div className="jd-report-body">
        <div className="jd-chips"><span>Oncology</span><span>Clinical research</span><span>Updated 2h ago</span></div>
        <h3>Targeting HER2: new combination therapy shows promising results</h3>
        <p>A recent study reports that combining trastuzumab with a novel inhibitor improved outcomes in HER2+ breast cancer patients.</p>
        <h4>Key findings</h4>
        <ul className="jd-findings">
          {["92% response rate in trial cohort", "Recurrence reduced by 60%", "Well tolerated with manageable side effects"].map(f => <li key={f}><CheckCircle2 />{f}</li>)}
        </ul>
        <h4>Research timeline</h4>
        <ol className="jd-timeline">
          {[["Baseline", "HER2 identified as driver"], ["Standard care", "Trastuzumab therapy"], ["Active trials", "Combination inhibitors"], ["Now", "This report"]].map(([a, b]) => <li key={a}><strong>{a}</strong><small>{b}</small></li>)}
        </ol>
        <div className="jd-report-actions"><Button disabled><FileText />Download dossier</Button><Button variant="outline" onClick={goPathogen}>Open pathogen mapping<ArrowRight /></Button></div>
      </div>
      <div className="jd-report-anatomy">
        <div className="jd-anatomy-head"><strong>Virtual Human</strong><small>Built from key findings</small></div>
        <Anatomy organs={organs} active={organ} onPick={setOrgan} />
        <div className="jd-organ-pills">{organs.map(o => <button key={o} type="button" className={o === organ ? "is-active" : ""} onClick={() => setOrgan(o)}>{o}</button>)}</div>
      </div>
    </article>
    <div className="jd-section-head"><h2>More incoming reports</h2></div>
    <div className="jd-mini-list">
      {[["Infectious disease", "Malaria vaccine shows durable protection", "The Lancet · 3h"], ["Neurology", "AI model flags early Alzheimer's risk", "Science Daily · 5h"], ["Virology", "Mpox guidance updated by WHO", "WHO · 6h"]].map(([t, h, s]) => <button type="button" className="jd-mini" key={h}><span className="jd-tag">{t}</span><strong>{h}</strong><small>{s}</small></button>)}
    </div>
  </>;
}

function PathogenView({ back }: { back: () => void }) {
  const impact = [["Liver", "Primary site of infection", 95], ["Red blood cells", "Parasite replication", 92], ["Spleen", "Immune response", 67], ["Brain", "Possible complications", 38]] as const;
  const [organ, setOrgan] = useState<string>("Liver");
  return <>
    <button type="button" className="jd-back" onClick={back}><ArrowLeft />Back to search</button>
    <div className="jd-path-title"><div><h2>Pathogen Mapping</h2><p>How a pathogen moves through the body, from entry to impact.</p></div>
      <div className="jd-pathogen-pick"><Droplet /><span>Malaria (Plasmodium falciparum)</span><X /></div></div>
    <div className="jd-path-grid">
      <section className="jd-card jd-overview">
        <h3>Pathogen overview</h3>
        <strong className="jd-big">Plasmodium falciparum</strong><small>Malaria parasite</small>
        <p>A microscopic parasite that infects red blood cells.</p>
        <dl>{[["Transmission", "Mosquito bite", Bug], ["Incubation", "7–30 days", Timer], ["Primary impact", "Red blood cells", Droplet], ["Mortality", "Sample figure", Activity]].map(([k, v, I]) => { const Icon = I as typeof Bug; return <div key={k as string}><Icon /><dt>{k as string}</dt><dd>{v as string}</dd></div>; })}</dl>
      </section>
      <section className="jd-card jd-path-anatomy"><Anatomy organs={impact.map(i => i[0])} active={organ} onPick={setOrgan} /></section>
      <section className="jd-card jd-impact">
        <h3>Impact analysis</h3>
        {impact.map(([n, d, v]) => <button type="button" key={n} onClick={() => setOrgan(n)} className={n === organ ? "is-active" : ""}><span><strong>{n}</strong><small>{d}</small></span><b>{v}%</b><i style={{ width: `${v}%` }} /></button>)}
      </section>
    </div>
    <div className="jd-path-bottom">
      <section className="jd-card"><h3>Disease progression</h3>
        <ol className="jd-steps">{[["Entry", "Mosquito bite"], ["Blood stage", "Parasitemia"], ["Organ stage", "Liver & spleen"], ["Severe stage", "Organs"]].map(([a, b], i) => <li key={a} className={i === 2 ? "is-active" : ""}><span>{i + 1}</span><strong>{a}</strong><small>{b}</small></li>)}</ol>
        <p className="jd-note">The parasite enters through a mosquito bite, travels in the blood, targets the liver, then infects red blood cells.</p></section>
      <section className="jd-card"><h3>Key biological pathways</h3>
        <ul className="jd-pathways">{[["Immune response", "High"], ["Inflammatory signalling", "High"], ["Heme metabolism", "Moderate"], ["Cell cycle regulation", "Moderate"]].map(([a, b]) => <li key={a}><Dna />{a}<span>{b}</span></li>)}</ul></section>
      <section className="jd-card"><h3>Related research</h3>
        <ul className="jd-related">{[["New insights into malaria vaccine efficacy", "Nature"], ["Antimalarial drug resistance trends in Africa", "The Lancet"], ["Genetic markers of severe malaria", "Science"]].map(([a, b]) => <li key={a}><FileText /><span><strong>{a}</strong><small>{b}</small></span></li>)}</ul></section>
    </div>
  </>;
}

export function HealthDashboard() {
  const { user } = useAuth();
  const { credits } = useUserData(user?.id ?? null);
  const navigate = useNavigate();
  const [view, setView] = useState<View>("search");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const [ask, setAsk] = useState("");
  const name = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "Your account";
  const go = (v: View) => { setView(v); setMobileNav(false); window.scrollTo({ top: 0 }); };
  const toggle = () => { if (window.innerWidth < 1024) setMobileNav(s => !s); else setCollapsed(c => !c); };
  const openAssistant = () => { if (!ask.trim()) return; void navigate({ to: user ? "/chat" : "/login", search: user ? { view: "assistant", q: ask.trim() } : {} }); };

  return <div className={`jd-dash ${collapsed ? "is-collapsed" : ""}`}>
    {mobileNav && <div className="jd-backdrop" onClick={() => setMobileNav(false)} />}
    <aside className={`jd-side ${mobileNav ? "is-open" : ""}`}>
      <Link to="/" className="jd-brand"><LogoMark className="h-9 w-9 shrink-0 object-contain" /><span className="jd-copy"><strong>Jeradin</strong><small>Global Biomedical Intelligence</small></span></Link>
      <nav>{nav.map(n => <button type="button" key={n.id} title={n.label} onClick={() => go(n.id)} className={view === n.id ? "is-active" : ""}><n.icon /><span className="jd-copy">{n.label}</span></button>)}
        {soon.map(n => <button type="button" key={n.label} title={`${n.label} (coming soon)`} disabled><n.icon /><span className="jd-copy">{n.label}</span></button>)}</nav>
      <div className="jd-side-card jd-copy">Connect the world's health evidence to the human body.</div>
      <Link to={user ? "/account" : "/login"} className="jd-profile"><span className="jd-avatar"><UserRound /></span><span className="jd-copy"><strong>{name}</strong><small>{user ? (credits?.plan ?? "Member") : "Sign in"}</small></span><ChevronDown className="jd-copy" /></Link>
    </aside>
    <div className="jd-main">
      <header className="jd-top">
        <button type="button" className="jd-icon" onClick={toggle} aria-label="Toggle sidebar">{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</button>
        <div className="jd-ticker"><span className="jd-live"><Radio />Live</span><div className="jd-ticker-track"><div>{[...ticker, ...ticker].map((t, i) => <span key={i}>{t}</span>)}</div></div></div>
        <button type="button" className="jd-icon" aria-label="Notifications"><Bell /></button>
      </header>
      <main className="jd-content">
        {view === "search" && <form className="jd-search" onSubmit={e => e.preventDefault()}><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder='Search diseases, pathogens, drugs or research (e.g. "HER2+ breast cancer")' aria-label="Search research" /><Button type="submit">Search<ArrowRight /></Button></form>}
        {view === "search" ? <SearchView goPathogen={() => go("pathogen")} /> : <PathogenView back={() => go("search")} />}
        <form className="jd-ask" onSubmit={e => { e.preventDefault(); openAssistant(); }}>
          <div><Microscope /><span><strong>Ask Jeradin AI</strong><small>Research and education only. Not medical advice.</small></span></div>
          <div className="jd-ask-input"><input value={ask} onChange={e => setAsk(e.target.value)} placeholder="Ask anything about health, research or the human body…" aria-label="Ask Jeradin" /><Button type="submit" size="icon" aria-label="Send" disabled={!ask.trim()}><Send /></Button></div>
        </form>
      </main>
    </div>
  </div>;
}
