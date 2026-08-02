import { useEffect, useRef } from "react";

/**
 * Interactive wireframe globe rendered to canvas.
 * - Rotates continuously
 * - Follows the mouse (parallax tilt + spin influence)
 * - Click & drag to spin manually
 */
export function InteractiveGlobe({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const rgb = tone === "light" ? "255,255,255" : "0,0,0";
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Rotation state
    let rotY = 0;
    let rotX = -0.25;
    let velY = 0.0025;
    let velX = 0;

    // Pointer
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let dragging = false;
    let lastDragX = 0;
    let lastDragY = 0;

    // Build a set of points distributed on the sphere using a fibonacci lattice
    const N = 1400;
    const points: { x: number; y: number; z: number }[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      points.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
    }

    // A few "highlight" indices that pulse like cities
    const highlights: number[] = [];
    for (let i = 0; i < 18; i++) {
      highlights.push(Math.floor(Math.random() * N));
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      targetMouseX = px;
      targetMouseY = py;
      if (dragging) {
        velY = (e.clientX - lastDragX) * 0.005;
        velX = (e.clientY - lastDragY) * 0.003;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
      }
    };
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastDragX = e.clientX;
      lastDragY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
    };

    window.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    let t = 0;
    const render = () => {
      t += 1;
      mouseX += (targetMouseX - mouseX) * 0.06;
      mouseY += (targetMouseY - mouseY) * 0.06;

      if (!dragging) {
        velY += (0.0025 - velY) * 0.02;
        velX += (0 - velX) * 0.05;
      }
      rotY += velY + mouseX * 0.002;
      rotX += velX;
      rotX = Math.max(-0.9, Math.min(0.9, rotX + mouseY * 0.001 * 0.05));

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.42;

      ctx.clearRect(0, 0, width, height);

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Outer ring
      ctx.strokeStyle = `rgba(${rgb},0.14)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Latitude/longitude faint grid via projected great circles
      ctx.strokeStyle = `rgba(${rgb},0.09)`;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        const phi = (lat * Math.PI) / 180;
        for (let lon = 0; lon <= 360; lon += 4) {
          const theta = (lon * Math.PI) / 180;
          const x0 = Math.cos(phi) * Math.cos(theta);
          const y0 = Math.sin(phi);
          const z0 = Math.cos(phi) * Math.sin(theta);
          // rotate Y
          const x1 = x0 * cosY - z0 * sinY;
          const z1 = x0 * sinY + z0 * cosY;
          // rotate X
          const y2 = y0 * cosX - z1 * sinX;
          const z2 = y0 * sinX + z1 * cosX;
          if (z2 < -0.02) continue;
          const px = cx + x1 * radius;
          const py = cy + y2 * radius;
          if (lon === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // Points
      for (let i = 0; i < N; i++) {
        const p = points[i];
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        if (z2 < -0.05) continue;
        const px = cx + x1 * radius;
        const py = cy + y2 * radius;
        const depth = (z2 + 1) / 2;
        const alpha = 0.15 + depth * 0.55;
        const size = 0.6 + depth * 1.2;
        ctx.fillStyle = `rgba(${rgb},${alpha.toFixed(3)})`;
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      }

      // Highlight pulses
      for (let h = 0; h < highlights.length; h++) {
        const p = points[highlights[h]];
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        if (z2 < 0) continue;
        const px = cx + x1 * radius;
        const py = cy + y2 * radius;
        const pulse = (Math.sin(t * 0.04 + h) + 1) / 2;
        ctx.beginPath();
        ctx.arc(px, py, 1.6 + pulse * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${0.7 + pulse * 0.3})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, 4 + pulse * 6, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb},${0.18 * (1 - pulse)})`;
        ctx.stroke();
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [tone]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ touchAction: "none", cursor: "grab" }}
      aria-hidden
    />
  );
}
