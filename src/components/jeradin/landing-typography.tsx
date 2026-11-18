import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Box3, BufferGeometry, Color, CubicBezierCurve3, Group, InstancedMesh, MathUtils, Mesh, MeshStandardMaterial, Object3D, OrthographicCamera, Vector3 } from "three";
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
  return { ink: resolve("--landing-molecule"), sage: resolve("--landing-sage"), paper: resolve("--background"), signal: resolve("--landing-signal") };
}

function SkullModel({ colors, onReady }: { colors: ReturnType<typeof resolveColors>; onReady: () => void }) {
  const { scene } = useGLTF(skullAsset.url);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new Box3().setFromObject(clone);
    const center = bounds.getCenter(new Vector3());
    const height = bounds.getSize(new Vector3()).y;
    clone.position.sub(center); clone.scale.setScalar(8 / height);
    clone.position.multiplyScalar(8 / height);
    clone.traverse(object => {
      if (object instanceof Mesh) {
        // Preserve the model's bone texture while giving it a cool scientific finish.
        const original = Array.isArray(object.material) ? object.material[0] : object.material;
        object.material = new MeshStandardMaterial({ map: original.map ?? null, color: colors.paper, roughness: .65, metalness: .12 });
      }
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
  const origin = useMemo(() => new Vector3(mobile ? width * .24 : width * .31, mobile ? -2.25 : -.3, 0), [mobile, width]);
  const routes = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const start = origin.clone().add(new Vector3(Math.cos(angle) * 1.7, Math.sin(angle) * 2.2, -.7));
    const end = new Vector3(Math.cos(angle) * width * .56, Math.sin(angle) * 5.5, -1.5);
    const curve = new CubicBezierCurve3(start, start.clone().add(new Vector3(Math.cos(angle) * 2, Math.sin(angle), 1)), end.clone().add(new Vector3(-Math.cos(angle) * 2, .6, .4)), end);
    const geometry = new BufferGeometry().setFromPoints(curve.getPoints(64));
    return { curve, geometry, end };
  }), [origin, width]);
  const dust = useMemo(() => {
    const points = [];
    for (let i = 0; i < 340; i++) { const a = i * 2.39996; points.push(origin.x + Math.cos(a) * (2.5 + i % 13 * .2), origin.y + Math.sin(a) * (2.8 + i % 11 * .18), -1.4); }
    return new Float32Array(points);
  }, [origin]);
  const dummy = useMemo(() => new Object3D(), []);
  useEffect(() => {
    if (camera instanceof OrthographicCamera) { camera.zoom = size.height / 12; camera.updateProjectionMatrix(); }
  }, [camera, size]);
  useEffect(() => () => routes.forEach(route => route.geometry.dispose()), [routes]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, .05);
    if (!reduced) time.current += dt;
    const t = time.current;
    if (sculpture.current) {
      const blend = reduced ? 1 : 1 - Math.exp(-dt * 4);
      sculpture.current.rotation.y = MathUtils.lerp(sculpture.current.rotation.y, -.36 + (reduced ? 0 : Math.sin(t * .28) * .2 + input.current.x * .35), blend);
      sculpture.current.rotation.x = MathUtils.lerp(sculpture.current.rotation.x, .07 + (reduced ? 0 : input.current.y * .12), blend);
      sculpture.current.position.y = origin.y + (reduced ? 0 : Math.sin(t * .7) * .12 - input.current.scroll * .4);
      const scale = mobile ? .83 : 1;
      sculpture.current.scale.setScalar(scale * (!reduced && input.current.pressed ? 1.03 : 1));
    }
    if (packets.current) {
      for (let i = 0; i < 56; i++) {
        const route = routes[i % routes.length];
        const phase = (Math.floor(i / 14) / 4 + t * .14 + i * .023) % 1;
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
      <lineSegments geometry={route.geometry}><lineBasicMaterial color={colors.sage} transparent opacity={.21} /></lineSegments>
      <group position={route.end} rotation={[0, 0, i % 2 ? .12 : -.12]}>
        <mesh><planeGeometry args={[.42, .58]} /><meshBasicMaterial color={colors.paper} /></mesh>
        {[0, 1, 2, 3].map(row => <mesh key={row} position={[-.02, .16 - row * .09, .01]}><planeGeometry args={[row === 0 ? .23 : .29, .018]} /><meshBasicMaterial color={i % 3 ? colors.sage : colors.signal} transparent opacity={.65} /></mesh>)}
      </group>
    </group>)}
    <instancedMesh ref={packets} args={[undefined, undefined, 56]} frustumCulled={false}><boxGeometry args={[1, 1, .3]} /><meshStandardMaterial color={colors.signal} metalness={.25} roughness={.3} /></instancedMesh>
    <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[dust, 3]} /></bufferGeometry><pointsMaterial color={colors.sage} size={.028} transparent opacity={.45} /></points>
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
    <Canvas orthographic camera={{ position: [0, 0, 30], zoom: 50 }} dpr={[1, 1.5]} frameloop={reduced || !visible ? "demand" : "always"} gl={{ alpha: true, antialias: true }}>
      <SkullScene reduced={reduced} input={input} onReady={onReady} />
    </Canvas>
  </div>;
}
