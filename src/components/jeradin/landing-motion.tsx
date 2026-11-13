import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

export function ScrollStatement() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const words = "Health information is everywhere. Understanding is what moves us forward.".split(" ");
  return <div ref={ref} className="landing-manifesto"><p className="landing-kicker">THE REASON WE EXIST</p><h2>{words.map((word, i) => <StatementWord key={i} word={word} progress={scrollYProgress} start={i / words.length} reduced={!!reduced} />)}</h2><p className="manifesto-caption">Jeradin is building the connective layer between biomedical knowledge and the human body. So a question can become a clearer research direction—not another pile of information.</p></div>;
}
function StatementWord({ word, progress, start, reduced }: { word: string; progress: import("motion/react").MotionValue<number>; start: number; reduced: boolean }) {
  const opacity = useTransform(progress, [start, Math.min(1, start + .15)], [.2, 1]);
  return <motion.span style={reduced ? undefined : { opacity }}>{word} </motion.span>;
}

export function EvidenceAnimation({ mode }: { mode: number }) {
  const reduced = useReducedMotion();
  const topics = [["Disease mechanisms", "Study findings", "Research gaps"], ["Investigational therapies", "Study phases", "Treatment pathways"], ["Health events", "Regional context", "Emerging patterns"]][mode];
  return <div className="evidence-illustration" aria-label="Illustration of connected biomedical research">
    <svg viewBox="0 0 600 430" aria-hidden="true"><g className="evidence-orbits"><ellipse cx="300" cy="215" rx="205" ry="130" /><ellipse cx="300" cy="215" rx="130" ry="195" transform="rotate(45 300 215)" /><ellipse cx="300" cy="215" rx="130" ry="195" transform="rotate(-45 300 215)" /></g>{[0, 1, 2].map((i) => <motion.circle key={i} r={5} className="evidence-traveller" animate={reduced ? undefined : { cx: [95, 300, 505, 300, 95], cy: [215, 85, 215, 345, 215] }} transition={{ duration: 8 + i * 3, repeat: Infinity, delay: i * 1.7, ease: "linear" }} />)}<circle cx="300" cy="215" r="58" className="evidence-core" /><path d="M274 215h12l8-20 12 40 8-20h12" className="evidence-heartbeat" /></svg>
    <span className="evidence-caption caption-one">{topics[0]}</span><span className="evidence-caption caption-two">{topics[1]}</span><span className="evidence-caption caption-three">{topics[2]}</span><span className="evidence-illustration-footer">JERADIN / CONNECTED INTELLIGENCE</span>
  </div>;
}