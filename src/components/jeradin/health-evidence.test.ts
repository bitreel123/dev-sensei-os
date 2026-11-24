import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { NEWS_SOURCES, buildResearchQuery, newsMatches, normalizeResearch, parseNewsFeed, safeDate } from '@/lib/health-evidence';

test('RSS ingestion deduplicates source links and rejects non-HTTPS or foreign destinations', async () => {
  const xml = '<rss><channel><item><title>Health update</title><link>https://www.who.int/news/item/a</link><description>Research update</description></item><item><title>Duplicate</title><link>https://www.who.int/news/item/a</link></item><item><title>Unsafe</title><link>javascript:alert(1)</link></item><item><title>Foreign</title><link>https://example.com/a</link></item></channel></rss>';
  const source = NEWS_SOURCES[0];
  assert.ok(source);
  const entries = await parseNewsFeed(xml, source, '2026-11-24T00:00:00Z');
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.kind, 'news');
  assert.equal(entries[0]?.source, 'WHO');
  assert.equal(entries[0]?.source_url, 'https://www.who.int/news/item/a');
});
test('health research searches target requested biomedical terms without injected API operators', () => {
  assert.equal(buildResearchQuery('lung cancer'), 'TITLE_ABS:"lung" AND TITLE_ABS:"cancer"');
  assert.equal(buildResearchQuery('" OR SRC:MED'), 'TITLE_ABS:"OR" AND TITLE_ABS:"SRC" AND TITLE_ABS:"MED"');
});
test('automatic research updates cover a bounded recent publication window', () => {
  assert.equal(buildResearchQuery('', new Date('2026-11-24T00:00:00Z')), '(TITLE_ABS:health OR TITLE_ABS:disease OR TITLE_ABS:medicine) FIRST_PDATE:[2026-10-25 TO 2026-11-24] sort_date:y');
});
test('research records retain abstract, identifiers, authors and source attribution', () => {
  const entry = normalizeResearch({ id: '123', source: 'MED', title: 'Malaria study', abstractText: '<p>Liver stage.</p><script>bad()</script>', authorString: 'A Researcher', doi: '10.1234/test', firstPublicationDate: '2026-11-20' }, '2026-11-24T00:00:00Z');
  assert.equal(entry?.kind, 'research');
  assert.equal(entry?.summary, 'Liver stage.');
  assert.equal(entry?.doi, '10.1234/test');
  assert.equal(entry?.source_url, 'https://europepmc.org/article/MED/123');
  assert.equal(entry?.authors, 'A Researcher');
});
test('news matching requires all query terms and never fabricates publication dates', () => {
  const entry = normalizeResearch({ id: '123', source: 'MED', title: 'Lung cancer', abstractText: 'Treatment response' }, '2026-11-24T00:00:00Z');
  assert.ok(entry);
  assert.equal(newsMatches(entry, 'lung treatment'), true);
  assert.equal(newsMatches(entry, 'malaria'), false);
  assert.equal(safeDate('unknown'), null);
  assert.equal(safeDate('2026-11-20'), '2026-11-20T00:00:00.000Z');
});