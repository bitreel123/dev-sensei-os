import { load } from 'cheerio/slim';
import { z } from 'zod';

const link = z.object({ text: z.string(), url: z.string() });
export const articleBlock = z.discriminatedUnion('type', [
  z.object({ type: z.literal('h'), text: z.string() }),
  z.object({ type: z.literal('p'), text: z.string(), links: z.array(link).default([]) }),
  z.object({ type: z.literal('figure'), text: z.string(), image: z.string().nullable(), file: z.string().nullable() }),
  z.object({ type: z.literal('table'), text: z.string(), rows: z.array(z.array(z.object({ text: z.string(), colspan: z.number(), rowspan: z.number(), header: z.boolean() }))) }),
]);
export const articleSchema = z.object({ blocks: z.array(articleBlock), license: z.string().nullable(), licenseUrl: z.string().nullable(), credit: z.string(), complete: z.boolean(), mediaNotice: z.string().nullable().default(null), parserVersion: z.number().default(0) });
export type ArticleBlock = z.infer<typeof articleBlock>;
export type ArticleContent = z.infer<typeof articleSchema>;

export function safeArticleUrl(value: string, base?: string): string | null {
  try { const url = new URL(value, base); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
// Reproduction permission is distinct from access or commercial AI-training permission.
export function reusableLicense(value: string): boolean {
  if (/by[- ](?:nc|nd)\b|non.?commercial|no.?derivatives/i.test(value)) return false;
  return /creativecommons\.org\/licenses\/(?:by|by-sa)\/|creativecommons\.org\/publicdomain\/|\bcc[ -]by\b|\bcc0\b|public domain/i.test(value);
}

export function parseArticleDocument(markup: string, options: { xml: boolean; base: string; credit: string; license: string | null; licenseUrl: string | null }): ArticleContent | null {
  const $ = load(markup, { xml: options.xml });
  const root = options.xml ? $('article > body') : $('.syndicate').first();
  if (!root.length) return null;
  root.find('script,style,.no-syndicate,.card,.text-right,.sr-only').remove();
  const blocks: ArticleBlock[] = [];
  const text = (node: Parameters<typeof $>[0]) => $(node).text().replace(/\s+/g, ' ').trim();
  const links = (node: Parameters<typeof $>[0]) => $(node).find('ext-link,a').toArray().flatMap(a => {
    const url = safeArticleUrl($(a).attr('xlink:href') ?? $(a).attr('href') ?? '', options.base);
    return url ? [{ text: text(a) || url, url }] : [];
  });
  const table = (node: Parameters<typeof $>[0]) => {
    const rows = $(node).find('tr').toArray().map(tr => $(tr).children('td,th').toArray().map(c => ({ text: text(c), colspan: Math.max(1, Math.min(100, Number($(c).attr('colspan')) || 1)), rowspan: Math.max(1, Math.min(100, Number($(c).attr('rowspan')) || 1)), header: c.tagName === 'th' })));
    blocks.push({ type: 'table', text: $(node).find('label,caption,table caption').map((_, c) => text(c)).get().join(' '), rows });
    $(node).find('table-wrap-foot').each((_, n) => { if (text(n)) blocks.push({ type: 'p', text: text(n), links: links(n) }); });
  };
  const walk = (parent: Parameters<typeof $>[0]) => {
    $(parent).children().each((_, n) => {
      const tag = n.tagName.toLowerCase();
      if (tag === 'fig') {
        const file = $(n).find('graphic').attr('xlink:href') ?? null;
        blocks.push({ type: 'figure', text: $(n).find('label,caption').map((_, c) => text(c)).get().join(' '), image: null, file });
      } else if (tag === 'img') {
        const url = safeArticleUrl($(n).attr('src') ?? '', options.base);
        // CDC-produced report figures only; no generic or third-party website photography.
        if (url && new URL(url).hostname === 'www.cdc.gov' && new URL(url).pathname.startsWith('/mmwr/') && new URL(url).pathname.includes('/figures/')) blocks.push({ type: 'figure', text: $(n).attr('alt') ?? '', image: null, file: url });
      } else if (tag === 'table-wrap' || tag === 'table') table(n);
      else if (tag === 'title' || /^h[1-6]$/.test(tag)) { if (text(n)) blocks.push({ type: 'h', text: text(n) }); }
      else if (['p', 'list-item', 'li', 'disp-formula'].includes(tag)) {
        if ($(n).find('img').length) walk(n);
        if (text(n) && text(n) !== 'Top') blocks.push({ type: 'p', text: text(n), links: links(n) });
      } else walk(n);
    });
  };
  walk(root);
  if (options.xml) {
    // JATS may place all figures and tables outside body in a sibling floats-group.
    $('article > floats-group').each((_, n) => walk(n));
    $('article > back').children().each((_, n) => {
      if (n.tagName === 'ref-list') {
        blocks.push({ type: 'h', text: 'References' });
        $(n).find('ref').each((_, r) => { if (text(r)) blocks.push({ type: 'p', text: text(r), links: links(r) }); });
      } else walk(n);
    });
  }
  return blocks.length ? { blocks, license: options.license, licenseUrl: options.licenseUrl, credit: options.credit, complete: true, mediaNotice: null, parserVersion: 2 } : null;
}

export function parseResearchArticle(xml: string): ArticleContent | null {
  const $ = load(xml, { xml: true });
  const permissions = $('article > front permissions');
  const licenseUrl = permissions.find('license_ref').first().text().trim() || permissions.find('ext-link').first().attr('xlink:href') || null;
  const license = permissions.text().replace(/\s+/g, ' ').trim() || null;
  if (!reusableLicense(`${licenseUrl ?? ''} ${license ?? ''}`)) return null;
  return parseArticleDocument(xml, { xml: true, base: 'https://europepmc.org', credit: $('journal-title').first().text() || 'Europe PMC', license, licenseUrl });
}