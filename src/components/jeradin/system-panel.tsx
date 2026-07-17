import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Send, Network, Layers, GitBranch, Zap, Database, Sparkles, ShieldCheck, Gauge, AlertTriangle, Wrench, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import {
  listCodeRepos, startCodeScan, getScanStatus, runIntelMode, resyncCodeRepo,
  type CodeRepoRow, type ScanStatusRow, type IntelMode, type IntelResult,
} from "@/lib/code-graph.functions";
import { listMyGithubRepos } from "@/lib/repo-intel.functions";

function MermaidDiagram({ chart }: { chart: string }) {
  return (
    <pre className="text-[11px] font-mono text-white/70 bg-black/40 border border-white/10 rounded p-3 overflow-x-auto whitespace-pre">
      {chart}
    </pre>
  );
}

const MODE_META: Array<{ id: IntelMode; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }> = [
  { id: "architecture", label: "Architecture", icon: Layers, hint: "How the codebase is organised" },
  { id: "dependency", label: "Dependencies", icon: GitBranch, hint: "Packages, risks, unused deps" },
  { id: "impact", label: "Impact", icon: Zap, hint: "What breaks if I change this file?" },
  { id: "dataflow", label: "Data Flow", icon: Database, hint: "Routes ↔ database tables" },
  { id: "business", label: "Business Logic", icon: Sparkles, hint: "Features in plain English" },
  { id: "knowledge", label: "Knowledge", icon: HelpCircle, hint: "Ask any question about the repo" },
  { id: "security", label: "Security", icon: ShieldCheck, hint: "Auth gaps, secret leaks, missing RLS" },
  { id: "performance", label: "Performance", icon: Gauge, hint: "N+1, slow paths, oversized bundles" },
  { id: "debt", label: "Tech Debt", icon: AlertTriangle, hint: "TODOs, dead code, hotspots" },
  { id: "refactor", label: "Refactor", icon: Wrench, hint: "Concrete refactor recommendations" },
];

