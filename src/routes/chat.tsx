import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChatSidebar } from "@/components/jeradin/chat-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/hooks/use-user-data";
import { useGithubConnection, startGithubOAuth } from "@/hooks/use-github-connection";
import { Monitor, Square, Send, Paperclip, X, Network, BookOpen, Github, ArrowRight, Sparkles, Loader2, AlertTriangle, Menu, User as UserIcon, Check, Plus, Mic } from "lucide-react";
import { toast } from "sonner";
import { addHistoryEntry, updateHistoryEntry, getHistoryEntry } from "@/lib/chat-history";
import { analyzeScreenAndSuggestFix, type ScreenAnalysis, type FixSuggestion } from "@/lib/screen-intel.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";


export const Route = createFileRoute("/chat")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "New chat · Jeradin" },
      { name: "description", content: "Start a new debugging session with screen capture." },
    ],
  }),
  component: ChatPage,
});

type Attachment =
  | { kind: "recording"; url: string; blob: Blob }
  | { kind: "file"; file: File; url: string };

function ChatPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { credits } = useUserData(user?.id ?? null);
  const { connection: github } = useGithubConnection(user?.id ?? null);
  const search = Route.useSearch();
  const [prompt, setPrompt] = useState("");
  const [recording, setRecording] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activeCapability, setActiveCapability] = useState<CapabilityKey | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ analysis: ScreenAnalysis; fix: FixSuggestion } | null>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const runAnalyze = useServerFn(analyzeScreenAndSuggestFix);

  // Restore a saved chat when ?id=... is in the URL
  useEffect(() => {
    if (!search.id) return;
    const entry = getHistoryEntry(search.id);
    if (entry?.payload) {
      setAnalysisResult(entry.payload);
      setActiveCapability("screen");
      setCurrentEntryId(entry.id);
    }
  }, [search.id]);

  async function analyzeImageBase64(base64: string, note: string, title: string) {
    setAnalyzing(true);
    try {
      const result = await runAnalyze({ data: { imageBase64: base64, note } });
      setAnalysisResult(result);
      setActiveCapability("screen");
      const entry = addHistoryEntry(title, result);
      setCurrentEntryId(entry.id);
      toast.success("Analysis complete");
      setPrompt("");
      return result;
    } catch (e) {
      console.error("[analyzeImageBase64] failed:", e);
      toast.error(e instanceof Error ? e.message : "Analysis failed");
      return null;
    } finally {
      setAnalyzing(false);
    }
  }

  async function captureFrameAndAnalyze() {
    if (!streamRef.current) {
      toast.error("Start a screen recording first");
      return;
    }
    try {
      const video = document.createElement("video");
      video.srcObject = streamRef.current;
      video.muted = true;
      await video.play();
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      const maxW = 1280;
      const scale = Math.min(1, maxW / video.videoWidth);
      const w = Math.floor(video.videoWidth * scale);
      const h = Math.floor(video.videoHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/png");
      video.pause();

      await analyzeImageBase64(
        dataUrl.replace(/^data:image\/png;base64,/, ""),
        prompt.trim(),
        prompt.trim() || "Screen frame analysis",
      );
    } catch (e) {
      console.error("[captureFrameAndAnalyze] failed:", e);
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    }
  }

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => () => {
    stopStream();
    attachments.forEach((a) => URL.revokeObjectURL(a.url));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });
      streamRef.current = stream;
      chunksRef.current = [];

      // Pick a supported mimeType (Safari/Firefox may not support vp9)
      const candidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      const mimeType = candidates.find((m) =>
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m),
      );
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        setAttachments((prev) => [...prev, { kind: "recording", url, blob }]);
        stopStream();
        setRecording(false);
        // Auto-analyze immediately so the user doesn't have to click Send
        try {
          const base64 = await videoBlobToFrameBase64(blob);
          await analyzeImageBase64(
            base64,
            prompt.trim(),
            prompt.trim() || "Screen recording",
          );
        } catch (e) {
          console.error("[auto-analyze on stop] failed:", e);
          toast.error(e instanceof Error ? e.message : "Could not analyze recording");
        }
      };
      stream.getVideoTracks()[0].addEventListener("ended", () => rec.state !== "inactive" && rec.stop());
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start recording");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: Attachment[] = [];
    Array.from(files).forEach((file) => {
      next.push({ kind: "file", file, url: URL.createObjectURL(file) });
    });
    setAttachments((prev) => [...prev, ...next]);
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return toast.error("Clipboard is empty");
      setPrompt((p) => (p ? p + "\n" + text : text));
      toast.success("Pasted from clipboard");
    } catch {
      toast.error("Clipboard access denied");
    }
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function send() {
    if (!prompt.trim() && attachments.length === 0) {
      toast.error("Add a prompt or a screenshot / recording");
      return;
    }

    // Recording still in progress → grab a live frame
    if (streamRef.current) {
      await captureFrameAndAnalyze();
      return;
    }

    // Image attachment → analyze it
    const imageAttachment = attachments.find(
      (a) => a.kind === "file" && a.file.type.startsWith("image/"),
    );
    if (imageAttachment && imageAttachment.kind === "file") {
      try {
        const base64 = await fileToBase64(imageAttachment.file);
        await analyzeImageBase64(
          base64,
          prompt.trim(),
          prompt.trim() || imageAttachment.file.name,
        );
      } catch (e) {
        console.error("[send image] failed:", e);
        toast.error(e instanceof Error ? e.message : "Analysis failed");
      }
      return;
    }

    // Recording attachment → analyze first frame
    const recAttachment = attachments.find((a) => a.kind === "recording");
    if (recAttachment && recAttachment.kind === "recording") {
      try {
        const base64 = await videoBlobToFrameBase64(recAttachment.blob);
        await analyzeImageBase64(
          base64,
          prompt.trim(),
          prompt.trim() || "Screen recording",
        );
      } catch (e) {
        console.error("[send recording] failed:", e);
        toast.error(e instanceof Error ? e.message : "Analysis failed");
      }
      return;
    }

    toast.message("Attach a screenshot or start Screen recording, then Send.");
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-black text-white flex">
        <div className="flex-1 pt-32 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white overflow-hidden">
      {/* ============= MOBILE LAYOUT ============= */}
      <MobileChat
        user={user}
        credits={credits}
        prompt={prompt}
        setPrompt={setPrompt}
        activeCapability={activeCapability}
        setActiveCapability={setActiveCapability}
        onSend={send}
        onAttach={(files) => addFiles(files)}
        attachments={attachments}
        onRemoveAttachment={removeAttachment}
        analyzing={analyzing}
        analysisResult={analysisResult}
        onClearAnalysis={() => { setAnalysisResult(null); setCurrentEntryId(null); }}
      />


      {/* ============= DESKTOP LAYOUT ============= */}
      <div className="hidden md:flex h-full">
      <ChatSidebar />

      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex items-center justify-center gap-3 py-3 text-[12px] text-white/70 border-b border-white/5">
          <span className="capitalize">{credits?.plan ?? "free"} plan</span>
          <span className="text-white/25">·</span>
          <Link to="/pricing" className="underline underline-offset-2 hover:text-white">
            Upgrade
          </Link>
        </div>


        <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
          <div className="w-full max-w-[720px]">
            <h1
              className="text-center text-[44px] leading-[1.05] tracking-[-0.02em]"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              What are we doing today?
            </h1>
            <p className="mt-2 text-center text-[13px] text-white/55">
              Describe the issue, let Jeradin solve it for you.
            </p>

            {attachments.length > 0 && (
              <div className="mt-6 grid grid-cols-2 gap-3">
                {attachments.map((a, i) => (
                  <div key={i} className="relative border border-white/15 bg-white/[0.02] p-2">
                    <button
                      onClick={() => removeAttachment(i)}
                      className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 hover:bg-black text-white/80 hover:text-white"
                      aria-label="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {a.kind === "recording" ? (
                      <video src={a.url} controls className="w-full rounded" />
                    ) : a.file.type.startsWith("image/") ? (
                      <img src={a.url} alt={a.file.name} className="w-full rounded object-cover max-h-40" />
                    ) : (
                      <div className="p-3 text-[12px] text-white/70 truncate">
                        <Paperclip className="inline h-3 w-3 mr-1.5" />
                        {a.file.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 border border-white/20 bg-white/[0.03] focus-within:border-white/40 transition-colors rounded-lg">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Paste an error, describe the bug, or start a screen recording…"
                rows={4}
                className="w-full bg-transparent p-4 text-[14px] resize-none focus:outline-none placeholder:text-white/35"
              />
              <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <ToolButton onClick={() => fileInputRef.current?.click()} icon={<Paperclip className="h-3.5 w-3.5" />} label="Attach" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                  />
                </div>
                <button
                  onClick={send}
                  className="inline-flex items-center gap-1.5 bg-white text-black px-4 py-1.5 rounded font-mono text-[10.5px] uppercase tracking-[0.22em] hover:bg-white/90 transition-colors"
                >
                  Send
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="mt-5">
              <div className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-white/40 mb-3">
                Intelligence modes
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {CAPABILITIES.map((c) => {
                  const isRec = c.key === "screen" && recording;
                  return (
                    <button
                      key={c.key}
                      onClick={() => setActiveCapability(activeCapability === c.key ? null : c.key)}
                      className={`text-left border p-3 rounded transition-colors ${
                        isRec
                          ? "border-red-500/60 bg-red-500/10"
                          : activeCapability === c.key
                          ? "border-white/50 bg-white/[0.05]"
                          : "border-white/15 hover:border-white/40 hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-white/90">
                        {isRec ? (
                          <Square className="h-3.5 w-3.5 fill-current text-red-400" />
                        ) : (
                          <c.Icon className="h-4 w-4" />
                        )}
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.2em]">
                          {c.title}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {activeCapability && (() => {
                const c = CAPABILITIES.find((x) => x.key === activeCapability)!;
                const isRec = c.key === "screen" && recording;
                return (
                  <div className="mt-3 border border-white/20 bg-white/[0.03] rounded-lg p-4 relative">
                    <button
                      onClick={() => setActiveCapability(null)}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-white/10 text-white/50 hover:text-white"
                      aria-label="Close"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-center gap-2 mb-2">
                      <c.Icon className="h-4 w-4 text-white/80" />
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/80">
                        {c.title}
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-white/70">{c.desc}</p>
                    {(c.key === "repo" || c.key === "system") && github && (
                      <p className="mt-2 text-[11px] font-mono text-white/50">
                        connected as <span className="text-white/80">{github.login}</span>
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          if (c.key === "screen") {
                            isRec ? stopRecording() : startRecording();
                          } else if (c.key === "repo" || c.key === "system") {
                            if (github) {
                              toast.success(`GitHub connected as ${github.login}. Indexing coming next.`);
                            } else {
                              startGithubOAuth("connect", "/chat");
                            }
                          } else {
                            toast("Knowledge Intelligence coming soon");
                          }
                        }}
                        className="inline-flex items-center gap-1.5 bg-white text-black px-4 py-1.5 rounded font-mono text-[10.5px] uppercase tracking-[0.22em] hover:bg-white/90 transition-colors"
                      >
                        {isRec
                          ? "Stop recording"
                          : (c.key === "repo" || c.key === "system") && github
                            ? "Run analysis"
                            : c.cta}
                        <ArrowRight className="h-3 w-3" />
                      </button>
                      {c.key === "screen" && isRec && (
                        <button
                          disabled={analyzing}
                          onClick={captureFrameAndAnalyze}
                          className="inline-flex items-center gap-1.5 border border-white/40 bg-black text-white px-4 py-1.5 rounded font-mono text-[10.5px] uppercase tracking-[0.22em] hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                        >
                          {analyzing ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Analyzing…
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3" />
                              Analyze now
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    {c.key === "screen" && analysisResult && (
                      <AnalysisReport
                        result={analysisResult}
                        onClose={() => setAnalysisResult(null)}
                      />
                    )}
                  </div>
                );
              })()}
            </div>




            <div className="mt-6 text-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/40">
              {credits?.balance ?? 0} credits remaining
            </div>
          </div>
        </div>
      </main>
      </div>
    </div>

  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || "");
      resolve(s.replace(/^data:image\/[a-zA-Z+]+;base64,/, ""));
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

async function videoBlobToFrameBase64(blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Could not load recording"));
    });
    // seek near start to get a valid frame
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
    });
    const maxW = 1280;
    const scale = Math.min(1, maxW / (video.videoWidth || maxW));
    const w = Math.floor((video.videoWidth || maxW) * scale);
    const h = Math.floor((video.videoHeight || 720) * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ToolButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 border border-white/20 px-2.5 py-1.5 rounded font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/80 hover:bg-white hover:text-black transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}

function AnalysisReport({
  result,
  onClose,
}: {
  result: { analysis: ScreenAnalysis; fix: FixSuggestion };
  onClose: () => void;
}) {
  const { analysis, fix } = result;
  return (
    <div className="mt-4 border border-white/20 bg-black/60 rounded-lg p-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-white/90">
          <Sparkles className="h-4 w-4" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.2em]">
            Gemini 3 · Claude analysis
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1">
          What's on screen
        </div>
        <p className="text-[13px] text-white/80 leading-relaxed">{analysis.summary}</p>
        {(analysis.editor || analysis.language) && (
          <p className="mt-1 text-[11px] font-mono text-white/50">
            {analysis.editor ?? "editor"} · {analysis.language ?? "unknown lang"}
          </p>
        )}
      </div>

      {analysis.errors.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40 mb-2">
            Errors detected
          </div>
          <ul className="space-y-1.5">
            {analysis.errors.map((err, i) => (
              <li
                key={i}
                className="flex gap-2 text-[12.5px] text-white/80 border border-white/10 bg-white/[0.02] p-2 rounded"
              >
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-400" />
                <div className="min-w-0">
                  <div className="break-words">{err.message}</div>
                  <div className="mt-0.5 text-[10.5px] font-mono text-white/45">
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
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1">
            Suspect files
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.suspectFiles.map((f, i) => (
              <span
                key={i}
                className="font-mono text-[11px] text-white/80 border border-white/15 px-2 py-0.5 rounded"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-white/10 pt-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40 mb-1">
          Plain-English explanation
        </div>
        <p className="text-[13px] text-white/85 leading-relaxed">{fix.plainExplanation}</p>
        <p className="mt-2 text-[13px] text-white/70 leading-relaxed">{fix.whyItHappened}</p>
      </div>

      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40 mb-2">
          Step-by-step fix
        </div>
        <ol className="space-y-2">
          {fix.steps.map((s, i) => (
            <li key={i} className="border border-white/10 bg-white/[0.02] p-2.5 rounded">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] text-white/50">STEP {i + 1}</span>
                <span className="font-mono text-[11px] text-white/85 truncate">{s.file}</span>
              </div>
              <p className="text-[12.5px] text-white/80 leading-relaxed">{s.change}</p>
              {s.codeAfter && (
                <pre className="mt-2 text-[11px] font-mono bg-black/60 border border-white/10 p-2 rounded overflow-x-auto text-white/85 whitespace-pre">
                  {s.codeAfter}
                </pre>
              )}
            </li>
          ))}
        </ol>
      </div>

      {fix.additionalNotes && (
        <p className="text-[12px] text-white/60 italic border-t border-white/10 pt-3">
          {fix.additionalNotes}
        </p>
      )}
    </div>
  );
}


type CapabilityKey = "screen" | "system" | "knowledge" | "repo";

const CAPABILITIES: Array<{
  key: CapabilityKey;
  title: string;
  desc: string;
  cta: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: "screen",
    title: "Screen Intelligence",
    desc: "Record your screen so Jeradin sees exactly what you see — clicks, errors, network traffic and console output are captured together so the agent can reproduce the bug instead of guessing.",
    cta: "Start recording",
    Icon: Monitor,
  },
  {
    key: "system",
    title: "System Intelligence",
    desc: "Upload your codebase or connect GitHub and Jeradin will build a semantic map of your architecture — routes, modules, data flow and dependencies — so fixes account for the whole system, not one file.",
    cta: "Connect codebase",
    Icon: Network,
  },
  {
    key: "knowledge",
    title: "Knowledge Intelligence",
    desc: "Pulls in docs, tickets, prior PR discussions and past decisions relevant to the current issue so you don't have to hunt for context across five tools.",
    cta: "Enable knowledge",
    Icon: BookOpen,
  },
  {
    key: "repo",
    title: "Repo Intelligence",
    desc: "Connect your GitHub account and Jeradin reads commit history, branches, PRs and diffs to trace root causes — perfect for regressions and 'it worked last week' bugs.",
    cta: "Connect GitHub",
    Icon: Github,
  },
];

const CAPABILITY_SHORT: Record<CapabilityKey, string> = {
  screen: "See your screen, diagnose bugs",
  system: "Map your whole codebase",
  knowledge: "Find repos, APIs, models",
  repo: "Analyze commits & PRs",
};

// ============= MOBILE LAYOUT =============
function MobileChat({
  user,
  credits,
  prompt,
  setPrompt,
  activeCapability,
  setActiveCapability,
  onSend,
  onAttach,
  attachments,
  onRemoveAttachment,
  analyzing,
}: {
  user: { email?: string | null } | null;
  credits: { plan?: string | null; balance?: number | null } | null | undefined;
  prompt: string;
  setPrompt: (v: string) => void;
  activeCapability: CapabilityKey | null;
  setActiveCapability: (v: CapabilityKey | null) => void;
  onSend: () => void;
  onAttach: (files: FileList | null) => void;
  attachments: Attachment[];
  onRemoveAttachment: (idx: number) => void;
  analyzing: boolean;
}) {
  const mobileFileInputRef = useRef<HTMLInputElement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const selected = activeCapability ?? "screen";
  const selectedTitle = CAPABILITIES.find((c) => c.key === selected)?.title ?? "Screen Intelligence";
  const firstName = (user?.email ?? "there").split("@")[0].split(/[._-]/)[0];
  const greetName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <div className="md:hidden flex flex-col h-full bg-black text-white">
      {/* Top navbar */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-white/80 hover:text-white"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/account" className="p-2 -mr-2 text-white/80 hover:text-white" aria-label="Account">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
            <UserIcon className="h-4 w-4" />
          </span>
        </Link>
      </div>

      {/* Upgrade banner */}
      <div className="mx-4 mb-2 shrink-0 rounded-xl border border-white/10 px-4 py-3 flex items-center justify-between">
        <span className="text-[13.5px] text-white/80">Get more with Jeradin Pro</span>
        <Link to="/pricing" className="text-[13.5px] text-sky-400 hover:text-sky-300 font-medium">
          Upgrade
        </Link>
      </div>

      {/* Empty state */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-4">
          <Sparkles className="h-10 w-10 text-orange-400" strokeWidth={1.2} />
        </div>
        <h1
          className="text-[36px] leading-tight tracking-[-0.02em] text-white"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {greetName} returns!
        </h1>
        <p className="mt-2 text-[12px] text-white/40">
          {credits?.balance ?? 0} credits · {credits?.plan ?? "free"} plan
        </p>
      </div>

      {/* Composer */}
      <div className="p-3 shrink-0">
        {attachments.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {attachments.map((a, i) => (
              <div key={i} className="relative shrink-0 border border-white/15 bg-white/[0.03] rounded-lg p-1.5">
                <button
                  onClick={() => onRemoveAttachment(i)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-black border border-white/20 text-white/80 flex items-center justify-center"
                  aria-label="Remove"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
                {a.kind === "recording" ? (
                  <video src={a.url} className="h-16 w-24 rounded object-cover" />
                ) : a.file.type.startsWith("image/") ? (
                  <img src={a.url} alt={a.file.name} className="h-16 w-24 rounded object-cover" />
                ) : (
                  <div className="h-16 w-24 rounded flex items-center justify-center p-1 text-[10px] text-white/70 text-center">
                    <span className="truncate">{a.file.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Chat with ${selectedTitle.split(" ")[0]}…`}
            rows={2}
            className="w-full bg-transparent px-2 py-1 text-[15px] resize-none focus:outline-none placeholder:text-white/40 text-white"
          />
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={mobileFileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { onAttach(e.target.files); e.target.value = ""; }}
            />
            <button
              onClick={() => mobileFileInputRef.current?.click()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20"
              aria-label="Attach"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSheetOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-full bg-white/10 text-[13px] text-white/90 truncate"
            >
              <span className="truncate">{selectedTitle}</span>
            </button>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80"
              aria-label="Voice"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              onClick={onSend}
              disabled={analyzing}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-black disabled:opacity-60"
              aria-label="Send"
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>


      {/* Capability picker sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="bg-[#0a0a0a] border-white/10 text-white rounded-t-3xl px-0 pt-2"
        >
          <div className="flex justify-center pt-1 pb-2">
            <div className="h-1 w-10 rounded-full bg-white/20" />
          </div>
          <SheetHeader className="px-6">
            <SheetTitle className="text-center text-white text-[17px] font-semibold">
              Select capability
            </SheetTitle>
          </SheetHeader>
          <div className="px-2 pt-2 pb-6">
            {CAPABILITIES.map((c) => {
              const isSelected = selected === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => {
                    setActiveCapability(c.key);
                    setSheetOpen(false);
                  }}
                  className="w-full flex items-start justify-between text-left px-4 py-4 hover:bg-white/5 rounded-xl"
                >
                  <div className="min-w-0">
                    <div className={`text-[17px] font-medium ${isSelected ? "text-sky-400" : "text-white"}`}>
                      {c.title}
                    </div>
                    <div className={`text-[13.5px] mt-0.5 ${isSelected ? "text-sky-400/80" : "text-white/50"}`}>
                      {CAPABILITY_SHORT[c.key]}
                    </div>
                  </div>
                  {isSelected && <Check className="h-5 w-5 text-sky-400 shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sidebar drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-[260px] bg-[#0a0a0a] border-white/10">
          <ChatSidebar />
        </SheetContent>
      </Sheet>
    </div>
  );
}



