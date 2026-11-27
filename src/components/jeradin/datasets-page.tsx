import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Database, Download, Search, ArrowRight, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { datasetRecordsQuery } from '@/lib/health-evidence.queries';
import { downloadEvidence } from '@/lib/evidence-download';
import banner from '@/assets/dataset-banner.png.asset.json';

export function DatasetsPage() {
  const { data } = useSuspenseQuery(datasetRecordsQuery());
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const visible = data.records.filter(r => (!kind || r.kind === kind) && `${r.title} ${r.source} ${r.mentions.map(m => m.name).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const exportRecords = visible.filter(r => selected.includes(r.id));
  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(v => v !== id) : [...s, id]);
  return <>
    <div className="jd-catalog-heading"><div><h1><Database />Datasets</h1><p>Structured records from complete health reports and research.</p></div><span className="jd-tag">{data.records.length} available records</span></div>
    <section className="jd-dataset-banner"><img src={banner.url} alt="Human organs and DNA" /><div className="jd-banner-copy"><span className="jd-banner-eyebrow">Evidence collections</span><h2>From full reports<br />to structured records</h2><p>Published text, tables and evidence-linked mentions.</p><form className="jd-dataset-search" onSubmit={e => e.preventDefault()}><Search /><input aria-label="Search datasets" placeholder="Search topics, organs, reports…" value={query} onChange={e => setQuery(e.target.value)} /><Button size="icon" type="submit" aria-label="Search catalogue"><ArrowRight /></Button></form></div><div className="jd-banner-checks">{['Publication identifiers', 'Supporting passages', 'Reuse terms'].map(label => <span key={label}><Check />{label}</span>)}</div></section>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Evidence collections">{[['', 'All records'], ['news', 'Outbreak & health reports'], ['research', 'Biomedical research']].map(([value, label]) => <Button key={value} variant={kind === value ? 'default' : 'outline'} aria-pressed={kind === value} onClick={() => setKind(value ?? '')}>{label}</Button>)}</div>
    <div className="jd-catalog-meta"><span>{visible.length} matching records · {exportRecords.length} selected</span><Button variant="ghost" size="sm" disabled={!visible.length} onClick={() => setSelected(exportRecords.length === visible.length ? [] : visible.map(r => r.id))}>{exportRecords.length === visible.length && visible.length ? 'Clear selection' : 'Select matching records'}</Button></div>
    {data.unavailable && <p role="alert">The evidence collection could not be loaded. Please try again later.</p>}
    <div className="divide-y divide-border">{visible.map(r => <article key={r.id} className="grid gap-4 py-6 sm:grid-cols-[auto_minmax(0,1fr)]"><label className="flex items-start gap-2 pt-1"><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.title}`} className="h-4 w-4 accent-current" /></label><div className="min-w-0"><small className="text-muted-foreground">{r.source} · {r.published_at ? new Date(r.published_at).toLocaleDateString('en-GB') : 'Date unavailable'}</small><h2 className="mt-2 break-words text-lg font-semibold"><Link to="/evidence/$id" params={{ id: r.id }}>{r.title}</Link></h2><div className="jd-dataset-tags my-3">{r.mentions.filter(m => m.category === 'Organ mentions').map(m => <span key={m.name}>{m.name}</span>)}</div><p className="text-sm text-muted-foreground">{r.blocks.filter(b => b.type === 'p').length} text passages · {r.blocks.filter(b => b.type === 'table').length} tables · {r.blocks.filter(b => b.type === 'figure').length} figure references</p><p className="mt-2 break-words text-xs text-muted-foreground">{r.license || 'Check publication reuse terms'} · Automated extraction, not expert reviewed</p><Button asChild variant="ghost" className="mt-2"><Link to="/evidence/$id" params={{ id: r.id }}><FileText />Read report<ArrowRight /></Link></Button></div></article>)}</div>
    {!visible.length && !data.unavailable && <div className="jd-catalog-empty"><Database /><h2>No matching complete records</h2><p>{data.records.length ? 'Try a different topic or collection.' : 'Complete permitted articles will appear after the next successful source refresh.'}</p></div>}
    <section className="border-t border-border py-6"><h2 className="text-lg font-semibold">Export selected evidence</h2><p className="mt-2 text-sm text-muted-foreground">Text, tables, figure references, article mentions and publication provenance. Records are not validated training datasets; commercial training rights and third-party image rights require separate review.</p><div className="mt-4 flex flex-wrap gap-3"><Button variant="outline" disabled={!exportRecords.length} onClick={() => void downloadEvidence(exportRecords, 'jsonl')}><Download />Export JSONL</Button><Button variant="outline" disabled={!exportRecords.length} onClick={() => void downloadEvidence(exportRecords, 'csv')}><Download />Export CSV</Button></div></section>
  </>;
}
