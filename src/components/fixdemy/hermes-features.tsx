import { motion } from "motion/react";
import img1 from "@/assets/hermes-1.jpg";
import img2 from "@/assets/hermes-2.jpg";
import img3 from "@/assets/hermes-3.jpg";

const FEATURES = [
  {
    num: "#1",
    label: "Connect",
    title: ["Lives", "Everywhere"],
    img: img1,
    body: "GitHub, Vercel, Supabase, AWS, Docker, CLI — and a growing list of platforms. One agent, one memory, every surface.",
  },
  {
    num: "#2",
    label: "Remember",
    title: ["Persistent", "Memory"],
    img: img2,
    body: "It learns your projects, auto-generates skills, and never forgets how it solved a problem.",
  },
  {
    num: "#3",
    label: "Automate",
    title: ["Focused", "Automation"],
    img: img3,
    body: "Natural-language scheduling for background debugging, refactors and reviews — while you keep shipping.",
  },
];

export function HermesFeatures() {
  return (
    <section className="relative bg-black text-[#f3ecdc]">
      {/* Top toolbar */}
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
            transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col"
          >
            <div className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#f3ecdc]/85">
              {f.num} {f.label}
            </div>

            <h3
              className="mb-6 text-[44px] leading-[0.95] tracking-[-0.01em] text-[#f3ecdc] sm:text-[52px] md:text-[56px]"
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
                width={1024}
                height={1024}
                loading="lazy"
                className="h-full w-full object-cover mix-blend-screen"
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
