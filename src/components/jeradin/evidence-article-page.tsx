import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, FileText, Info, Share2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardAnatomy } from "./dashboard-anatomy";
import { pathogenTour, researchTour } from "./dashboard-tour-data";
import { evidenceDate } from "./search-explorer";
import { fullTextQuery } from "@/lib/health-evidence.queries";
import type { EvidenceEntry } from "@/lib/health-evidence";

const tabs = [["overview", "Overview"], ["full", "Full report"], ["anatomy", "Virtual human"], ["details", "Details"]] as const;
type Tab = typeof tabs[number][0];

export function EvidenceArticlePage({ entry }: { entry: EvidenceEntry }) {
  const [tab, setTab] = useState<Tab>("overview");
  const full = useQuery(fullTextQuery(entry.id));
  const stages = /infect|virus|viral|bacteri|parasit|malaria|pathogen|tubercul|outbreak|vaccin/i.test(`${entry.title} ${entry.summary}`) ? pathogenTour : researchTour;
  const paragraphs = entry.summary ? entry.summary.split(/\n\n+/) : [];
  const credit = `${entry.source}${entry.authors ? ` · ${entry.authors.replace(/\.+$/, "")}` : ""}`;
  return <article className="jd-article">
    <div className="jd-article-bar">
      <Link to="/app" className="jd-back"><ArrowLeft />Back to Search Explorer</Link>
      <Button variant="outline" size="sm" onClick={() => void navigator.share?.({ title: entry.title, url: location.href })}><Share2 />Share</Button>
    </div>
    <header className="jd-article-hero">
      <div><small>{entry.kind === "news" ? "Health news" : "Biomedical research"}</small><h1>{entry.title}</h1>
        <div className="jd-chips"><span>{evidenceDate(entry.published_at)}</span>{entry.doi && <span>DOI {entry.doi}</span>}</div></div>
    </header>
    <nav className="jd-article-tabs" role="tablist" aria-label="Report sections">{tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}>{label}</button>)}</nav>
    <div className="jd-article-grid">
      <div className="jd-article-main">
        {tab === "overview" && <section className="jd-a-card"><h2><FileText />Overview</h2>
          {paragraphs.length ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p>No summary was supplied for this item.</p>}
          {full.data && <Button variant="outline" onClick={() => setTab("full")}><BookOpen />Continue to the full report</Button>}</section>}
        {tab === "full" && <section className="jd-a-card jd-a-fulltext"><h2><BookOpen />Full report</h2>
          {full.isLoading ? <p role="status">Loading the full report…</p> : full.data ? full.data.blocks.map((b, i) => b.type === "h" ? <h3 key={i}>{b.text}</h3> : <p key={i}>{b.text}</p>)
            : <><p>{entry.kind === "news" ? "News publishers only share a summary for reuse, so the complete article can't be republished here." : "This publication is not open access, so only its abstract can be shown."}</p>{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</>}
          <footer className="jd-a-end"><div><strong>You have reached the end of this report.</strong></div></footer></section>}
        {tab === "anatomy" && <section className="jd-a-card"><h2><Stethoscope />Body systems</h2>{stages.map(s => <div className="jd-a-organ" key={s.organ}><h3>{s.organ}</h3><strong>{s.function}</strong><p>{s.explanation}</p></div>)}<p className="jd-a-note">Educational illustration, not a finding of this publication.</p></section>}
        {tab === "details" && <section className="jd-a-card"><h2><Info />Details</h2><dl className="jd-facts"><div><dt>Type</dt><dd>{entry.kind === "news" ? "News" : "Research"}</dd></div><div><dt>Published</dt><dd>{evidenceDate(entry.published_at)}</dd></div>{entry.authors && <div><dt>Authors</dt><dd>{entry.authors}</dd></div>}{entry.doi && <div><dt>DOI</dt><dd>{entry.doi}</dd></div>}{full.data?.license && <div><dt>License</dt><dd>{full.data.license}</dd></div>}</dl></section>}
        <p className="jd-a-note">Credit: {credit}. Not medical advice.</p>
      </div>
      <aside className="jd-article-side"><section className="jd-a-card jd-a-sticky"><DashboardAnatomy stages={stages} /></section></aside>
    </div>
  </article>;
}
