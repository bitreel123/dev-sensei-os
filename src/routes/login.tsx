import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogoMark } from "@/components/jeradin/logo";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

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
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    navigate({ to: "/pricing" });
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
            Welcome back
          </h1>
        </div>

        <button
          onClick={signInGoogle}
          className="mt-8 w-full border border-white/25 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] hover:bg-white hover:text-black transition-colors"
        >
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-white/40 text-[10px] uppercase tracking-[0.22em] font-mono">
          <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={signInEmail} className="space-y-3">
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black border border-white/25 px-3 py-3 text-[13px] focus:outline-none focus:border-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] hover:bg-white/90 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-center text-[12px] text-white/60">
          No account?{" "}
          <Link to="/signup" className="text-white underline underline-offset-2">
            Create one
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
