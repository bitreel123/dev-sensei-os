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
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useServerFn } from "@tanstack/react-start";
import {
  chatAboutAnalysis,
  type ScreenAnalysis,
  type FixSuggestion,
  type OverlayChatMessage,
} from "@/lib/screen-intel.functions";


type Props = {
  analysis: ScreenAnalysis;
  fix: FixSuggestion;
  initialMessages?: OverlayChatMessage[];
  onClose: () => void;
  onMessagesChange?: (messages: OverlayChatMessage[]) => void;
};

export function ScreenIntelOverlay({
  analysis,
  fix,
  initialMessages,
  onClose,
  onMessagesChange,
}: Props) {

  const [minimized, setMinimized] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [messages, setMessages] = useState<OverlayChatMessage[]>(initialMessages ?? []);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const askFollowUp = useServerFn(chatAboutAnalysis);
  const scrollRef = useRef<HTMLDivElement>(null);

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

      <div className="flex px-3 pt-2 shrink-0">
        <div className="inline-flex items-center gap-1.5 rounded bg-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white">
          <FileText className="h-3 w-3" />
          Analysis
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 py-3">
        <AnalysisBody analysis={analysis} fix={fix} />
      </div>

    </div>
  );
}

export function AnalysisBody({ analysis, fix }: { analysis: ScreenAnalysis; fix: FixSuggestion }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40 mb-1">
          What's on screen
        </div>
        <p className="text-[12.5px] text-white/85 leading-relaxed">{analysis.summary}</p>
        {(analysis.editor || analysis.language) && (
          <p className="mt-1 text-[10.5px] font-mono text-white/45">
            {analysis.editor ?? "editor"} · {analysis.language ?? "unknown"}
          </p>
        )}
      </div>

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

      {analysis.suspectFiles.length > 0 && (
        <div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40 mb-1">
            Suspect files
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

      <div className="border-t border-white/10 pt-3">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40 mb-1">
          Plain-English explanation
        </div>
        <p className="text-[12.5px] text-white/90 leading-relaxed">{fix.plainExplanation}</p>
        <p className="mt-2 text-[12px] text-white/70 leading-relaxed">{fix.whyItHappened}</p>
      </div>

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

