import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import mermaid from "mermaid";
import {
  Brain,
  Loader2,
  Github,
  Upload,
  AlertTriangle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  analyzeSystem,
  listMyGithubRepos,
  type SystemAnalysis,
  type FileInput,
} from "@/lib/system-intel.functions";
import { useAuth } from "@/hooks/use-auth";
import { useGithubConnection, startGithubOAuth } from "@/hooks/use-github-connection";

export const Route = createFileRoute("/system-intelligence")({
  head: () => ({
    meta: [
      { title: "System Intelligence — Jeradin" },
      {
        name: "description",
        content:
          "Claude Sonnet reads your entire project, draws a semantic map, and gives one-by-one suggestions in plain English.",
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
            className="px-4 py-2 rounded bg-white text-black"
            onClick={() => {
              reset();
              router.invalidate();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      Not found
    </div>
  ),
  component: SystemIntelligencePage,
});

function SystemIntelligencePage() {
  const { user, loading: authLoading } = useAuth();
  const { connection } = useGithubConnection(user?.id ?? null);
  const analyze = useServerFn(analyzeSystem);
  const listRepos = useServerFn(listMyGithubRepos);

  const [tab, setTab] = useState<"github" | "upload">("github");
  const [repos, setRepos] = useState<Array<{ full_name: string; private: boolean }>>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<FileInput[]>([]);
  const [projectHint, setProjectHint] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    analysis: SystemAnalysis;
    filesAnalyzed: number;
  } | null>(null);

  useEffect(() => {
    if (!connection) return;
    listRepos({}).then((r) => {
      setRepos(r.repos);
      if (r.repos.length && !selectedRepo) setSelectedRepo(r.repos[0].full_name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const parsed: FileInput[] = [];
    for (const f of files.slice(0, 60)) {
      if (f.size > 60_000) continue;
      const text = await f.text();
      parsed.push({ path: f.webkitRelativePath || f.name, content: text });
    }
    setUploadedFiles(parsed);
  }

  async function runAnalysis() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const payload =
        tab === "github"
          ? { source: "github" as const, repo: selectedRepo, projectHint }
          : { source: "upload" as const, files: uploadedFiles, projectHint };
      const r = await analyze({ data: payload });
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <Brain className="h-10 w-10 mx-auto mb-3 text-white/60" />
          <h1 className="text-xl font-semibold mb-2">System Intelligence</h1>
          <p className="text-white/60 mb-4 text-sm">Sign in to analyze your project.</p>
          <Link to="/login" className="px-4 py-2 rounded bg-white text-black inline-block">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link to="/chat" className="text-sm text-white/60 hover:text-white">
          ← Back
        </Link>
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          <span className="font-semibold text-sm">System Intelligence</span>
        </div>
        <div className="w-16" />
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {!result && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Analyze your project</h1>
              <p className="text-white/60 text-sm">
                Claude Sonnet reads your whole codebase, draws a dependency map, and gives
                you suggestions one file at a time — in plain English. It will not rewrite
                your code.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-white/10">
              <button
                onClick={() => setTab("github")}
                className={`px-4 py-2 text-sm border-b-2 -mb-px ${
                  tab === "github"
                    ? "border-white text-white"
                    : "border-transparent text-white/50"
                }`}
              >
                <Github className="h-3.5 w-3.5 inline mr-1.5" />
                From GitHub
              </button>
              <button
                onClick={() => setTab("upload")}
                className={`px-4 py-2 text-sm border-b-2 -mb-px ${
                  tab === "upload"
                    ? "border-white text-white"
                    : "border-transparent text-white/50"
                }`}
              >
                <Upload className="h-3.5 w-3.5 inline mr-1.5" />
                Upload files
              </button>
            </div>

            {tab === "github" && (
              <div className="space-y-3">
                {!connection ? (
                  <div className="rounded border border-white/10 p-4">
                    <p className="text-sm text-white/70 mb-3">
                      Connect GitHub to pick a repo.
                    </p>
                    <button
                      onClick={() =>
                        startGithubOAuth("connect", "/system-intelligence")
                      }
                      className="px-4 py-2 rounded bg-white text-black text-sm inline-flex items-center gap-2"
                    >
                      <Github className="h-4 w-4" /> Connect GitHub
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="text-xs uppercase tracking-wider text-white/40">
                      Repository
                    </label>
                    <select
                      value={selectedRepo}
                      onChange={(e) => setSelectedRepo(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
                    >
                      {repos.length === 0 && <option>Loading…</option>}
                      {repos.map((r) => (
                        <option key={r.full_name} value={r.full_name}>
                          {r.full_name}
                          {r.private ? " (private)" : ""}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            )}

            {tab === "upload" && (
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-white/40">
                  Files (up to 60, ≤60KB each)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={onUpload}
                  className="block w-full text-sm text-white/70 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-white file:text-black file:text-sm"
                />
                {uploadedFiles.length > 0 && (
                  <div className="text-xs text-white/50">
                    {uploadedFiles.length} file(s) ready
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs uppercase tracking-wider text-white/40 mb-1 block">
                Project note (optional)
              </label>
              <textarea
                value={projectHint}
                onChange={(e) => setProjectHint(e.target.value)}
                placeholder="What are you building? Any specific area to focus on?"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm"
              />
            </div>

            {error && (
              <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              onClick={runAnalysis}
              disabled={
                running ||
                (tab === "github" && !selectedRepo) ||
                (tab === "upload" && uploadedFiles.length === 0)
              }
              className="w-full sm:w-auto px-6 py-3 rounded bg-orange-400 text-black font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-40"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing (30–90s)…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Analyze project
                </>
              )}
            </button>
          </div>
        )}

        {result && (
          <AnalysisView
            data={result.analysis}
            filesAnalyzed={result.filesAnalyzed}
            onReset={() => setResult(null)}
          />
        )}
      </main>
    </div>
  );
}

function AnalysisView({
  data,
  filesAnalyzed,
  onReset,
}: {
  data: SystemAnalysis;
  filesAnalyzed: number;
  onReset: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-white/40 mb-1">
            Analyzed {filesAnalyzed} files
          </div>
          <h1 className="text-2xl font-semibold">{data.projectSummary}</h1>
        </div>
        <button
          onClick={onReset}
          className="text-sm px-3 py-1.5 rounded border border-white/20 hover:bg-white/10"
        >
          New analysis
        </button>
      </div>

      {data.stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.stack.map((s) => (
            <span
              key={s}
              className="text-[11px] px-2 py-0.5 rounded bg-white/10 text-white/70"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <Section title="In plain English">
        <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
          {data.laymanOverview}
        </p>
      </Section>

      <Section title="Semantic map">
        <MermaidBlock code={data.mermaid} />
      </Section>

      <Section title="Modules">
        <div className="grid sm:grid-cols-2 gap-3">
          {data.modules.map((m) => (
            <div key={m.path} className="rounded border border-white/10 p-3">
              <div className="text-sm font-semibold">{m.name}</div>
              <div className="text-[11px] font-mono text-white/40 mb-2">{m.path}</div>
              <div className="text-sm text-white/75 mb-2">{m.role}</div>
              {m.keyExports.length > 0 && (
                <div className="text-xs text-white/50">
                  <span className="text-white/40">Exports:</span> {m.keyExports.join(", ")}
                </div>
              )}
              {m.dependsOn.length > 0 && (
                <div className="text-xs text-white/50 mt-0.5">
                  <span className="text-white/40">Depends on:</span>{" "}
                  {m.dependsOn.join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Suggestions (${data.suggestions.length})`}>
        <div className="space-y-3">
          {data.suggestions.map((s, i) => (
            <div
              key={i}
              className="rounded border border-white/10 p-4 hover:border-white/20"
            >
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      s.priority === "high"
                        ? "bg-red-500/20 text-red-300"
                        : s.priority === "medium"
                          ? "bg-yellow-500/20 text-yellow-300"
                          : "bg-white/10 text-white/60"
                    }`}
                  >
                    {s.priority}
                  </span>
                  <h3 className="font-semibold text-sm">{s.title}</h3>
                </div>
                <div className="text-[11px] font-mono text-white/40 shrink-0">
                  {s.file}
                  {s.line ? `:${s.line}` : ""}
                </div>
              </div>
              <div className="text-sm text-white/70 mb-2 flex gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-yellow-400/60" />
                <div>{s.problem}</div>
              </div>
              <div className="text-sm text-white/85 leading-relaxed pl-5">
                {s.suggestion}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {data.references.length > 0 && (
        <Section title="Reference material">
          <div className="space-y-2">
            {data.references.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded border border-white/10 p-3 hover:bg-white/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      <span className="text-[10px] uppercase text-white/40">
                        {r.kind}
                      </span>
                      {r.title}
                    </div>
                    <div className="text-xs text-white/60 mt-0.5">{r.why}</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-white/40 shrink-0" />
                </div>
              </a>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-[0.22em] text-white/40 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useMemo(() => `mmd-${Math.random().toString(36).slice(2)}`, []);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
    const clean = code.replace(/^```mermaid\s*/i, "").replace(/```$/, "").trim();
    mermaid
      .render(id, clean)
      .then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      })
      .catch((e) => {
        if (ref.current)
          ref.current.innerHTML = `<pre class="text-xs text-red-300 whitespace-pre-wrap">Mermaid error: ${
            (e as Error).message
          }\n\n${clean}</pre>`;
      });
  }, [code, id]);

  return (
    <div className="rounded border border-white/10 p-4 bg-white/[0.02] overflow-x-auto">
      <div ref={ref} />
    </div>
  );
}
