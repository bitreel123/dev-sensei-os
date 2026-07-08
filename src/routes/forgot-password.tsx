import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LogoMark } from "@/components/jeradin/logo";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password · Jeradin" },
      { name: "description", content: "Reset your Jeradin account password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Reset email sent — check your inbox");
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
            Reset password
          </h1>
        </div>
        <p className="mt-2 text-center text-[12px] text-white/55">
          We'll email you a link to set a new password.
        </p>

        {sent ? (
          <div className="mt-8 border border-white/25 p-5 text-[13px] text-white/80">
            If <span className="text-white">{email}</span> matches an account, a reset link is on
            its way. It expires in 1 hour.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-3">
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-white/25 px-3 py-3 text-[13px] focus:outline-none focus:border-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] hover:bg-white/90 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-[12px] text-white/60">
          Remembered it?{" "}
          <Link to="/login" className="text-white underline underline-offset-2">
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
