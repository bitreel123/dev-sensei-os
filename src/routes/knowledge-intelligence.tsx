import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Library, ExternalLink, Sparkles } from "lucide-react";
import {
  runKnowledgeIntelligence,
  type KnowledgeReport,
} from "@/lib/knowledge-intel.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/knowledge-intelligence")({
  head: () => ({
    meta: [
      { title: "Knowledge Intelligence — Jeradin" },
      {
        name: "description",
        content:
          "An agent that finds the best repositories, APIs, datasets, models, and frameworks for your project — explained in plain English.",
      },
    ],
  }),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="max-w-md">
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-white/60 mb-4">{error.message}</p>
          <button
            onClick={() => {
              reset();
              router.invalidate();
            }}
            className="px-4 py-2 rounded bg-white text-black text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => <div>Not found</div>,
  component: KnowledgeIntelPage,
});

function KnowledgeIntelPage() {
  const { user, loading: authLoading } = useAuth();
  const runAgent = useServerFn(runKnowledgeIntelligence);
  const [question, setQuestion] = useState("");
  const [projectContext, setContext] = useState("");
  const [report, setReport] = useState<KnowledgeReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setErr(null);
    setReport(null);
    try {
      const { report } = await runAgent({ data: { question, projectContext } });
      setReport(report);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-xl mb-3">Sign in required</h1>
          <Link to="/login" className="underline">Log in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto p-6 md:p-10">
        <div className="flex items-center gap-3 mb-2">
          <Library className="h-6 w-6 text-emerald-400" />
          <h1 className="text-2xl md:text-3xl font-semibold">Knowledge Intelligence</h1>
        </div>
        <p className="text-white/60 mb-8">
          An AI agent (Claude Sonnet 4.5 + Gemini 3.1) searches GitHub, npm, and Hugging Face
          to find the best repositories, APIs, datasets, models, and frameworks for your project.
          Every finding is explained in plain English.
        </p>

        <form onSubmit={submit} className="space-y-3 mb-8">
          <label className="block text-sm text-white/70">What are you building or stuck on?</label>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. I'm building a real-time collaborative whiteboard. What should I use?"
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
          />
          <label className="block text-sm text-white/70">Project context (optional)</label>
          <textarea
            value={projectContext}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
            placeholder="e.g. Solo founder, React + TypeScript, targeting SMB teams, low budget."
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-white/30"
          />
          <button
            disabled={busy || !question.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-500 text-black text-sm font-medium disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Agent is researching..." : "Run agent"}
          </button>
          {err && <div className="text-sm text-red-400">{err}</div>}
        </form>

        {report && (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold mb-2">Plain-English summary</h2>
              <div className="rounded-lg bg-white/5 border border-white/10 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                {report.laymanSummary}
              </div>
            </section>

            {report.recommendedStack?.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-2">Recommended stack</h2>
                <div className="flex flex-wrap gap-2">
                  {report.recommendedStack.map((s) => (
                    <span key={s} className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-lg font-semibold mb-2">Resources</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {report.resources.map((r) => (
                  <a
                    key={r.url}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-white/50">{r.kind}</span>
                      {r.stars != null && (
                        <span className="text-[10px] text-yellow-400">★ {r.stars}</span>
                      )}
                    </div>
                    <div className="text-sm font-medium mb-1 flex items-center gap-1">
                      {r.title} <ExternalLink className="h-3 w-3 opacity-50" />
                    </div>
                    <div className="text-xs text-white/60">{r.why}</div>
                  </a>
                ))}
              </div>
            </section>

            {report.nextSteps?.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-2">Next steps</h2>
                <ol className="space-y-2 list-decimal list-inside text-sm text-white/80">
                  {report.nextSteps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </section>
            )}

            {report.glossary?.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-2">Glossary</h2>
                <dl className="grid gap-2 md:grid-cols-2 text-sm">
                  {report.glossary.map((g) => (
                    <div key={g.term} className="p-3 rounded bg-white/5 border border-white/10">
                      <dt className="font-medium">{g.term}</dt>
                      <dd className="text-white/60 text-xs mt-1">{g.meaning}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
