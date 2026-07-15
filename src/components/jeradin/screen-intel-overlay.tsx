import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  X,
  Minus,
  Pin,
  PinOff,
  GripHorizontal,
  Send,
  Loader2,
  AlertTriangle,
  MessageSquare,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
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

type Tab = "analysis" | "chat";

export function ScreenIntelOverlay({
  analysis,
  fix,
  initialMessages = [],
  onClose,
  onMessagesChange,
}: Props) {
  const askFollowUp = useServerFn(chatAboutAnalysis);
  const [tab, setTab] = useState<Tab>("analysis");
  const [minimized, setMinimized] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [messages, setMessages] = useState<OverlayChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

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

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    const next: OverlayChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    setTab("chat");
    try {
      const { reply } = await askFollowUp({
        data: {
          analysis: analysis as ScreenAnalysis & Record<string, unknown>,
          fix,
          messages: next,
        },
      });
      const updated: OverlayChatMessage[] = [...next, { role: "assistant", content: reply }];
      setMessages(updated);
      onMessagesChange?.(updated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to reply";
      toast.error(msg);
      setMessages(next); // keep user message
    } finally {
      setSending(false);
    }
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

      {/* Tabs */}
      <div className="flex px-2 pt-2 gap-1 shrink-0">
        <TabBtn active={tab === "analysis"} onClick={() => setTab("analysis")} icon={<FileText className="h-3 w-3" />}>
          Analysis
        </TabBtn>
        <TabBtn
          active={tab === "chat"}
          onClick={() => setTab("chat")}
          icon={<MessageSquare className="h-3 w-3" />}
        >
          Chat {messages.length > 0 && `· ${messages.length}`}
        </TabBtn>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 py-3">
        {tab === "analysis" ? (
          <AnalysisBody analysis={analysis} fix={fix} />
        ) : (
          <ChatBody messages={messages} sending={sending} />
        )}
      </div>

    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-[0.2em] ${
        active ? "bg-white/10 text-white" : "text-white/45 hover:text-white/80"
      }`}
    >
      {icon}
      {children}
    </button>
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

function ChatBody({
  messages,
  sending,
}: {
  messages: OverlayChatMessage[];
  sending: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  if (messages.length === 0 && !sending) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-4 text-white/50">
        <MessageSquare className="h-6 w-6 mb-2 text-white/30" />
        <p className="text-[12.5px]">
          Ask a follow-up about the analysis, the fix, or anything adjacent.
        </p>
        <p className="mt-1 text-[10.5px] font-mono uppercase tracking-[0.2em] text-white/35">
          with full analysis context
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((m, i) => (
        <div
          key={i}
          className={`text-[12.5px] leading-relaxed ${
            m.role === "user" ? "text-white" : "text-white/85"
          }`}
        >
          <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40 mb-1">
            {m.role === "user" ? "You" : "Jeradin"}
          </div>
          <div className="whitespace-pre-wrap">{m.content}</div>
        </div>
      ))}
      {sending && (
        <div className="text-[12px] text-white/50 inline-flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
        </div>
      )}
      <div ref={bottomRef} />
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

