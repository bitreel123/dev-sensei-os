import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import portalImg from "@/assets/ciel_noir.jpeg.asset.json";

/**
 * Nous-Portal inspired closing section — solid electric blue,
 * huge serif "JERADIN PORTAL" wordmark, tier eyebrow, description,
 * rectangular CTA, faded "JERADIN" backdrop, and a hero figure.
 */
export function JeradinPortal() {
  return (
    <section className="relative overflow-hidden bg-black text-white">
      {/* Faded backdrop wordmark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
        <span
          className="font-serif font-medium tracking-[-0.04em] text-white/10 whitespace-nowrap"
          style={{ fontSize: "clamp(180px, 28vw, 460px)", lineHeight: 1 }}
        >
          JERADIN
        </span>
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-0 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-mono text-[11px] tracking-[0.35em] text-white/90"
        >
          FREE · PLUS · SUPER · ELITE
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 font-serif font-medium tracking-[-0.03em] text-white"
          style={{ fontSize: "clamp(56px, 9vw, 128px)", lineHeight: 0.95 }}
        >
          JERADIN PORTAL
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mx-auto mt-8 max-w-xl font-mono text-[12px] leading-[1.9] tracking-[0.14em] uppercase text-white/90"
        >
          All paid tiers include monthly credits for use in Jeradin Agent
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10"
        >
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center border border-white/70 bg-transparent px-8 py-3.5 font-mono text-[12px] tracking-[0.28em] uppercase text-white hover:bg-white hover:text-black transition-colors"
          >
            View all our plans
          </Link>

        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="relative mt-12 flex justify-center pb-16"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[520px] w-[520px] rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(255,255,255,0.14), rgba(255,255,255,0) 70%)",
            }}
          />
          <img
            src={portalImg.url}
            alt="Jeradin portal figure — silhouette reaching toward a luminous hand"
            className="relative w-[min(520px,82%)] h-auto object-contain"
            style={{ filter: "brightness(1.15) contrast(1.05)" }}
            loading="lazy"
          />
        </motion.div>

      </div>
    </section>
  );
}
