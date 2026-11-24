import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HealthDashboard } from '@/components/jeradin/health-dashboard';
import { evidenceQuery } from '@/lib/health-evidence.queries';
import { evidenceDate } from '@/components/jeradin/search-explorer';

export const Route = createFileRoute('/evidence/$id')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(evidenceQuery(params.id)),
  head: ({ loaderData }) => {
    const entry = loaderData?.entry;
    const title = entry ? `${entry.title} · Jeradin` : 'Health evidence · Jeradin';
    const description = entry?.summary.slice(0, 180) || 'Read source-linked health news and biomedical research in Jeradin.';
    return { meta: [{ title }, { name: 'description', content: description }, { property: 'og:title', content: title }, { property: 'og:description', content: description }, { property: 'og:type', content: 'article' }, { name: 'twitter:card', content: 'summary_large_image' }] };
  },
  component: EvidencePage,
});
function EvidencePage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(evidenceQuery(id));
  const entry = data.entry;
  return <HealthDashboard view="search"><div className="je-article"><Button asChild variant="ghost"><Link to="/app"><ArrowLeft /> Search Explorer</Link></Button>{entry ? <article>
    <div className="je-result-meta"><span>{entry.kind === 'news' ? 'Health news' : 'Biomedical research'}</span><span>{entry.source}</span><time dateTime={entry.published_at ?? undefined}>{evidenceDate(entry.published_at)}</time></div>
    <h1>{entry.title}</h1>{entry.authors && <p className="je-authors">{entry.authors}</p>}
    <div className="je-article-reading"><h2>{entry.kind === 'research' ? 'Publication abstract' : 'Source excerpt'}</h2>{entry.summary ? entry.summary.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>) : <p>The source has not supplied an abstract. Follow the original publication below.</p>}</div>
    <section className="je-article-source"><h2>Source and publication details</h2><dl><div><dt>Provider</dt><dd>{entry.source}</dd></div><div><dt>Published</dt><dd>{evidenceDate(entry.published_at)}</dd></div>{entry.doi && <div><dt>DOI</dt><dd><a href={`https://doi.org/${entry.doi}`} target="_blank" rel="noopener noreferrer">{entry.doi}</a></dd></div>}<div><dt>Retrieved</dt><dd>{evidenceDate(entry.fetched_at)}</dd></div></dl><Button asChild><a href={entry.source_url} target="_blank" rel="noopener noreferrer">Read full {entry.kind === 'news' ? 'article' : 'publication'} at source <ArrowUpRight /></a></Button><p>The full publication may have access restrictions. Source terms govern reuse; inclusion here does not grant AI-training rights. This is source material, not a verified clinical conclusion or medical advice.</p></section>
  </article> : <p role="status">{data.unavailable ? 'The source could not be reached. Please try again.' : 'This entry could not be found.'}</p>}</div></HealthDashboard>;
}