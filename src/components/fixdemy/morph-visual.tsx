import { motion } from "motion/react";

/**
 * Gigantic animated "system intelligence" character.
 * Inspired by CFD / turbofan visualizations — vivid, abstract,
 * continuously moving. Pure SVG + framer-motion (no extra deps).
 */
export function MorphVisual({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full ${className}`}>
      <svg
        viewBox="0 0 800 520"
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff5a3c" />
            <stop offset="40%" stopColor="#ff9d2e" />
            <stop offset="75%" stopColor="#ffd23f" />
            <stop offset="100%" stopColor="#9be15d" />
          </radialGradient>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="blur">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id="soft">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Soft gradient halo */}
        <motion.ellipse
          cx="400"
          cy="260"
          rx="320"
          ry="180"
          fill="url(#core)"
          opacity="0.35"
          filter="url(#blur)"
          animate={{ rx: [320, 360, 320], ry: [180, 210, 180] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Morphing liquid blob (core) */}
        <motion.path
          fill="url(#core)"
          filter="url(#soft)"
          animate={{
            d: [
              "M400 110 C520 110 620 200 620 290 C620 380 510 430 400 430 C290 430 180 380 180 290 C180 200 280 110 400 110 Z",
              "M400 130 C540 100 640 220 600 320 C560 420 470 440 380 420 C260 395 170 350 200 250 C225 165 300 150 400 130 Z",
              "M400 100 C530 120 630 180 615 295 C600 410 490 445 390 425 C275 405 170 370 195 265 C220 165 285 90 400 100 Z",
              "M400 110 C520 110 620 200 620 290 C620 380 510 430 400 430 C290 430 180 380 180 290 C180 200 280 110 400 110 Z",
            ],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Concentric rotating rings */}
        <motion.g
          style={{ transformOrigin: "400px 270px" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          <ellipse
            cx="400"
            cy="270"
            rx="290"
            ry="120"
            fill="none"
            stroke="url(#ring)"
            strokeWidth="1"
            opacity="0.55"
          />
          <ellipse
            cx="400"
            cy="270"
            rx="260"
            ry="95"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.15"
            strokeWidth="0.8"
          />
        </motion.g>

        <motion.g
          style={{ transformOrigin: "400px 270px" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        >
          <ellipse
            cx="400"
            cy="270"
            rx="340"
            ry="160"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.18"
            strokeWidth="0.8"
            strokeDasharray="2 6"
          />
        </motion.g>

        {/* Streaming particles along orbit */}
        {Array.from({ length: 14 }).map((_, i) => {
          const angle = (i / 14) * Math.PI * 2;
          const rx = 290;
          const ry = 120;
          const cx = 400 + Math.cos(angle) * rx;
          const cy = 270 + Math.sin(angle) * ry;
          return (
            <motion.circle
              key={i}
              cx={cx}
              cy={cy}
              r="2.2"
              fill="#ffffff"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.18,
                ease: "easeInOut",
              }}
            />
          );
        })}

        {/* Grid wireframe under the blob */}
        <g opacity="0.18" stroke="#ffffff" strokeWidth="0.5">
          {Array.from({ length: 20 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={40 + i * 36}
              y1="420"
              x2={40 + i * 36}
              y2="500"
            />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1="40"
              y1={420 + i * 20}
              x2="760"
              y2={420 + i * 20}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
