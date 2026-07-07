import { motion } from "motion/react";
import img1 from "@/assets/intel-1.jpg.asset.json";
import img2 from "@/assets/intel-2.jpg.asset.json";
import img3 from "@/assets/intel-3.jpg.asset.json";
import img4 from "@/assets/intel-4.jpg.asset.json";
import img5 from "@/assets/intel-5.jpg.asset.json";

const FEATURES = [
  {
    num: "#1",
    label: "Detect",
    title: ["Real-Time Error", "Intelligence"],
    img: img1.url,
    body:
      "Continuously monitors applications, logs, terminals, and workflows to detect errors, identify root causes, and recommend fixes before they become critical problems.",
  },
  {
    num: "#2",
    label: "Understand",
    title: ["Semantic System", "Intelligence"],
    img: img2.url,
    body:
      "Builds a deep understanding of your product's architecture, relationships, dependencies, and workflows instead of analyzing files in isolation.",
  },
  {
    num: "#3",
    label: "Observe",
    title: ["Screen", "Intelligence"],
    img: img3.url,
    body:
      "Understands what is happening on your screen in real time and provides contextual guidance, diagnostics, and recommendations.",
  },
  {
    num: "#4",
    label: "Discover",
    title: ["Knowledge", "Discovery"],
    img: img4.url,
    body:
      "Finds relevant repositories, APIs, datasets, models, frameworks, and engineering resources to accelerate product development.",
  },
  {
    num: "#5",
    label: "Analyze",
    title: ["GitHub", "Intelligence"],
    img: img5.url,
    body:
      "Analyzes repositories, pull requests, commits, and dependencies to reveal risks, opportunities, and implementation patterns.",
  },
];

export function IntelligenceFeatures() {
  return (
    <section className="relative bg-black text-[#f3ecdc]">
      <div className="mx-auto flex max-w-[1400px] items-center justify-end px-4 pt-5 sm:px-8">
        <div className="flex font-mono text-[10px] tracking-[0.18em]">
          <button className="border border-[#f3ecdc] px-3 py-1.5 uppercase">
            Feature
          </button>
          <button className="border border-l-0 border-[#f3ecdc] px-3 py-1.5 uppercase opacity-60 hover:opacity-100">
            Preview
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-14 px-4 pb-24 pt-10 sm:px-8 md:grid-cols-3 md:gap-8 md:pt-14">
        {FEATURES.map((f, i) => (
          <motion.article
            key={f.num}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col"
          >
            <div className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#f3ecdc]/85">
              {f.num} {f.label}
            </div>

            <h3
              className="mb-6 text-[40px] leading-[0.95] tracking-[-0.01em] text-[#f3ecdc] sm:text-[48px] md:text-[52px]"
              style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400 }}
            >
              {f.title[0]}
              <br />
              {f.title[1]}
            </h3>

            <div className="relative aspect-square w-full overflow-hidden border border-[#f3ecdc]/15 bg-black">
              <img
                src={f.img}
                alt={`${f.label} illustration`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>

            <p className="mt-6 font-mono text-[11.5px] uppercase leading-[1.7] tracking-[0.08em] text-[#f3ecdc]/80">
              {f.body}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
