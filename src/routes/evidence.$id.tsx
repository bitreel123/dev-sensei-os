import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { HealthDashboard } from '@/components/jeradin/health-dashboard';
import { EvidenceArticlePage } from '@/components/jeradin/evidence-article-page';
import { evidenceQuery } from '@/lib/health-evidence.queries';

export const Route = createFileRoute('/evidence/$id')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(evidenceQuery(params.id)),
  head: ({ loaderData }) => {
    const entry = loaderData?.entry;
    const title = entry ? `${entry.title} · Jeradin` : 'Health evidence · Jeradin';
    const description = entry?.summary.slice(0, 180) || 'Read health news and biomedical research in Jeradin.';
    return { meta: [{ title }, { name: 'description', content: description }, { property: 'og:title', content: title }, { property: 'og:description', content: description }, { property: 'og:type', content: 'article' }, { name: 'twitter:card', content: 'summary_large_image' }] };
  },
  component: EvidencePage,
});
function EvidencePage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(evidenceQuery(id));
  return <HealthDashboard view="search">{data.entry ? <EvidenceArticlePage entry={data.entry} /> : <p role="status">{data.unavailable ? 'This item could not be loaded. Please try again.' : 'This entry could not be found.'}</p>}</HealthDashboard>;
}
