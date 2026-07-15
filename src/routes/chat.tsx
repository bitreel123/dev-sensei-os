import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChatSidebar } from "@/components/jeradin/chat-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/hooks/use-user-data";
import { useGithubConnection, startGithubOAuth } from "@/hooks/use-github-connection";
import { Monitor, Square, Send, Paperclip, X, Network, BookOpen, Github, Sparkles, Loader2, AlertTriangle, Menu, User as UserIcon, Plus, Check, Ghost } from "lucide-react";
import { toast } from "sonner";
import { addHistoryEntry, updateHistoryEntry, getHistoryEntry } from "@/lib/chat-history";
import { analyzeScreenAndSuggestFix, type ScreenAnalysis, type FixSuggestion, type OverlayChatMessage } from "@/lib/screen-intel.functions";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScreenIntelOverlay, CodeBlock } from "@/components/jeradin/screen-intel-overlay";
import { chatAboutAnalysis } from "@/lib/screen-intel.functions";
import { analyzeSystem, type FileInput, type SystemAnalysis } from "@/lib/system-intel.functions";
import { runKnowledgeIntelligence, type KnowledgeReport } from "@/lib/knowledge-intel.functions";
import { runGithubIntelligence, type GithubIntelReport } from "@/lib/github-intel.functions";
import { SystemReportBody, KnowledgeReportBody, RepoReportBody } from "@/components/jeradin/intel-reports";
import { NotificationsBell } from "@/components/jeradin/notifications-bell";



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
  const [openedCapabilityPanel, setOpenedCapabilityPanel] = useState<Exclude<CapabilityKey, "screen"> | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{ analysis: ScreenAnalysis; fix: FixSuggestion } | null>(null);
  const [systemResult, setSystemResult] = useState<{ analysis: SystemAnalysis; filesAnalyzed: number } | null>(null);
  const [knowledgeResult, setKnowledgeResult] = useState<KnowledgeReport | null>(null);
  const [repoResult, setRepoResult] = useState<GithubIntelReport | null>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [overlayMessages, setOverlayMessages] = useState<OverlayChatMessage[]>([]);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [knowledgeEnabled, setKnowledgeEnabled] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const runAnalyze = useServerFn(analyzeScreenAndSuggestFix);
  const runSystem = useServerFn(analyzeSystem);
  const runKnowledge = useServerFn(runKnowledgeIntelligence);
  const runRepo = useServerFn(runGithubIntelligence);
  const askScreenFollowUp = useServerFn(chatAboutAnalysis);

  useEffect(() => {
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    const htmlHeight = document.documentElement.style.height;
    const bodyHeight = document.body.style.height;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.height = "100dvh";
    document.body.style.height = "100dvh";
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.height = htmlHeight;
      document.body.style.height = bodyHeight;
    };
  }, []);

  // Restore a saved chat when ?id=... is in the URL
  useEffect(() => {
    if (!search.id) return;
    const entry = getHistoryEntry(search.id);
    if (!entry?.payload) return;
    const p = entry.payload;
    if (p.analysis && p.fix) {
      setAnalysisResult({ analysis: p.analysis, fix: p.fix });
      setSystemResult(null);
      setKnowledgeResult(null);
      setRepoResult(null);
      setOverlayMessages(p.messages ?? []);
      setOverlayOpen(true);
      setActiveCapability(p.mode ?? "screen");
      setCurrentEntryId(entry.id);
    } else if (p.system || p.knowledge || p.repo) {
      setAnalysisResult(null);
      setOverlayOpen(false);
      setSystemResult(p.system ? { analysis: p.system.analysis, filesAnalyzed: p.system.filesAnalyzed } : null);
      setKnowledgeResult(p.knowledge?.report ?? null);
      setRepoResult(p.repo?.report ?? null);
      setActiveCapability(p.mode ?? "system");
      setOpenedCapabilityPanel(null);
      setCurrentEntryId(entry.id);
    }
  }, [search.id]);

  // Persist overlay chat messages to the current history entry
  useEffect(() => {
    if (!currentEntryId || !analysisResult) return;
    updateHistoryEntry(currentEntryId, {
      payload: { mode: "screen", analysis: analysisResult.analysis, fix: analysisResult.fix, messages: overlayMessages },
    });
  }, [overlayMessages, currentEntryId, analysisResult]);

  async function analyzeImageBase64(base64: string, note: string, title: string) {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await runAnalyze({ data: { imageBase64: base64, note } });
      setAnalysisResult(result);
      setOverlayMessages([]);
      setOverlayOpen(true);
      setActiveCapability("screen");
      const entry = addHistoryEntry(title, { mode: "screen", analysis: result.analysis, fix: result.fix, messages: [] });
      setCurrentEntryId(entry.id);
      navigate({ to: "/chat", search: { id: entry.id } });
      toast.success("Analysis complete");
      setPrompt("");
      return result;
    } catch (e) {
      console.error("[analyzeImageBase64] failed:", e);
      const message = formatAnalysisError(e);
      setAnalysisError(message);
      toast.error(message);
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
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const video = document.createElement("video");
      video.srcObject = streamRef.current;
      video.muted = true;
      await withTimeout(video.play(), 5000, "Could not preview the screen recording");
      await withTimeout(new Promise((r) => requestAnimationFrame(() => r(null))), 1500, "Could not capture a screen frame");

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
      const message = formatAnalysisError(e);
      setAnalysisError(message);
      toast.error(message);
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
        setAnalyzing(true);
        setAnalysisError(null);
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
          const message = formatAnalysisError(e);
          setAnalysisError(message);
          toast.error(message);
          setAnalyzing(false);
        }
      };
      stream.getVideoTracks()[0].addEventListener("ended", () => rec.state !== "inactive" && rec.stop());
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start recording";
      setAnalysisError(message);
      toast.error(message);
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
    const selectedCapability = activeCapability ?? "screen";

    if (
      analysisResult &&
      selectedCapability === "screen" &&
      prompt.trim() &&
      attachments.length === 0 &&
      !streamRef.current
    ) {
      const text = prompt.trim();
      const next: OverlayChatMessage[] = [...overlayMessages, { role: "user", content: text }];
      setOverlayMessages(next);
      setPrompt("");
      setAnalyzing(true);
      setAnalysisError(null);
      try {
        const { reply } = await askScreenFollowUp({
          data: {
            analysis: analysisResult.analysis as ScreenAnalysis & Record<string, unknown>,
            fix: analysisResult.fix,
            messages: next,
          },
        });
        setOverlayMessages([...next, { role: "assistant", content: reply }]);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to reply");
      } finally {
        setAnalyzing(false);
      }
      return;
    }

    if (selectedCapability !== "screen") {
      await runPromptCapability(selectedCapability);
      return;
    }

    setAnalysisError(null);

    // Recording still in progress → grab a live frame
    if (streamRef.current) {
      await captureFrameAndAnalyze();
      return;
    }

    if (!prompt.trim() && attachments.length === 0) {
      toast.error("Add a prompt or start Screen recording, then Send.");
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
      setAnalyzing(true);
      try {
        const base64 = await videoBlobToFrameBase64(recAttachment.blob);
        await analyzeImageBase64(
          base64,
          prompt.trim(),
          prompt.trim() || "Screen recording",
        );
      } catch (e) {
        console.error("[send recording] failed:", e);
        const message = formatAnalysisError(e);
        setAnalysisError(message);
        toast.error(message);
        setAnalyzing(false);
      }
      return;
    }

    toast.message("Attach a screenshot or start Screen recording, then Send.");
  }

  async function runPromptCapability(capability: Exclude<CapabilityKey, "screen">) {
    const text = prompt.trim();
    setAnalysisResult(null);
    setSystemResult(null);
    setKnowledgeResult(null);
    setRepoResult(null);
    setOverlayOpen(false);
    setOpenedCapabilityPanel(null);
    setAnalysisError(null);

    if (capability === "knowledge" && text.length < 5) {
      setKnowledgeEnabled(true);
      toast.success("Knowledge Intelligence enabled");
      return;
    }

    const repo = extractRepoName(text);
    if ((capability === "system" || capability === "repo") && !repo && attachments.length === 0) {
      if (!github) {
        toast.message("Connect GitHub, then choose or type the repo you want Jeradin to analyze.");
        startGithubOAuth("connect", "/chat");
        return;
      }
      toast.error("Type a repo like owner/name in the chat box, then Send.");
      return;
    }

    setAnalyzing(true);
    try {
      if (capability === "knowledge") {
        const res = await runKnowledge({ data: { question: text, projectContext: "" } });
        setKnowledgeResult(res.report);
        setKnowledgeEnabled(true);
        const entry = addHistoryEntry(`Knowledge · ${text.slice(0, 60)}`, {
          mode: "knowledge",
          knowledge: { report: res.report, input: { question: text, projectContext: "" } },
        });
        setCurrentEntryId(entry.id);
        navigate({ to: "/chat", search: { id: entry.id } });
        setPrompt("");
        toast.success("Knowledge report ready");
        return;
      }

      if (capability === "system") {
        if (attachments.length > 0) {
          const files = await attachmentsToFileInputs(attachments);
          if (files.length === 0) {
            toast.error("Attach readable code files, then Send.");
            return;
          }
          const res = await runSystem({ data: { source: "upload", files, projectHint: text } });
          setSystemResult(res);
          const entry = addHistoryEntry(`System · ${files.length} files`, {
            mode: "system",
            system: { analysis: res.analysis, filesAnalyzed: res.filesAnalyzed, input: { source: "upload", projectHint: text } },
          });
          setCurrentEntryId(entry.id);
          navigate({ to: "/chat", search: { id: entry.id } });
          setPrompt("");
          toast.success("System analysis complete");
          return;
        }
        if (!github) {
          toast.message("Connect GitHub, then choose or type the repo you want Jeradin to analyze.");
          startGithubOAuth("connect", "/chat");
          return;
        }
        const res = await runSystem({ data: { source: "github", repo: repo!, projectHint: text } });
        setSystemResult(res);
        const entry = addHistoryEntry(`System · ${repo}`, {
          mode: "system",
          system: { analysis: res.analysis, filesAnalyzed: res.filesAnalyzed, input: { source: "github", repo: repo!, projectHint: text } },
        });
        setCurrentEntryId(entry.id);
        navigate({ to: "/chat", search: { id: entry.id } });
        setPrompt("");
        toast.success("System analysis complete");
        return;
      }

      if (!github) {
        toast.message("Connect GitHub, then choose or type the repo you want Jeradin to analyze.");
        startGithubOAuth("connect", "/chat");
        return;
      }
      const focus = text.replace(repo!, "").trim();
      const res = await runRepo({ data: { repo: repo!, focus } });
      setRepoResult(res.report);
      const entry = addHistoryEntry(`Repo · ${repo}`, {
        mode: "repo",
        repo: { report: res.report, input: { repo: repo!, focus } },
      });
      setCurrentEntryId(entry.id);
      navigate({ to: "/chat", search: { id: entry.id } });
      setPrompt("");
      toast.success("Repo audit complete");
    } catch (e) {
      console.error("[runPromptCapability] failed:", e);
      const message = formatAnalysisError(e);
      setAnalysisError(message);
      toast.error(message);
    } finally {
      setAnalyzing(false);
    }
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
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
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
        recording={recording}
        onToggleRecording={recording ? stopRecording : startRecording}
        analyzing={analyzing}
        analysisError={analysisError}
        analysisResult={analysisResult}
        systemResult={systemResult}
        knowledgeResult={knowledgeResult}
        repoResult={repoResult}
        onClearAnalysis={() => { setAnalysisResult(null); setAnalysisError(null); setCurrentEntryId(null); }}
        openedCapabilityPanel={openedCapabilityPanel}
        onOpenCapabilityPanel={(m: Exclude<CapabilityKey, "screen">) => {
          setActiveCapability(m);
          setAnalysisResult(null);
          setSystemResult(null);
          setKnowledgeResult(null);
          setRepoResult(null);
          setAnalysisError(null);
          setOpenedCapabilityPanel(m);
        }}
        onCloseCapabilityPanels={() => setOpenedCapabilityPanel(null)}
        currentEntryId={currentEntryId}
        setCurrentEntryId={setCurrentEntryId}
      />


      {/* ============= DESKTOP LAYOUT ============= */}
      <div className="hidden md:flex h-full">
      <ChatSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 px-5 text-[12px] text-white/70 shrink-0">
          <div />
          <div className="flex items-center justify-center gap-3">
            <span className="capitalize">{credits?.plan ?? "free"} plan</span>
            <span className="text-white/25">·</span>
            <Link to="/pricing" className="underline underline-offset-2 hover:text-white">
              Upgrade
            </Link>
            {(analysisResult || systemResult || knowledgeResult || repoResult) && (
              <>
                <span className="text-white/25">·</span>
                <button
                  onClick={() => {
                    setAnalysisResult(null);
                    setSystemResult(null);
                    setKnowledgeResult(null);
                    setRepoResult(null);
                    setAnalysisError(null);
                    setCurrentEntryId(null);
                    setPrompt("");
                  }}
                  className="underline underline-offset-2 hover:text-white"
                >
                  New chat
                </button>
              </>
            )}
          </div>
          <div className="flex justify-end">
            <NotificationsBell tone="dark" />
          </div>
        </div>

        {/* Top: analysis / greeting area */}
        <div className={`flex-1 min-h-0 ${(analysisResult || systemResult || knowledgeResult || repoResult) ? "overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "overflow-hidden"}`}>
          <div className={`mx-auto w-full max-w-[780px] px-5 ${(analysisResult || systemResult || knowledgeResult || repoResult) ? "py-6 pb-10 space-y-6" : "h-full flex flex-col justify-center py-8 space-y-6"}`}>





            {(
              <>
                {analyzing && !analysisResult && (
                  <div className="flex items-center justify-center gap-3 py-10 text-white/70">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.22em]">
                      Analyzing…
                    </span>
                  </div>
                )}

                {analysisError && !analysisResult && (
                  <AnalysisError message={analysisError} />
                )}

                {analysisResult ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/90">
                        <Sparkles className="h-4 w-4 text-orange-400" />
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em]">
                          Screen Intelligence
                        </span>
                      </div>
                      {!overlayOpen && (
                        <button
                          onClick={() => setOverlayOpen(true)}
                          className="inline-flex items-center gap-1.5 border border-white/20 px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-[0.22em] hover:bg-white/10"
                        >
                          Open floating assistant
                        </button>
                      )}
                    </div>
                    <div className="border border-white/10 rounded-lg p-5 bg-white/[0.02]">
                      <AnalysisBody analysis={analysisResult.analysis} fix={analysisResult.fix} />
                    </div>
                    <InlineAnalysisChat
                      analysis={analysisResult.analysis}
                      fix={analysisResult.fix}
                      messages={overlayMessages}
                      onMessagesChange={setOverlayMessages}
                    />
                  </div>
                ) : systemResult ? (
                  <IntelResultFrame title="System Intelligence" icon={<Network className="h-4 w-4 text-orange-400" />}>
                    <div className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50">
                      {systemResult.filesAnalyzed} files analyzed
                    </div>
                    <SystemReportBody analysis={systemResult.analysis} />
                  </IntelResultFrame>
                ) : knowledgeResult ? (
                  <IntelResultFrame title="Knowledge Intelligence" icon={<BookOpen className="h-4 w-4 text-orange-400" />}>
                    <KnowledgeReportBody report={knowledgeResult} />
                  </IntelResultFrame>
                ) : repoResult ? (
                  <IntelResultFrame title="Repo Intelligence" icon={<Github className="h-4 w-4 text-orange-400" />}>
                    <RepoReportBody report={repoResult} />
                  </IntelResultFrame>
                ) : !analyzing ? (
                  <div className="flex flex-col items-center justify-center">
                    <h1
                      className="text-center text-[44px] leading-[1.05] tracking-[-0.02em]"
                      style={{ fontFamily: "'Instrument Serif', serif" }}
                    >
                      What are we doing today?
                    </h1>
                    <p className="mt-2 text-center text-[13px] text-white/55">
                      Describe the issue, let Jeradin solve it for you.
                    </p>
                    <DesktopPromptBlock
                      prompt={prompt}
                      setPrompt={setPrompt}
                      current={activeCapability}
                      attachments={attachments}
                      onRemoveAttachment={removeAttachment}
                      onAttach={() => fileInputRef.current?.click()}
                      fileInputRef={fileInputRef}
                      imageInputRef={imageInputRef}
                      addFiles={addFiles}
                      recording={recording}
                      onRecord={recording ? stopRecording : startRecording}
                      analyzing={analyzing}
                      onSend={send}
                      onSelectCapability={(m) => {
                        setActiveCapability((currentMode) => currentMode === m ? null : m);
                        setOpenedCapabilityPanel(null);
                        setAnalysisResult(null);
                        setSystemResult(null);
                        setKnowledgeResult(null);
                        setRepoResult(null);
                        setAnalysisError(null);
                        navigate({ to: "/chat" });
                      }}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>

        {/* Bottom composer only stays after a result/panel is open */}
        {(analysisResult || systemResult || knowledgeResult || repoResult) && (
          <div className="shrink-0">
            <div className="mx-auto w-full max-w-[820px] px-5 py-4">
              <DesktopPromptBlock
                prompt={prompt}
                setPrompt={setPrompt}
                current={activeCapability}
                attachments={attachments}
                onRemoveAttachment={removeAttachment}
                onAttach={() => fileInputRef.current?.click()}
                fileInputRef={fileInputRef}
                imageInputRef={imageInputRef}
                addFiles={addFiles}
                recording={recording}
                onRecord={recording ? stopRecording : startRecording}
                analyzing={analyzing}
                onSend={send}
                onSelectCapability={(m) => {
                  setActiveCapability((currentMode) => currentMode === m ? null : m);
                  setOpenedCapabilityPanel(null);
                  setAnalysisResult(null);
                  setSystemResult(null);
                  setKnowledgeResult(null);
                  setRepoResult(null);
                  setAnalysisError(null);
                  navigate({ to: "/chat" });
                }}
              />
              <div className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                {credits?.balance ?? 0} credits · {credits?.plan ?? "free"} plan
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Floating desktop overlay */}
      {analysisResult && overlayOpen && (
        <div className="hidden md:block">
          <ScreenIntelOverlay
            key={currentEntryId ?? "new"}
            analysis={analysisResult.analysis}
            fix={analysisResult.fix}
            initialMessages={overlayMessages}
            onMessagesChange={setOverlayMessages}
            onClose={() => setOverlayOpen(false)}
          />
        </div>
      )}

      {/* Floating "Analysis" button while screen recording — stops sharing and opens the overlay */}
      {recording && (
        <button
          onClick={stopRecording}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-[9998] inline-flex items-center gap-2 rounded-full bg-red-500 hover:bg-red-500/90 text-white px-4 py-2 shadow-2xl border border-white/20"
          aria-label="Stop screen sharing and analyze"
          title="Stop sharing & analyze"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em]">Analysis</span>
        </button>
      )}
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
  if (!blob.size) throw new Error("The screen recording is empty. Try recording again for a few seconds.");
  const url = URL.createObjectURL(blob);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    await withTimeout(new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Could not load recording"));
    }), 8000, "Could not load the screen recording");

    // Some browsers never fire `seeked` for freshly-recorded WebM blobs. Draw the
    // first loaded frame immediately, and only attempt a short best-effort seek.
    if (Number.isFinite(video.duration) && video.duration > 0.2) {
      await withTimeout(new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = Math.min(0.1, video.duration / 2);
      }), 1200, "").catch(() => undefined);
    }
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

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message || "Timed out")), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

