import type { ArticleContent } from './health-article';
import type { EvidenceEntry } from './health-evidence';
import type { AnatomyStage } from '@/components/jeradin/dashboard-tour-data';

// Mentions are not diagnoses, causal findings, evidence ratings or expert validation.
const organs: { name: string; pattern: RegExp; point: [number, number]; function: string }[] = [
  { name: 'Lungs', pattern: /\b(lungs?|pulmonary|alveol\w*)\b/i, point: [43, 36], function: 'Lungs exchange oxygen and carbon dioxide.' },
  { name: 'Airways', pattern: /\b(airways?|bronchi\w*|trachea\w*)\b/i, point: [50, 27], function: 'Airways carry air into and out of the lungs.' },
  { name: 'Heart', pattern: /\b(hearts?|cardiac|myocardi\w*)\b/i, point: [52, 39], function: 'The heart pumps blood around the body.' },
  { name: 'Brain', pattern: /\b(brain|cerebral|cerebell\w*)\b/i, point: [50, 13], function: 'The brain coordinates nervous-system activity.' },
  { name: 'Liver', pattern: /\b(liver|hepatic|hepatocytes?)\b/i, point: [45, 48], function: 'The liver supports metabolism and processes nutrients.' },
  { name: 'Kidneys', pattern: /\b(kidneys?|renal)\b/i, point: [58, 54], function: 'Kidneys filter blood and regulate fluid balance.' },
  { name: 'Spleen', pattern: /\b(spleen|splenic)\b/i, point: [59, 48], function: 'The spleen filters blood and supports immune defence.' },
  { name: 'Skin', pattern: /\b(skin|cutaneous|dermal)\b/i, point: [71, 44], function: 'Skin forms a protective barrier.' },
  { name: 'Blood', pattern: /\b(blood|erythrocytes?|red blood cells?)\b/i, point: [50, 41], function: 'Blood transports oxygen, nutrients and immune cells.' },
];
const patterns: { category: string; name: string; pattern: RegExp }[] = [
  { category: 'Study design mentions', name: 'Randomized trial', pattern: /\brandomi[sz]ed\b/i },
  { category: 'Study design mentions', name: 'Systematic review', pattern: /\bsystematic review\b/i },
  { category: 'Study design mentions', name: 'Meta-analysis', pattern: /\bmeta.analysis\b/i },
  { category: 'Study design mentions', name: 'Cohort', pattern: /\bcohort\b/i },
  { category: 'Study design mentions', name: 'Case report', pattern: /\bcase report\b/i },
  { category: 'Pathogen mentions', name: 'SARS-CoV-2', pattern: /\b(SARS.CoV.2|COVID.19)\b/i },
  { category: 'Pathogen mentions', name: 'Influenza', pattern: /\b(influenza|H5N1|H1N1)\b/i },
  { category: 'Pathogen mentions', name: 'Plasmodium', pattern: /\bplasmodium\b/i },
  { category: 'Pathogen mentions', name: 'Mycobacterium tuberculosis', pattern: /\bmycobacterium tuberculosis\b/i },
  { category: 'Transmission mentions', name: 'Airborne', pattern: /\b(airborne|aerosol transmission)\b/i },
  { category: 'Transmission mentions', name: 'Vector-borne', pattern: /\b(vector.borne|mosquito.borne)\b/i },
  { category: 'Transmission mentions', name: 'Droplet', pattern: /\bdroplet transmission\b/i },
  { category: 'Transmission mentions', name: 'Contact', pattern: /\bcontact transmission\b/i },
  { category: 'Outcome & mechanism mentions', name: 'Mortality', pattern: /\b(mortality|case.fatality)\b/i },
  { category: 'Outcome & mechanism mentions', name: 'Treatment efficacy', pattern: /\b(efficacy|effectiveness)\b/i },
  { category: 'Outcome & mechanism mentions', name: 'ACE2', pattern: /\bACE2\b/i },
  { category: 'Outcome & mechanism mentions', name: 'Sialic acid', pattern: /\bsialic acid\b/i },
  { category: 'Outcome & mechanism mentions', name: 'Incubation period', pattern: /\bincubation period\b/i },
];
export type EvidenceMention = { category: string; name: string; quote: string; block_index: number };
export function extractIntelligence(content: ArticleContent): EvidenceMention[] {
  const passages = content.blocks.flatMap((b, block_index) => b.type === 'p' ? b.text.split(/(?<=[.!?])\s+/).map(quote => ({ quote, block_index })) : []);
  return [...organs.map(o => ({ ...o, category: 'Organ mentions' })), ...patterns].flatMap(rule => {
    const passage = passages.find(p => rule.pattern.test(p.quote));
    return passage ? [{ category: rule.category, name: rule.name, ...passage }] : [];
  });
}
export function evidenceAnatomy(mentions: EvidenceMention[]): AnatomyStage[] {
  return mentions.filter(m => m.category === 'Organ mentions').flatMap(m => {
    const organ = organs.find(o => o.name === m.name);
    return organ ? [{ organ: organ.name, label: 'Mentioned in this article', function: organ.function, explanation: `Article passage: “${m.quote}” This mention does not establish organ damage or causation.`, points: [organ.point], route: [organ.point] }] : [];
  });
}
export function intelligenceRecord(entry: EvidenceEntry, content: ArticleContent) {
  return {
    schema_version: '1.0', id: entry.id, title: entry.title, kind: entry.kind,
    source: entry.source, source_url: entry.source_url, doi: entry.doi, pmcid: entry.pmcid ?? null,
    authors: entry.authors, published_at: entry.published_at, retrieved_at: entry.fetched_at,
    license: content.license, license_url: content.licenseUrl, credit: content.credit,
    validation_status: 'automated_mentions_not_expert_reviewed', extraction_method: 'deterministic_dictionary_v1',
    training_rights: 'not_assessed', mentions: extractIntelligence(content),
    blocks: content.blocks.map(b => b.type === 'figure' ? { type: b.type, caption: b.text, publisher_file: b.file, image_rights: 'check_separately' } : b),
  };
}
export type IntelligenceRecord = ReturnType<typeof intelligenceRecord>;
export function serializeRecords(records: IntelligenceRecord[], format: 'jsonl' | 'csv'): string {
  if (format === 'jsonl') return records.map(r => JSON.stringify(r)).join('\n') + '\n';
  const columns = ['id', 'title', 'kind', 'source', 'source_url', 'doi', 'published_at', 'license', 'license_url', 'validation_status', 'training_rights', 'mentions', 'blocks'] as const;
  const cell = (value: unknown) => {
    let text = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
    if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [columns.join(','), ...records.map(record => columns.map(key => cell(record[key])).join(','))].join('\r\n') + '\r\n';
}