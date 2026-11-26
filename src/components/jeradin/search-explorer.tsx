import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useInfiniteQuery, useSuspenseQuery } from '@tanstack/react-query';
import { ArrowUpRight, ArrowRight, FileText, Loader2, RefreshCw, Search, Activity, Bug, Brain, Dna, Microscope, Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { explorerQuery } from '@/lib/health-evidence.queries';
import { getExplorer } from '@/lib/health-evidence.functions';
import type { EvidenceEntry } from '@/lib/health-evidence';
import { DashboardAnatomy } from './dashboard-anatomy';
import { researchTour } from './dashboard-tour-data';
import { EvidenceVisual, evidenceTopic } from './evidence-visual';
import { EvidenceFeatured } from './evidence-featured';

export function evidenceDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Date not supplied';
}
const topics = [{ name: 'All topics', query: '', icon: Activity }, { name: 'Infectious disease', query: 'infection', icon: Bug }, { name: 'Oncology', query: 'cancer', icon: Microscope }, { name: 'Neuroscience', query: 'brain', icon: Brain }, { name: 'Genomics', query: 'genomics', icon: Dna }, { name: 'Public health', query: 'health', icon: Globe2 }];
function EvidenceRow({ entry }: { entry: EvidenceEntry }) {
  return <article className="je-post"><Link to="/evidence/$id" params={{ id: entry.id }}>
    <EvidenceVisual entry={entry} />
    <div className="je-post-body"><div className="je-result-meta"><span>{evidenceTopic(entry)}</span><time dateTime={entry.published_at ?? undefined}>{evidenceDate(entry.published_at)}</time></div><h3>{entry.title}</h3><p className="je-excerpt">{entry.summary || 'Publication information is available inside this report.'}</p><div className="je-post-foot"><small>{entry.source} · {entry.kind === 'news' ? 'News' : 'Research'}</small><ArrowUpRight /></div><span className="je-access">{entry.content_access === 'complete' ? 'Complete report' : entry.content_access === 'open-access' ? 'Open-access publication' : 'Publisher summary'}</span></div>
  </Link></article>;
}
export function SearchExplorer() {
  const { data: initial } = useSuspenseQuery(explorerQuery());
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('All topics');
  const [tab, setTab] = useState<'all' | 'news' | 'research'>('all');
  const [newsLimit, setNewsLimit] = useState(12);
  const results = useInfiniteQuery({
    queryKey: ['health-explorer-pages', query], initialPageParam: '*',
    queryFn: ({ pageParam }) => getExplorer({ data: { query, cursor: pageParam } }),
    getNextPageParam: last => last.research.nextCursor ?? undefined,
    ...(query === '' ? { initialData: { pages: [initial], pageParams: ['*'] } } : {}),
    staleTime: 5 * 60 * 1000, refetchInterval: 5 * 60 * 1000, retry: 1,
  });
  const first = results.data?.pages[0];
  const news = first?.news ?? [];
  const research = [...new Map((results.data?.pages.flatMap(p => p.research.entries) ?? []).map(e => [e.id, e])).values()];
  const featured = [...initial.news, ...initial.research.entries].sort((a, b) => Number(b.content_access === 'complete') - Number(a.content_access === 'complete') || (b.published_at ?? '').localeCompare(a.published_at ?? '')).slice(0, 5);
  const submit = () => { setTopic('All topics'); setQuery(input.trim()); setNewsLimit(12); if (input.trim() === query) void results.refetch(); };
  const statuses = first?.statuses ?? [];
  return <div className="je-explorer je-editorial">
    <form className="jd-search" onSubmit={e => { e.preventDefault(); submit(); }}><Search /><input value={input} maxLength={160} onChange={e => setInput(e.target.value)} placeholder="Search conditions, medicines or research" aria-label="Search research" /><Button type="submit" aria-label="Search" title="Search" disabled={results.isFetching}>{results.isFetching ? <Loader2 className="animate-spin" /> : <><span className="jd-search-word">Search</span><ArrowRight /></>}</Button></form>
    {!query && <EvidenceFeatured entries={featured} />}
    <div className="je-topics" aria-label="Health topics">{topics.map(t => <Button key={t.name} variant="ghost" aria-pressed={topic === t.name} className={topic === t.name ? 'is-selected' : ''} onClick={() => { setTopic(t.name); setQuery(t.query); setInput(t.query); setNewsLimit(12); }}><t.icon /><span>{t.name}</span></Button>)}</div>
    <div className="je-toolbar"><div role="tablist" aria-label="Evidence type">{(['all', 'news', 'research'] as const).map(t => <Button key={t} variant={tab === t ? 'default' : 'ghost'} role="tab" aria-selected={tab === t} aria-controls="evidence-results" id={`evidence-type-${t}`} onClick={() => setTab(t)}>{t === 'all' ? 'All evidence' : t === 'news' ? 'Health news' : 'Research'}</Button>)}</div><Button variant="ghost" size="icon" onClick={() => void results.refetch()} disabled={results.isFetching} title="Refresh sources" aria-label="Refresh sources"><RefreshCw className={results.isFetching ? 'animate-spin' : ''} /></Button></div>
    {results.isPending && <p role="status" className="je-status"><Loader2 className="animate-spin" /> Searching health sources…</p>}
    {results.isError && <p role="alert" className="je-status">Sources could not be reached. Try refreshing.</p>}
    {first && <>
      <div className="je-status"><span>{query ? `Results for “${query}”` : 'The latest in health intelligence'}</span><small>Checked {evidenceDate(first.checkedAt)} · Updated hourly</small></div>
      {(!first.research.available || !first.newsAvailable) && <p role="status" className="jd-preview-notice">{!first.research.available ? 'Research is temporarily unavailable. Saved publications are shown where available.' : 'The news catalogue is temporarily unavailable.'}</p>}
      <div className="je-layout"><div id="evidence-results" role="tabpanel" aria-labelledby={`evidence-type-${tab}`} className="je-results">
        {tab !== 'research' && <section aria-label="Health news results"><div className="jd-section-head"><h2>Health news</h2><small>{news.length} {query ? 'matches in current feeds' : 'updates'}</small></div><div className="je-post-grid">{news.slice(0, newsLimit).map(entry => <EvidenceRow key={entry.id} entry={entry} />)}</div>{!news.length && <p className="je-empty">{query ? 'No news matches in the current feeds. Try a broader topic or explore research.' : 'No news entries are available yet.'}</p>}{news.length > newsLimit && <Button variant="outline" onClick={() => setNewsLimit(n => n + 12)}>More health news <ArrowRight /></Button>}</section>}
        {tab !== 'news' && <section aria-label="Research results"><div className="jd-section-head"><h2>Biomedical research</h2><small>{first.research.total.toLocaleString()} {first.research.available ? 'publications found' : 'saved entries'}</small></div><div className="je-post-grid">{research.map(entry => <EvidenceRow key={entry.id} entry={entry} />)}</div>{!research.length && <p className="je-empty">No publications found. Try the condition or medicine name.</p>}{results.hasNextPage && <Button variant="outline" onClick={() => void results.fetchNextPage()} disabled={results.isFetchingNextPage}>{results.isFetchingNextPage ? <Loader2 className="animate-spin" /> : <FileText />} More research</Button>}</section>}
      </div><aside className="je-context"><div className="jd-section-head"><h2>Human anatomy</h2><Activity size={16} /></div><DashboardAnatomy stages={researchTour} /><p>Educational anatomy, not findings from these publications.</p><div className="je-source-status"><h3>Feed activity</h3>{statuses.map(s => <div key={s.source}><strong>{s.source}</strong><span>{s.status === 'ok' ? `Retrieved ${evidenceDate(s.last_success_at)}` : 'Temporarily unavailable'}</span></div>)}<p>Article availability and reuse terms vary by publisher. Not medical advice.</p></div></aside></div>
    </>}
  </div>;
}
