import { useState } from "react";
import anatomyImage from "@/assets/anatomy-research.jpg";
import { Button } from "@/components/ui/button";
import AnatomyWalkthrough from "./anatomy-walkthrough";
export type Part3D = { name: string; x: number; y: number; kind: "Internal" | "External" };
const locations: Record<string, [number, number]> = { Brain:[48,9], Trachea:[48,25], "Right lung":[43,33], "Left lung":[56,33], Heart:[53,39], Ribs:[38,35], Liver:[43,48], Stomach:[54,49], Kidneys:[55,54], "Small intestine":[48,61], "Large intestine":[43,60], Pelvis:[48,78], "Arteries & veins":[56,66] };
export default function VirtualHuman3D({ parts, selected, labels, onSelect, zoom = 1 }: { parts: Part3D[]; selected: string; labels: boolean; onSelect: (name: string) => void; zoom?: number }) {
  const available = parts.filter(part => locations[part.name]);
  const index = Math.max(0, available.findIndex(part => part.name === selected));
  const [automatic, setAutomatic] = useState(true);
  const point = locations[selected] ?? [53,39];
  return <div className={`dashboard-anatomy-art zoom-level-${zoom}`} data-scene-ready="true">
    <img src={anatomyImage} alt="Educational human anatomy illustration with naturally colored internal organs" />
    <AnatomyWalkthrough count={available.length} selected={index} point={point} enabled={automatic} onSelect={i => { const part = available[i]; if(part) onSelect(part.name); }} />
    {labels && available.map((part,i) => <Button key={part.name} size="sm" variant={part.name === selected ? "default" : "outline"} className={`atlas-art-label atlas-label-${i % 2 ? "right" : "left"}`} style={{top:`${locations[part.name][1]}%`}} onClick={() => { setAutomatic(false); onSelect(part.name); }}>{part.name}</Button>)}
    <Button className="atlas-tour-toggle" size="sm" variant="outline" onClick={() => setAutomatic(v => !v)} aria-pressed={automatic}>{automatic ? "Pause tour" : "Play tour"}</Button>
  </div>;
}
