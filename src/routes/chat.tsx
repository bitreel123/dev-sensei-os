import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChatSidebar } from "@/components/jeradin/chat-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/hooks/use-user-data";
import { Monitor, Square, Send, Paperclip, X, Network, BookOpen, Github, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { addHistoryEntry } from "@/lib/chat-history";

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
  const [prompt, setPrompt] = useState("");
  const [recording, setRecording] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activeCapability, setActiveCapability] = useState<CapabilityKey | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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
    addHistoryEntry(prompt || attachments[0]?.kind === "recording" ? "Screen recording" : "New chat");
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
                <Capability
                  onClick={recording ? stopRecording : startRecording}
                  icon={recording ? <Square className="h-3.5 w-3.5 fill-current text-red-400" /> : <Monitor className="h-4 w-4" />}
                  title="Screen Intelligence"
                  desc={recording ? "Recording… click to stop" : "Record your screen so Jeradin sees exactly what you see."}
                  active={recording}
                />
                <Capability
                  onClick={() => toast("Semantic System Intelligence coming soon")}
                  icon={<Network className="h-4 w-4" />}
                  title="System Intelligence"
                  desc="Deep understanding of your architecture, dependencies and workflows."
                />
                <Capability
                  onClick={() => toast("Knowledge Intelligence coming soon")}
                  icon={<BookOpen className="h-4 w-4" />}
                  title="Knowledge Intelligence"
                  desc="Discovers docs, tickets and prior decisions relevant to the issue."
                />
                <Capability
                  onClick={() => toast("Repo Intelligence coming soon")}
                  icon={<Github className="h-4 w-4" />}
                  title="Repo Intelligence"
                  desc="Reads your GitHub history, PRs and diffs to trace root causes."
                />
              </div>
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

function Capability({
  onClick,
  icon,
  title,
  desc,
  active,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left border p-3 rounded transition-colors ${
        active
          ? "border-red-500/60 bg-red-500/10"
          : "border-white/15 hover:border-white/40 hover:bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center gap-2 text-white/90">
        {icon}
        <span className="font-mono text-[10.5px] uppercase tracking-[0.2em]">{title}</span>
      </div>
      <p className="mt-1.5 text-[11.5px] leading-snug text-white/55">{desc}</p>
    </button>
  );
}

