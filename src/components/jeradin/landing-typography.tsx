import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Box3, BufferGeometry, Color, CubicBezierCurve3, Group, InstancedMesh, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, CanvasTexture, SRGBColorSpace, Object3D, OrthographicCamera, Vector3 } from "three";
import skullAsset from "@/assets/models/human-skull.glb.asset.json";

type Interaction = { x: number; y: number; scroll: number; pressed: boolean };
function resolveColors() {
  const root = document.querySelector(".jeradin-landing");
  const tokens = getComputedStyle(root ?? document.documentElement);
  const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const resolve = (name: string) => {
    if (!context) return new Color();
    context.clearRect(0, 0, 1, 1); context.fillStyle = tokens.getPropertyValue(name).trim(); context.fillRect(0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return new Color().setRGB(r / 255, g / 255, b / 255, "srgb");
  };
  return { wire: resolve("--landing-wire"), ink: resolve("--foreground"), sage: resolve("--landing-sage"), paper: resolve("--background"), signal: resolve("--landing-signal") };
}

function SkullModel({ colors, onReady }: { colors: ReturnType<typeof resolveColors>; onReady: () => void }) {
  const { scene } = useGLTF(skullAsset.url);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new Box3().setFromObject(clone);
    const center = bounds.getCenter(new Vector3());
    const height = bounds.getSize(new Vector3()).y;
    clone.position.sub(center); clone.scale.setScalar(2.7 / height);
    clone.position.multiplyScalar(2.7 / height);
    const meshes: Mesh[] = [];
    clone.traverse(object => { if (object instanceof Mesh) meshes.push(object); });
    meshes.forEach(object => {
        object.material = new MeshBasicMaterial({ color: colors.wire, wireframe: true, transparent: true, opacity: .28 });
        const surface = new Mesh(object.geometry, new MeshBasicMaterial({ color: colors.paper, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
        object.add(surface);
    });
    return clone;
  }, [scene, colors]);
  useEffect(() => { const frame = requestAnimationFrame(onReady); return () => cancelAnimationFrame(frame); }, [onReady]);
  useEffect(() => () => model.traverse(object => { if (object instanceof Mesh) { const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(material => material.dispose()); } }), [model]);
  return <primitive object={model} />;
}
function SkullScene({ reduced, input, onReady }: { reduced: boolean; input: RefObject<Interaction>; onReady: () => void }) {
  const sculpture = useRef<Group>(null), packets = useRef<InstancedMesh>(null);
  const time = useRef(0);
  const { size, camera } = useThree();
  const colors = useMemo(resolveColors, []);
  const mobile = size.width < 760;
  const width = size.width / size.height * 12;
  const origin = useMemo(() => new Vector3(0, 1.35, 0), []);
  const paperWidth = Math.min(2.4, width * .16);
  const paperHeight = mobile ? 1.65 : 2.1;
  const routes = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const side = i < 3 ? -1 : 1;
    const row = i % 3;
    const end = new Vector3(side * width * .34, 3.75 - row * 3.5, -.6);
    const start = origin.clone().add(new Vector3(side * .75, .7 - row * .6, -.3));
    const curve = new CubicBezierCurve3(start, start.clone().add(new Vector3(side * width * .15, 1, .5)), end.clone().add(new Vector3(-side * width * .15, .5, .5)), end);
    return { curve, geometry: new BufferGeometry().setFromPoints(curve.getPoints(64)), end };
  }), [origin, width]);
  const messages = useRef<Array<Mesh | null>>([]);
  const textures = useMemo(() => ["Better data. Better information.", "A world of reliable health evidence.", "Information for important decisions."].map(message => {
    const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 160;
    const context = canvas.getContext("2d");
    if (context) {
      context.font = "500 42px Manrope, Arial, sans-serif"; context.textAlign = "center"; context.textBaseline = "middle";
      context.fillStyle = colors.ink.getStyle(); context.fillText(message, 512, 80, 970);
    }
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; return texture;
  }), [colors]);
  useEffect(() => () => textures.forEach(texture => texture.dispose()), [textures]);
  const dummy = useMemo(() => new Object3D(), []);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const host = window as unknown as { __jeradinHero?: { setTime: (seconds: number) => void } };
    host.__jeradinHero = { setTime: seconds => { time.current = Math.max(0, seconds); } };
    return () => { delete host.__jeradinHero; };
  }, []);
  useEffect(() => {
    if (camera instanceof OrthographicCamera) { camera.zoom = size.height / 12; camera.updateProjectionMatrix(); }
  }, [camera, size]);
  useEffect(() => () => routes.forEach(route => route.geometry.dispose()), [routes]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, .05);
    if (!reduced) time.current += dt;
    const t = time.current;
    const hero = document.querySelector(".landing-hero");
    if (hero) {
      const phase = t % 10 / 10;
      const opacity = reduced ? 1 : phase < .75 ? 1 : phase < .88 ? 1 - MathUtils.smoothstep(phase, .75, .88) : MathUtils.smoothstep(phase, .9, 1);
      hero.querySelectorAll<HTMLElement>("h1, .landing-hero-description").forEach(element => { element.style.opacity = String(opacity); });
    }
    if (sculpture.current) {
      const blend = reduced ? 1 : 1 - Math.exp(-dt * 4);
      sculpture.current.rotation.y = MathUtils.lerp(sculpture.current.rotation.y, -.36 + (reduced ? 0 : Math.sin(t * .28) * .2 + input.current.x * .35), blend);
      sculpture.current.rotation.x = MathUtils.lerp(sculpture.current.rotation.x, .07 + (reduced ? 0 : input.current.y * .12), blend);
      sculpture.current.position.y = origin.y + (reduced ? 0 : Math.sin(t * .7) * .12 - input.current.scroll * .4);
      const scale = mobile ? 1.75 : 1.35;
      sculpture.current.scale.setScalar(scale * (!reduced && input.current.pressed ? 1.03 : 1));
    }
    messages.current.forEach((mesh, index) => {
      if (!mesh || !(mesh.material instanceof MeshBasicMaterial)) return;
      const cycle = t / 4.8;
      const phase = cycle % 1;
      const active = Math.floor(cycle) % 3 === index;
      mesh.material.opacity = reduced ? 0 : active ? Math.min(1, phase / .18, (1 - phase) / .22) : 0;
      mesh.position.y = -5.15 + (active ? (1 - Math.min(1, phase / .18)) * -.12 : 0);
    });
    if (packets.current) {
      for (let i = 0; i < 24; i++) {
        const route = routes[i % routes.length];
        const phase = (Math.floor(i / 6) / 4 + t * .14 + i * .023) % 1;
        dummy.position.copy(route.curve.getPoint(phase));
        dummy.rotation.set(0, 0, Math.sin(i + t * .4) * .4);
        dummy.scale.setScalar(.045 + Math.sin(phase * Math.PI) * .035);
        dummy.updateMatrix(); packets.current.setMatrixAt(i, dummy.matrix);
      }
      packets.current.instanceMatrix.needsUpdate = true;
    }
  });
  return <>
    <ambientLight intensity={1.4} />
    <directionalLight position={[-4, 6, 10]} intensity={3} color={colors.paper} />
    <directionalLight position={[5, -2, 6]} intensity={1.2} color={colors.sage} />
    <Environment resolution={64}><Lightformer intensity={2} position={[0, 5, 5]} scale={[15, 4, 1]} color={colors.paper} /><Lightformer intensity={1} position={[-4, 0, 4]} scale={[3, 12, 1]} color={colors.sage} /></Environment>
    <group ref={sculpture} position={origin} rotation={[.07, -.36, -.04]}><Suspense fallback={null}><SkullModel colors={colors} onReady={onReady} /></Suspense></group>
    {routes.map((route, i) => <group key={i}>
      <lineSegments geometry={route.geometry}><lineBasicMaterial color={colors.sage} transparent opacity={.3} /></lineSegments>
      <group position={route.end} rotation={[0, 0, i < 3 ? .025 : -.025]}>
        <mesh position={[0, 0, -.02]}><planeGeometry args={[paperWidth + .035, paperHeight + .035]} /><meshBasicMaterial color={colors.sage} transparent opacity={.35} /></mesh>
        <mesh><planeGeometry args={[paperWidth, paperHeight]} /><meshBasicMaterial color={colors.paper} /></mesh>
        {[0, 1, 2, 3, 4].map(row => <mesh key={row} position={[-paperWidth * .04, paperHeight * .32 - row * paperHeight * .12, .02]}><planeGeometry args={[paperWidth * (row === 0 ? .5 : .72), row === 0 ? .065 : .035]} /><meshBasicMaterial color={row === 0 ? colors.ink : colors.sage} transparent opacity={row === 0 ? .7 : .3} /></mesh>)}
        <mesh position={[-paperWidth * .15, -paperHeight * .32, .02]}><planeGeometry args={[paperWidth * .43, .04]} /><meshBasicMaterial color={colors.signal} transparent opacity={.75} /></mesh>
        <mesh position={[paperWidth * .3, -paperHeight * .32, .02]}><circleGeometry args={[.08, 12]} /><meshBasicMaterial color={colors.sage} /></mesh>
      </group>
    </group>)}
    <instancedMesh ref={packets} args={[undefined, undefined, 24]} frustumCulled={false}><boxGeometry args={[1, 1, .3]} /><meshStandardMaterial color={colors.signal} metalness={.25} roughness={.3} /></instancedMesh>
    {textures.map((texture, i) => <mesh key={i} ref={mesh => { messages.current[i] = mesh; }} position={[0, -5.15, 2]}>
      <planeGeometry args={[Math.min(width * .92, 15), Math.min(width * .92, 15) * 160 / 1024]} />
      <meshBasicMaterial map={texture} transparent opacity={0} depthWrite={false} />
    </mesh>)}
  </>;
}
export default function LandingTypography() {
  const scene = useRef<HTMLDivElement>(null);
  const input = useRef<Interaction>({ x: 0, y: 0, scroll: 0, pressed: false });
  const [ready, setReady] = useState(false), [reduced, setReduced] = useState(false), [visible, setVisible] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches); update(); query.addEventListener("change", update);
    const hero = scene.current?.closest(".landing-hero");
    const content = hero?.querySelector(".landing-hero-content");
    const fit = () => {
      if (!(hero instanceof HTMLElement) || !content) return;
      const top = content.getBoundingClientRect().bottom - hero.getBoundingClientRect().top + 22;
      hero.style.setProperty("--hero-art-top", `${top}px`);
    };
    const resize = new ResizeObserver(fit); if (content) resize.observe(content); fit();
    const move = (event: Event) => {
      if (!(event instanceof PointerEvent) || !hero) return;
      const bounds = hero.getBoundingClientRect();
      input.current.x = (event.clientX - bounds.left) / bounds.width * 2 - 1;
      input.current.y = (event.clientY - bounds.top) / bounds.height * 2 - 1;
    };
    const reset = () => { input.current.x = 0; input.current.y = 0; input.current.pressed = false; };
    const press = (event: Event) => { move(event); input.current.pressed = true; };
    const release = () => { input.current.pressed = false; };
    const scroll = () => { if (hero) input.current.scroll = Math.max(0, -hero.getBoundingClientRect().top / hero.clientHeight); };
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (hero) observer.observe(hero);
    hero?.addEventListener("pointermove", move, { passive: true }); hero?.addEventListener("pointerdown", press, { passive: true });
    hero?.addEventListener("pointerleave", reset); window.addEventListener("pointerup", release); window.addEventListener("scroll", scroll, { passive: true });
    return () => { resize.disconnect(); observer.disconnect(); query.removeEventListener("change", update); hero?.removeEventListener("pointermove", move); hero?.removeEventListener("pointerdown", press); hero?.removeEventListener("pointerleave", reset); window.removeEventListener("pointerup", release); window.removeEventListener("scroll", scroll); };
  }, []);
  const onReady = useMemo(() => () => setReady(true), []);
  return <div ref={scene} className="landing-type-scene" aria-hidden="true" data-scene-ready={ready ? "true" : undefined}>
    <Canvas orthographic camera={{ position: [0, 0, 30], zoom: 50 }} dpr={[1, 1.5]} frameloop={reduced || !visible ? "demand" : "always"} gl={{ alpha: true, antialias: true }}>
      <SkullScene reduced={reduced} input={input} onReady={onReady} />
    </Canvas>
  </div>;
}
