import { useState } from 'react';
import virus from '@/assets/dataset-virus.png.asset.json';
import cancer from '@/assets/dataset-cancer.png.asset.json';
import brain from '@/assets/dataset-brain.png.asset.json';
import general from '@/assets/dataset-banner.png.asset.json';
import type { EvidenceEntry } from '@/lib/health-evidence';

export function evidenceTopic(entry: EvidenceEntry) {
  const text = `${entry.title} ${entry.summary}`;
  if (/cancer|tumou?r|oncolog/i.test(text)) return 'Oncology';
  if (/brain|neuro|alzheimer|dementia/i.test(text)) return 'Neuroscience';
  if (/gene|genom|dna|rna/i.test(text)) return 'Genomics';
  if (/virus|infect|malaria|dengue|tuberculo|bacter|parasite|outbreak/i.test(text)) return 'Infectious disease';
  return 'Public health';
}
export function EvidenceVisual({ entry, image = entry.featured_image, className = '' }: { entry: EvidenceEntry; image?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const topic = evidenceTopic(entry);
  const fallback = topic === 'Oncology' ? cancer : topic === 'Neuroscience' ? brain : topic === 'Infectious disease' ? virus : general;
  const original = image && !failed;
  return <div className={`je-visual ${className} ${original ? 'is-publisher-image' : ''}`}><img src={original ? image : fallback.url} alt={original ? `Figure from ${entry.title}` : `${topic} topic illustration`} onError={() => setFailed(true)} loading="lazy" /><span>{original ? 'Article figure' : 'Topic illustration'}</span></div>;
}