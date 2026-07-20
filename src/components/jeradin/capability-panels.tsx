import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Send, Network, BookOpen, Github, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { addHistoryEntry, updateHistoryEntry, getHistoryEntry } from "@/lib/chat-history";
import { analyzeSystem, listMyGithubRepos, type FileInput, type SystemAnalysis } from "@/lib/system-intel.functions";
import { runKnowledgeIntelligence, type KnowledgeReport } from "@/lib/knowledge-intel.functions";
import { runGithubIntelligence, type GithubIntelReport } from "@/lib/github-intel.functions";
import { SystemReportBody, KnowledgeReportBody, RepoReportBody } from "./intel-reports";

type PanelProps = {
  entryId: string | null;
  setEntryId: (id: string | null) => void;
};

function Header({ Icon, title, subtitle }: { Icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <Icon className="h-4 w-4 mt-0.5 text-orange-400" />
      <div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/90">{title}</div>
        <p className="text-[12.5px] text-white/55 mt-1 max-w-[560px]">{subtitle}</p>
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mt-4 border border-red-400/25 bg-red-500/10 rounded-lg p-4 text-sm text-red-100 flex gap-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-red-300 mt-0.5" />
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}

function AnalyzingBar() {
  return (
    <div className="flex items-center gap-3 py-8 text-white/70">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="font-mono text-[11px] uppercase tracking-[0.22em]">Analyzing…</span>
    </div>
  );
}

// ---------------- System ----------------
export function SystemPanel({ entryId, setEntryId }: PanelProps) {
  const navigate = useNavigate();
  const run = useServerFn(analyzeSystem);
  const listRepos = useServerFn(listMyGithubRepos);
  const [source, setSource] = useState<"github" | "upload">("github");
  const [repo, setRepo] = useState("");
  const [projectHint, setProjectHint] = useState("");
  const [files, setFiles] = useState<FileInput[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ analysis: SystemAnalysis; filesAnalyzed: number } | null>(null);
  const [repoOptions, setRepoOptions] = useState<Array<{ full_name: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!entryId) { setResult(null); return; }
    const e = getHistoryEntry(entryId);
    if (e?.payload?.system) {
      setResult({ analysis: e.payload.system.analysis, filesAnalyzed: e.payload.system.filesAnalyzed });
      setRepo(e.payload.system.input.repo ?? "");
      setProjectHint(e.payload.system.input.projectHint ?? "");
      setSource(e.payload.system.input.source);
    }
  }, [entryId]);

  useEffect(() => {
    listRepos().then((r) => setRepoOptions(r.repos)).catch(() => undefined);
  }, [listRepos]);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const input = source === "github"
        ? { source: "github" as const, repo, projectHint }
        : { source: "upload" as const, files, projectHint };
      const res = await run({ data: input });
      setResult(res);
      const title = source === "github" ? `System · ${repo}` : `System · ${files.length} files`;
      const entry = addHistoryEntry(title, {
        mode: "system",
        system: { analysis: res.analysis, filesAnalyzed: res.filesAnalyzed, input: { source, repo, projectHint } },
      });
      setEntryId(entry.id);
      navigate({ to: "/chat", search: { id: entry.id } });
      toast.success("System analysis complete");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onFilesPicked(list: FileList | null) {
    if (!list) return;
    const arr: FileInput[] = [];
    for (const f of Array.from(list)) {
      if (arr.length >= 60) break;
      try {
        const content = await f.text();
        arr.push({ path: f.webkitRelativePath || f.name, content: content.slice(0, 40_000) });
      } catch {}
    }
    setFiles(arr);
  }

  return (
    <div>
      <Header
        Icon={Network}
        title="System Intelligence"
        subtitle="Give Jeradin a codebase (GitHub repo or uploaded files) and get a plain-English map — modules, dependencies, and prioritised suggestions."
      />

      {!result && (
        <div className="border border-white/10 rounded-lg p-4 space-y-3 bg-white/[0.02]">
          <div className="flex gap-2 text-[11px] font-mono uppercase tracking-[0.2em]">
            <button
              onClick={() => setSource("github")}
              className={`px-2.5 py-1 rounded border ${source === "github" ? "border-white bg-white text-black" : "border-white/20 text-white/70"}`}
            >GitHub</button>
            <button
              onClick={() => setSource("upload")}
              className={`px-2.5 py-1 rounded border ${source === "upload" ? "border-white bg-white text-black" : "border-white/20 text-white/70"}`}
            >Upload files</button>
          </div>

          {source === "github" ? (
            <div className="space-y-2">
              <input
                list="sys-repos"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="owner/repo (e.g. facebook/react)"
                className="w-full bg-black/40 border border-white/15 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-white/40"
              />
              <datalist id="sys-repos">
                {repoOptions.slice(0, 200).map((r) => (
                  <option key={r.full_name} value={r.full_name} />
                ))}
              </datalist>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => { onFilesPicked(e.target.files); e.target.value = ""; }}
                className="text-[12px] text-white/70 file:bg-white/10 file:text-white file:border-0 file:px-3 file:py-1.5 file:mr-2 file:rounded file:font-mono file:text-[11px] file:uppercase file:tracking-[0.2em]"
              />
              {files.length > 0 && (
                <div className="mt-1 font-mono text-[10.5px] text-white/50">{files.length} files ready</div>
              )}
            </div>
          )}

          <textarea
            value={projectHint}
            onChange={(e) => setProjectHint(e.target.value)}
            placeholder="Optional context: what does this project do? What are you trying to improve?"
            rows={2}
            className="w-full bg-black/40 border border-white/15 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-white/40 resize-none"
          />

          <button
            onClick={submit}
            disabled={busy || (source === "github" ? !/^[^/]+\/[^/]+$/.test(repo) : files.length === 0)}
            className="inline-flex items-center gap-1.5 bg-white text-black px-4 py-1.5 rounded font-mono text-[10.5px] uppercase tracking-[0.22em] hover:bg-white/90 disabled:opacity-40"
          >
            {busy ? <><Loader2 className="h-3 w-3 animate-spin" /> Analyzing</> : <>Analyze codebase <Send className="h-3 w-3" /></>}
          </button>
        </div>
      )}

      {busy && !result && <AnalyzingBar />}
      {error && <ErrorBox message={error} />}

      {result && (
        <div className="mt-4 border border-white/10 rounded-lg p-5 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50">
              {result.filesAnalyzed} files analyzed
            </div>
            <button
              onClick={() => { setResult(null); setEntryId(null); navigate({ to: "/chat", search: {} }); }}
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50 hover:text-white"
            >
              New analysis
            </button>
          </div>
          <SystemReportBody analysis={result.analysis} />
        </div>
      )}
    </div>
  );
}

