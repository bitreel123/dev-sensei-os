import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Color, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector2 } from "three";

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const fragmentShader = `
uniform sampler2D image;
uniform vec2 frame;
uniform vec2 imageSize;
uniform float time;
uniform float portrait;
uniform vec3 signal;
varying vec2 vUv;
void main() {
  float frameAspect = frame.x / frame.y;
  float imageAspect = imageSize.x / imageSize.y;
  vec2 uv = vUv;
  if (portrait > 0.5) {
    float width = min(1.0, imageAspect / frameAspect);
    float center = frameAspect > 1.1 ? 0.73 : 0.5;
    uv.x = (uv.x - center) / width + 0.5;
  } else {
    if (frameAspect > imageAspect) uv.y = (uv.y - 0.5) * imageAspect / frameAspect + 0.5;
    else uv.x = (uv.x - 0.5) * frameAspect / imageAspect + 0.5;
  }
  uv = (uv - 0.5) / (1.025 + sin(time * 0.35) * 0.02) + 0.5;
  uv.x += sin(uv.y * 9.0 + time * 0.45) * 0.0018;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
  vec4 pixel = texture2D(image, uv);
  float scan = pow(max(0.0, 1.0 - abs(uv.y - fract(time * 0.065)) * 16.0), 3.0);
  float detail = clamp(1.0 - dot(pixel.rgb, vec3(0.333)), 0.0, 1.0);
  float neural = max(0.0, pixel.r - pixel.b) * 2.0;
  pixel.rgb = mix(pixel.rgb, signal, scan * (detail * 0.12 + neural * 0.22));
  gl_FragColor = pixel;
  #include <colorspace_fragment>
}`;

function ImagePlane({ url, portrait, reduced, onReady }: { url: string; portrait: boolean; reduced: boolean; onReady: () => void }) {
  const texture = useLoader(TextureLoader, url);
  texture.colorSpace = SRGBColorSpace;
  const { viewport, size, gl, invalidate } = useThree();
  const ready = useRef(false);
  const material = useMemo(() => new ShaderMaterial({
    vertexShader, fragmentShader, transparent: true,
    uniforms: {
      image: { value: texture }, frame: { value: new Vector2(1, 1) },
      imageSize: { value: new Vector2(texture.image.width, texture.image.height) },
      time: { value: 0 }, portrait: { value: portrait ? 1 : 0 }, signal: { value: new Color() },
    },
  }), [texture, portrait]);
  useEffect(() => {
    material.uniforms['frame']?.value.set(size.width, size.height);
    const parent = gl.domElement.closest('.jeradin-landing');
    if (parent) {
      const css = getComputedStyle(parent).getPropertyValue('--landing-image-signal').trim();
      // Resolve the semantic CSS color through the browser, including OKLCH.
      const probe = document.createElement('canvas').getContext('2d');
      if (probe) { probe.fillStyle = css; material.uniforms['signal']?.value.set(probe.fillStyle); }
    }
    invalidate();
  }, [size, gl, material, invalidate]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, delta) => {
    if (!reduced && material.uniforms['time']) material.uniforms['time'].value += Math.min(delta, 0.05);
    if (!ready.current) { ready.current = true; onReady(); }
  });
  return <mesh material={material} scale={[viewport.width, viewport.height, 1]}><planeGeometry args={[1, 1]} /></mesh>;
}

export default function LandingImageScene({ url, portrait, active, reduced, onReady }: { url: string; portrait: boolean; active: boolean; reduced: boolean; onReady: () => void }) {
  return <Canvas aria-hidden="true" flat dpr={[1, 1.5]} frameloop={active && !reduced ? 'always' : 'demand'} orthographic camera={{ position: [0, 0, 5], zoom: 100 }} gl={{ alpha: true, antialias: false }}>
    <ImagePlane url={url} portrait={portrait} reduced={reduced} onReady={onReady} />
  </Canvas>;
}