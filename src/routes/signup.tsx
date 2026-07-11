import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogoMark } from "@/components/jeradin/logo";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your Jeradin account" },
      { name: "description", content: "Get 5 free credits. No card required." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    navigate({ to: "/chat" });
  }

  async function signInGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error(result.error.message ?? "Sign in failed");
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-3 justify-center">
          <LogoMark className="h-7 w-7 text-white" />
          <h1
            className="text-[32px] tracking-[-0.02em]"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Create account
          </h1>
        </div>
        <p className="mt-2 text-center text-[12px] text-white/55">
          5 free credits · No card required
        </p>

        <button
          onClick={signInGoogle}
          className="mt-8 w-full border border-white/25 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] hover:bg-white hover:text-black transition-colors"
        >
          Continue with Google
        </button>

        <button
          onClick={() => { window.location.href = "/api/public/github/authorize?mode=login&return_to=/chat"; }}
          className="mt-2 w-full border border-white/25 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] hover:bg-white hover:text-black transition-colors inline-flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden><path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 007.86 10.92c.58.1.79-.25.79-.55v-2.02c-3.2.7-3.88-1.36-3.88-1.36-.53-1.35-1.29-1.71-1.29-1.71-1.05-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.72 1.27 3.38.97.1-.75.4-1.27.74-1.56-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 015.79 0c2.2-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.41.35.78 1.05.78 2.12v3.15c0 .3.21.66.8.55A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>
          Continue with GitHub
        </button>

        <div className="my-5 flex items-center gap-3 text-white/40 text-[10px] uppercase tracking-[0.22em] font-mono">
          <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={signUp} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black border border-white/25 px-3 py-3 text-[13px] focus:outline-none focus:border-white"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black border border-white/25 px-3 py-3 text-[13px] focus:outline-none focus:border-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] hover:bg-white/90 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center text-[12px] text-white/60">
          Have an account?{" "}
          <Link to="/login" className="text-white underline underline-offset-2">
            Sign in
          </Link>
        </div>
        <div className="mt-2 text-center">
          <Link to="/" className="text-[11px] text-white/40 hover:text-white">
            ← Back home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
