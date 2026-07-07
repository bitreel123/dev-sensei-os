import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

/**
 * A soft cursor-following halo that gives the page an interactive,
 * physics-y feel (à la antigravity.google / physicsx.ai).
 * Pointer-events: none, so it never blocks UI.
 */
export function CursorHalo() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 120, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 120, damping: 18, mass: 0.6 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    };
    const leave = () => setVisible(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseleave", leave);
    };
  }, [x, y]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-[1] h-[420px] w-[420px] rounded-full"
      style={{
        x: sx,
        y: sy,
        translateX: "-50%",
        translateY: "-50%",
        background:
          "radial-gradient(closest-side, rgba(0,0,0,0.06), rgba(0,0,0,0))",
      }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.4 }}
    />
  );
}
