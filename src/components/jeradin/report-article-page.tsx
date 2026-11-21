import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, CircleCheck, Download, ExternalLink, FileText, FlaskConical, History, Lightbulb, Pill, Radio, Route, Share2, Stethoscope, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardAnatomy } from "./dashboard-anatomy";
import type { ReportArticle } from "./report-articles";

const tabs = [["overview", "Overview"], ["anatomy", "Virtual human"], ["journey", "How it affects the body"], ["organs", "Affected organs"], ["cases", "Past & recent"], ["effects", "Effects"], ["research", "Research & trials"], ["solutions", "Solutions"], ["data", "Data & reports"], ["sources", "Sources"]] as const;

export function ReportArticlePage({ article }: { article: ReportArticle }) {
  const back = article.kind === "pathogen" ? "/pathogen" : "/app";
  return <article className="jd-article">
    <div className="jd-article-bar">
      <Link to={back} className="jd-back"><ArrowLeft />Back to {article.kind === "pathogen" ? "Pathogen Mapping" : "Search Explorer"}</Link>
      <Button variant="outline" size="sm" onClick={() => void navigator.share?.({ title: article.title, url: location.href })}><Share2 />Share</Button>
    </div>
    <header className="jd-article-hero">
      <div>
        <small>{article.eyebrow}</small>
        <h1>{article.title}</h1>
        <p>{article.subtitle}</p>
        <div className="jd-chips">{article.tags.map(t => <span key={t}>{t}</span>)}</div>
      </div>
      <dl>{article.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    </header>
    <nav className="jd-article-tabs" aria-label="Report sections">{tabs.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>

    <div className="jd-article-grid">
      <div className="jd-article-main">
        <section id="overview" className="jd-a-card"><h2><FileText />Overview</h2><p>{article.overview}</p>
          <div className="jd-a-finding"><Lightbulb /><div><strong>Key finding</strong><p>{article.keyFinding}</p></div></div></section>
        <section id="journey" className="jd-a-card"><h2><Route />How it affects the human body</h2>
          <ol className="jd-a-journey">{article.journey.map(([a, b], i) => <li key={a}><span>{i + 1}</span><strong>{a}</strong><small>{b}</small></li>)}</ol></section>
        <section id="organs" className="jd-a-card"><h2><Stethoscope />Affected organs</h2>
          {article.stages.map(s => <div className="jd-a-organ" key={s.organ}><h3>{s.organ}</h3><strong>{s.function}</strong><p>{s.explanation}</p></div>)}</section>
        <section id="cases" className="jd-a-two">
          <div className="jd-a-card"><h2><History />Past research</h2><ul className="jd-a-list">{article.past.map(([y, t]) => <li key={y}><b>{y}</b>{t}</li>)}</ul></div>
          <div className="jd-a-card"><h2><Radio />Recent developments</h2><ul className="jd-a-list">{article.recent.map(([y, t]) => <li key={y}><b>{y}</b>{t}</li>)}</ul></div>
        </section>
        <section id="effects" className="jd-a-card"><h2><TriangleAlert />Effects & symptoms</h2>
          <div className="jd-a-effects">{article.effects.map(e => <span key={e}>{e}</span>)}</div><p className="jd-a-note">{article.effectsNote}</p></section>
        <section id="research" className="jd-a-card"><h2><FlaskConical />Laboratory research & trials</h2><ul className="jd-a-checks">{article.research.map(r => <li key={r}><CircleCheck />{r}</li>)}</ul></section>
        <section id="solutions" className="jd-a-card"><h2><Pill />Treatments & prevention</h2><ul className="jd-a-checks">{article.solutions.map(r => <li key={r}><CircleCheck />{r}</li>)}</ul></section>
        <section id="data" className="jd-a-card"><h2><BookOpen />Data fields in this report</h2><ul className="jd-a-checks">{article.data.map(r => <li key={r}><CircleCheck />{r}</li>)}</ul></section>
        <section id="sources" className="jd-a-card"><h2><ExternalLink />Sources & links</h2>
          <ol className="jd-a-sources">{article.sources.map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer"><strong>{s.title}</strong><small>{s.publisher}</small><ExternalLink /></a></li>)}</ol>
          <p className="jd-a-note">Educational report linking public references. It is not medical advice and does not include verified study extraction.</p></section>
        <footer className="jd-a-end"><div><strong>You have reached the end of this report.</strong><p>The complete dossier will include every section and source. Downloads are not connected yet.</p></div>
          <div className="jd-a-end-actions"><Button disabled><Download />Download dossier (PDF)</Button><Button variant="outline" disabled><Download />Dataset (CSV)</Button></div></footer>
      </div>
      <aside className="jd-article-side">
        <section id="anatomy" className="jd-a-card jd-a-sticky"><DashboardAnatomy stages={article.stages} />
          <div className="jd-a-organs">{article.stages.map(s => <span key={s.organ}><i />{s.organ}</span>)}</div></section>
        <section className="jd-a-card"><h2>Related topics</h2><div className="jd-a-effects">{article.related.map(r => <span key={r}>{r}</span>)}</div></section>
      </aside>
    </div>
  </article>;
}

export function ReadFullReportLink({ kind }: { kind: ReportArticle["kind"] }) {
  return <Button asChild variant="outline" className="self-start"><Link to="/reports/$kind" params={{ kind }}><BookOpen />Read full report<ArrowRight /></Link></Button>;
}
