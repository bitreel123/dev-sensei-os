import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/jeradin/header";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/hooks/use-user-data";
import { Monitor, Square, Send, Paperclip } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "New chat · Jeradin" },
      { name: "description", content: "Start a new debugging session with screen capture." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { credits } = useUserData(user?.id ?? null);
  const [prompt, setPrompt] = useState("");
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => () => stopStream(), []);

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
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));
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

  function send() {
    if (!prompt.trim() && !previewUrl) {
      toast.error("Add a prompt or a recording");
      return;
    }
    toast.success("Sent — worker pickup coming soon");
    setPrompt("");
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <SiteHeader variant="dark" />
        <div className="pt-32 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <SiteHeader variant="dark" />

      <main className="flex-1 flex flex-col items-center justify-center px-5 pt-20 pb-10">
        <div className="w-full max-w-[720px]">
          <div className="text-center">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-white/50">
              New session
            </div>
            <h1
              className="mt-3 text-[44px] leading-[1.05] tracking-[-0.02em]"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              What are we debugging?
            </h1>
            <p className="mt-2 text-[13px] text-white/55">
              Describe the issue, or capture your screen and let Jeradin watch.
            </p>
          </div>

          {previewUrl && (
            <div className="mt-6 border border-white/15 bg-white/[0.02] p-3">
              <video src={previewUrl} controls className="w-full rounded" />
              <button
                onClick={() => {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
                className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50 hover:text-white"
              >
                Discard recording
              </button>
            </div>
          )}

          <div className="mt-6 border border-white/20 bg-white/[0.03] focus-within:border-white/40 transition-colors">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Paste an error, describe the bug, or start a screen recording…"
              rows={4}
              className="w-full bg-transparent p-4 text-[14px] resize-none focus:outline-none placeholder:text-white/35"
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                {recording ? (
                  <button
                    onClick={stopRecording}
                    className="inline-flex items-center gap-1.5 border border-red-500/60 bg-red-500/10 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-red-200 hover:bg-red-500/20 transition-colors"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    Stop recording
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="inline-flex items-center gap-1.5 border border-white/25 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.22em] hover:bg-white hover:text-black transition-colors"
                  >
                    <Monitor className="h-3 w-3" />
                    Record screen
                  </button>
                )}
                <button
                  disabled
                  title="File upload coming soon"
                  className="inline-flex items-center gap-1.5 border border-white/15 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/40 cursor-not-allowed"
                >
                  <Paperclip className="h-3 w-3" />
                  Attach
                </button>
              </div>
              <button
                onClick={send}
                className="inline-flex items-center gap-1.5 bg-white text-black px-4 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.22em] hover:bg-white/90 transition-colors"
              >
                Send
                <Send className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/45">
            <span>
              {credits?.plan ?? "free"} · {credits?.balance ?? 0} credits
            </span>
            <Link to="/account" className="hover:text-white">
              Account →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
