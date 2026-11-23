import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

const Scene = lazy(() => import("./landing-image-scene"));

export function LandingImageArt({ url, alt, portrait = false }: { url: string; alt: string; portrait?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    setMounted(true);
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setActive(entry?.isIntersecting ?? false), { rootMargin: "100px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`landing-image-art ${portrait ? 'portrait-art' : 'dna-art'}`} data-scene-ready={ready ? 'true' : undefined}>
    <img src={url} alt={alt} loading="lazy" />
    {mounted && <div className="landing-image-canvas"><Suspense fallback={null}><Scene url={url} portrait={portrait} active={active} reduced={!!reduced} onReady={onReady} /></Suspense></div>}
  </div>;
}