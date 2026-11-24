import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { NEWS_SOURCES, buildResearchQuery, newsMatches, normalizeResearch, parseNewsFeed, researchResponse } from './health-evidence';
import type { EvidenceEntry } from './health-evidence';

function publicClient() {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('Public catalogue unavailable');
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
    headers.set('apikey', key);
    return fetch(input, { ...init, headers });
  } } });
}
async function providerFetch(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { Accept: 'application/json, application/rss+xml, application/xml;q=0.9', 'User-Agent': 'JeradinHealthEvidence/1.0' } });
  if (!response.ok) throw new Error(`Provider response ${response.status}`);
  return response;
}
export async function searchResearch(query: string, cursor = '*') {
  const params = new URLSearchParams({ query: buildResearchQuery(query), format: 'json', resultType: 'core', pageSize: '12', cursorMark: cursor });
  const result = researchResponse.parse(await (await providerFetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`)).json());
  const entries = result.resultList.result.map(r => normalizeResearch(r, new Date().toISOString())).filter((r): r is EvidenceEntry => r !== null);
  return { entries, total: result.hitCount, nextCursor: entries.length && result.nextCursorMark !== cursor ? result.nextCursorMark ?? null : null };
}
export async function loadExplorer(query: string, cursor: string) {
  const client = publicClient();
  const [newsResult, statuses, research] = await Promise.all([
    client.from('health_feed_entries').select('*').eq('kind', 'news').order('published_at', { ascending: false, nullsFirst: false }).limit(250),
    client.from('health_feed_status').select('*'),
    Promise.resolve(query ? searchResearch(query, cursor) : client.from('health_feed_entries').select('*').eq('kind', 'research').order('published_at', { ascending: false }).limit(12).then(r => {
      if (r.error) throw r.error;
      return { entries: (r.data ?? []) as EvidenceEntry[], total: r.data?.length ?? 0, nextCursor: null };
    })).then(r => ({ ...r, available: true })).catch(error => { console.error('Research source unavailable', error); return { entries: [] as EvidenceEntry[], total: 0, nextCursor: null, available: false }; }),
  ]);
  const news = (newsResult.data ?? []).filter(e => newsMatches(e as EvidenceEntry, query)) as EvidenceEntry[];
  // Cached research is only a fallback, never presented as a fresh API response.
  if (!research.available && cursor === '*') {
    const cached = await client.from('health_feed_entries').select('*').eq('kind', 'research').order('published_at', { ascending: false }).limit(100);
    research.entries = (cached.data ?? []).filter(e => newsMatches(e as EvidenceEntry, query)) as EvidenceEntry[];
    research.total = research.entries.length;
  }
  return { news, research, statuses: statuses.data ?? [], newsAvailable: !newsResult.error, checkedAt: new Date().toISOString() };
}
export async function loadEvidence(id: string): Promise<EvidenceEntry | null> {
  const client = publicClient();
  const stored = await client.from('health_feed_entries').select('*').eq('id', id).maybeSingle();
  if (stored.data) return stored.data as EvidenceEntry;
  const match = /^research-(MED|PMC|PPR|AGR|CBA|CTX|ETH|HIR|NBK|PAT)-([a-zA-Z0-9._-]{1,80})$/.exec(id);
  if (!match) return null;
  const params = new URLSearchParams({ query: `EXT_ID:${match[2]} AND SRC:${match[1]}`, format: 'json', resultType: 'core', pageSize: '1' });
  const response = researchResponse.parse(await (await providerFetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`)).json());
  return normalizeResearch(response.resultList.result[0], new Date().toISOString());
}
// Called only after managed callback authentication; never from a public read.
export async function ingestHealthSources() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const now = new Date().toISOString();
  const sources = [...NEWS_SOURCES.map(source => ({ name: source.name as string, load: async () => parseNewsFeed(await (await providerFetch(source.url)).text(), source, now) })), { name: 'Europe PMC', load: async () => (await searchResearch('')).entries }];
  return Promise.all(sources.map(async source => {
    try {
      const entries = await source.load();
      if (!entries.length) throw new Error('No valid provider entries');
      const saved = await supabaseAdmin.from('health_feed_entries').upsert(entries, { onConflict: 'id' });
      if (saved.error) throw saved.error;
      const status = await supabaseAdmin.from('health_feed_status').upsert({ source: source.name, status: 'ok', last_attempt_at: now, last_success_at: now, entry_count: entries.length });
      if (status.error) throw status.error;
      return { source: source.name, status: 'ok', count: entries.length };
    } catch (error) {
      console.error('Health ingestion failed', source.name, error);
      // Do not erase the last successful refresh or entries on a failed fetch.
      await supabaseAdmin.from('health_feed_status').upsert({ source: source.name, status: 'unavailable', last_attempt_at: now });
      return { source: source.name, status: 'unavailable', count: 0 };
    }
  }));
}