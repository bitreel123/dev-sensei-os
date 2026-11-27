import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { extractIntelligence, evidenceAnatomy, intelligenceRecord, serializeRecords } from '@/lib/evidence-intelligence';
import type { ArticleContent } from '@/lib/health-article';
import type { EvidenceEntry } from '@/lib/health-evidence';

const content: ArticleContent = { blocks: [{ type: 'h', text: 'Results' }, { type: 'p', text: 'The cohort examined liver tissue. No brain samples were collected.', links: [] }, { type: 'table', text: 'Participants', rows: [[{ text: '42', colspan: 1, rowspan: 1, header: false }]] }], complete: true, license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', credit: 'Authors', parserVersion: 2, mediaNotice: null };
const entry: EvidenceEntry = { id: 'research-MED-123', title: 'Liver study', kind: 'research', summary: '', source: 'Europe PMC', source_url: 'https://europepmc.org/article/MED/123', published_at: null, authors: 'Authors', doi: '10.1234/a', fetched_at: '2026-11-27T00:00:00Z' };

test('structured organ mentions retain exact passages and block provenance, including negated mentions', () => {
  const mentions = extractIntelligence(content);
  assert.deepEqual(mentions.find(m => m.name === 'Liver'), { category: 'Organ mentions', name: 'Liver', quote: 'The cohort examined liver tissue.', block_index: 1 });
  assert.equal(mentions.find(m => m.name === 'Brain')?.quote, 'No brain samples were collected.');
  assert.equal(mentions.some(m => m.name === 'Lungs'), false);
});
test('anatomy uses only article organ mentions, not a default malaria or cancer tour', () => {
  const stages = evidenceAnatomy(extractIntelligence(content));
  assert.deepEqual(stages.map(s => s.organ), ['Brain', 'Liver']);
  assert.deepEqual(stages.find(s => s.organ === 'Liver')?.points, [[45, 48]]);
  assert.deepEqual(evidenceAnatomy([]), []);
});
test('exports preserve actual full text, tables and licensing without claiming training readiness', () => {
  const record = intelligenceRecord(entry, content);
  const exported = JSON.parse(serializeRecords([record], 'jsonl').trim());
  assert.equal(exported.doi, '10.1234/a');
  assert.deepEqual(exported.blocks, content.blocks);
  assert.equal(exported.license, 'CC BY 4.0');
  assert.equal(exported.training_rights, 'not_assessed');
  assert.equal(exported.validation_status, 'automated_mentions_not_expert_reviewed');
});
test('CSV exports escape quotations and neutralise formula injection', () => {
  const record = intelligenceRecord({ ...entry, title: '=SUM(1,2) "unsafe"' }, content);
  const csv = serializeRecords([record], 'csv');
  assert.ok(csv.includes('"\'=SUM(1,2) ""unsafe"""'));
  assert.ok(csv.includes('"10.1234/a"'));
});