function formatAnalysisError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || "Analysis failed");
  const lower = raw.toLowerCase();
  if (raw.includes("429") || lower.includes("rate limit")) {
    return "AI is rate limited right now. Please wait a moment and try again, or upgrade/add credits for higher usage.";
  }
  if (raw.includes("402") || lower.includes("credit")) {
    return "AI credits are exhausted. Add credits or upgrade, then run the analysis again.";
  }
  if (raw.includes("403")) {
    return "The AI request was blocked by the gateway. Check that Lovable AI is enabled and try again.";
  }
  return raw;
}

function extractRepoName(text: string): string | null {
  const match = text.match(/(?:https?:\/\/github\.com\/)?([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/);
  return match?.[1]?.replace(/\.git$/, "") ?? null;
}

async function attachmentsToFileInputs(attachments: Attachment[]): Promise<FileInput[]> {
  const files: FileInput[] = [];
  for (const attachment of attachments) {
    if (attachment.kind !== "file") continue;
    try {
      const content = await attachment.file.text();
      if (content.trim()) {
        files.push({ path: attachment.file.name, content: content.slice(0, 40_000) });
      }
    } catch {
      // Ignore unreadable/binary files.
    }
    if (files.length >= 60) break;
  }
  return files;
}

function IntelResultFrame({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-white/90">
        {icon}
        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em]">{title}</span>
      </div>
      <div className="border border-white/10 rounded-lg p-5 bg-white/[0.02]">
        {children}
      </div>
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

function DesktopPromptBlock({
  prompt,
  setPrompt,
  current,
  attachments,
  onRemoveAttachment,
  onAttach,
  fileInputRef,
  imageInputRef,
  addFiles,
  recording,
  onRecord,
  analyzing,
  onSend,
  onSelectCapability,
}: {
  prompt: string;
  setPrompt: (value: string) => void;
  current: CapabilityKey | null;
  attachments: Attachment[];
  onRemoveAttachment: (idx: number) => void;
  onAttach: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  addFiles: (files: FileList | null) => void;
  recording: boolean;
  onRecord: () => void;
  analyzing: boolean;
  onSend: () => void;
  onSelectCapability: (m: CapabilityKey) => void;
}) {
  const selected = current ?? "screen";
  const placeholder = selected === "screen"
    ? "Paste an error, describe the bug, or start a screen recording…"
    : `Describe what you need from ${CAPABILITIES.find((c) => c.key === selected)?.title ?? "this capability"}…`;

  return (
    <div className="mt-16 w-full">
      {attachments.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {attachments.map((a, i) => (
            <div key={i} className="relative shrink-0 border border-white/15 bg-white/[0.02] p-1.5 rounded">
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

      <div className="border border-white/20 bg-white/[0.03] focus-within:border-white/40 transition-colors rounded-lg text-left">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full bg-transparent p-4 text-[14px] resize-none focus:outline-none placeholder:text-white/35"
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <ToolButton onClick={onAttach} icon={<Paperclip className="h-3.5 w-3.5" />} label="Attach" />
            <ToolButton onClick={onRecord} icon={recording ? <Square className="h-3.5 w-3.5 fill-current text-red-400" /> : <Monitor className="h-3.5 w-3.5" />} label={recording ? "Stop" : "Screen"} />
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
            onClick={onSend}
            disabled={analyzing}
            className="inline-flex items-center gap-1.5 bg-white text-black px-4 py-1.5 rounded font-mono text-[10.5px] uppercase tracking-[0.22em] hover:bg-white/90 transition-colors disabled:opacity-60"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing
              </>
            ) : (
              <>
                Send
                <Send className="h-3 w-3" />
              </>
            )}
          </button>
        </div>
      </div>

      <CapabilityPills current={current} onSelect={onSelectCapability} />
      {current && (
        <CapabilityDetails
          current={current}
          recording={recording}
          onRecord={onRecord}
          onSend={onSend}
        />
      )}
    </div>
  );
}

function CapabilityPills({ current, onSelect }: { current: CapabilityKey | null; onSelect: (m: CapabilityKey) => void }) {
  return (
    <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
      {CAPABILITIES.map((c) => {
        const active = current === c.key;
        return (
          <button
            key={c.key}
            onClick={() => onSelect(c.key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              active
                ? "bg-white/15 text-white"
                : "bg-white/[0.08] text-white/70 hover:bg-white/[0.12] hover:text-white"
            }`}
          >
            <c.Icon className="h-3.5 w-3.5" />
            <span>{c.title.replace(" Intelligence", "")}</span>
          </button>
        );
      })}
    </div>
  );
}

function CapabilityDetails({
  current,
  recording,
  onRecord,
  onSend,
}: {
  current: CapabilityKey;
  recording: boolean;
  onRecord: () => void;
  onSend: () => void;
}) {
  const capability = CAPABILITIES.find((c) => c.key === current) ?? CAPABILITIES[0];
  const ctaLabel =
    current === "screen"
      ? (recording ? "Stop recording" : capability.cta)
      : capability.cta;
  const onCta =
    current === "screen"
      ? onRecord
      : onSend;
  const CtaIcon =
    current === "screen"
      ? (recording ? Square : Monitor)
      : capability.Icon;

  return (
    <div className="mx-auto mt-3 max-w-[640px] rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-center">
      <div className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">
        <capability.Icon className="h-3.5 w-3.5 text-orange-400" />
        {capability.title}
      </div>
      <p className="mx-auto mt-2 max-w-[560px] text-[12.5px] leading-relaxed text-white/55">
        {capability.desc}
      </p>
      <button
        onClick={onCta}
        className="mt-3 inline-flex items-center gap-1.5 bg-white text-black px-4 py-1.5 rounded font-mono text-[10.5px] uppercase tracking-[0.22em] hover:bg-white/90 transition-colors"
      >
        <CtaIcon className="h-3.5 w-3.5" />
        {ctaLabel}
      </button>
    </div>
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
            Screen Intelligence
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

function AnalysisError({ message }: { message: string }) {
  return (
    <div className="mt-4 border border-red-400/25 bg-red-500/10 rounded-lg p-4 text-sm text-red-100 flex gap-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-red-300 mt-0.5" />
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-red-200/80 mb-1">
          Analysis did not run
        </div>
        <p className="leading-relaxed">{message}</p>
      </div>
    </div>
  );
}


type CapabilityKey = "screen" | "system" | "knowledge" | "repo";

const CAPABILITIES: Array<{
  key: CapabilityKey;
  title: string;
  desc: string;
  mobileDesc?: string;
  cta: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    key: "screen",
    title: "Screen Intelligence",
    desc: "Record your screen so Jeradin sees exactly what you see — clicks, errors, network traffic and console output are captured together so the agent can reproduce the bug instead of guessing.",
    mobileDesc: "See your screen, diagnose bugs",
    cta: "Start recording",
    Icon: Monitor,
  },
  {
    key: "system",
    title: "System Intelligence",
    desc: "Upload your codebase or connect GitHub and Jeradin will build a semantic map of your architecture — routes, modules, data flow and dependencies — so fixes account for the whole system, not one file.",
    mobileDesc: "Map your whole codebase",
    cta: "Connect codebase",
    Icon: Network,
  },
  {
    key: "knowledge",
    title: "Knowledge Intelligence",
    desc: "Pulls in docs, tickets, prior PR discussions and past decisions relevant to the current issue so you don't have to hunt for context across five tools.",
    mobileDesc: "Find repos, APIs, models",
    cta: "Enable knowledge",
    Icon: BookOpen,
  },
  {
    key: "repo",
    title: "Repo Intelligence",
    desc: "Connect your GitHub account and Jeradin reads commit history, branches, PRs and diffs to trace root causes — perfect for regressions and 'it worked last week' bugs.",
    mobileDesc: "Analyze commits and PRs",
    cta: "Connect GitHub",
    Icon: Github,
  },
];

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
  recording,
  onToggleRecording,
  analyzing,
  analysisError,
  analysisResult,
  systemResult,
  knowledgeResult,
  repoResult,
  onClearAnalysis,
  openedCapabilityPanel,
  onOpenCapabilityPanel,
  onCloseCapabilityPanels,
  currentEntryId,
  setCurrentEntryId,
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
  recording: boolean;
  onToggleRecording: () => void;
  analyzing: boolean;
  analysisError: string | null;
  analysisResult: { analysis: ScreenAnalysis; fix: FixSuggestion } | null;
  systemResult: { analysis: SystemAnalysis; filesAnalyzed: number } | null;
  knowledgeResult: KnowledgeReport | null;
  repoResult: GithubIntelReport | null;
  onClearAnalysis: () => void;
  openedCapabilityPanel: Exclude<CapabilityKey, "screen"> | null;
  onOpenCapabilityPanel: (m: Exclude<CapabilityKey, "screen">) => void;
  onCloseCapabilityPanels: () => void;
  currentEntryId: string | null;
  setCurrentEntryId: (id: string | null) => void;
}) {
  const mobileFileInputRef = useRef<HTMLInputElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [capabilitySheetOpen, setCapabilitySheetOpen] = useState(false);
  const selected = activeCapability ?? "screen";
  const firstName = (user?.email ?? "there").split("@")[0].split(/[._-]/)[0];
  const cleanedName = firstName.replace(/\d+/g, "");
  const greetName = (cleanedName.length > 14 ? cleanedName.slice(0, 14) : cleanedName) || "there";
  const displayName = greetName.charAt(0).toUpperCase() + greetName.slice(1);
  const handleMobileSend = () => {
    if (selected === "screen" && !recording && attachments.length === 0 && !prompt.trim()) {
      onToggleRecording();
      return;
    }
    onSend();
  };

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
          <Ghost className="h-7 w-7" strokeWidth={1.7} />
        </Link>
      </div>

      {/* Upgrade banner */}
      <div className="mx-4 mb-2 shrink-0 rounded-xl border border-white/10 px-4 py-3 flex items-center justify-between">
        <span className="text-[13.5px] text-white/80">Get more with Jeradin Pro</span>
        <Link to="/pricing" className="text-[13.5px] text-sky-400 hover:text-sky-300 font-medium">
          Upgrade
        </Link>
      </div>

      {/* Content area: result or empty state */}
      {analysisResult ? (
        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 pb-3">
          <AnalysisReport result={analysisResult} onClose={onClearAnalysis} />
        </div>
      ) : systemResult ? (
        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 pb-3">
          <IntelResultFrame title="System Intelligence" icon={<Network className="h-4 w-4 text-orange-400" />}>
            <div className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50">
              {systemResult.filesAnalyzed} files analyzed
            </div>
            <SystemReportBody analysis={systemResult.analysis} />
          </IntelResultFrame>
        </div>
      ) : knowledgeResult ? (
        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 pb-3">
          <IntelResultFrame title="Knowledge Intelligence" icon={<BookOpen className="h-4 w-4 text-orange-400" />}>
            <KnowledgeReportBody report={knowledgeResult} />
          </IntelResultFrame>
        </div>
      ) : repoResult ? (
        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 pb-3">
          <IntelResultFrame title="Repo Intelligence" icon={<Github className="h-4 w-4 text-orange-400" />}>
            <RepoReportBody report={repoResult} />
          </IntelResultFrame>
        </div>
      ) : analysisError ? (
        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 pb-3">
          <AnalysisError message={analysisError} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-4">
            {analyzing ? (
              <Loader2 className="h-10 w-10 text-orange-400 animate-spin" strokeWidth={1.2} />
            ) : (
              <Sparkles className="h-10 w-10 text-orange-400" strokeWidth={1.2} />
            )}
          </div>
          <h1
            className="max-w-full break-words text-[32px] leading-tight text-white"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {analyzing ? "Analyzing…" : `${displayName} returns!`}
          </h1>
          <p className="mt-2 text-[12px] text-white/40">
            {credits?.balance ?? 0} credits · {credits?.plan ?? "free"} plan
          </p>
        </div>
      )}

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
            placeholder="Chat with Jeradin…"
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
              onClick={() => setCapabilitySheetOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-black/55 px-4 text-[13px] font-semibold text-white shadow-sm"
              aria-label="Select capability"
            >
              <CapabilityIcon capability={selected} className="h-4 w-4" />
              {CAPABILITIES.find((c) => c.key === selected)?.title.replace(" Intelligence", "") ?? "Screen"}
            </button>
            <div className="flex-1" />
            <button
              onClick={handleMobileSend}
              disabled={analyzing}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-black disabled:opacity-60"
              aria-label={recording ? "Capture screen" : "Send"}
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-4 w-4 fill-current" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <Sheet open={capabilitySheetOpen} onOpenChange={setCapabilitySheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[28px] border-white/10 bg-[#1c1c1a] px-6 pb-8 pt-5 text-white">
          <div className="mx-auto mb-5 h-1 w-14 rounded-full bg-white/15" />
          <SheetTitle className="text-center text-[20px] font-semibold text-white">Select capability</SheetTitle>
          <div className="mt-6 space-y-5">
            {CAPABILITIES.map((capability) => {
              const isActive = capability.key === selected;
              return (
                <button
                  key={capability.key}
                  onClick={() => {
                    setActiveCapability(isActive ? null : capability.key);
                    setCapabilitySheetOpen(false);
                    onCloseCapabilityPanels();
                  }}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 text-left"
                >
                  <span className="min-w-0">
                    <span className={`block text-[20px] font-semibold ${isActive ? "text-sky-400" : "text-white"}`}>
                      {capability.title}
                    </span>
                    <span className={`mt-1 block text-[14px] leading-snug ${isActive ? "text-sky-400" : "text-white/50"}`}>
                      {capability.mobileDesc ?? capability.desc}
                    </span>
                  </span>
                  {isActive && <Check className="h-5 w-5 shrink-0 text-sky-400" />}
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

function CapabilityIcon({ capability, className }: { capability: CapabilityKey; className?: string }) {
  const Icon = CAPABILITIES.find((c) => c.key === capability)?.Icon ?? Monitor;
  return <Icon className={className} />;
}


function InlineAnalysisChat({
  analysis,
  fix,
  messages,
  onMessagesChange,
}: {
  analysis: ScreenAnalysis;
  fix: FixSuggestion;
  messages: OverlayChatMessage[];
  onMessagesChange: (m: OverlayChatMessage[]) => void;
}) {
  const askFollowUp = useServerFn(chatAboutAnalysis);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const next: OverlayChatMessage[] = [...messages, { role: "user", content: text }];
    onMessagesChange(next);
    setInput("");
    setSending(true);
    try {
      const { reply } = await askFollowUp({
        data: {
          analysis: analysis as ScreenAnalysis & Record<string, unknown>,
          fix,
          messages: next,
        },
      });
      onMessagesChange([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reply");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-white/10 rounded-lg bg-white/[0.02] flex flex-col">
      <div className="px-4 py-2.5 border-b border-white/10 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
        Chat with Jeradin about this analysis
      </div>
      <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto min-h-[120px]">
        {messages.length === 0 && !sending && (
          <p className="text-[13px] text-white/45">
            Ask a follow-up about the diagnosis, the fix, or anything adjacent.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className="text-[13px] leading-relaxed">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40 mb-1">
              {m.role === "user" ? "You" : "Jeradin"}
            </div>
            <div className={`whitespace-pre-wrap ${m.role === "user" ? "text-white" : "text-white/85"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="text-[12.5px] text-white/50 inline-flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-white/10 p-2">
        <div className="flex items-end gap-2 rounded-lg border border-white/15 bg-black/40 focus-within:border-white/30 px-3 py-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask a follow-up…"
            rows={1}
            className="flex-1 bg-transparent text-[13.5px] resize-none focus:outline-none placeholder:text-white/35 max-h-32 py-1"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="inline-flex h-8 w-8 items-center justify-center rounded bg-white text-black disabled:opacity-40 shrink-0"
            aria-label="Send"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}




