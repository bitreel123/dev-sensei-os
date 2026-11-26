import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseArticleDocument, parseResearchArticle, reusableLicense, safeArticleUrl } from '@/lib/health-article';

test('complete research retains all paragraphs beyond the old 600-block limit', () => {
  const xml = `<article><front><permissions><license><license-p>CC BY 4.0</license-p></license></permissions></front><body><sec><title>Results</title>${Array.from({ length: 650 }, (_, i) => `<p>Observation ${i}</p>`).join('')}</sec></body><back><ref-list><ref>Study reference</ref></ref-list></back></article>`;
  const article = parseResearchArticle(xml);
  assert.equal(article?.blocks.filter(b => b.type === 'p').length, 651);
  assert.ok(article?.blocks.some(b => b.text === 'Observation 649'));
  assert.ok(article?.blocks.some(b => b.text === 'Study reference'));
});
test('research preserves figure captions, table data and external reference links', () => {
  const xml = '<article><front><permissions><license><license-p>CC BY 4.0</license-p></license></permissions></front><body><fig><label>Figure 1</label><caption><p>Measured response</p></caption><graphic xlink:href="study-f1"/></fig><table-wrap><label>Table 1</label><table><tr><th>Cases</th><td colspan="2">42</td></tr></table></table-wrap><p>Trial <ext-link xlink:href="https://clinicaltrials.gov/study/NCT123">registration</ext-link></p></body></article>';
  const article = parseResearchArticle(xml);
  const figure = article?.blocks.find(b => b.type === 'figure');
  const table = article?.blocks.find(b => b.type === 'table');
  assert.equal(figure?.file, 'study-f1');
  assert.equal(figure?.text, 'Figure 1 Measured response');
  assert.equal(table?.rows[0]?.[1]?.text, '42');
  assert.equal(table?.rows[0]?.[1]?.colspan, 2);
  assert.equal(article?.blocks.find(b => b.type === 'p')?.links[0]?.url, 'https://clinicaltrials.gov/study/NCT123');
});
test('unlicensed free-to-read content is not treated as reusable', () => {
  assert.equal(parseResearchArticle('<article><front><permissions><license>All rights reserved</license></permissions></front><body><p>Restricted text</p></body></article>'), null);
  assert.equal(reusableLicense('Free to read'), false);
  assert.equal(reusableLicense('CC BY-NC 4.0'), false);
  assert.equal(reusableLicense('https://creativecommons.org/licenses/by-nd/4.0/'), false);
  assert.equal(reusableLicense('https://creativecommons.org/licenses/by/4.0/'), true);
  assert.equal(safeArticleUrl('javascript:alert(1)'), null);
});
test('research includes figures and tables stored in JATS sibling floats groups', () => {
  const article = parseResearchArticle('<article><front><permissions><license>CC BY 4.0</license></permissions></front><body><p>Results</p></body><floats-group><fig><caption><p>Complete figure</p></caption><graphic xlink:href="paper-f1"/></fig><table-wrap><table><tr><td>98</td></tr></table></table-wrap></floats-group></article>');
  assert.equal(article?.blocks.find(b => b.type === 'figure')?.file, 'paper-f1');
  assert.equal(article?.blocks.find(b => b.type === 'table')?.rows[0]?.[0]?.text, '98');
});
test('CDC report extraction preserves approved figures but excludes website scripts and third-party images', () => {
  const article = parseArticleDocument('<div class="syndicate"><script>secret()</script><h2>Results</h2><p>42 cases.</p><img src="/mmwr/volumes/75/wr/figures/test.png" alt="Cases by age"/><img src="https://example.com/photo.jpg"/><table><tr><td>42</td></tr></table></div>', { xml: false, base: 'https://www.cdc.gov', credit: 'CDC MMWR', license: 'Government report', licenseUrl: null });
  assert.equal(article?.blocks.find(b => b.type === 'figure')?.file, 'https://www.cdc.gov/mmwr/volumes/75/wr/figures/test.png');
  assert.equal(article?.blocks.filter(b => b.type === 'figure').length, 1);
  assert.ok(article?.blocks.some(b => b.type === 'table' && b.rows[0]?.[0]?.text === '42'));
  assert.equal(article?.blocks.some(b => b.text.includes('secret()')), false);
});