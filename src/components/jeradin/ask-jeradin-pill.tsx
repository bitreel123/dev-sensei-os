// "Ask Jeradin" — Android-style floating pill + attached bottom sheet.
//
// UX contract:
//   1. When screen recording stops, chat.tsx passes a captured frame + note here.
//   2. The sheet auto-opens on top of the current view and immediately kicks
//      off the streaming analysis so the user sees results without extra taps.
//   3. Users can minimise back to a floating pill (never navigating away) and
//      re-open the sheet at will.
//   4. Sections stream progressively:
//         Thinking → Reading screen → Understanding code → Finding errors → Generating fixes
//   5. Deep Dive, Learn Mode and a follow-up chat composer live inside the
//      sheet so the user never has to leave to reach the full experience.

import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, X, Check, AlertTriangle, Zap, Send, ChevronDown } from "lucide-react";
import { streamIntel, type IntelStreamEvent } from "@/lib/intel-stream";
import { AnalysisBody } from "@/components/jeradin/screen-intel-overlay";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  analyzeScreenAndSuggestFix,
  chatAboutAnalysis,
  type ScreenAnalysis,
  type FixSuggestion,
  type OverlayChatMessage,
} from "@/lib/screen-intel.functions";

export type PendingAsk = {
  imageBase64: string;
  note: string;
  title: string;
  sessionId: string;
  targetTabTitle?: string;
};

type Props = {
  pending: PendingAsk;
  onDismiss: () => void;
  onComplete?: (result: { analysis: ScreenAnalysis; fix: FixSuggestion }) => void;
};

type Stage = { id: string; label: string; status: "running" | "done" | "error"; message?: string };

