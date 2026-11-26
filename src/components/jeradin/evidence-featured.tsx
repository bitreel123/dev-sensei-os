import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Pause, Play, ArrowUpRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { EvidenceVisual, evidenceTopic } from './evidence-visual';
import type { EvidenceEntry } from '@/lib/health-evidence';

export function EvidenceFeatured({ entries }: { entries: EvidenceEntry[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [visible, setVisible] = useState(true);
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const feature = entries[index % Math.max(1, entries.length)];
  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    observer.observe(root.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (paused || interacting || reduced || !visible || entries.length < 2) return;
    const timer = window.setInterval(() => { if (!document.hidden) setIndex(i => (i + 1) % entries.length); }, 9000);
    return () => window.clearInterval(timer);
  }, [paused, interacting, reduced, visible, entries.length]);
  if (!feature) return null;
  return <section ref={root} className="je-feature" aria-label="Featured health evidence" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false); }}>
    <Link to="/evidence/$id" params={{ id: feature.id }} className="je-feature-story" key={feature.id}>
      <EvidenceVisual entry={feature} className="je-feature-image" />
      <div className="je-feature-copy"><small>In focus / {evidenceTopic(feature)}</small><div className="je-feature-label">{feature.kind === 'news' ? 'Health news' : 'Research'} · {feature.source}</div><h2>{feature.title}</h2><p>{feature.summary}</p><span className="je-feature-read">Explore this report <ArrowUpRight /></span></div>
    </Link>
    <div className="je-feature-controls"><span>{String(index % entries.length + 1).padStart(2, '0')} / {String(entries.length).padStart(2, '0')}</span><div className="je-slide-dots">{entries.map((entry, i) => <Button variant="ghost" size="icon" key={entry.id} aria-label={`Featured post ${i + 1}`} aria-pressed={i === index % entries.length} onClick={() => setIndex(i)}><span /></Button>)}</div><Button variant="ghost" size="icon" title={paused ? 'Play slideshow' : 'Pause slideshow'} aria-label={paused ? 'Play slideshow' : 'Pause slideshow'} onClick={() => setPaused(p => !p)}>{paused ? <Play /> : <Pause />}</Button><Button variant="ghost" size="icon" title="Previous featured post" aria-label="Previous featured post" onClick={() => setIndex(i => (i - 1 + entries.length) % entries.length)}><ChevronLeft /></Button><Button variant="ghost" size="icon" title="Next featured post" aria-label="Next featured post" onClick={() => setIndex(i => (i + 1) % entries.length)}><ChevronRight /></Button></div>
  </section>;
}
