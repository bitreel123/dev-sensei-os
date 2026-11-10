import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";

export type Part3D = { name: string; x: number; y: number; kind: "Internal" | "External" };

// Natural organ colours (educational approximation).
const COLORS: Record<string, string> = {
  Brain: "#e8a7a0", Heart: "#b3202a", "Right lung": "#e58f94", "Left lung": "#e58f94", Liver: "#7a2418",
  Gallbladder: "#4f7a2a", Stomach: "#d98a7a", Spleen: "#6b1f3a", Kidneys: "#8a2c22", "Large intestine": "#c98a6a",
  "Small intestine": "#e3a08a", Bladder: "#e8c27a", Trachea: "#e9d6c4", "Aorta & vena cava": "#c0202a",
};
const SHAPES: Record<string, [number, number, number]> = {
  Brain: [0.17, 0.14, 0.17], Heart: [0.09, 0.11, 0.08], "Right lung": [0.13, 0.22, 0.1], "Left lung": [0.12, 0.21, 0.1],
  Liver: [0.2, 0.09, 0.1], Stomach: [0.1, 0.08, 0.07], Spleen: [0.05, 0.07, 0.04], Kidneys: [0.05, 0.08, 0.04],
  "Large intestine": [0.25, 0.15, 0.06], "Small intestine": [0.16, 0.11, 0.07], Bladder: [0.07, 0.06, 0.06],
  Gallbladder: [0.03, 0.04, 0.03], Trachea: [0.025, 0.1, 0.025], "Aorta & vena cava": [0.03, 0.2, 0.03],
};

const pos = (p: { x: number; y: number }): [number, number, number] => [((p.x - 50) / 50) * 0.9, 1.8 - (p.y / 100) * 3.6, 0];

function Body() {
  const skin = { color: "#d9a882", transparent: true, opacity: 0.28, roughness: 0.6, depthWrite: false } as const;
  const limb = (p: [number, number, number], h: number, r: number, rz = 0) => (
    <mesh position={p} rotation={[0, 0, rz]}><capsuleGeometry args={[r, h, 8, 16]} /><meshStandardMaterial {...skin} /></mesh>
  );
  return <group>
    <mesh position={[0, 1.62, 0]}><sphereGeometry args={[0.22, 32, 32]} /><meshStandardMaterial {...skin} /></mesh>
    {limb([0, 1.3, 0], 0.1, 0.07)}
    <mesh position={[0, 0.65, 0]} scale={[1, 1, 0.55]}><capsuleGeometry args={[0.36, 0.95, 8, 24]} /><meshStandardMaterial {...skin} /></mesh>
    {limb([-0.55, 0.65, 0], 1.0, 0.07, -0.18)}{limb([0.55, 0.65, 0], 1.0, 0.07, 0.18)}
    {limb([-0.18, -0.85, 0], 1.25, 0.1)}{limb([0.18, -0.85, 0], 1.25, 0.1)}
  </group>;
}

export default function VirtualHuman3D({ parts, selected, labels, onSelect }: { parts: Part3D[]; selected: string; labels: boolean; onSelect: (name: string) => void }) {
  return <div className="absolute inset-0" data-scene-ready>
    <Canvas camera={{ position: [0, 0.3, 4.2], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#0b0b0b"]} />
      <ambientLight intensity={0.5} /><directionalLight position={[2, 3, 4]} intensity={1.4} />

      <Body />
      {parts.map(p => {
        const [x, y] = pos(p); const s = SHAPES[p.name]; const active = p.name === selected;
        const z = p.kind === "External" ? 0.3 : 0.05;
        return <group key={p.name} position={[x, y, z]}>
          {s && COLORS[p.name] ? <mesh scale={s} onClick={e => { e.stopPropagation(); onSelect(p.name); }}>
            <sphereGeometry args={[1, 24, 24]} /><meshStandardMaterial color={COLORS[p.name]} roughness={0.45} emissive={active ? COLORS[p.name] : "#000"} emissiveIntensity={active ? 0.6 : 0} />
          </mesh> : <mesh onClick={e => { e.stopPropagation(); onSelect(p.name); }}><sphereGeometry args={[0.025, 12, 12]} /><meshStandardMaterial color={active ? "#ffffff" : "#bbbbbb"} /></mesh>}
          {labels && <Html distanceFactor={2.2} position={[0, 0, 0.12]} center zIndexRange={[10, 0]}>
            <button type="button" onClick={() => onSelect(p.name)} className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] leading-none border ${active ? "bg-foreground text-background" : "bg-background/80 text-foreground"}`}>{p.name}</button>
          </Html>}
        </group>;
      })}
      <OrbitControls enablePan={false} minDistance={2} maxDistance={7} />
    </Canvas>
  </div>;
}
