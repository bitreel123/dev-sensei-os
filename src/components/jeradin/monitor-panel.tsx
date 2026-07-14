import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, AlertTriangle, FileText, Loader2, Play, Square, X } from "lucide-react";
import { toast } from "sonner";
import { analyzeMonitorBatch, type MonitorEvent, type MonitorFinding } from "@/lib/monitor.functions";
import { createNotification } from "@/hooks/use-notifications";

// Narrow typing for the preload-bridged API. Present only in the Electron shell.
type JeradinDesktop = {
  isDesktop: boolean;
  monitor: {
    pickLogFile: () => Promise<string | null>;
    startTail: (filePath: string) => Promise<{ ok: boolean; error?: string; alreadyTailing?: boolean }>;
    stopTail: (filePath: string) => Promise<{ ok: boolean; error?: string }>;
    listTailed: () => Promise<string[]>;
    onChunk: (cb: (p: { filePath: string; chunk: string; ts: number }) => void) => () => void;
    onError: (cb: (p: { filePath: string; message: string }) => void) => () => void;
    onStopped: (cb: (p: { filePath: string; code: number | null }) => void) => () => void;
  };
};

function getDesktop(): JeradinDesktop | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { jeradinDesktop?: JeradinDesktop }).jeradinDesktop ?? null;
}

const BATCH_INTERVAL_MS = 30_000;
const MAX_BUFFER = 400;
const ERROR_RE = /error|exception|failed|traceback|fatal|panic|unhandled/i;

function classifyLine(line: string): MonitorEvent["level"] {
  if (/\b(error|fatal|panic|exception|traceback)\b/i.test(line)) return "error";
  if (/\b(warn|warning)\b/i.test(line)) return "warn";
  if (/\b(info|notice)\b/i.test(line)) return "info";
  if (/\b(debug|trace)\b/i.test(line)) return "debug";
  return "unknown";
}

export function MonitorPanel({ onClose }: { onClose?: () => void }) {
  const desktop = useMemo(() => getDesktop(), []);
  const analyze = useServerFn(analyzeMonitorBatch);
  const [tailedFile, setTailedFile] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const [findings, setFindings] = useState<MonitorFinding[]>([]);
  const [busy, setBusy] = useState(false);
  const bufferRef = useRef<MonitorEvent[]>([]);
  const analyzeRef = useRef<() => Promise<void>>(async () => {});

  // Attach desktop listeners
  useEffect(() => {
    if (!desktop) return;
    const offChunk = desktop.monitor.onChunk(({ filePath, chunk, ts }) => {
      const lines = chunk.split(/\r?\n/).filter(Boolean);
      const next: MonitorEvent[] = lines.map((l) => ({
        ts,
        source: "log-file",
        file: filePath,
        level: classifyLine(l),
        message: l.slice(0, 2000),
      }));
      bufferRef.current = [...bufferRef.current, ...next].slice(-MAX_BUFFER);
      setEvents((prev) => [...prev, ...next].slice(-MAX_BUFFER));
    });
    const offError = desktop.monitor.onError(({ filePath, message }) => {
      toast.error(`Tail error on ${filePath}: ${message.slice(0, 120)}`);
    });
    const offStopped = desktop.monitor.onStopped(({ filePath }) => {
      if (filePath === tailedFile) setRunning(false);
    });
    return () => { offChunk(); offError(); offStopped(); };
  }, [desktop, tailedFile]);

  // Periodic batched analysis
  useEffect(() => {
    analyzeRef.current = async () => {
      if (busy) return;
      const batch = bufferRef.current.filter((e) => ERROR_RE.test(e.message) || e.level === "error" || e.level === "warn");
      if (batch.length === 0) return;
      bufferRef.current = [];
      setBusy(true);
      try {
        const res = await analyze({ data: { events: batch, context: tailedFile ? `Log file: ${tailedFile}` : "" } });
        if (res.finding) {
          const f = res.finding as MonitorFinding;
          setFindings((prev) => [f, ...prev].slice(0, 20));
          // Persist as a notification so users see it via the bell + native OS notification.
          createNotification({
            title: `${f.diagnosis.category}: ${f.diagnosis.severity}`,
            message: f.laymanExplanation,
            severity: f.diagnosis.severity,
            category: "monitor",
            source: tailedFile ?? "log",
            metadata: { eventCount: f.eventCount, actions: f.suggestedActions },
          }).catch(() => { /* non-fatal */ });
        }
      } catch (e) {
        console.warn("[monitor] analyze failed:", e);
      } finally {
        setBusy(false);
      }
    };
  });

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => { analyzeRef.current(); }, BATCH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [running]);

  async function pickAndStart() {
    if (!desktop) return;
    const file = await desktop.monitor.pickLogFile();
    if (!file) return;
    const res = await desktop.monitor.startTail(file);
    if (!res.ok) { toast.error(res.error ?? "Could not start tail"); return; }
    setTailedFile(file);
    setRunning(true);
    toast.success(`Watching ${file.split(/[/\\]/).pop()}`);
  }

  async function stop() {
    if (!desktop || !tailedFile) return;
    await desktop.monitor.stopTail(tailedFile);
    setRunning(false);
  }

  if (!desktop) {
    return (
      <div className="border border-white/10 rounded-lg p-4 bg-white/[0.02] text-[13px] text-white/70">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-4 w-4 text-orange-400" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/90">Real-time monitor</span>
        </div>
        <p className="text-[12.5px] text-white/60">
          Real-time log & error monitoring runs inside the Jeradin desktop app. Install and launch the Electron shell (see <span className="font-mono">/electron/README.md</span>) to enable this feature.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-lg bg-white/[0.02] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Activity className={`h-4 w-4 ${running ? "text-emerald-400 animate-pulse" : "text-white/40"}`} />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/90">Real-time monitor</span>
          {busy && <Loader2 className="h-3 w-3 animate-spin text-white/60" />}
        </div>
        <div className="flex items-center gap-2">
          {running ? (
            <button onClick={stop} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] border border-white/20 px-2 py-1 rounded hover:bg-white/10">
              <Square className="h-3 w-3" /> Stop
            </button>
          ) : (
            <button onClick={pickAndStart} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] bg-white text-black px-2 py-1 rounded">
              <Play className="h-3 w-3" /> Watch log file
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1 text-white/40 hover:text-white" aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {tailedFile && (
        <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 font-mono text-[10.5px] text-white/55">
          <FileText className="h-3 w-3" /> {tailedFile}
          <span className="ml-auto">{events.length} lines buffered</span>
        </div>
      )}

      <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto min-h-[120px]">
        {findings.length === 0 && (
          <p className="text-[12.5px] text-white/45">
            {running
              ? "Watching for errors. Findings appear here as soon as Jeradin spots something worth surfacing."
              : "Pick a log file and Jeradin will analyse errors, warnings and stack traces every 30 seconds."}
          </p>
        )}
        {findings.map((f, i) => (
          <div key={i} className="border border-white/10 rounded p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-mono text-[11px] text-white">{f.diagnosis.category}</span>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40">
                  {f.diagnosis.severity} · {f.eventCount} events
                </span>
              </div>
              <span className="font-mono text-[9.5px] text-white/40">
                {new Date(f.windowEnd).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-[12.5px] text-white/85">{f.laymanExplanation}</p>
            {f.suggestedActions.length > 0 && (
              <ol className="mt-2 space-y-0.5 list-decimal pl-5 text-[12px] text-white/70">
                {f.suggestedActions.map((s, j) => <li key={j}>{s}</li>)}
              </ol>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
