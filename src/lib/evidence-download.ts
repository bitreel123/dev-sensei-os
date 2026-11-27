import { serializeRecords, type IntelligenceRecord } from './evidence-intelligence';

export async function downloadEvidence(records: IntelligenceRecord[], format: 'jsonl' | 'csv') {
  const filename = `jeradin-evidence-${new Date().toISOString().slice(0, 10)}.${format}`;
  const blob = new Blob([serializeRecords(records, format)], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/x-ndjson;charset=utf-8' });
  const file = new File([blob], filename, { type: blob.type });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; }
    catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}