import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Info, Share2, Stethoscope, ChartNoAxesCombined, ArrowUpRight, Loader2, RefreshCw, ZoomIn, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DashboardAnatomy } from './dashboard-anatomy';
import { extractIntelligence, evidenceAnatomy, intelligenceRecord } from '@/lib/evidence-intelligence';
import { downloadEvidence } from '@/lib/evidence-download';
import { evidenceDate } from './search-explorer';
import { EvidenceVisual } from './evidence-visual';
import { fullTextQuery } from '@/lib/health-evidence.queries';
import type { EvidenceEntry } from '@/lib/health-evidence';
import type { ArticleBlock } from '@/lib/health-article';

const tabs = [['overview', 'Overview'], ['data', 'Data & figures'], ['anatomy', 'Virtual human'], ['details', 'Publication details']] as const;
type Tab = typeof tabs[number][0];
function ContentBlock({ block, index }: { block: ArticleBlock; index: number }) {
  if (block.type === 'h') return <h2 id={`article-section-${index}`}>{block.text}</h2>;
  if (block.type === 'p') return <div id={`article-section-${index}`} className="je-reading-paragraph"><p>{block.text}</p>{block.links.length > 0 && <div className="je-inline-links">{block.links.map((link, i) => <a key={i} href={link.url} target="_blank" rel="noreferrer">{link.text}<ArrowUpRight size={12} /></a>)}</div>}</div>;
  if (block.type === 'table') return <figure className="je-article-table"><figcaption>{block.text || 'Data table'}</figcaption><div tabIndex={0} role="region" aria-label={block.text || 'Data table'}><table><tbody>{block.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => cell.header ? <th key={j} colSpan={cell.colspan} rowSpan={cell.rowspan} scope="col">{cell.text}</th> : <td key={j} colSpan={cell.colspan} rowSpan={cell.rowspan}>{cell.text}</td>)}</tr>)}</tbody></table></div></figure>;
  return <figure className="je-article-figure">{block.image ? <Dialog><DialogTrigger asChild><Button variant="ghost" className="je-figure-open" aria-label="Enlarge article figure"><img src={block.image} alt={block.text || 'Publication figure'} loading="lazy" /><ZoomIn /></Button></DialogTrigger><DialogContent className="je-image-dialog"><DialogTitle>Article figure</DialogTitle><img src={block.image} alt={block.text || 'Publication figure'} /><p>{block.text}</p></DialogContent></Dialog> : <p className="je-figure-unavailable">The publisher’s image file is unavailable.</p>}<figcaption>{block.text}</figcaption></figure>;
}
export function EvidenceArticlePage({ entry }: { entry: EvidenceEntry }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [shareNotice, setShareNotice] = useState('');
  const full = useQuery({ ...fullTextQuery(entry.id), ...(entry.article_content ? { initialData: entry.article_content } : {}) });
  const content = full.data;
  const mentions = content ? extractIntelligence(content) : [];
  const stages = evidenceAnatomy(mentions);
  const paragraphs = entry.summary ? entry.summary.split(/\n\n+/) : [];
  const blocks = content?.blocks ?? [];
  const visuals = blocks.flatMap((block, index) => block.type === 'figure' || block.type === 'table' ? [{ block, index }] : []);
  const firstFigure = blocks.find(b => b.type === 'figure' && b.image);
  const headings = blocks.flatMap((block, index) => block.type === 'h' ? [{ text: block.text, index }] : []);
  const share = async () => {
    try { if (navigator.share) await navigator.share({ title: entry.title, url: location.href }); else { await navigator.clipboard.writeText(location.href); setShareNotice('Link copied'); } } catch { setShareNotice('Unable to share this link.'); }
  };
  return <article className="jd-article je-reader">
    <div className="jd-article-bar"><Link to="/app" className="jd-back"><ArrowLeft />Search Explorer</Link><div><Button variant="ghost" size="sm" onClick={() => void share()}><Share2 />Share</Button>{shareNotice && <small role="status">{shareNotice}</small>}</div></div>
    <header className="je-reader-heading"><small>{entry.kind === 'news' ? 'Health news' : 'Biomedical research'} / {entry.source}</small><h1>{entry.title}</h1><div className="je-reader-byline"><time>{evidenceDate(entry.published_at)}</time><span>{entry.authors || entry.source}</span></div></header>
    <EvidenceVisual entry={entry} image={firstFigure?.type === 'figure' ? firstFigure.image : entry.featured_image} className="je-reader-cover" />
    <nav className="jd-article-tabs" role="tablist" aria-label="Report sections">{tabs.map(([id, label]) => <Button variant="ghost" key={id} id={`article-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls="article-panel" className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</Button>)}</nav>
    <div className="jd-article-grid"><div className="jd-article-main" id="article-panel" role="tabpanel" aria-labelledby={`article-tab-${tab}`}>
      {tab === 'overview' && <section className="je-reading"><h2>Overview</h2>{content && <section className="my-6 border-y border-border py-5"><h3>Structured intelligence</h3><p className="text-sm text-muted-foreground">Automated article mentions · Not expert-validated findings</p><dl className="mt-4 grid gap-4 sm:grid-cols-2">{['Organ mentions', 'Pathogen mentions', 'Study design mentions', 'Transmission mentions', 'Outcome & mechanism mentions'].map(category => <div key={category}><dt className="text-sm font-semibold">{category}</dt><dd className="text-sm text-muted-foreground">{mentions.filter(m => m.category === category).map(m => m.name).join(', ') || 'Not identified'}</dd></div>)}</dl>{mentions.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-sm">Supporting article passages</summary>{mentions.map(m => <div className="my-3 text-sm" key={`${m.category}-${m.name}`}><strong>{m.name}</strong><p>{m.quote}</p><a href={`#article-section-${m.block_index}`} className="underline">Read passage in context</a></div>)}</details>}</section>}{paragraphs.map((p, i) => <p className="je-abstract" key={i}>{p}</p>)}
        {full.isPending ? <p role="status" className="je-loading"><Loader2 className="animate-spin" />Retrieving article sections and figures…</p> : content ? <>{content.mediaNotice && <p className="je-availability">{content.mediaNotice}</p>}{blocks.map((block, index) => <ContentBlock key={index} block={block} index={index} />)}<footer className="je-reading-end">End of article · {visuals.filter(v => v.block.type === 'figure').length} figures · {visuals.filter(v => v.block.type === 'table').length} tables</footer></> : <div className="je-availability"><strong>Complete content is not available for republication.</strong><p>{entry.kind === 'news' ? 'This publisher shares a summary through its feed. Jeradin cannot reproduce the rest without permission.' : 'The publication did not provide a reusable complete manuscript, or its content service could not be reached.'}</p><Button variant="ghost" size="sm" onClick={() => void full.refetch()} disabled={full.isFetching}><RefreshCw />Retry retrieval</Button></div>}
      </section>}
      {tab === 'data' && <section className="je-reading"><h2><ChartNoAxesCombined />Data & figures</h2>{full.isPending ? <p role="status">Retrieving article data…</p> : visuals.length ? visuals.map(v => <ContentBlock key={v.index} block={v.block} index={v.index} />) : <p>No reusable figures or tables were supplied for this article.</p>}<p className="jd-a-note">Published tables and figures are preserved, not a validated AI-training dataset.</p></section>}
      {tab === 'anatomy' && <section className="je-reading"><h2><Stethoscope />Body systems mentioned</h2>{stages.map(s => <div className="jd-a-organ" key={s.organ}><h3>{s.organ}</h3><strong>{s.function}</strong><p>{s.explanation}</p></div>)}{!stages.length && <p>No supported organ mentions were identified.</p>}<p className="jd-a-note">Locations illustrate organ mentions, not proven injury, spread or causation.</p></section>}
      {tab === 'details' && <section className="je-reading"><h2><Info />Publication details</h2><dl className="jd-facts"><div><dt>Type</dt><dd>{entry.kind === 'news' ? 'News' : 'Research'}</dd></div><div><dt>Published</dt><dd>{evidenceDate(entry.published_at)}</dd></div>{entry.authors && <div><dt>Authors</dt><dd>{entry.authors}</dd></div>}{entry.doi && <div><dt>DOI</dt><dd>{entry.doi}</dd></div>}<div><dt>Availability</dt><dd>{content ? 'Complete permitted article content' : 'Publisher summary or abstract'}</dd></div>{content?.license && <div><dt>Reuse terms</dt><dd>{content.license}</dd></div>}</dl>{content?.licenseUrl && <a href={content.licenseUrl} target="_blank" rel="noreferrer">View reuse terms <ArrowUpRight size={14} /></a>}<p>Reading permission does not automatically grant permission for commercial redistribution or AI training. Third-party figures may carry separate rights.</p></section>}
      <p className="jd-a-note">Credit: {content?.credit || entry.source}{entry.authors ? ` · ${entry.authors}` : ''}. Not medical advice.</p>
      {tab === 'overview' && content?.complete && <section className="border-t border-border py-5"><h3>Export this article record</h3><p className="text-sm text-muted-foreground">Includes text, tables, figure references, supporting passages and reuse terms. Commercial AI-training rights are not assessed.</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={() => void downloadEvidence([intelligenceRecord(entry, content)], 'jsonl')}><Download />JSONL</Button><Button variant="outline" onClick={() => void downloadEvidence([intelligenceRecord(entry, content)], 'csv')}><Download />CSV</Button></div></section>}
    </div><aside className="jd-article-side"><div className="je-reader-aside"><h2>Human anatomy</h2><DashboardAnatomy stages={stages} /><p>Educational illustration</p>{tab === 'overview' && headings.length > 0 && <nav aria-label="Article contents"><h3>In this article</h3>{headings.map(h => <a key={h.index} href={`#article-section-${h.index}`}>{h.text}</a>)}</nav>}</div></aside></div>
  </article>;
}