// ---------------- Knowledge ----------------
export function KnowledgePanel({ entryId, setEntryId }: PanelProps) {
  const navigate = useNavigate();
  const run = useServerFn(runKnowledgeIntelligence);
  const [question, setQuestion] = useState("");
  const [projectContext, setProjectContext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<KnowledgeReport | null>(null);

  useEffect(() => {
    if (!entryId) { setReport(null); return; }
    const e = getHistoryEntry(entryId);
    if (e?.payload?.knowledge) {
      setReport(e.payload.knowledge.report);
      setQuestion(e.payload.knowledge.input.question);
      setProjectContext(e.payload.knowledge.input.projectContext ?? "");
    }
  }, [entryId]);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await run({ data: { question, projectContext } });
      setReport(res.report);
      const entry = addHistoryEntry(`Knowledge · ${question.slice(0, 60)}`, {
        mode: "knowledge",
        knowledge: { report: res.report, input: { question, projectContext } },
      });
      setEntryId(entry.id);
      navigate({ to: "/chat", search: { id: entry.id } });
      toast.success("Knowledge report ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Research failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Header
        Icon={BookOpen}
        title="Knowledge Intelligence"
        subtitle="Ask what to build with. Jeradin searches GitHub, npm and Hugging Face and returns a plain-English shortlist of tools, models and next steps."
      />

      {!report && (
        <div className="border border-white/10 rounded-lg p-4 space-y-3 bg-white/[0.02]">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. 'What's the best way to add realtime chat with typing indicators to a Next.js app?'"
            rows={3}
            className="w-full bg-black/40 border border-white/15 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-white/40 resize-none"
          />
          <textarea
            value={projectContext}
            onChange={(e) => setProjectContext(e.target.value)}
            placeholder="Optional: describe your current stack / constraints (React + Supabase, small team, no budget for paid infra, etc.)"
            rows={2}
            className="w-full bg-black/40 border border-white/15 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-white/40 resize-none"
          />
          <button
            onClick={submit}
            disabled={busy || question.trim().length < 5}
            className="inline-flex items-center gap-1.5 bg-white text-black px-4 py-1.5 rounded font-mono text-[10.5px] uppercase tracking-[0.22em] hover:bg-white/90 disabled:opacity-40"
          >
            {busy ? <><Loader2 className="h-3 w-3 animate-spin" /> Researching</> : <>Research <Send className="h-3 w-3" /></>}
          </button>
        </div>
      )}

      {busy && !report && <AnalyzingBar />}
      {error && <ErrorBox message={error} />}

      {report && (
        <div className="mt-4 border border-white/10 rounded-lg p-5 bg-white/[0.02]">
          <div className="flex justify-end mb-3">
            <button
              onClick={() => { setReport(null); setEntryId(null); navigate({ to: "/chat", search: {} }); }}
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50 hover:text-white"
            >
              New research
            </button>
          </div>
          <KnowledgeReportBody report={report} />
        </div>
      )}
    </div>
  );
}

// ---------------- Repo (GitHub audit) ----------------
export function RepoPanel({ entryId, setEntryId }: PanelProps) {
  const navigate = useNavigate();
  const run = useServerFn(runGithubIntelligence);
  const listRepos = useServerFn(listMyGithubRepos);
  const [repo, setRepo] = useState("");
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<GithubIntelReport | null>(null);
  const [repoOptions, setRepoOptions] = useState<Array<{ full_name: string }>>([]);

  useEffect(() => {
    if (!entryId) { setReport(null); return; }
    const e = getHistoryEntry(entryId);
    if (e?.payload?.repo) {
      setReport(e.payload.repo.report);
      setRepo(e.payload.repo.input.repo);
      setFocus(e.payload.repo.input.focus ?? "");
    }
  }, [entryId]);

  useEffect(() => {
    listRepos().then((r) => setRepoOptions(r.repos)).catch(() => undefined);
  }, [listRepos]);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await run({ data: { repo, focus } });
      setReport(res.report);
      const entry = addHistoryEntry(`Repo · ${repo}`, {
        mode: "repo",
        repo: { report: res.report, input: { repo, focus } },
      });
      setEntryId(entry.id);
      navigate({ to: "/chat", search: { id: entry.id } });
      toast.success("Repo audit complete");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Audit failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Header
        Icon={Github}
        title="Repo Intelligence"
        subtitle="Point Jeradin at a repo and it audits commits, PRs, issues and dependencies — surfacing risks, opportunities and patterns in plain English."
      />

      {!report && (
        <div className="border border-white/10 rounded-lg p-4 space-y-3 bg-white/[0.02]">
          <input
            list="repo-audit-repos"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo (e.g. vercel/next.js)"
            className="w-full bg-black/40 border border-white/15 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-white/40"
          />
          <datalist id="repo-audit-repos">
            {repoOptions.slice(0, 200).map((r) => (
              <option key={r.full_name} value={r.full_name} />
            ))}
          </datalist>
          <textarea
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Optional focus: 'Why did the last release regress performance?' or 'Look at auth-related PRs'"
            rows={2}
            className="w-full bg-black/40 border border-white/15 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-white/40 resize-none"
          />
          <button
            onClick={submit}
            disabled={busy || !/^[^/]+\/[^/]+$/.test(repo)}
            className="inline-flex items-center gap-1.5 bg-white text-black px-4 py-1.5 rounded font-mono text-[10.5px] uppercase tracking-[0.22em] hover:bg-white/90 disabled:opacity-40"
          >
            {busy ? <><Loader2 className="h-3 w-3 animate-spin" /> Auditing</> : <>Audit repo <Send className="h-3 w-3" /></>}
          </button>
        </div>
      )}

      {busy && !report && <AnalyzingBar />}
      {error && <ErrorBox message={error} />}

      {report && (
        <div className="mt-4 border border-white/10 rounded-lg p-5 bg-white/[0.02]">
          <div className="flex justify-end mb-3">
            <button
              onClick={() => { setReport(null); setEntryId(null); navigate({ to: "/chat", search: {} }); }}
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50 hover:text-white"
            >
              New audit
            </button>
          </div>
          <RepoReportBody report={report} />
        </div>
      )}
    </div>
  );
}
