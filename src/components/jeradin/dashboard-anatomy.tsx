import { useEffect, useState } from "react";
import anatomyImage from "@/assets/anatomy-research.jpg";
import { anatomyStep, ORGAN_SECONDS } from "./anatomy-timing";
import type { AnatomyStage } from "./dashboard-tour-data";

export function DashboardAnatomy({ stages }: { stages: AnatomyStage[] }) {
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (reduced || stages.length === 0) return;
    let seconds = 0;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      seconds += ORGAN_SECONDS;
      setStep(anatomyStep(seconds, stages.length));
    }, ORGAN_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [reduced, stages.length]);
  const currentStep = stages.length ? step % stages.length : 0;
  const stage = stages[currentStep];
  if (!stage) return <figure className="jd-auto-anatomy"><div className="jd-anatomy-head"><strong>Virtual Human</strong><small>No mapped organ mentions</small></div><div className="jd-atlas"><img src={anatomyImage} alt="Jeradin human anatomy atlas" /></div><figcaption>No supported organ mentions were identified in this article. No condition or organ effects are inferred.</figcaption></figure>;
  return <figure className="jd-auto-anatomy" aria-label="Automatic educational anatomy walkthrough" data-organ={stage.organ}>
    <div className="jd-anatomy-head"><strong>Virtual Human</strong><small>Educational illustration · Not clinical imaging</small></div>
    <div className="jd-atlas">
      <img src={anatomyImage} alt="Jeradin human anatomy atlas with natural organ colours" />
      <svg key={`route-${step}`} className="jd-anatomy-overlay" viewBox="0 0 100 100" aria-hidden="true">
        <polyline className="jd-body-route" points={stage.route.map(p => p.join(",")).join(" ")} />
        <polyline className="jd-route-travel" points={stage.route.map(p => p.join(",")).join(" ")} />
        {stage.points.map(([x, y], i) => <g key={i}><circle className="jd-organ-halo" cx={x} cy={y} r="2.3" /><circle className="jd-organ-dot" cx={x} cy={y} r=".7" /></g>)}
      </svg>
      <div key={`label-${step}`} className="jd-auto-label"><span />{stage.organ}</div>
    </div>
    <figcaption key={`caption-${step}`} className="jd-tour-caption">
      <div className="jd-tour-label"><small>{stage.label}</small><h4>{stage.organ}</h4></div>
      <div className="jd-tour-explanation"><strong>{stage.function}</strong><p>{stage.explanation}</p></div>
      <div className="jd-tour-progress" aria-label={`Stage ${currentStep + 1} of ${stages.length}`}>{stages.map((s, i) => <span key={s.organ} className={i === currentStep ? "is-active" : ""} />)}</div>
    </figcaption>
    {reduced && <div className="jd-reduced-transcript">{stages.filter(s => s.organ !== stage.organ).map(s => <p key={s.organ}><strong>{s.organ}: </strong>{s.explanation}</p>)}</div>}
  </figure>;
}