export function AskJeradinPill({ pending, onDismiss, onComplete }: Props) {
  // Auto-open the sheet the moment the pill mounts so users don't have to hunt
  // for a small floating button — they immediately see the analysis stream.
  const [open, setOpen] = useState(true);
  const [stages, setStages] = useState<Stage[]>([]);
  const [analysis, setAnalysis] = useState<ScreenAnalysis | null>(null);
  const [fix, setFix] = useState<FixSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [deepDiving, setDeepDiving] = useState(false);
  const [didDeepDive, setDidDeepDive] = useState(false);
  const [deepError, setDeepError] = useState<string | null>(null);
  const [messages, setMessages] = useState<OverlayChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);
  const runDeep = useServerFn(analyzeScreenAndSuggestFix);
  const askFollowUp = useServerFn(chatAboutAnalysis);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function startStream() {
    if (startedRef.current) return;
    startedRef.current = true;
    setError(null);
    setStages([]);
    setAnalysis(null);
    setFix(null);
    setDone(false);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamIntel(
        "/api/intel/screen/stream",
        { imageBase64: pending.imageBase64, note: pending.note, sessionId: pending.sessionId },
        (event: IntelStreamEvent) => {
          if (event.type === "stage") {
            setStages((prev) => {
              const idx = prev.findIndex((s) => s.id === event.id);
              const next: Stage = { id: event.id, label: event.label, status: event.status, message: event.message };
              if (idx >= 0) {
                const copy = prev.slice();
                copy[idx] = next;
                return copy;
              }
              return [...prev, next];
            });
          } else if (event.type === "section") {
            const data = event.data as { analysis?: ScreenAnalysis; fix?: FixSuggestion };
            if (data.analysis) setAnalysis(data.analysis);
            if (data.fix) setFix(data.fix);
          } else if (event.type === "section-error") {
            setError(event.message);
          } else if (event.type === "done") {
            setDone(true);
          } else if (event.type === "error") {
            setError(event.message);
          }
        },
        controller.signal,
      );
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Analysis failed");
    }
  }

  // Kick off the stream automatically the first time the sheet mounts.
  useEffect(() => {
    void startStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire onComplete once, after both sections + done arrive.
  useEffect(() => {
    if (done && analysis && fix) onComplete?.({ analysis, fix });
  }, [done, analysis, fix, onComplete]);

  async function handleDeepDive() {
    if (!analysis || deepDiving) return;
    setDeepDiving(true);
    setDeepError(null);
    try {
      const res = await runDeep({
        data: { imageBase64: pending.imageBase64, note: pending.note, mode: "deep" },
      });
      setAnalysis(res.analysis);
      setFix(res.fix);
      setDidDeepDive(true);
    } catch (e) {
      setDeepError(e instanceof Error ? e.message : "Deep dive failed");
    } finally {
      setDeepDiving(false);
    }
  }

  async function sendFollowUp(textOverride?: string, truncateAt?: number) {
    const text = (textOverride ?? chatInput).trim();
    if (!text || sending || !analysis || !fix) return;
    const base = typeof truncateAt === "number" ? messages.slice(0, truncateAt) : messages;
    const next = [...base, { role: "user" as const, content: text }];
    setMessages(next);
    if (textOverride === undefined) setChatInput("");
    setSending(true);
    try {
      const res = await askFollowUp({ data: { analysis, fix, messages: next } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: `Sorry, I couldn't reply: ${(e as Error).message}` }]);
    } finally {
      setSending(false);
    }
  }


  function handleMinimize() {
    setOpen(false);
  }

  function handleClose() {
    abortRef.current?.abort();
    setOpen(false);
    onDismiss();
  }

  // ---------- Minimized floating pill ----------
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed z-[10000] bottom-24 right-4 md:bottom-8 md:right-8 inline-flex items-center gap-2 rounded-full bg-black text-white border border-white/25 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] px-4 py-2.5 hover:border-orange-400/70 transition-colors group"
        aria-label="Ask Jeradin"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-70" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400" />
        </span>
        <Sparkles className="h-4 w-4 text-orange-400" />
        <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
          {done ? "Ask Jeradin — Ready" : "Ask Jeradin"}
        </span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="ml-1 rounded-full p-0.5 hover:bg-white/10 text-white/50 group-hover:text-white cursor-pointer"
          role="button"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" />
        </span>
      </button>
    );
  }

  // ---------- Attached bottom sheet ----------
  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto" onClick={handleMinimize} />
      <div
        className="absolute pointer-events-auto bg-black/95 border-white/15 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.9)]
                   left-0 right-0 bottom-0 rounded-t-2xl border-t
                   md:left-auto md:right-4 md:bottom-4 md:top-16 md:w-[480px] md:rounded-2xl md:border
                   flex flex-col max-h-[92vh]"
      >
        <div className="pt-2 pb-1 flex items-center justify-center md:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
          <Sparkles className="h-4 w-4 text-orange-400" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/80 flex-1 truncate">
            Ask Jeradin {didDeepDive ? "— Deep" : ""}
          </span>
          <button
            onClick={handleMinimize}
            className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
            aria-label="Minimize"
            title="Minimize"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 py-3 space-y-4">
          {(!analysis || !fix) && (
            <div className="space-y-1.5">
              {stages.length === 0 && (
                <div className="flex items-center gap-2 text-[12px] text-white/60">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" />
                  Starting…
                </div>
              )}
              {stages.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-[12px]">
                  {s.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400 shrink-0" />}
                  {s.status === "done" && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                  {s.status === "error" && <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                  <span
                    className={
                      s.status === "done"
                        ? "text-white/50 line-through"
                        : s.status === "error"
                          ? "text-red-300"
                          : "text-white/85"
                    }
                  >
                    {s.label}
                    {s.status === "running" ? "…" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}

          {error && !analysis && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
              {error}
            </div>
          )}

          {analysis && (
            <>
              {/* Deep dive control — surfaces the second-tier Claude+GitHub pass */}
              {!didDeepDive && (
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  <div className="text-[11.5px] text-white/70">
                    Want a deeper pass with repo context?
                  </div>
                  <button
                    onClick={handleDeepDive}
                    disabled={deepDiving}
                    className="inline-flex items-center gap-1.5 rounded-md border border-orange-400/40 bg-orange-400/10 px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-orange-200 hover:bg-orange-400/20 disabled:opacity-60"
                  >
                    {deepDiving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                    {deepDiving ? "Deep diving…" : "Deep dive"}
                  </button>
                </div>
              )}
              {deepError && <div className="text-[11px] text-red-300 font-mono">{deepError}</div>}

              <AnalysisBody
                analysis={analysis}
                fix={
                  fix ?? {
                    plainExplanation: "Generating fix plan…",
                    whyItHappened: "",
                    steps: [],
                    references: [],
                    additionalNotes: null,
                    technicalExplanation: null,
                    recommendedActions: [],
                    confidence: null,
                    impact: [],
                    learnMode: null,
                  }
                }
              />

              {/* Learn mode — plain-english "why this matters" explainer */}
              {fix?.learnMode && (
                <div className="rounded-lg border border-orange-400/30 bg-orange-400/[0.06] p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-300 mb-1">
                    Learn mode
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-white/85 italic">{fix.learnMode}</p>
                </div>
              )}

              {/* Follow-up chat */}
              {fix && (
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2 space-y-2">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50 px-1">
                    Follow up
                  </div>
                  {messages.map((m, i) =>
                    m.role === "user" ? (
                      <PillEditableUserMessage
                        key={i}
                        content={m.content}
                        disabled={sending}
                        onResend={(newText) => void sendFollowUp(newText, i)}
                      />
                    ) : (
                      <MessageResponse
                        key={i}
                        className="text-[12.5px] leading-relaxed rounded-md px-2.5 py-1.5 text-white/85 [&_pre]:max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:!bg-code-editor [&_pre]:!text-code-editor-foreground [&_code]:break-words"
                      >
                        {m.content}
                      </MessageResponse>
                    ),
                  )}

                  {sending && (
                    <div className="flex items-center gap-2 px-2 text-[11.5px] text-white/60">
                      <Loader2 className="h-3 w-3 animate-spin text-orange-400" />
                      Jeradin is thinking…
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendFollowUp();
                        }
                      }}
                      placeholder="Ask a follow-up…"
                      className="flex-1 bg-transparent border border-white/10 rounded-md px-2.5 py-1.5 text-[12.5px] text-white placeholder:text-white/35 focus:outline-none focus:border-orange-400/50"
                    />
                    <button
                      onClick={() => void sendFollowUp()}
                      disabled={!chatInput.trim() || sending}
                      className="p-1.5 rounded-md border border-white/15 text-white/80 hover:bg-white/10 disabled:opacity-40"
                      aria-label="Send"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 px-4 py-2 border-t border-white/10 flex items-center justify-between">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40">
            {done ? "Ready" : analysis ? "Streaming…" : "Analyzing…"}
          </span>
          <button
            onClick={handleClose}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function PillEditableUserMessage({
  content,
  onResend,
  disabled,
}: {
  content: string;
  onResend: (newText: string) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(ref.current.value.length, ref.current.value.length);
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [editing]);

  if (editing) {
    return (
      <div className="rounded-md border border-orange-400/40 bg-white/[0.05] px-2 py-1.5">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-orange-300">Editing</span>
          <span className="font-mono text-[9px] text-white/40">⏎ send · Esc cancel</span>
        </div>
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setDraft(content);
              setEditing(false);
            } else if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              const trimmed = draft.trim();
              if (!trimmed) return;
              setEditing(false);
              onResend(trimmed);
            }
          }}
          rows={1}
          className="w-full resize-none bg-transparent text-[12.5px] leading-relaxed text-white outline-none"
        />
        <div className="mt-1.5 flex items-center justify-end gap-1.5">
          <button
            onClick={() => {
              setDraft(content);
              setEditing(false);
            }}
            className="rounded border border-white/15 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/70 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const trimmed = draft.trim();
              if (!trimmed) return;
              setEditing(false);
              onResend(trimmed);
            }}
            disabled={!draft.trim()}
            className="rounded bg-white px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-black hover:bg-white/90 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex items-start gap-1.5">
      <div className="flex-1 min-w-0 text-[12.5px] leading-relaxed rounded-md bg-white/10 text-white px-2.5 py-1.5 whitespace-pre-wrap break-words">
        {content}
      </div>
      {!disabled && (
        <button
          onClick={() => {
            setDraft(content);
            setEditing(true);
          }}
          className="shrink-0 mt-1 rounded p-1 text-white/40 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10 hover:text-white focus:opacity-100"
          aria-label="Edit"
          title="Edit"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      )}
    </div>
  );
}
