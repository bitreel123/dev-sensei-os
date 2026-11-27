import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { canSignArticleMedia } from '@/lib/article-media-access';

const path = 'articles/research-MED-123/2.png';
const record = {
  id: 'research-MED-123', source: 'Europe PMC', content_access: 'complete', featured_image: path,
  article_content: { blocks: [{ type: 'figure', text: 'Figure 1', image: path, file: null }], license: 'CC BY', licenseUrl: null, credit: 'Europe PMC', complete: true },
};
test('only figures referenced by a complete public article can be signed', () => {
  assert.equal(canSignArticleMedia(path, record), true);
  assert.equal(canSignArticleMedia('articles/research-MED-123/3.png', record), false);
  assert.equal(canSignArticleMedia(path, null), false);
});
test('another article and traversal paths cannot access cached files', () => {
  assert.equal(canSignArticleMedia('articles/research-MED-456/2.png', record), false);
  assert.equal(canSignArticleMedia('articles/research-MED-123/../private.png', record), false);
  assert.equal(canSignArticleMedia('articles/research-MED-123/%2e%2e/private.png', record), false);
});
test('incomplete or unsupported catalogue records cannot authorize images', () => {
  assert.equal(canSignArticleMedia(path, { ...record, content_access: 'summary' }), false);
  assert.equal(canSignArticleMedia(path, { ...record, source: 'BBC' }), false);
  assert.equal(canSignArticleMedia(path, { ...record, article_content: { ...record.article_content, complete: false } }), false);
});