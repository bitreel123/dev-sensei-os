import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Activity, ArrowRight, BookOpen, Brain, ChevronDown, Database, FileText, FlaskConical, Heart, History, House, Layers, Maximize2, Menu, Microscope, Network, Plus, Search, Send, Settings, ShieldCheck, UserRound, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LogoMark } from "./logo";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/hooks/use-user-data";
import { supabase } from "@/integrations/supabase/client";
import anatomyImage from "@/assets/virtual-human-color.jpg";

const features = [
  { title: "Virtual Human", icon: UserRound, description: "Explore anatomy, organs and body systems with clear labels. Map published disease findings onto an educational human model.", status: "Anatomy preview" },
  { title: "Research Assistant", icon: Brain, description: "Bring research questions and papers together. Compare findings, review evidence quality and trace answers to their sources.", status: "Research connections planned" },
  { title: "Medical Data Explorer", icon: Database, description: "Explore public health data, clinical trials, drug information and approved laboratory datasets in one workspace.", status: "Data connections planned" },
  { title: "Disease & Pathway Maps", icon: Network, description: "Connect diseases, viruses, organs, biological pathways and published findings in a visual evidence map.", status: "Evidence mapping planned" },
  { title: "Procedure Rehearsal", icon: FlaskConical, description: "Study anatomy and professionally reviewed procedure steps before physical training or lab work. Educational rehearsal, not surgical guidance.", status: "Simulation engine planned" },
  { title: "Research Reports", icon: FileText, description: "Collect sources, visual maps, research questions and evidence tables into downloadable research dossiers.", status: "Health report exports planned" },
];
type Part = { name: string; x: number; y: number; system: string; detail: string; kind: "Internal" | "External" };
const organs: Part[] = [
  { name: "Brain", x: 49.5, y: 4.5, kind: "Internal", system: "Nervous system", detail: "Controls thinking, memory, movement, senses and the body's automatic functions such as breathing." },
  { name: "Skull", x: 44, y: 9.5, kind: "Internal", system: "Skeletal system", detail: "Bony case that protects the brain and gives shape to the face." },
  { name: "Eyes", x: 54, y: 7.6, kind: "External", system: "Sensory system", detail: "Detect light and send images to the brain through the optic nerves." },
  { name: "Trachea", x: 50, y: 15.6, kind: "Internal", system: "Respiratory system", detail: "The windpipe. Carries air from the throat down to the lungs." },
  { name: "Clavicle", x: 37.8, y: 18.2, kind: "Internal", system: "Skeletal system", detail: "Collarbone. Connects the arm to the body and supports shoulder movement." },
  { name: "Right lung", x: 41, y: 24, kind: "Internal", system: "Respiratory system", detail: "Takes in oxygen and removes carbon dioxide. The right lung has three lobes." },
  { name: "Heart", x: 51.5, y: 24, kind: "Internal", system: "Cardiovascular system", detail: "Muscular pump that pushes blood through the lungs and the whole body." },
  { name: "Left lung", x: 58, y: 23, kind: "Internal", system: "Respiratory system", detail: "Exchanges oxygen and carbon dioxide. It has two lobes, leaving room for the heart." },
  { name: "Ribs", x: 62.5, y: 27, kind: "Internal", system: "Skeletal system", detail: "Twelve pairs of curved bones forming a cage that protects the heart and lungs." },
  { name: "Humerus", x: 30, y: 28.6, kind: "Internal", system: "Skeletal system", detail: "Upper arm bone, from shoulder to elbow." },
  { name: "Liver", x: 42, y: 30.5, kind: "Internal", system: "Digestive system", detail: "Largest internal organ. Processes nutrients, makes bile, stores energy and filters toxins." },
  { name: "Gallbladder", x: 41.5, y: 33.8, kind: "Internal", system: "Digestive system", detail: "Small pouch that stores bile from the liver and releases it to digest fats." },
  { name: "Stomach", x: 52, y: 32, kind: "Internal", system: "Digestive system", detail: "Mixes food with acid and enzymes to begin breaking down proteins." },
  { name: "Spleen", x: 59.5, y: 32.8, kind: "Internal", system: "Lymphatic system", detail: "Filters blood, recycles old red blood cells and helps fight infection." },
  { name: "Kidneys", x: 44.5, y: 35.6, kind: "Internal", system: "Urinary system", detail: "Two bean shaped organs that filter waste from blood and make urine." },
  { name: "Aorta & vena cava", x: 50, y: 37, kind: "Internal", system: "Cardiovascular system", detail: "Main artery (red) carrying blood from the heart, and main vein (blue) returning it." },
  { name: "Large intestine", x: 39.5, y: 41, kind: "Internal", system: "Digestive system", detail: "Absorbs water and salts and forms stool from leftover food." },
  { name: "Small intestine", x: 51, y: 41.5, kind: "Internal", system: "Digestive system", detail: "Long coiled tube where most nutrients from food are absorbed into the blood." },
  { name: "Arteries & veins", x: 70.5, y: 34, kind: "Internal", system: "Cardiovascular system", detail: "Arteries carry oxygen rich blood out; veins bring blood back to the heart." },
  { name: "Pelvis", x: 58.5, y: 48.5, kind: "Internal", system: "Skeletal system", detail: "Bony ring at the hips that supports the spine and protects pelvic organs." },
  { name: "Bladder", x: 49.5, y: 49, kind: "Internal", system: "Urinary system", detail: "Stretchy sac that stores urine until it is released." },
  { name: "Hand", x: 18, y: 53, kind: "External", system: "Musculoskeletal system", detail: "27 bones each, allowing grip, touch and fine movement." },
  { name: "Skin", x: 66, y: 57, kind: "External", system: "Integumentary system", detail: "The body's largest organ. Protects, controls temperature and senses touch." },
  { name: "Femur", x: 39, y: 59, kind: "Internal", system: "Skeletal system", detail: "Thigh bone. The longest and strongest bone in the body." },
  { name: "Knee", x: 58.6, y: 68.6, kind: "External", system: "Musculoskeletal system", detail: "Hinge joint between thigh and shin, protected by the kneecap (patella)." },
  { name: "Tibia", x: 40, y: 80, kind: "Internal", system: "Skeletal system", detail: "Shin bone. Carries most of the body's weight in the lower leg." },
  { name: "Foot", x: 61, y: 95, kind: "External", system: "Musculoskeletal system", detail: "26 bones each, supporting balance, standing and walking." },
];
const sources = [
  { name: "PubMed", type: "Biomedical literature", url: "https://pubmed.ncbi.nlm.nih.gov/" },
  { name: "ClinicalTrials.gov", type: "Clinical trial records", url: "https://clinicaltrials.gov/" },
  { name: "Europe PMC", type: "Open research papers", url: "https://europepmc.org/" },
  { name: "WHO", type: "Public health indicators", url: "https://www.who.int/data" },
];
type SavedReport = { id: string; title: string; created_at: string; mode: string };

