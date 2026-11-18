import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, CanvasTexture, Color, MathUtils, Mesh, MeshBasicMaterial, NormalBlending, OrthographicCamera, Points, PointsMaterial, SRGBColorSpace, TextureLoader, Vector3 } from "three";
import humanAsset from "@/assets/network-human.png.asset.json";

// Timing constants (seconds)
const FORM_SECONDS = 3.2, IMAGE_FADE = 1.4, PARTICLES = 2600, STREAM = 140;
const ASPECT = 736 / 920;

function inkColor() {
  const root = document.querySelector(".jeradin-landing") ?? document.documentElement;
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return new Color();
  ctx.fillStyle = getComputedStyle(root).getPropertyValue("--foreground").trim(); ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return new Color().setRGB(r / 255, g / 255, b / 255, "srgb");
}

function HumanScene({ reduced, onReady }: { reduced: boolean; onReady: () => void }) {
  const texture = useLoader(TextureLoader, humanAsset.url);
  const { size, camera } = useThree();
  const ink = useMemo(inkColor, []);
  const mobile = size.width < 760;
  const viewW = size.width / size.height * 12;
  const height = Math.min(10.2, viewW / ASPECT * .98);
  const width = height * ASPECT;
  const center = useMemo(() => new Vector3(0, .75, 0), [mobile, viewW]);
  const image = useRef<Mesh>(null), cloud = useRef<Points>(null), stream = useRef<Points>(null), time = useRef(0);
  const messages = useRef<Array<Mesh | null>>([]);

  // Sample dark pixels of the artwork as particle targets.
  const { targets, starts } = useMemo(() => {
    texture.colorSpace = SRGBColorSpace;
    const img = texture.image as HTMLImageElement;
    const c = document.createElement("canvas"); c.width = 184; c.height = 230;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const pts: number[] = [];
    if (ctx) {
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        if (data[i + 3] > 120 && data[i] < 120) pts.push(x / c.width, y / c.height);
      }
    }
    const targets = new Float32Array(PARTICLES * 3), starts = new Float32Array(PARTICLES * 3);
    const count = pts.length / 2 || 1;
    for (let i = 0; i < PARTICLES; i++) {
      const k = Math.floor(Math.random() * count) * 2;
      targets[i * 3] = ((pts[k] ?? .5) - .5) * width; targets[i * 3 + 1] = (.5 - (pts[k + 1] ?? .5)) * height; targets[i * 3 + 2] = 0;
      const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 10;
      starts[i * 3] = Math.cos(a) * r; starts[i * 3 + 1] = Math.sin(a) * r * .7; starts[i * 3 + 2] = (Math.random() - .5) * 8;
    }
    return { targets, starts };
  }, [texture, width, height]);

  const cloudGeo = useMemo(() => { const g = new BufferGeometry(); g.setAttribute("position", new BufferAttribute(starts.slice(), 3)); return g; }, [starts]);
  const streamSeeds = useMemo(() => Array.from({ length: STREAM }, () => ({ off: Math.random(), speed: .05 + Math.random() * .08, angle: -.9 + Math.random() * 1.5, spread: Math.random() })), []);
  const streamGeo = useMemo(() => { const g = new BufferGeometry(); g.setAttribute("position", new BufferAttribute(new Float32Array(STREAM * 3), 3)); return g; }, []);
  useEffect(() => () => { cloudGeo.dispose(); streamGeo.dispose(); }, [cloudGeo, streamGeo]);

  const textures = useMemo(() => ["Better data. Better information.", "A world of reliable health evidence.", "Information for important decisions."].map(text => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 160;
    const ctx = c.getContext("2d");
    if (ctx) { ctx.font = "500 44px Manrope, Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = ink.getStyle(); ctx.fillText(text, 512, 80, 980); }
    const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
  }), [ink]);
  useEffect(() => () => textures.forEach(t => t.dispose()), [textures]);

  useEffect(() => { if (camera instanceof OrthographicCamera) { camera.zoom = size.height / 12; camera.updateProjectionMatrix(); } }, [camera, size]);
  useEffect(() => { const f = requestAnimationFrame(onReady); return () => cancelAnimationFrame(f); }, [onReady]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const host = window as unknown as { __jeradinHero?: { setTime: (s: number) => void } };
    host.__jeradinHero = { setTime: s => { time.current = Math.max(0, s); } };
    return () => { delete host.__jeradinHero; };
  }, []);

  // Hand position in image space (from the artwork) — source of the outgoing data stream.
  const hand = useMemo(() => new Vector3((.76 - .5) * width, (.5 - .45) * height, .2), [width, height]);

  useFrame((_, delta) => {
    if (!reduced) time.current += Math.min(delta, .05);
    const t = reduced ? 60 : time.current;
    const form = MathUtils.smootherstep(t, 0, FORM_SECONDS);
    const reveal = MathUtils.smoothstep(t, FORM_SECONDS * .7, FORM_SECONDS * .7 + IMAGE_FADE);

    const hero = document.querySelector(".landing-hero");
    if (hero) {
      const phase = t % 10 / 10;
      const o = reduced ? 1 : phase < .75 ? 1 : phase < .88 ? 1 - MathUtils.smoothstep(phase, .75, .88) : MathUtils.smoothstep(phase, .9, 1);
      hero.querySelectorAll<HTMLElement>("h1, .landing-hero-description").forEach(el => { el.style.opacity = String(o); });
    }
    if (image.current) {
      const m = image.current.material as MeshBasicMaterial; m.opacity = reveal;
      image.current.position.set(0, Math.sin(t * .6) * .08, 0);
      image.current.scale.setScalar(.96 + reveal * .04 + Math.sin(t * .5) * .006);
    }
    if (cloud.current) {
      const pos = cloudGeo.attributes.position as BufferAttribute; const arr = pos.array as Float32Array;
      for (let i = 0; i < PARTICLES; i++) {
        const j = i * 3, wobble = (1 - form) * .4 + .03;
        arr[j] = MathUtils.lerp(starts[j], targets[j], form) + Math.sin(t * 1.3 + i) * wobble;
        arr[j + 1] = MathUtils.lerp(starts[j + 1], targets[j + 1], form) + Math.cos(t * 1.1 + i * .7) * wobble + Math.sin(t * .6) * .08;
        arr[j + 2] = MathUtils.lerp(starts[j + 2], 0, form);
      }
      pos.needsUpdate = true;
      (cloud.current.material as PointsMaterial).opacity = .9 - reveal * .65;
    }
    if (stream.current) {
      const arr = (streamGeo.attributes.position as BufferAttribute).array as Float32Array;
      streamSeeds.forEach((s, i) => {
        const p = (s.off + t * s.speed) % 1, d = p * (mobile ? 5 : 8);
        arr[i * 3] = hand.x + Math.cos(s.angle) * d; arr[i * 3 + 1] = hand.y + Math.sin(s.angle) * d + Math.sin(t + i) * .15 * p; arr[i * 3 + 2] = s.spread;
      });
      (streamGeo.attributes.position as BufferAttribute).needsUpdate = true;
      (stream.current.material as PointsMaterial).opacity = reveal * .8;
    }
    messages.current.forEach((mesh, i) => {
      if (!mesh) return;
      const cycle = t / 4.8, phase = cycle % 1, active = Math.floor(cycle) % 3 === i;
      (mesh.material as MeshBasicMaterial).opacity = reduced ? 0 : active ? Math.min(1, phase / .18, (1 - phase) / .22) * reveal : 0;
      mesh.position.y = -5.45 + (active ? (1 - Math.min(1, phase / .18)) * -.12 : 0);
    });
  });

  const msgW = Math.min(viewW * .9, 13);
  return <>
    <group position={center}>
      <mesh ref={image}><planeGeometry args={[width, height]} /><meshBasicMaterial map={texture} transparent opacity={0} depthWrite={false} blending={NormalBlending} /></mesh>
      <points ref={cloud} geometry={cloudGeo}><pointsMaterial color={ink} size={mobile ? .05 : .045} transparent opacity={.9} depthWrite={false} /></points>
      <points ref={stream} geometry={streamGeo} position={[0, 0, 0]}><pointsMaterial color={ink} size={.09} transparent opacity={0} depthWrite={false}  /></points>
    </group>
    {textures.map((tex, i) => <mesh key={i} ref={m => { messages.current[i] = m; }} position={[0, -5.45, 2]}>
      <planeGeometry args={[msgW, msgW * 160 / 1024]} /><meshBasicMaterial map={tex} transparent opacity={0} depthWrite={false} />
    </mesh>)}
  </>;
}

