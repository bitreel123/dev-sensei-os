import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { NEWS_SOURCES, buildResearchQuery, newsMatches, normalizeResearch, parseNewsFeed, researchResponse } from './health-evidence';
import type { EvidenceEntry } from './health-evidence';
import { unzipSync } from 'fflate';
import { articleSchema, parseArticleDocument, parseResearchArticle } from './health-article';
import type { ArticleContent } from './health-article';

const listingColumns = 'id,kind,title,summary,source,source_url,published_at,authors,doi,fetched_at,pmcid,content_access,featured_image';

async function signedImage(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (!path.startsWith('articles/')) return path.startsWith('data:image/') ? path : null;
  const result = await publicClient().storage.from('health-article-media').createSignedUrl(path, 3600);
  return result.data?.signedUrl ?? null;
}
async function hydrateArticle(article: ArticleContent): Promise<ArticleContent> {
  return { ...article, blocks: await Promise.all(article.blocks.map(async b => b.type === 'figure' ? { ...b, image: await signedImage(b.image) } : b)) };
}
async function hydrateListings(entries: EvidenceEntry[]) {
  return Promise.all(entries.map(async entry => ({ ...entry, featured_image: await signedImage(entry.featured_image) })));
}

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
    client.from('health_feed_entries').select(listingColumns).eq('kind', 'news').order('published_at', { ascending: false, nullsFirst: false }).limit(250),
    client.from('health_feed_status').select('*'),
    Promise.resolve(query ? searchResearch(query, cursor) : client.from('health_feed_entries').select(listingColumns).eq('kind', 'research').order('published_at', { ascending: false }).limit(12).then(r => {
      if (r.error) throw r.error;
      return { entries: (r.data ?? []) as EvidenceEntry[], total: r.data?.length ?? 0, nextCursor: null };
    })).then(r => ({ ...r, available: true })).catch(error => { console.error('Research source unavailable', error); return { entries: [] as EvidenceEntry[], total: 0, nextCursor: null, available: false }; }),
  ]);
  const news = (newsResult.data ?? []).filter(e => newsMatches(e as EvidenceEntry, query)) as EvidenceEntry[];
  // Cached research is only a fallback, never presented as a fresh API response.
  if (!research.available && cursor === '*') {
    const cached = await client.from('health_feed_entries').select(listingColumns).eq('kind', 'research').order('published_at', { ascending: false }).limit(100);
    research.entries = (cached.data ?? []).filter(e => newsMatches(e as EvidenceEntry, query)) as EvidenceEntry[];
    research.total = research.entries.length;
  }
  if (query && research.entries.length) {
    const cached = await client.from('health_feed_entries').select(listingColumns).in('id', research.entries.map(e => e.id));
    const saved = new Map((cached.data ?? []).map(e => [e.id, e]));
    research.entries = research.entries.map(e => ({ ...e, ...(saved.get(e.id) ?? {}), kind: e.kind }));
  }
  return { news: await hydrateListings(news), research: { ...research, entries: await hydrateListings(research.entries) }, statuses: statuses.data ?? [], newsAvailable: !newsResult.error, checkedAt: new Date().toISOString() };
}
export async function loadEvidence(id: string): Promise<EvidenceEntry | null> {
  const client = publicClient();
  const stored = await client.from('health_feed_entries').select('*').eq('id', id).maybeSingle();
  if (stored.data) {
    if (stored.data.kind !== 'news' && stored.data.kind !== 'research') return null;
    const parsed = articleSchema.safeParse(stored.data.article_content);
    return { ...stored.data, kind: stored.data.kind, featured_image: await signedImage(stored.data.featured_image), article_content: parsed.success ? await hydrateArticle(parsed.data) : null };
  }
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
      const previous = await supabaseAdmin.from('health_feed_entries').select('id,content_access').in('id', entries.map(e => e.id));
      const existingAccess = new Map((previous.data ?? []).map(e => [e.id, e.content_access]));
      const saved = await supabaseAdmin.from('health_feed_entries').upsert(entries.map(e => ({ ...e, content_access: existingAccess.get(e.id) === 'complete' ? 'complete' : e.content_access ?? 'summary' })), { onConflict: 'id' });
      if (saved.error) throw saved.error;
      // Bound each hourly batch; catalogue reads never write or trigger privileged work.
      const eligible = entries.filter(e => e.source === 'CDC MMWR' || e.content_access === 'open-access').slice(0, 8);
      for (const entry of eligible) {
        try {
          const cached = await supabaseAdmin.from('health_feed_entries').select('article_content').eq('id', entry.id).maybeSingle();
          const cachedArticle = articleSchema.safeParse(cached.data?.article_content);
          if (cachedArticle.success && cachedArticle.data.parserVersion === 2) continue;
          const article = await fetchArticle(entry);
          if (!article) continue;
          for (let i = 0; i < article.blocks.length; i++) {
            const block = article.blocks[i];
            if (block?.type !== 'figure' || !block.image?.startsWith('data:image/')) continue;
            const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(block.image);
            if (!match?.[1] || !match[2]) continue;
            const path = `articles/${entry.id}/${i}.${match[1].split('/')[1]}`;
            const upload = await supabaseAdmin.storage.from('health-article-media').upload(path, Buffer.from(match[2], 'base64'), { contentType: match[1], upsert: true });
            block.image = upload.error ? null : path;
          }
          const figure = article.blocks.find(b => b.type === 'figure' && b.image);
          const update = await supabaseAdmin.from('health_feed_entries').update({ article_content: JSON.parse(JSON.stringify(article)), content_access: 'complete', featured_image: figure?.type === 'figure' ? figure.image : null }).eq('id', entry.id);
          if (update.error) throw update.error;
        } catch (error) { console.error('Article enrichment unavailable', entry.id, error); }
      }
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
async function boundedSource(url: string, limit = 20 * 1024 * 1024): Promise<Uint8Array> {
  for (let redirects = 0; redirects < 4; redirects++) {
    const destination = new URL(url);
    if (destination.protocol !== 'https:' || !['www.ebi.ac.uk', 'www.cdc.gov', 'tools.cdc.gov'].includes(destination.hostname) || destination.username || destination.password) throw new Error('Unapproved article destination');
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'JeradinHealthEvidence/1.0' } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Missing article redirect');
      url = new URL(location, url).href; continue;
    }
    if (!response.ok || !response.body || Number(response.headers.get('content-length')) > limit) throw new Error('Article content unavailable or too large');
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > limit) { await reader.cancel(); throw new Error('Article content exceeds retrieval capacity'); } chunks.push(part.value); }
    const result = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; } return result;
  }
  throw new Error('Too many article redirects');
}
function imageData(bytes: Uint8Array, filename: string): string | null {
  const ext = filename.split('?')[0]?.split('.').pop()?.toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : null;
  return mime ? `data:${mime};base64,${Buffer.from(bytes).toString('base64')}` : null;
}
async function fetchArticle(entry: EvidenceEntry): Promise<ArticleContent | null> {
  if (entry.kind === 'news') {
    if (entry.source !== 'CDC MMWR') return null;
    const url = new URL(entry.source_url);
    if (!(url.hostname === 'tools.cdc.gov' && url.pathname === '/api/embed/downloader/download.asp') && !(url.hostname === 'www.cdc.gov' && url.pathname.startsWith('/mmwr/'))) return null;
    const article = parseArticleDocument(new TextDecoder().decode(await boundedSource(url.href)), { xml: false, base: 'https://www.cdc.gov', credit: 'CDC MMWR', license: 'US government report; third-party materials may have separate terms. No endorsement implied.', licenseUrl: 'https://www.cdc.gov/other/agencymaterials.html' });
    if (!article) return null;
    for (const b of article.blocks) if (b.type === 'figure' && b.file) {
      try { b.image = imageData(await boundedSource(b.file, 8 * 1024 * 1024), b.file); } catch { article.mediaNotice = 'Some publisher figures could not be retrieved. Their captions remain available.'; }
    }
    return article;
  }
  let pmcid = entry.pmcid;
  if (!pmcid) {
    const match = /^research-([A-Z]{3})-([a-zA-Z0-9._-]{1,80})$/.exec(entry.id);
    if (!match) return null;
    const params = new URLSearchParams({ query: `EXT_ID:${match[2]} AND SRC:${match[1]}`, format: 'json', resultType: 'core', pageSize: '1' });
    const json = await (await providerFetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`)).json() as { resultList?: { result?: Array<{ pmcid?: string; isOpenAccess?: string }> } };
    const record = json.resultList?.result?.[0];
    if (record?.isOpenAccess !== 'Y') return null;
    pmcid = record.pmcid;
  }
  if (!pmcid || !/^PMC\d{1,12}$/.test(pmcid)) return null;
  const article = parseResearchArticle(new TextDecoder().decode(await boundedSource(`https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcid}/fullTextXML`)));
  if (!article) return null;
  const figures = article.blocks.filter(b => b.type === 'figure');
  if (figures.length) {
    try {
      const zip = await boundedSource(`https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcid}/supplementaryFiles`);
      let selectedSize = 0;
      const files = unzipSync(zip, { filter: file => {
        const base = file.name.split('/').pop() ?? '';
        const wanted = figures.some(f => f.file && (base === f.file || base.replace(/\.[^.]+$/, '') === f.file));
        if (!wanted || !/\.(jpg|jpeg|png|webp|gif)$/i.test(base) || file.originalSize > 8 * 1024 * 1024 || selectedSize + file.originalSize > 20 * 1024 * 1024) return false;
        selectedSize += file.originalSize; return true;
      } });
      for (const figure of figures) {
        const file = Object.entries(files).find(([name]) => { const base = name.split('/').pop() ?? ''; return base === figure.file || base.replace(/\.[^.]+$/, '') === figure.file; });
        if (file) figure.image = imageData(file[1], file[0]);
      }
      if (figures.some(f => !f.image)) article.mediaNotice = 'Some publisher figure files are unavailable; their captions are preserved.';
    } catch { article.mediaNotice = 'Publisher figure files could not be retrieved; their captions are preserved.'; }
  }
  return article;
}
export async function loadFullText(id: string): Promise<ArticleContent | null> {
  const entry = await loadEvidence(id);
  if (!entry) return null;
  return entry.article_content ?? fetchArticle(entry);
}
