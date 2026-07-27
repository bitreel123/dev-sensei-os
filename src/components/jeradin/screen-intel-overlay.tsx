import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  X,
  Minus,
  Pin,
  PinOff,
  GripHorizontal,
  AlertTriangle,
  FileText,
  Send,
  Loader2,
  Github,
  Zap,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { MessageResponse } from "@/components/ai-elements/message";
import { useServerFn } from "@tanstack/react-start";
import {
  analyzeScreenAndSuggestFix,
  chatAboutAnalysis,
  type ScreenAnalysis,
  type FixSuggestion,
  type OverlayChatMessage,
} from "@/lib/screen-intel.functions";
import {
  listMyGithubRepos,
  getActiveRepo,
  setActiveRepo,
} from "@/lib/repo-intel.functions";


// -----------------------------------------------------------------------------
// Project Intelligence — active-repo picker
// -----------------------------------------------------------------------------
// Lets the developer pick which of their GitHub repos Screen Intelligence
// should search when analyzing screenshots. Persisted on the server as
// github_connections.active_repo and read automatically by the fixer.
function RepoPicker() {
  const loadRepos = useServerFn(listMyGithubRepos);
  const loadActive = useServerFn(getActiveRepo);
  const saveActive = useServerFn(setActiveRepo);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(true);
  const [active, setActive] = useState<string | null>(null);
  const [repos, setRepos] = useState<Array<{ full_name: string; private: boolean }>>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    loadActive({})
      .then((r) => {
        setActive(r.activeRepo);
        setConnected(r.connected);
      })
      .catch(() => {
        /* not signed in / no conn */
      });
  }, [loadActive]);

  async function ensureRepos() {
    if (repos.length > 0) return;
    setLoading(true);
    try {
      const r = await loadRepos({});
      setConnected(r.connected);
      setRepos(r.repos.map((x) => ({ full_name: x.full_name, private: x.private })));
    } catch {
      setRepos([]);
    } finally {
      setLoading(false);
    }
  }

  async function pick(repo: string | null) {
    setActive(repo);
    setOpen(false);
    try {
      await saveActive({ data: { repo } });
    } catch {
      /* keep local state; user can retry */
    }
  }

  const label = active ?? (connected ? "Pick project repo" : "Connect GitHub");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!connected) {
            window.location.href = "/chat";
            return;
          }
          setOpen((o) => !o);
          void ensureRepos();
        }}
        className="inline-flex items-center gap-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/80 max-w-[220px]"
        title={active ? `Active project: ${active}` : "Choose the repo Jeradin should search"}
      >
        <Github className="h-3 w-3 text-white/60" />
        <span className="truncate">{label}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-64 rounded-lg bg-black border border-white/15 shadow-xl z-[10000] overflow-hidden">
          <div className="p-2 border-b border-white/10">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search repos…"
              className="w-full bg-white/5 rounded px-2 py-1 text-[12px] text-white placeholder:text-white/40 outline-none border border-transparent focus:border-white/20"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {loading && (
              <div className="p-3 text-[11px] text-white/50 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </div>
            )}
            {!loading && repos.length === 0 && (
              <div className="p-3 text-[11px] text-white/50">
                No repos found. Connect GitHub in Chat.
              </div>
            )}
            {!loading &&
              repos
                .filter((r) => !filter || r.full_name.toLowerCase().includes(filter.toLowerCase()))
                .slice(0, 60)
                .map((r) => (
                  <button
                    key={r.full_name}
                    onClick={() => pick(r.full_name)}
                    className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-white/10 flex items-center gap-2 ${
                      active === r.full_name ? "bg-white/10 text-white" : "text-white/80"
                    }`}
                  >
                    <span className="truncate flex-1">{r.full_name}</span>
                    {r.private && (
                      <span className="text-[9px] uppercase tracking-wider text-white/40">
                        private
                      </span>
                    )}
                  </button>
                ))}
          </div>
          {active && (
            <button
              onClick={() => pick(null)}
              className="w-full text-left px-3 py-1.5 text-[11px] text-white/50 hover:bg-white/10 border-t border-white/10"
            >
              Clear active project
            </button>
          )}
        </div>
      )}
    </div>
  );
}





type Props = {
  analysis: ScreenAnalysis;
  fix: FixSuggestion;
  initialMessages?: OverlayChatMessage[];
  onClose: () => void;
  onMessagesChange?: (messages: OverlayChatMessage[]) => void;
  // Optional: raw screenshot base64 + note so the overlay can re-run a
  // "Deep Dive" (Claude + GitHub) against the same frame.
  screenshotBase64?: string | null;
  note?: string | null;
  onResultReplace?: (next: { analysis: ScreenAnalysis; fix: FixSuggestion }) => void;
};

export function ScreenIntelOverlay({
  analysis,
  fix,
  initialMessages,
  onClose,
  onMessagesChange,
  screenshotBase64,
  note,
  onResultReplace,
}: Props) {

  const [minimized, setMinimized] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [messages, setMessages] = useState<OverlayChatMessage[]>(initialMessages ?? []);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [deepDiving, setDeepDiving] = useState(false);
  const [deepError, setDeepError] = useState<string | null>(null);
  const [didDeepDive, setDidDeepDive] = useState(false);
  const askFollowUp = useServerFn(chatAboutAnalysis);
  const runAnalyze = useServerFn(analyzeScreenAndSuggestFix);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function runDeepDive() {
    if (!screenshotBase64 || deepDiving) return;
    setDeepDiving(true);
    setDeepError(null);
    try {
      const res = await runAnalyze({
        data: { imageBase64: screenshotBase64, note: note ?? "", mode: "deep" },
      });
      onResultReplace?.({ analysis: res.analysis, fix: res.fix });
      setDidDeepDive(true);
    } catch (e) {
      setDeepError((e as Error).message || "Deep dive failed");
    } finally {
      setDeepDiving(false);
    }
  }

  useEffect(() => {
    onMessagesChange?.(messages);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, onMessagesChange]);

  async function sendFollowUp() {
    const text = chatInput.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setChatInput("");
    setSending(true);
    try {
      const res = await askFollowUp({ data: { analysis, fix, messages: next } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMessages([
        ...next,
        { role: "assistant", content: `Sorry, I couldn't reply: ${(e as Error).message}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  // ---- Draggable positioning ----
  const [pos, setPos] = useState({ x: 24, y: 96 });

  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Restore last position
    try {
      const raw = localStorage.getItem("jeradin.overlay.pos");
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p?.x === "number" && typeof p?.y === "number") setPos(p);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("jeradin.overlay.pos", JSON.stringify(pos));
  }, [pos]);

  function onDragStart(e: React.PointerEvent) {
    if (pinned) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: pos.x, oy: pos.y };
  }
  function onDragMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const w = panelRef.current?.offsetWidth ?? 420;
    const h = panelRef.current?.offsetHeight ?? 500;
    const nx = Math.max(8, Math.min(window.innerWidth - w - 8, d.ox + (e.clientX - d.startX)));
    const ny = Math.max(8, Math.min(window.innerHeight - 60, d.oy + (e.clientY - d.startY)));
    setPos({ x: nx, y: ny });
  }
  function onDragEnd() {
    dragRef.current = null;
  }

  // ---- Minimized pill ----
  if (minimized) {
    return (
      <div
        className="fixed z-[9999] pointer-events-auto"
        style={{ left: pos.x, top: pos.y }}
      >
        <button
          onClick={() => setMinimized(false)}
          className="inline-flex items-center gap-2 bg-black border border-white/20 rounded-full px-4 py-2 shadow-2xl hover:border-white/40"
        >
          <Sparkles className="h-3.5 w-3.5 text-orange-400" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/85">
            Jeradin · analysis
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="fixed z-[9999] pointer-events-auto w-[440px] max-w-[calc(100vw-16px)] flex flex-col rounded-xl bg-black/95 backdrop-blur-xl border border-white/15 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)]"
      style={{ left: pos.x, top: pos.y, height: 560, maxHeight: "calc(100vh - 16px)" }}
    >
      {/* Header (drag handle) */}
      <div
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        className={`flex items-center gap-2 px-3 py-2 border-b border-white/10 rounded-t-xl ${
          pinned ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        <GripHorizontal className="h-3.5 w-3.5 text-white/40" />
        <Sparkles className="h-3.5 w-3.5 text-orange-400" />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/70 flex-1 truncate">
          Screen Intelligence
        </span>
        <button
          onClick={() => setPinned((p) => !p)}
          className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white"
          aria-label={pinned ? "Unpin" : "Pin"}
          title={pinned ? "Unpin (allow dragging)" : "Pin (lock in place)"}
        >
          {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => setMinimized(true)}
          className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white"
          aria-label="Minimize"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 pt-2 shrink-0">
        <div className="inline-flex items-center gap-1.5 rounded bg-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white">
          <FileText className="h-3 w-3" />
          {didDeepDive ? "Deep Analysis" : "Analysis"}
        </div>
        {!didDeepDive && (
          <button
            onClick={runDeepDive}
            disabled={deepDiving || !screenshotBase64}
            title={
              !screenshotBase64
                ? "Re-record to enable deep dive on this session"
                : "Re-analyze with Claude + your connected GitHub repo for a project-wide report"
            }
            className="inline-flex items-center gap-1.5 rounded bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-orange-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deepDiving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            {deepDiving ? "Deep diving…" : "Deep dive"}
          </button>
        )}

        <div className="ml-auto">
          <RepoPicker />
        </div>
      </div>
      {deepError && (
        <div className="mx-3 mt-1 text-[11px] text-red-300 font-mono">{deepError}</div>
      )}

      {/* Body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 py-3"
      >
        <AnalysisBody analysis={analysis} fix={fix} />

        {messages.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl bg-orange-500/90 text-white px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </div>
                ) : (
                  <MessageResponse className="text-[12.5px] text-white/90 leading-relaxed [&_pre]:max-w-full [&_pre]:whitespace-pre-wrap [&_code]:break-words">
                    {m.content}
                  </MessageResponse>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-[11px] text-white/50">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking…
              </div>
            )}
          </div>
        )}
      </div>

      {/* Follow-up composer */}
      <div className="shrink-0 border-t border-white/10 p-2">
        <div className="flex items-end gap-1.5 rounded-xl bg-white/5 border border-white/10 px-2 py-1.5 focus-within:border-white/25">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendFollowUp();
              }
            }}
            rows={1}
            placeholder="Ask a follow-up…"
            className="flex-1 resize-none bg-transparent text-[12.5px] text-white placeholder:text-white/35 outline-none max-h-24 py-1"
          />
          <button
            onClick={sendFollowUp}
            disabled={!chatInput.trim() || sending}
            className="p-1.5 rounded-lg bg-orange-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600"
            aria-label="Send"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}


export function AnalysisBody({ analysis, fix }: { analysis: ScreenAnalysis; fix: FixSuggestion }) {
  const stack = analysis.stack;
  const ctx = analysis.context;
  const stackChips: Array<{ label: string; value: string }> = [];
  if (stack?.framework) stackChips.push({ label: "Framework", value: stack.framework });
  if (stack?.language) stackChips.push({ label: "Language", value: stack.language });
  if (stack?.database) stackChips.push({ label: "Database", value: stack.database });
  if (stack?.runtime) stackChips.push({ label: "Runtime", value: stack.runtime });
  if (stack?.buildTool) stackChips.push({ label: "Build", value: stack.buildTool });
  if (ctx?.ide || analysis.editor) stackChips.push({ label: "IDE", value: (ctx?.ide ?? analysis.editor)! });

  return (
    <div className="space-y-4">
      <div>
        <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40 mb-1">
          What's on screen
        </div>
        <p className="text-[12.5px] text-white/85 leading-relaxed">{analysis.summary}</p>
        {(ctx?.currentFile || ctx?.cursorLine || ctx?.workflow) && (
          <p className="mt-1 text-[10.5px] font-mono text-white/45">
            {ctx?.currentFile ?? ""}
            {ctx?.cursorLine ? `:${ctx.cursorLine}` : ""}
            {ctx?.workflow ? ` · ${ctx.workflow}` : ""}
          </p>
        )}
      </div>

      {stackChips.length > 0 && (
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40 mb-1.5">
            Detected stack
          </div>
          <div className="flex flex-wrap gap-1.5">
            {stackChips.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-white/80">
                <span className="text-white/40">{c.label}:</span> {c.value}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.errors.length > 0 && (
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40 mb-1.5">
            Errors detected
          </div>
          <ul className="space-y-1.5">
            {analysis.errors.map((err, i) => (
              <li
                key={i}
                className="flex gap-2 text-[12px] text-white/80 border border-white/10 bg-white/[0.02] p-2 rounded"
              >
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-red-400" />
                <div className="min-w-0">
                  <div className="break-words">{err.message}</div>
                  <div className="mt-0.5 text-[10px] font-mono text-white/40">
                    [{err.source}]
                    {err.file ? ` ${err.file}${err.line ? `:${err.line}` : ""}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-white/10 pt-3">
        <div className="flex items-center justify-between mb-1">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40">
            Root cause
          </div>
          {typeof fix.confidence === "number" && (
            <span className="font-mono text-[10px] text-emerald-400/90">
              {fix.confidence}% confidence
            </span>
          )}
        </div>
        <p className="text-[12.5px] text-white/90 leading-relaxed">{analysis.hypothesis}</p>
        {(analysis.affectedFunction || analysis.affectedDependency) && (
          <p className="mt-1 text-[10.5px] font-mono text-white/50">
            {analysis.affectedFunction ? `fn ${analysis.affectedFunction}` : ""}
            {analysis.affectedDependency ? `${analysis.affectedFunction ? " · " : ""}pkg ${analysis.affectedDependency}` : ""}
          </p>
        )}
      </div>

      {analysis.suspectFiles.length > 0 && (
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40 mb-1">
            Affected files
          </div>
          <div className="flex flex-wrap gap-1">
            {analysis.suspectFiles.map((f, i) => (
              <span
                key={i}
                className="font-mono text-[10.5px] text-white/80 border border-white/15 px-1.5 py-0.5 rounded"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-white/10 pt-3 grid gap-3">
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40 mb-1">
            Plain-English
          </div>
          <p className="text-[12.5px] text-white/90 leading-relaxed">{fix.plainExplanation}</p>
        </div>
        {fix.technicalExplanation && (
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40 mb-1">
              Technical
            </div>
            <p className="text-[12px] text-white/75 leading-relaxed">{fix.technicalExplanation}</p>
          </div>
        )}
        <p className="text-[12px] text-white/60 leading-relaxed">{fix.whyItHappened}</p>
      </div>

      {fix.recommendedActions && fix.recommendedActions.length > 0 && (
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40 mb-1.5">
            Recommended fix
          </div>
          <ul className="space-y-1">
            {fix.recommendedActions.map((a, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] text-white/85">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fix.impact && fix.impact.length > 0 && (
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40 mb-1.5">
            If not fixed
          </div>
          <ul className="space-y-1.5">
            {fix.impact.map((im, i) => (
              <li key={i} className="text-[12px] text-white/80 border border-red-500/20 bg-red-500/[0.04] p-2 rounded">
                <span className="font-medium text-red-300">{im.area}</span>
                <span className="text-white/60"> — {im.consequence}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fix.steps.length > 0 && (
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40 mb-1.5">
            Step-by-step fix
          </div>
          <ol className="space-y-2">
            {fix.steps.map((s, i) => (
              <li key={i} className="border border-white/10 bg-white/[0.02] p-2 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[9.5px] text-white/45">STEP {i + 1}</span>
                  <span className="font-mono text-[10.5px] text-white/85 truncate">{s.file}</span>
                </div>
                <p className="text-[12px] text-white/80 leading-relaxed">{s.change}</p>
                {s.codeAfter && (
                  <div className="mt-2 rounded-md overflow-hidden border border-white/10">
                    <CodeBlock code={s.codeAfter} language={detectLang(s.file)} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {fix.learnMode && (
        <div className="border-t border-white/10 pt-3">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-orange-300/80 mb-1">
            Learn mode
          </div>
          <p className="text-[12px] text-white/80 leading-relaxed italic">{fix.learnMode}</p>
        </div>
      )}

      {fix.additionalNotes && (
        <p className="text-[11.5px] text-white/55 italic border-t border-white/10 pt-2">
          {fix.additionalNotes}
        </p>
      )}
    </div>
  );
}


function detectLang(file?: string | null): string {
  if (!file) return "typescript";
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx", cjs: "javascript", mjs: "javascript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java", kt: "kotlin", swift: "swift",
    php: "php", cs: "csharp", c: "c", h: "c", cpp: "cpp", hpp: "cpp",
    json: "json", yml: "yaml", yaml: "yaml", toml: "toml", md: "markdown",
    css: "css", scss: "scss", html: "html", sh: "bash", bash: "bash", sql: "sql",
  };
  return map[ext] ?? "typescript";
}

export function CodeBlock({ code, language = "typescript" }: { code: string; language?: string }) {
  return (
    <SyntaxHighlighter
      language={language}
      style={oneDark}
      wrapLongLines
      customStyle={{
        margin: 0,
        padding: "12px 14px",
        background: "#0b0f17",
        fontSize: "11.5px",
        lineHeight: "1.55",
        borderRadius: 0,
        overflowX: "visible",
        whiteSpace: "pre-wrap",
      }}
      codeTagProps={{ style: { whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" } }}
    >
      {code}
    </SyntaxHighlighter>
  );
}