export function HealthDashboard() {
  const { user, loading } = useAuth();
  const { credits } = useUserData(user?.id ?? null);
  const navigate = useNavigate();
  const [active, setActive] = useState("Home");
  const [sidebar, setSidebar] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [organ, setOrgan] = useState(organs[6]);
  const [labels, setLabels] = useState(true);
  const [info, setInfo] = useState(true);
  const [tab, setTab] = useState("Anatomy");
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [historyState, setHistoryState] = useState("Sign in to see your saved work.");
  const [filter, setFilter] = useState("");
  const currentFeature = features.find(f => f.title === active);
  const name = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.split(" ")[0] : "researcher";
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setHistoryState("Loading your saved work…");
    void supabase.from("intel_memory").select("id, title, created_at, mode").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50).then(({ data, error }) => {
      if (cancelled) return;
      setReports(data ?? []);
      setHistoryState(error ? "Your saved work is temporarily unavailable." : "No saved research yet.");
    });
    return () => { cancelled = true; };
  }, [user]);
  function choose(title: string) { setActive(title); setSidebar(false); }
  function openAssistant() {
    if (!prompt.trim()) return;
    void navigate({ to: user ? "/chat" : "/login", search: user ? { view: "assistant", q: prompt.trim() } : {} });
  }
  const matchingReports = reports.filter(r => r.title.toLowerCase().includes(filter.toLowerCase()));
  const anatomy = (large = false) => <div className={`anatomy-stage ${large ? "anatomy-large" : ""}`}>
    <div className="organ-tools"><Button size="sm" variant={labels ? "default" : "outline"} aria-pressed={labels} onClick={() => setLabels(v => !v)}>Labels {labels ? "on" : "off"}</Button><Button size="sm" variant={info ? "default" : "outline"} aria-pressed={info} onClick={() => setInfo(v => !v)}>Info {info ? "on" : "off"}</Button></div>
    <div className={`anatomy-art zoom-${zoom}`}><img src={anatomyImage} width={768} height={1152} alt="Educational human anatomy illustration with organs in natural colours" />{organs.map(o => <button key={o.name} type="button" style={{ left: `${o.x}%`, top: `${o.y}%` }} className={`part-pin ${o.x < 50 ? "part-left" : ""} ${organ.name === o.name ? "part-selected" : ""}`} onClick={() => setOrgan(o)} aria-label={o.name}><span className="part-dot" />{labels && <span className="part-text">{o.name}</span>}</button>)}</div>
    {info && <div className="part-info"><strong>{organ.name}</strong><small>{organ.kind} · {organ.system}</small><p>{organ.detail}</p></div>}
    <span className="anatomy-caption">ANTERIOR VIEW · ILLUSTRATED ATLAS</span>
    <div className="anatomy-controls"><Button size="icon-sm" variant="outline" aria-label="Zoom out" title="Zoom out" onClick={() => setZoom(z => Math.max(1, z - 1))} disabled={zoom === 1}><ZoomOut /></Button><Button size="icon-sm" variant="outline" aria-label="Zoom in" title="Zoom in" onClick={() => setZoom(z => Math.min(3, z + 1))} disabled={zoom === 3}><ZoomIn /></Button><Button size="icon-sm" variant="outline" aria-label="Expand anatomy" title="Expand anatomy" onClick={() => setExpanded(true)}><Maximize2 /></Button></div>
  </div>;
  return <div className={`health-dashboard ${collapsed ? "nav-collapsed" : ""}`}>
    {sidebar && <div className="mobile-nav-backdrop" onClick={() => setSidebar(false)} />}
    <aside className={`health-sidebar ${sidebar ? "nav-open" : ""}`}>
      <Link to="/" className="health-brand"><LogoMark className="h-9 w-9 shrink-0 object-contain" /><div className="nav-copy"><strong>Jeradin</strong><span>Health Intelligence</span></div></Link>
      <div className="nav-caption nav-copy">WORKSPACE</div>
      <nav aria-label="Research workspace"><Button title="Home" variant={active === "Home" ? "default" : "ghost"} onClick={() => choose("Home")} className="health-nav-item"><House /><span className="nav-copy">Home</span></Button>{features.map(f => <Button key={f.title} title={f.title} className="health-nav-item" variant={active === f.title ? "default" : "ghost"} onClick={() => choose(f.title)}><f.icon /><span className="nav-copy">{f.title}</span></Button>)}<Button title="History" className="health-nav-item" variant={active === "History" ? "default" : "ghost"} onClick={() => choose("History")}><History /><span className="nav-copy">History</span></Button></nav>
      <div className="sidebar-bottom"><div className="research-note nav-copy"><ShieldCheck className="h-5 w-5" /><strong>Evidence before answers.</strong><span>For research and education. Not for diagnosis or treatment.</span></div><Button variant="ghost" asChild className="health-nav-item" title="Settings"><Link to={user ? "/account" : "/login"}><Settings /><span className="nav-copy">Settings & billing</span></Link></Button><Button variant="ghost" asChild className="profile-link"><Link to={user ? "/account" : "/login"}><span className="profile-avatar"><UserRound className="h-4 w-4" /></span><span className="nav-copy min-w-0"><strong>{user ? name : "Your account"}</strong><small>{user ? (credits?.plan ?? "Member") : "Sign in"}</small></span><ChevronDown className="nav-copy ml-auto h-4 w-4" /></Link></Button></div>
    </aside>
    <div className="health-main"><header className="health-topbar"><Button variant="ghost" size="icon" title="Toggle navigation" aria-label="Toggle navigation" onClick={() => { if (window.innerWidth < 1024) setSidebar(s => !s); else setCollapsed(c => !c); }}>{sidebar ? <X /> : <Menu />}</Button><div className="dashboard-search"><Search className="h-4 w-4 shrink-0" /><input aria-label="Search saved research" placeholder="Search your research…" value={filter} onChange={e => { setFilter(e.target.value); if(e.target.value) setActive("History"); }} /></div><Button asChild variant="outline" className="plan-button"><Link to="/pricing">{credits?.plan ? `${credits.plan} plan` : "View plans"}<ChevronDown /></Link></Button><Button variant="ghost" size="icon" asChild title="Account" aria-label="Account"><Link to={user ? "/account" : "/login"}><UserRound /></Link></Button></header>
    <main className="health-content"><section className="welcome-band"><div><div className="eyebrow">YOUR RESEARCH WORKSPACE</div><h1>{active === "Home" ? `Welcome${user ? ` back, ${name}` : " to Jeradin"}.` : active}</h1><p>{currentFeature ? currentFeature.description : "Explore the human body. Connect the evidence. Move research forward."}</p></div><div className="welcome-stamp"><Microscope className="h-8 w-8" /><span>Human understanding.<br /><strong>Grounded in evidence.</strong></span></div></section>
    <section className="metric-grid" aria-label="Workspace summary">{[{ label: "Saved reports", value: user ? String(reports.length) : "—", note: "Your research history", icon: FileText },{ label: "Public data sources", value: "04", note: "Available to explore", icon: Database },{ label: "Core research tools", value: "06", note: "Our platform roadmap", icon: Microscope },{ label: "Available credits", value: credits ? String(credits.balance) : "—", note: user ? "Your current balance" : "Sign in to view balance", icon: Layers }].map(m => <article className="metric-item" key={m.label}><span className="metric-icon"><m.icon className="h-5 w-5" /></span><div><span>{m.label}</span><strong>{m.value}</strong><small>{m.note}</small></div></article>)}</section>
    {active === "History" ? <section className="history-view"><div className="section-heading"><h2>Saved work</h2><Button variant="outline" asChild><Link to="/chat" search={{ view: "assistant" }}><Plus />New chat</Link></Button></div>{matchingReports.length ? matchingReports.map(r => <Button variant="ghost" className="saved-report-row" key={r.id} asChild><Link to="/chat" search={{ id: r.id, view: "assistant" }}><FileText /><span className="min-w-0 flex-1 truncate">{r.title}</span><ArrowRight /></Link></Button>) : <p className="empty-message">{filter ? "No saved work matches your search." : historyState}</p>}</section> : <>
    <div className="workspace-grid"><section className="workspace-panel anatomy-panel"><div className="panel-heading"><h2>Virtual Human Explorer</h2><span className="status-label">Anatomy preview</span></div><div className="atlas-tabs" role="tablist" aria-label="Anatomy views">{["Anatomy", "Systems", "Disease maps"].map(t => <Button key={t} role="tab" aria-selected={tab === t} variant="ghost" onClick={() => setTab(t)} className={tab === t ? "tab-active" : ""}>{t}</Button>)}</div>{anatomy()}<div className="organ-detail"><div className="eyebrow">{tab === "Anatomy" ? organ.system : tab === "Systems" ? "BODY SYSTEM" : "DISEASE MAPPING · PLANNED"}</div><h3>{organ.name}</h3><p>{tab === "Disease maps" ? "Published findings will be mapped to affected organs. This illustration does not show a patient’s condition or locate a virus." : organ.detail}</p><Button variant="link" onClick={() => setExpanded(true)}>Explore anatomy<ArrowRight /></Button></div></section>
    <section className="workspace-panel assistant-panel"><div className="panel-heading"><div className="flex items-center gap-2"><LogoMark className="h-5 w-5" /><h2>Jeradin Research Assistant</h2></div><Brain className="h-4 w-4" /></div><div className="assistant-body"><span className="assistant-emblem"><Microscope className="h-9 w-9" /></span><h3>{currentFeature ? currentFeature.title : "Where does your research begin?"}</h3><p>{currentFeature ? currentFeature.description : "A question. A paper. A connection worth investigating."}</p>{currentFeature && <span className="status-label">{currentFeature.status}</span>}<div className="research-prompts">{["Compare evidence on cancer treatments", "Explore how viruses affect the body", "Review a clinical trial"].map(p => <Button key={p} variant="outline" onClick={() => setPrompt(p)}><span>{p}</span><ArrowRight /></Button>)}</div><div className="assistant-disclaimer"><ShieldCheck className="h-4 w-4 shrink-0" /><span>Medical source connections are being built. The existing assistant is not clinically validated.</span></div></div><form className="research-composer" onSubmit={e => { e.preventDefault(); openAssistant(); }}><textarea aria-label="Research question" placeholder="Ask a research question…" value={prompt} onChange={e => setPrompt(e.target.value)} rows={2} /><div className="composer-bottom"><span>Research & education only</span><Button type="submit" size="icon" aria-label="Send research question" title="Open existing assistant" disabled={!prompt.trim()}><Send /></Button></div></form></section>
    <div className="right-column"><section className="workspace-panel saved-panel"><div className="panel-heading"><h2>Your saved work</h2><Button size="icon-sm" variant="ghost" aria-label="View history" title="View history" onClick={() => choose("History")}><ArrowRight /></Button></div>{reports.length ? reports.slice(0,3).map(r => <Button key={r.id} variant="ghost" className="report-preview" asChild><Link to="/chat" search={{ id:r.id, view:"assistant" }}><span className="report-icon"><FileText /></span><span><strong>{r.title}</strong><small>Saved {new Date(r.created_at).toLocaleDateString("en-GB")}</small></span></Link></Button>) : <div className="empty-work"><FileText className="h-6 w-6" /><p>{loading ? "Loading your account…" : historyState}</p><Button variant="link" onClick={() => user ? choose("Research Reports") : void navigate({to:"/login",search:{}})}>{user ? "Explore reports" : "Sign in"}<ArrowRight /></Button></div>}</section><section className="workspace-panel sources-panel"><div className="panel-heading"><h2>Research sources</h2><BookOpen className="h-4 w-4" /></div>{sources.map(s => <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="source-row"><span className="source-icon"><Database className="h-4 w-4" /></span><span><strong>{s.name}</strong><small>{s.type}</small></span><ArrowRight className="h-3.5 w-3.5 ml-auto shrink-0" /></a>)}<p className="source-note">Public sources · Not yet connected</p></section></div></div>
    <section className="tools-section"><div className="section-heading"><h2>Explore your research tools</h2><span>From question to understanding</span></div><div className="tool-grid">{features.filter(f => !["Virtual Human","Research Assistant"].includes(f.title)).map(f => <Button key={f.title} variant="outline" className="tool-tile" onClick={() => choose(f.title)}><f.icon className="h-6 w-6" /><span>{f.title}</span><ArrowRight /></Button>)}</div></section></>}
    <footer className="dashboard-footer"><span>Jeradin · Health Intelligence</span><span>Research and education. Not medical advice.</span><Link to="/privacy">Privacy</Link></footer></main></div>
    <Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="health-dashboard atlas-dialog"><DialogTitle>Virtual Human · {organ.name}</DialogTitle><DialogDescription>Educational anatomy illustration. Interactive 3D simulation is planned.</DialogDescription>{anatomy(true)}<div><strong>{organ.name} · {organ.system}</strong><p className="text-sm mt-1">{organ.detail}</p></div></DialogContent></Dialog>
  </div>;
}
