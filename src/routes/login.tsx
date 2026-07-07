import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LogoMark } from "@/components/jeradin/logo";
import { ArrowRight, Plus, Mic, AudioLines, Sparkles, MessageSquare, BookOpen, Code, Coffee } from "lucide-react";
import { motion } from "motion/react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · Jeradin" },
      { name: "description", content: "Sign in to your Jeradin workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex">
      {/* Side rail — Claude-style */}
      <aside className="hidden md:flex w-14 border-r border-white/5 flex-col items-center py-4 gap-3">
        <LogoMark className="h-5 w-5 text-white" />
        <div className="mt-4 flex flex-col gap-1 text-white/40">
          {[Plus, MessageSquare, BookOpen, Sparkles, Code, Coffee].map((I, i) => (
            <button key={i} className="h-9 w-9 rounded-lg hover:bg-white/5 flex items-center justify-center">
              <I className="h-4 w-4" />
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <div className="absolute top-0 left-0 right-0 flex items-center justify-center h-12 text-[12px] text-white/55">
          Free plan · <Link to="/pricing" className="ml-1 underline underline-offset-2">Upgrade</Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3"
          >
            <LogoMark className="h-7 w-7 text-white" />
            <h1 className="text-[36px] tracking-[-0.02em] font-serif text-white/95">
              Welcome back?
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 w-full max-w-2xl"
          >
            <div className="rounded-2xl border border-white/10 bg-[#222222] p-1">
              <div className="px-3 pt-2 pb-1 text-[12px] text-white/55">
                Jeradin beta sign-in · email-only, no password
              </div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourdomain.com"
                className="w-full bg-transparent px-3 py-3 text-[14px] placeholder:text-white/30 outline-none"
              />
              <div className="flex items-center justify-between px-2 pb-2">
                <button className="inline-flex items-center gap-1.5 text-[12px] text-white/45 hover:text-white px-2 py-1 rounded-md">
                  <Plus className="h-3.5 w-3.5" /> Continue with Google
                </button>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-white/40 px-2">Jeradin 0.1 · Beta</span>
                  <button className="h-8 w-8 rounded-md hover:bg-white/5 flex items-center justify-center text-white/45">
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                  <button className="h-8 w-8 rounded-md hover:bg-white/5 flex items-center justify-center text-white/45">
                    <AudioLines className="h-3.5 w-3.5" />
                  </button>
                  <button className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {[
                ["Connect Lovable", Sparkles],
                ["Connect Cursor", Code],
                ["Connect Gemini", BookOpen],
                ["Open dashboard", MessageSquare],
              ].map(([label, Icon]) => {
                const I = Icon as typeof Plus;
                return (
                  <Link
                    to="/app"
                    key={label as string}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#222] px-3 py-1.5 text-[12px] text-white/75 hover:bg-[#2a2a2a]"
                  >
                    <I className="h-3 w-3" /> {label as string}
                  </Link>
                );
              })}
            </div>

            <p className="mt-8 text-center text-[12px] text-white/40">
              New to Jeradin?{" "}
              <Link to="/signup" className="text-white/70 underline underline-offset-2">
                Create an account
              </Link>
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