function fmtRelative(iso: string | null): string {
  if (!iso) return "never";
  const t = Date.parse(iso);
  const ago = Date.now() - t;
  const m = Math.floor(ago / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function SystemPanel() {
  const listRepos = useServerFn(listMyGithubRepos);
  const listMine = useServerFn(listCodeRepos);
  const startScan = useServerFn(startCodeScan);
  const pollScan = useServerFn(getScanStatus);
  const resync = useServerFn(resyncCodeRepo);
  const runMode = useServerFn(runIntelMode);

  const [ghRepos, setGhRepos] = useState<Array<{ full_name: string }>>([]);
  const [myRepos, setMyRepos] = useState<CodeRepoRow[]>([]);
  const [repoInput, setRepoInput] = useState("");
  const [activeRepo, setActiveRepo] = useState<CodeRepoRow | null>(null);
  const [scan, setScan] = useState<ScanStatusRow | null>(null);
  const [mode, setMode] = useState<IntelMode | null>(null);
  const [question, setQuestion] = useState("");
  const [focusPath, setFocusPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntelResult | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    listRepos().then((r: { repos: Array<{ full_name: string }> }) => setGhRepos(r.repos)).catch(() => undefined);
    listMine().then((r: { repos: CodeRepoRow[] }) => {
      setMyRepos(r.repos);
      if (r.repos[0]) setActiveRepo(r.repos[0]);
    }).catch(() => undefined);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [listRepos, listMine]);

  async function refreshMine() {
    const r = (await listMine()) as { repos: CodeRepoRow[] };
    setMyRepos(r.repos);
    if (activeRepo) {
      const found = r.repos.find((x) => x.id === activeRepo.id);
      if (found) setActiveRepo(found);
    }
  }

  async function beginScan(name: string) {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const { scanId, repoId } = await startScan({ data: { fullName: name } });
      toast.success("Scan started");
      // Start polling
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(async () => {
        const { scan: s } = await pollScan({ data: { scanId } });
        setScan(s);
        if (s && (s.status === "done" || s.status === "error")) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          await refreshMine();
          const r = await listMine();
          const found = r.repos.find((x) => x.id === repoId);
          if (found) setActiveRepo(found);
          setBusy(false);
          if (s.status === "error") toast.error(s.error ?? "Scan failed");
          else toast.success("Scan complete");
        }
      }, 1500);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function doResync() {
    if (!activeRepo) return;
    setBusy(true);
    try {
      const r = await resync({ data: { repoId: activeRepo.id } });
      toast.success(r.skipped ? "Already up to date" : `Updated ${r.updated} file(s)`);
      await refreshMine();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function runSelectedMode() {
    if (!activeRepo || !mode) return;
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const r = await runMode({
        data: {
          repoId: activeRepo.id,
          mode,
          question: question.trim() || undefined,
          focusPath: focusPath.trim() || undefined,
        },
      });
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isScanning = scan?.status === "running" || scan?.status === "pending";
  const progress = scan?.files_total ? Math.round((scan.files_done / scan.files_total) * 100) : 0;
  const scannedRepo = activeRepo && activeRepo.file_count > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <Network className="h-4 w-4 mt-0.5 text-orange-400" />
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/90">System Intelligence</div>
          <p className="text-[12.5px] text-white/55 mt-1 max-w-[560px]">
            A living map of your codebase. Scan a repo once — then ask across 10 modes: architecture, impact, security, data flow, and more.
          </p>
        </div>
      </div>

      {/* Repo picker + scan */}
      <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02] space-y-3">
        {myRepos.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {myRepos.map((r) => (
              <button
                key={r.id}
                onClick={() => { setActiveRepo(r); setResult(null); setMode(null); }}
                className={`px-2.5 py-1 rounded border font-mono text-[10.5px] tracking-[0.15em] ${
                  activeRepo?.id === r.id ? "border-white bg-white text-black" : "border-white/15 text-white/70 hover:border-white/40"
                }`}
                title={`${r.file_count} files · scanned ${fmtRelative(r.last_scanned_at)}`}
              >
                {r.full_name}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            list="sys-repos"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            placeholder="owner/repo — scan a new codebase"
            className="flex-1 bg-black/40 border border-white/15 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-white/40"
          />
          <datalist id="sys-repos">
            {ghRepos.slice(0, 200).map((r) => <option key={r.full_name} value={r.full_name} />)}
          </datalist>
          <button
            onClick={() => beginScan(repoInput)}
            disabled={busy || !/^[^/]+\/[^/]+$/.test(repoInput)}
            className="inline-flex items-center gap-1.5 bg-white text-black px-3 py-1.5 rounded font-mono text-[10.5px] uppercase tracking-[0.22em] hover:bg-white/90 disabled:opacity-40"
          >
            {busy && isScanning ? <><Loader2 className="h-3 w-3 animate-spin" /> Scanning</> : <>Scan</>}
          </button>
          {activeRepo && (
            <button
              onClick={doResync}
              disabled={busy}
              className="inline-flex items-center gap-1.5 border border-white/15 text-white/80 px-3 py-1.5 rounded font-mono text-[10.5px] uppercase tracking-[0.22em] hover:border-white/40 disabled:opacity-40"
              title="Re-sync from GitHub"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>

        {activeRepo && (
          <div className="font-mono text-[10.5px] text-white/50">
            {activeRepo.file_count} files · {activeRepo.symbol_count} symbols · {activeRepo.edge_count} edges · scanned {fmtRelative(activeRepo.last_scanned_at)}
          </div>
        )}

        {isScanning && scan && (
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-[10.5px] text-white/60">
              <span>{scan.phase ?? "working"}</span>
              <span>{scan.files_done}/{scan.files_total} ({progress}%)</span>
            </div>
            <div className="h-1 rounded bg-white/10 overflow-hidden">
              <div className="h-full bg-orange-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Mode chips */}
      {scannedRepo && (
        <div className="mt-4">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50 mb-2">Choose a mode</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
            {MODE_META.map(({ id, label, icon: Icon, hint }) => (
              <button
                key={id}
                onClick={() => { setMode(id); setResult(null); }}
                title={hint}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded border text-left ${
                  mode === id ? "border-white bg-white text-black" : "border-white/15 text-white/80 hover:border-white/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="font-mono text-[10.5px] uppercase tracking-[0.15em] truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mode input */}
      {scannedRepo && mode && (
        <div className="mt-3 border border-white/10 rounded-lg p-4 bg-white/[0.02] space-y-2">
          {mode === "impact" && (
            <input
              value={focusPath}
              onChange={(e) => setFocusPath(e.target.value)}
              placeholder="Focus file path — e.g. src/components/AuthForm.tsx"
              className="w-full bg-black/40 border border-white/15 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-white/40"
            />
          )}
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              mode === "knowledge" ? "Ask anything about this codebase…"
              : mode === "impact" ? "Optional: what change are you considering?"
              : "Optional: narrow the analysis (leave blank for a full overview)"
            }
            rows={2}
            className="w-full bg-black/40 border border-white/15 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-white/40 resize-none"
          />
          <button
            onClick={runSelectedMode}
            disabled={busy || (mode === "impact" && !focusPath.trim()) || (mode === "knowledge" && !question.trim())}
            className="inline-flex items-center gap-1.5 bg-white text-black px-4 py-1.5 rounded font-mono text-[10.5px] uppercase tracking-[0.22em] hover:bg-white/90 disabled:opacity-40"
          >
            {busy ? <><Loader2 className="h-3 w-3 animate-spin" /> Running</> : <>Run <Send className="h-3 w-3" /></>}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 border border-red-400/25 bg-red-500/10 rounded-lg p-4 text-sm text-red-100 flex gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-300 mt-0.5" />
          <p className="leading-relaxed">{error}</p>
        </div>
      )}

      {result && <ModeResult result={result} />}
    </div>
  );
}

function ModeResult({ result }: { result: IntelResult }) {
  return (
    <div className="mt-4 border border-white/10 rounded-lg p-5 bg-white/[0.02] space-y-5">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-orange-400 mb-1">{result.mode}</div>
        <h3 className="text-lg text-white leading-snug">{result.headline}</h3>
        <p className="text-[13px] text-white/70 mt-2 leading-relaxed whitespace-pre-line">{result.summary}</p>
      </div>

      {result.mermaid && (
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50 mb-2">Diagram</div>
          <MermaidDiagram chart={result.mermaid} />
        </div>
      )}

      {result.sections?.map((s, i) => (
        <div key={i}>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/60 mb-1.5">{s.title}</div>
          <ul className="space-y-1 text-[13px] text-white/80">
            {s.bullets.map((b, j) => (
              <li key={j} className="flex gap-2"><span className="text-white/30">·</span><span className="leading-relaxed">{b}</span></li>
            ))}
          </ul>
        </div>
      ))}

      {result.findings?.length > 0 && (
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/60 mb-2">Findings</div>
          <div className="space-y-2">
            {result.findings.map((f, i) => (
              <div key={i} className="border border-white/10 rounded p-3 bg-black/20">
                <div className="flex items-center gap-2 mb-1">
                  {f.severity && (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider ${
                      f.severity === "high" ? "bg-red-500/20 text-red-200" :
                      f.severity === "medium" ? "bg-yellow-500/20 text-yellow-200" :
                      "bg-white/10 text-white/60"
                    }`}>{f.severity}</span>
                  )}
                  <span className="text-[13px] text-white font-medium">{f.title}</span>
                  {f.file && <span className="font-mono text-[10.5px] text-white/40 ml-auto">{f.file}{f.line ? `:${f.line}` : ""}</span>}
                </div>
                <p className="text-[12.5px] text-white/70 leading-relaxed">{f.detail}</p>
                <p className="text-[12.5px] text-orange-200/90 mt-1.5 leading-relaxed">→ {f.suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.citations?.length > 0 && (
        <div className="pt-2 border-t border-white/5">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/40 mb-1.5">Sources</div>
          <div className="flex flex-wrap gap-1.5">
            {result.citations.map((c, i) => (
              <span key={i} className="font-mono text-[10.5px] text-white/50 border border-white/10 rounded px-1.5 py-0.5">{c.path}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
