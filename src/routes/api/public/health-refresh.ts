import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/health-refresh')({
  server: { handlers: { POST: async ({ request }) => {
    const { authenticateCronRequest } = await import('@/integrations/supabase/cron-auth');
    const rejection = await authenticateCronRequest(request);
    if (rejection) return rejection;
    const { ingestHealthSources } = await import('@/lib/health-evidence.server');
    const sources = await ingestHealthSources();
    return Response.json({ sources }, { status: sources.some(s => s.status === 'ok') ? 200 : 503 });
  } } },
});