// "Ask Jeradin" — Android-style floating pill + attached bottom sheet.
//
// UX contract:
//   1. When screen recording stops, chat.tsx passes a captured frame + note here.
//   2. We show a floating pill ("Ask Jeradin") over whatever the user is doing.
//      They stay in whatever surface they were on until they tap it.
//   3. On tap → the pill expands into an overlay sheet attached to the current
//      view (bottom sheet on mobile, side sheet on desktop). We start the
//      streaming analysis IMMEDIATELY on tap and progressively render:
//         Thinking → Reading screen → Understanding code → Finding errors → Generating fixes
//   4. Sections stream in as they arrive (no full-response buffering).
//   5. Sheet stays open until the user dismisses it.

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, X, Check, AlertTriangle } from "lucide-react";
import { streamIntel, type IntelStreamEvent } from "@/lib/intel-stream";
import { AnalysisBody } from "@/components/jeradin/screen-intel-overlay";
import type { ScreenAnalysis, FixSuggestion } from "@/lib/screen-intel.functions";

export type PendingAsk = {
  imageBase64: string;
  note: string;
  title: string;
  sessionId: string;
};

type Props = {
  pending: PendingAsk;
  onDismiss: () => void;
  // Fired once when the streamed analysis finishes so chat.tsx can persist
  // history and (optionally) open the full ScreenIntelOverlay for follow-ups.
  onComplete?: (result: { analysis: ScreenAnalysis; fix: FixSuggestion }) => void;
};

type Stage = { id: string; label: string; status: "running" | "done" | "error"; message?: string };

export function AskJeradinPill({ pending, onDismiss, onComplete }: Props) {
  const [open, setOpen] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [analysis, setAnalysis] = useState<ScreenAnalysis | null>(null);
  const [fix, setFix] = useState<FixSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);

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
              const next: Stage = {
                id: event.id,
                label: event.label,
                status: event.status,
                message: event.message,
              };
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

  // Fire onComplete once, after both sections + done arrive.
  useEffect(() => {
    if (done && analysis && fix) onComplete?.({ analysis, fix });
  }, [done, analysis, fix, onComplete]);

  function handleOpen() {
    setOpen(true);
    void startStream();
  }

  function handleClose() {
    abortRef.current?.abort();
    setOpen(false);
    onDismiss();
  }

  // ---------- Floating pill ----------
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="fixed z-[10000] bottom-24 right-4 md:bottom-8 md:right-8 inline-flex items-center gap-2 rounded-full bg-black text-white border border-white/25 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] px-4 py-2.5 hover:border-orange-400/70 transition-colors group"
        aria-label="Ask Jeradin"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-70" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-400" />
        </span>
        <Sparkles className="h-4 w-4 text-orange-400" />
        <span className="font-mono text-[11px] uppercase tracking-[0.2em]">Ask Jeradin</span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
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
      {/* Soft dim so users know the sheet is attached to the current surface */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
        onClick={handleClose}
      />
      <div
        className="absolute pointer-events-auto bg-black/95 border-white/15 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.9)]
                   left-0 right-0 bottom-0 rounded-t-2xl border-t
                   md:left-auto md:right-4 md:bottom-4 md:top-16 md:w-[460px] md:rounded-2xl md:border
                   flex flex-col max-h-[92vh]"
      >
        {/* Handle */}
        <div className="pt-2 pb-1 flex items-center justify-center md:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
          <Sparkles className="h-4 w-4 text-orange-400" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/80 flex-1 truncate">
            Ask Jeradin
          </span>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 py-3 space-y-4">
          {/* Progressive stage checklist */}
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
                  {s.status === "running" && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400 shrink-0" />
                  )}
                  {s.status === "done" && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                  {s.status === "error" && (
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  )}
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

          {/* Progressive report — analysis card appears the moment it lands, fix follows */}
          {analysis && (
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