export default function LandingTypography() {
  const scene = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false), [reduced, setReduced] = useState(false), [visible, setVisible] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches); update(); query.addEventListener("change", update);
    const hero = scene.current?.closest(".landing-hero");
    const content = hero?.querySelector(".landing-hero-content");
    const fit = () => {
      if (!(hero instanceof HTMLElement) || !content) return;
      hero.style.setProperty("--hero-art-top", `${content.getBoundingClientRect().bottom - hero.getBoundingClientRect().top + 10}px`);
    };
    const resize = new ResizeObserver(fit); if (content) resize.observe(content); fit();
    const observer = new IntersectionObserver(([e]) => setVisible(e.isIntersecting)); if (hero) observer.observe(hero);
    return () => { resize.disconnect(); observer.disconnect(); query.removeEventListener("change", update); };
  }, []);
  const onReady = useMemo(() => () => setReady(true), []);
  return <div ref={scene} className="landing-type-scene" aria-hidden="true" data-scene-ready={ready ? "true" : undefined}>
    <Canvas orthographic camera={{ position: [0, 0, 30], zoom: 50 }} dpr={[1, 1.5]} frameloop={reduced || !visible ? "demand" : "always"} gl={{ alpha: true, antialias: true }}>
      <HumanScene reduced={reduced} onReady={onReady} />
    </Canvas>
  </div>;
}
