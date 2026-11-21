import { useId, useState } from "react";
import { BookOpen, ChevronUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnatomyStage } from "./dashboard-tour-data";

export function FullReportReading({ stages }: { stages: AnatomyStage[] }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return <div className="jd-full-reading">
    <Button variant="outline" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>
      {expanded ? <ChevronUp /> : <BookOpen />}{expanded ? "Close full report" : "Read full report"}
    </Button>
    {expanded && <section id={id} aria-label="Full report" className="mt-5 space-y-5 border-t border-border pt-5">
      <h4>Full anatomy explanation</h4>
      {stages.map(stage => <section key={stage.organ} className="space-y-2"><h4>{stage.organ}</h4><p><strong>{stage.function}</strong></p><p>{stage.explanation}</p></section>)}
      <section><h4>Evidence and limitations</h4><p>This educational report explains biological mechanisms. No retrieved publications, verified study results or individual clinical assessments are attached. It is not medical advice.</p></section>
      <footer className="space-y-3 border-t border-border pt-4"><p>You have reached the end of the report. Dossier downloads are not connected yet.</p><Button disabled><Download />Download complete dossier</Button></footer>
    </section>}
  </div>;
}