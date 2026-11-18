import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { BufferGeometry, Vector3, Mesh, Group, Color } from "three";
import { anatomyStep, ORGAN_SECONDS } from "./anatomy-timing";

type Props = { count: number; selected: number; onSelect: (index: number) => void; point: [number, number]; enabled?: boolean };
function Connections({ count, selected, onSelect, point, enabled = true }: Props) {
  const clock = useRef(0), last = useRef(selected), pulse = useRef<Mesh>(null), signal = useRef<Mesh>(null), group = useRef<Group>(null);
  const [reduced, setReduced] = useState(false);
  const color = useMemo(() => {
    const root = document.querySelector(".jeradin-landing") ?? document.querySelector(".health-dashboard") ?? document.documentElement;
    const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
    const context = canvas.getContext("2d");
    if (!context) return new Color();
    context.fillStyle = getComputedStyle(root).getPropertyValue("--foreground").trim(); context.fillRect(0,0,1,1);
    const [r,g,b] = context.getImageData(0,0,1,1).data;
    return new Color().setRGB(r/255,g/255,b/255,"srgb");
  }, []);
  const origin = useMemo(() => new Vector3((point[0] - 50) / 10, (50 - point[1]) / 10, 0), [point[0], point[1]]);
  const geometry = useMemo(() => new BufferGeometry().setFromPoints([origin, new Vector3(0, .8, 0), new Vector3(0, -2.2, 0)]), [origin]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => { const q = matchMedia("(prefers-reduced-motion: reduce)"); setReduced(q.matches); const update = () => setReduced(q.matches); q.addEventListener("change", update); return () => q.removeEventListener("change", update); }, []);
  useEffect(() => { clock.current = selected * ORGAN_SECONDS; last.current = selected; }, [selected]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const host = window as unknown as { __anatomyTour?: { setTime: (s: number) => void } };
    host.__anatomyTour = { setTime: s => { clock.current = s; } };
    return () => { delete host.__anatomyTour; };
  }, []);
  useFrame((_, dt) => {
    if (enabled && !reduced) clock.current += Math.min(dt, .05);
    const next = anatomyStep(clock.current, count);
    if (enabled && !reduced && next !== last.current) { last.current = next; onSelect(next); }
    const phase = clock.current % ORGAN_SECONDS / ORGAN_SECONDS;
    if (pulse.current) { pulse.current.scale.setScalar(1 + Math.sin(phase * Math.PI * 6) * .22); }
    if (signal.current) { signal.current.position.copy(origin).lerp(new Vector3(0, -2.2, 0), reduced ? .5 : (phase * 3) % 1); }
    if (group.current) group.current.visible = enabled;
  });
  return <group ref={group}><lineSegments geometry={geometry}><lineBasicMaterial color={color} transparent opacity={.35} /></lineSegments><mesh ref={pulse} position={origin}><ringGeometry args={[.16,.2,32]} /><meshBasicMaterial color={color} transparent opacity={.65} /></mesh><mesh ref={signal}><circleGeometry args={[.07,12]} /><meshBasicMaterial color={color} /></mesh></group>;
}
export default function AnatomyWalkthrough(props: Props) {
  return <div className="anatomy-connection-scene" aria-hidden="true"><Canvas orthographic camera={{ position: [0,0,10], zoom: 40 }} dpr={[1,1.5]} gl={{alpha:true}}><Connections {...props} /></Canvas></div>;
}
