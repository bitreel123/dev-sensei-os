import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChatSidebar } from "@/components/jeradin/chat-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/hooks/use-user-data";
import { useGithubConnection, startGithubOAuth } from "@/hooks/use-github-connection";
import { Monitor, Square, Send, Paperclip, X, Network, BookOpen, Github, ArrowRight, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { addHistoryEntry } from "@/lib/chat-history";
import { analyzeScreenAndSuggestFix, type ScreenAnalysis, type FixSuggestion } from "@/lib/screen-intel.functions";

export const Route = createFileRoute("/chat")({
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
  const [prompt, setPrompt] = useState("");
  const [recording, setRecording] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activeCapability, setActiveCapability] = useState<CapabilityKey | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ analysis: ScreenAnalysis; fix: FixSuggestion } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const runAnalyze = useServerFn(analyzeScreenAndSuggestFix);

  async function captureFrameAndAnalyze() {
    if (!streamRef.current) {
      toast.error("Start a screen recording first");
      return;
    }
    setAnalyzing(true);
    try {
      const video = document.createElement("video");
      video.srcObject = streamRef.current;
      video.muted = true;
      await video.play();
      // wait one frame
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

      const result = await runAnalyze({ data: { imageBase64: dataUrl, note: prompt.trim() } });
      setAnalysisResult(result);
      toast.success("Analysis complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
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
      const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setAttachments((prev) => [...prev, { kind: "recording", url, blob }]);
        stopStream();
        setRecording(false);
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

  function send() {
    if (!prompt.trim() && attachments.length === 0) {
      toast.error("Add a prompt or an attachment");
      return;
    }
    const title = prompt.trim() || (attachments[0]?.kind === "recording" ? "Screen recording" : "New chat");
    addHistoryEntry(title);
    toast.success("Sent — worker pickup coming soon");
    setPrompt("");
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
    <div className="h-screen bg-black text-white flex overflow-hidden">
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
  );
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


