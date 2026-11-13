import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { CanvasTexture, Group, SRGBColorSpace } from "three";

function Words({ reduced, onReady }: { reduced: boolean; onReady: () => void }) {
  const group = useRef<Group>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (context) {
      const color = getComputedStyle(document.querySelector(".jeradin-landing") ?? document.documentElement).getPropertyValue("--foreground").trim();
      context.fillStyle = color;
      context.font = "500 145px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("EVIDENCE → UNDERSTANDING", 1024, 128);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(onReady, [onReady]);
  useFrame((state, delta) => {
    if (!group.current || reduced) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    group.current.rotation.y += (state.pointer.x * 0.2 + Math.sin(t * .7) * .14 - group.current.rotation.y) * dt * 3;
    group.current.rotation.x = Math.sin(t * .6) * .1;
    group.current.position.y = Math.sin(t * .85) * .2;
  });
  return <group ref={group}><mesh><planeGeometry args={[12.5, 1.5625]} /><meshBasicMaterial map={texture} transparent opacity={0.8} depthWrite={false} /></mesh></group>;
}

export default function LandingTypography() {
  const [ready, setReady] = useState(false);
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const onReady = useMemo(() => () => setReady(true), []);
  return <div className="landing-type-scene" aria-hidden="true" data-scene-ready={ready ? "true" : undefined}>
    <Canvas camera={{ position: [0, 0, 9], fov: 36 }} dpr={[1, 1.5]} frameloop={reduced ? "demand" : "always"} gl={{ alpha: true, antialias: true }}>
      <Words reduced={reduced} onReady={onReady} />
    </Canvas>
  </div>;
}