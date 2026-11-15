import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Color, Group, MathUtils } from "three";

function DNA({ reduced, pointer, onReady }: { reduced: boolean; pointer: React.RefObject<{ x: number; y: number }>; onReady: () => void }) {
  const group = useRef<Group>(null);
  const geometry = useMemo(() => {
    const dots: number[] = [];
    const bonds: number[] = [];
    for (let i = 0; i < 220; i++) {
      const t = i / 219;
      const angle = t * Math.PI * 8;
      const x = (t - .5) * 17;
      const y = Math.cos(angle) * 1.2;
      const z = Math.sin(angle) * 1.2;
      dots.push(x, y, z, x, -y, -z);
      if (i % 9 === 0) bonds.push(x, y, z, x, -y, -z);
    }
    const root = document.querySelector(".jeradin-landing");
    const tokens = getComputedStyle(root ?? document.documentElement);
    // Canvas resolves modern CSS colors to sRGB; Three.js does not parse OKLCH.
    const swatch = document.createElement("canvas");
    swatch.width = 1; swatch.height = 1;
    const context = swatch.getContext("2d", { willReadFrequently: true });
    const resolveToken = (name: string) => {
      if (!context) return new Color();
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = tokens.getPropertyValue(name).trim();
      context.fillRect(0, 0, 1, 1);
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
      return new Color().setRGB(r / 255, g / 255, b / 255, "srgb");
    };
    return { dots: new Float32Array(dots), bonds: new Float32Array(bonds), ink: resolveToken("--foreground"), sage: resolveToken("--landing-sage") };
  }, []);
  const frames = useRef(0);
  useFrame((state, delta) => {
    if (frames.current === 0) onReady();
    frames.current++;
    if (!group.current || reduced) return;
    const blend = 1 - Math.exp(-Math.min(delta, .05) * 4);
    group.current.rotation.x = state.clock.elapsedTime * .48 + pointer.current.y * .4;
    group.current.rotation.y = MathUtils.lerp(group.current.rotation.y, pointer.current.x * .3, blend);
    group.current.position.x = MathUtils.lerp(group.current.position.x, pointer.current.x * .5, blend);
    group.current.position.y = Math.sin(state.clock.elapsedTime * .65) * .12;
  });
  return <group ref={group} rotation={[.25, 0, -.08]}>
    <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[geometry.dots, 3]} /></bufferGeometry><pointsMaterial color={geometry.ink} size={.095} sizeAttenuation transparent opacity={.8} /></points>
    <lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[geometry.bonds, 3]} /></bufferGeometry><lineBasicMaterial color={geometry.sage} transparent opacity={.4} /></lineSegments>
  </group>;
}

export default function LandingTypography() {
  const scene = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update(); query.addEventListener("change", update);
    const hero = scene.current?.closest(".landing-hero");
    const move = (event: Event) => {
      if (!(event instanceof PointerEvent) || !hero) return;
      const bounds = hero.getBoundingClientRect();
      pointer.current = { x: (event.clientX - bounds.left) / bounds.width * 2 - 1, y: (event.clientY - bounds.top) / bounds.height * 2 - 1 };
    };
    const reset = () => { pointer.current = { x: 0, y: 0 }; };
    hero?.addEventListener("pointermove", move);
    hero?.addEventListener("pointerdown", move);
    hero?.addEventListener("pointerleave", reset);
    return () => { query.removeEventListener("change", update); hero?.removeEventListener("pointermove", move); hero?.removeEventListener("pointerdown", move); hero?.removeEventListener("pointerleave", reset); };
  }, []);
  const onReady = useMemo(() => () => setReady(true), []);
  return <div ref={scene} className="landing-type-scene" aria-hidden="true" data-scene-ready={ready ? "true" : undefined}>
    <Canvas camera={{ position: [0, 0, 18], fov: 32 }} dpr={[1, 1.5]} frameloop={reduced ? "demand" : "always"} gl={{ alpha: true, antialias: true }}>
      <DNA reduced={reduced} pointer={pointer} onReady={onReady} />
    </Canvas>
  </div>;
}
