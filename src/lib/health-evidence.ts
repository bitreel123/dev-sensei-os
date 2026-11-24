import { z } from 'zod';
import { XMLParser } from 'fast-xml-parser';

export type EvidenceEntry = {
  id: string; kind: 'news' | 'research'; title: string; summary: string;
  source: string; source_url: string; published_at: string | null;
  authors: string; doi: string | null; fetched_at: string;
};
export const NEWS_SOURCES = [
  { name: 'WHO', url: 'https://www.who.int/rss-feeds/news-english.xml', hosts: ['www.who.int', 'who.int'] },
  { name: 'BBC Health', url: 'https://feeds.bbci.co.uk/news/health/rss.xml', hosts: ['www.bbc.com', 'www.bbc.co.uk', 'bbc.com', 'bbc.co.uk'] },
] as const;
export const explorerInput = z.object({
  query: z.string().trim().max(160).default(''),
  cursor: z.string().max(600).default('*'),
});
export function plainText(value: string): string {
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(?:p|div|h[1-6])>|<br\s*\/?\s*>/gi, '\n\n').replace(/<[^>]*>/g, '')
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, v => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' })[v] ?? v)
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n: string) => { const code = n.startsWith('x') ? parseInt(n.slice(1), 16) : Number(n); return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''; })
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
export function safeDate(value: string | undefined | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
export function buildResearchQuery(query: string, now = new Date()): string {
  const tokens = query.match(/[\p{L}\p{N}]+/gu)?.slice(0, 24) ?? [];
  if (tokens.length) return tokens.map(token => `TITLE_ABS:"${token}"`).join(' AND ');
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const until = now.toISOString().slice(0, 10);
  return `(TITLE_ABS:health OR TITLE_ABS:disease OR TITLE_ABS:medicine) FIRST_PDATE:[${since} TO ${until}] sort_date:y`;
}
export function newsMatches(entry: EvidenceEntry, query: string): boolean {
  const tokens = query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const content = `${entry.title} ${entry.summary}`.toLocaleLowerCase();
  return tokens.every(token => content.includes(token));
}
const rssItem = z.object({ title: z.string(), link: z.string(), description: z.string().optional(), pubDate: z.string().optional() }).passthrough();
export async function parseNewsFeed(xml: string, source: typeof NEWS_SOURCES[number], now: string): Promise<EvidenceEntry[]> {
  const parsed = new XMLParser({ ignoreAttributes: true, parseTagValue: false, processEntities: true }).parse(xml);
  const channel = z.object({ rss: z.object({ channel: z.object({ item: z.union([z.array(z.unknown()), z.unknown()]) }) }) }).parse(parsed).rss.channel;
  const items = Array.isArray(channel.item) ? channel.item : [channel.item];
  const entries = await Promise.all(items.slice(0, 150).map(async (value): Promise<EvidenceEntry | null> => {
    const item = rssItem.safeParse(value);
    if (!item.success) return null;
    let url: URL;
    try { url = new URL(item.data.link); } catch { return null; }
    if (url.protocol !== 'https:' || !source.hosts.some(host => host === url.hostname)) return null;
    url.hash = '';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url.href));
    const id = Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 24);
    const title = plainText(item.data.title);
    if (!title) return null;
    return { id: `news-${id}`, kind: 'news' as const, title, summary: plainText(item.data.description ?? '').slice(0, 1800), source: source.name, source_url: url.href, published_at: safeDate(item.data.pubDate), authors: '', doi: null, fetched_at: now };
  }));
  return [...new Map(entries.filter((e): e is EvidenceEntry => e !== null).map(e => [e.id, e])).values()];
}
const researchRecord = z.object({
  id: z.string(), source: z.enum(['MED', 'PMC', 'PPR', 'AGR', 'CBA', 'CTX', 'ETH', 'HIR', 'NBK', 'PAT']), title: z.string(),
  abstractText: z.string().nullish(), authorString: z.string().nullish(), doi: z.string().nullish(), firstPublicationDate: z.string().nullish(),
}).passthrough();
export const researchResponse = z.object({ hitCount: z.number(), nextCursorMark: z.string().optional(), resultList: z.object({ result: z.array(z.unknown()).default([]) }) });
export function normalizeResearch(value: unknown, now: string): EvidenceEntry | null {
  const parsed = researchRecord.safeParse(value);
  if (!parsed.success) return null;
  const r = parsed.data;
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(r.id)) return null;
  return { id: `research-${r.source}-${r.id}`, kind: 'research', title: plainText(r.title), summary: plainText(r.abstractText ?? ''), source: 'Europe PMC', source_url: `https://europepmc.org/article/${r.source}/${encodeURIComponent(r.id)}`, published_at: safeDate(r.firstPublicationDate), authors: r.authorString ?? '', doi: r.doi && /^10\.\d{4,9}\//.test(r.doi) ? r.doi : null, fetched_at: now };
}