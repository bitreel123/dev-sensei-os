import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, MathUtils, Object3D, Vector3 } from "three";

type Interaction = { x: number; y: number; scroll: number; pressed: boolean };
const LENGTH = 19;
function strand(t: number, side = 0) {
  const angle = t * Math.PI * 6 + side * Math.PI;
  const envelope = .9 + Math.sin(t * Math.PI) * .55;
  return new Vector3((t - .5) * LENGTH, Math.cos(angle) * envelope + Math.sin(t * Math.PI * 2) * .4, Math.sin(angle) * envelope);
}
function ribbon(side: number) {
  const vertices: number[] = [], indices: number[] = [];
  for (let i = 0; i <= 360; i++) {
    const t = i / 360;
    const p = strand(t, side);
    const angle = t * Math.PI * 6 + side * Math.PI;
    const width = .1 + Math.sin(t * Math.PI) * .12;
    vertices.push(p.x, p.y + Math.cos(angle) * width, p.z + Math.sin(angle) * width,
      p.x, p.y - Math.cos(angle) * width, p.z - Math.sin(angle) * width);
    if (i < 360) { const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
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
  return { ink: resolve("--landing-molecule"), sage: resolve("--landing-sage"), paper: resolve("--background"), signal: resolve("--landing-signal") };
}
function MolecularScene({ reduced, input, onReady }: { reduced: boolean; input: RefObject<Interaction>; onReady: () => void }) {
  const sculpture = useRef<Group>(null), pulses = useRef<InstancedMesh>(null);
  const time = useRef(0), frames = useRef(0);
  const { size, camera } = useThree();
  const colors = useMemo(resolveColors, []);
  const geometry = useMemo(() => ({ a: ribbon(0), b: ribbon(1) }), []);
  const dummy = useMemo(() => new Object3D(), []);
  const bonds = useMemo(() => Array.from({ length: 53 }, (_, i) => {
    const t = (i + .5) / 53, a = strand(t), b = strand(t, 1);
    return { position: a.clone().add(b).multiplyScalar(.5), length: a.distanceTo(b), rotation: Math.atan2(a.z - b.z, a.y - b.y), a, b };
  }), []);
  const dust = useMemo(() => {
    const points = [];
    for (let i = 0; i < 400; i++) {
      const t = i / 399, angle = i * 2.39996;
      points.push((t - .5) * 22, Math.sin(angle) * (2 + (i % 7) * .08), Math.cos(angle) * 2);
    }
    return new Float32Array(points);
  }, []);
  useEffect(() => {
    // Keep the full sculpture visible across narrow viewports without scaling text.
    const aspect = size.width / size.height;
    camera.position.z = Math.max(13, LENGTH / (2 * Math.tan(Math.PI / 12) * aspect) * 1.06);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  useEffect(() => () => { geometry.a.dispose(); geometry.b.dispose(); }, [geometry]);
  useFrame((_, delta) => {
    if (frames.current++ === 1) onReady();
    if (!sculpture.current) return;
    const dt = Math.min(delta, .05);
    if (!reduced) time.current += dt;
    const t = time.current;
    const blend = 1 - Math.exp(-dt * 4);
    sculpture.current.rotation.x = MathUtils.lerp(sculpture.current.rotation.x, reduced ? .3 : t * .22 + input.current.y * .42 + input.current.scroll * .9, blend);
    sculpture.current.rotation.y = MathUtils.lerp(sculpture.current.rotation.y, reduced ? 0 : input.current.x * .22, blend);
    sculpture.current.rotation.z = MathUtils.lerp(sculpture.current.rotation.z, -.07 + (reduced ? 0 : Math.sin(t * .3) * .035), blend);
    const targetScale = !reduced && input.current.pressed ? 1.065 : 1;
    sculpture.current.scale.lerp(new Vector3(targetScale, targetScale, targetScale), blend);
    if (pulses.current) {
      for (let i = 0; i < 26; i++) {
        const phase = (i / 13 + t * .055) % 1;
        dummy.position.copy(strand(phase, i % 2));
        dummy.scale.setScalar(.045 + Math.sin(phase * Math.PI) * .035);
        dummy.updateMatrix(); pulses.current.setMatrixAt(i, dummy.matrix);
      }
      pulses.current.instanceMatrix.needsUpdate = true;
    }
  });
  return <>
    <ambientLight intensity={.7} />
    <directionalLight position={[0, 6, 7]} intensity={3} color={colors.paper} />
    <Environment resolution={64}>
      <Lightformer intensity={3} position={[0, 5, 2]} scale={[20, 3, 1]} color={colors.paper} />
      <Lightformer intensity={2} position={[0, -3, 4]} scale={[18, 1, 1]} color={colors.sage} />
    </Environment>
    <group ref={sculpture} rotation={[.3, 0, -.07]}>
      <mesh geometry={geometry.a}><meshPhysicalMaterial color={colors.ink} metalness={.48} roughness={.28} clearcoat={.8} side={DoubleSide} /></mesh>
      <mesh geometry={geometry.b}><meshPhysicalMaterial color={colors.sage} metalness={.35} roughness={.32} clearcoat={.8} side={DoubleSide} /></mesh>
      {bonds.map((bond, i) => <mesh key={i} position={bond.position} rotation={[bond.rotation, 0, 0]}><cylinderGeometry args={[.013, .013, bond.length, 5]} /><meshStandardMaterial color={colors.ink} transparent opacity={.26} roughness={.5} /></mesh>)}
      <instancedMesh ref={pulses} args={[undefined, undefined, 26]} frustumCulled={false}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={colors.signal} metalness={.4} roughness={.2} /></instancedMesh>
      <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[dust, 3]} /></bufferGeometry><pointsMaterial color={colors.sage} size={.018} transparent opacity={.35} sizeAttenuation /></points>
    </group>
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
    return () => { observer.disconnect(); query.removeEventListener("change", update); hero?.removeEventListener("pointermove", move); hero?.removeEventListener("pointerdown", press); hero?.removeEventListener("pointerleave", reset); window.removeEventListener("pointerup", release); window.removeEventListener("scroll", scroll); };
  }, []);
  const onReady = useMemo(() => () => setReady(true), []);
  return <div ref={scene} className="landing-type-scene" aria-hidden="true" data-scene-ready={ready ? "true" : undefined}>
    <Canvas camera={{ position: [0, 0, 16], fov: 30 }} dpr={[1, 1.5]} frameloop={reduced || !visible ? "demand" : "always"} gl={{ alpha: true, antialias: true }}>
      <MolecularScene reduced={reduced} input={input} onReady={onReady} />
    </Canvas>
  </div>;
}
