import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, Github, Sparkles, AlertTriangle, TrendingUp, Puzzle, ExternalLink } from "lucide-react";
import {
  runGithubIntelligence,
  type GithubIntelReport,
} from "@/lib/github-intel.functions";
import { listMyGithubRepos } from "@/lib/system-intel.functions";
import { useAuth } from "@/hooks/use-auth";
import { useGithubConnection, startGithubOAuth } from "@/hooks/use-github-connection";

export const Route = createFileRoute("/github-intelligence")({
  head: () => ({
    meta: [
      { title: "GitHub Intelligence — Jeradin" },
      {
        name: "description",
        content:
          "Analyze any GitHub repo — pull requests, commits, dependencies — for risks, opportunities, and patterns, in plain English.",
      },
    ],
  }),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="max-w-md">
          <h1 className="text-xl mb-2">Something went wrong</h1>
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
  component: GithubIntelPage,
});

function GithubIntelPage() {
  const { user, loading: authLoading } = useAuth();
  const { connection } = useGithubConnection(user?.id ?? null);
  const listRepos = useServerFn(listMyGithubRepos);
  const runIntel = useServerFn(runGithubIntelligence);

  const [repos, setRepos] = useState<Array<{ full_name: string; private: boolean }>>([]);
  const [repo, setRepo] = useState("");
  const [focus, setFocus] = useState("");
  const [report, setReport] = useState<GithubIntelReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!connection) return;
    listRepos({ data: undefined as never }).then((r) => setRepos(r.repos)).catch(() => {});
  }, [connection, listRepos]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repo.trim()) return;
    setBusy(true);
    setErr(null);
    setReport(null);
    try {
      const { report } = await runIntel({ data: { repo, focus } });
      setReport(report);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) return null;
  if (!user)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Link to="/login" className="underline">Log in</Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto p-6 md:p-10">
        <div className="flex items-center gap-3 mb-2">
          <Github className="h-6 w-6 text-purple-400" />
          <h1 className="text-2xl md:text-3xl font-semibold">GitHub Intelligence</h1>
        </div>
        <p className="text-white/60 mb-8">
          Claude Sonnet 4.5 uses agent tools to read the repo's metadata, pull requests, commits,
          dependencies, and files — then reports risks, opportunities, and patterns in plain English.
        </p>

        {!connection ? (
          <div className="p-6 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm mb-3">Connect GitHub to analyze your repositories.</p>
            <button
              onClick={() => startGithubOAuth("connect", "/github-intelligence")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-white text-black text-sm"
            >
              <Github className="h-4 w-4" /> Connect GitHub
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 mb-8">
            <label className="block text-sm text-white/70">Choose a repository</label>
            <select
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm"
            >
              <option value="">— Select —</option>
              {repos.map((r) => (
                <option key={r.full_name} value={r.full_name}>
                  {r.full_name} {r.private ? "(private)" : ""}
                </option>
              ))}
            </select>
            <label className="block text-sm text-white/70">Specific focus (optional)</label>
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="e.g. security review, performance, onboarding new devs"
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm"
            />
            <button
              disabled={busy || !repo}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-purple-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy ? "Agent is auditing..." : "Audit repo"}
            </button>
            {err && <div className="text-sm text-red-400">{err}</div>}
          </form>
        )}

        {report && (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold mb-2">Summary</h2>
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-sm leading-relaxed">
                {report.summary}
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="text-white/50">Activity score:</span>
                <div className="flex-1 h-2 bg-white/10 rounded">
                  <div
                    className="h-2 bg-emerald-400 rounded"
                    style={{ width: `${report.activityScore}%` }}
                  />
                </div>
                <span className="w-10 text-right">{report.activityScore}/100</span>
              </div>
            </section>

            <Section title="Risks" icon={<AlertTriangle className="h-4 w-4 text-red-400" />}>
              <div className="space-y-2">
                {report.risks.map((r, i) => (
                  <div key={i} className="p-3 rounded bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                          r.severity === "high"
                            ? "bg-red-500/20 text-red-300"
                            : r.severity === "medium"
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-white/10 text-white/60"
                        }`}
                      >
                        {r.severity}
                      </span>
                      <span className="text-sm font-medium">{r.title}</span>
                    </div>
                    <div className="text-xs text-white/70">{r.detail}</div>
                    {r.where && (
                      <div className="text-[11px] text-white/45 mt-1">→ {r.where}</div>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Opportunities" icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}>
              <div className="space-y-2">
                {report.opportunities.map((o, i) => (
                  <div key={i} className="p-3 rounded bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        {o.effort}
                      </span>
                      <span className="text-sm font-medium">{o.title}</span>
                    </div>
                    <div className="text-xs text-white/70">{o.detail}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Implementation patterns" icon={<Puzzle className="h-4 w-4 text-blue-400" />}>
              <div className="space-y-2">
                {report.patterns.map((p, i) => (
                  <div key={i} className="p-3 rounded bg-white/5 border border-white/10">
                    <div className="text-sm font-medium mb-1">{p.name}</div>
                    <div className="text-xs text-white/70 mb-1">{p.description}</div>
                    {p.examples.length > 0 && (
                      <div className="text-[11px] text-white/45">
                        e.g. {p.examples.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            {report.dependencyNotes.length > 0 && (
              <Section title="Dependency notes">
                <div className="grid gap-2 md:grid-cols-2">
                  {report.dependencyNotes.map((d) => (
                    <div key={d.name} className="p-2 rounded bg-white/5 border border-white/10 text-xs">
                      <div className="font-mono text-white/80">
                        {d.name} <span className="text-white/40">{d.version}</span>
                      </div>
                      <div className="text-white/60 mt-1">{d.note}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {report.glossary?.length > 0 && (
              <Section title="Glossary">
                <dl className="grid gap-2 md:grid-cols-2 text-sm">
                  {report.glossary.map((g) => (
                    <div key={g.term} className="p-3 rounded bg-white/5 border border-white/10">
                      <dt className="font-medium">{g.term}</dt>
                      <dd className="text-white/60 text-xs mt-1">{g.meaning}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
