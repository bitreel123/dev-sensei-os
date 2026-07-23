import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChatSidebar } from "@/components/jeradin/chat-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useUserData } from "@/hooks/use-user-data";
import { useGithubConnection, startGithubOAuth } from "@/hooks/use-github-connection";
import { Monitor, Square, Send, Paperclip, X, Network, BookOpen, Github, Sparkles, Loader2, AlertTriangle, Menu, User as UserIcon, Plus, Check, Ghost, ChevronDown } from "lucide-react";
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
import { listMyGithubRepos, setActiveRepo, type GithubRepo } from "@/lib/repo-intel.functions";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { streamIntel, type IntelStreamEvent } from "@/lib/intel-stream";



export const Route = createFileRoute("/chat")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => {
    const id = typeof s.id === "string" ? s.id : undefined;
    return id ? { id } : {};
  },
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
  const [lastScreenshotBase64, setLastScreenshotBase64] = useState<string | null>(null);
  const [lastScreenshotNote, setLastScreenshotNote] = useState<string>("");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{ analysis: ScreenAnalysis; fix: FixSuggestion } | null>(null);
  const [systemResult, setSystemResult] = useState<{ analysis: SystemAnalysis; filesAnalyzed: number } | null>(null);
  const [knowledgeResult, setKnowledgeResult] = useState<KnowledgeReport | null>(null);
  const [repoResult, setRepoResult] = useState<GithubIntelReport | null>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [overlayMessages, setOverlayMessages] = useState<OverlayChatMessage[]>([]);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [knowledgeEnabled, setKnowledgeEnabled] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [reposLoading, setReposLoading] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState("");
  const [lastRun, setLastRun] = useState<{
    kind: "screen" | "knowledge" | "system" | "repo";
    status: "running" | "success" | "error";
    message?: string;
  } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pendingFrameRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const runAnalyze = useServerFn(analyzeScreenAndSuggestFix);
  const runSystem = useServerFn(analyzeSystem);
  const runKnowledge = useServerFn(runKnowledgeIntelligence);
  const runRepo = useServerFn(runGithubIntelligence);
  const loadGithubRepos = useServerFn(listMyGithubRepos);
  const saveActiveRepo = useServerFn(setActiveRepo);
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

  useEffect(() => {
    if (!user || !github) {
      setGithubRepos([]);
      setSelectedRepo("");
      return;
    }
    let cancelled = false;
    setReposLoading(true);
    loadGithubRepos()
      .then(({ repos }) => {
        if (cancelled) return;
        setGithubRepos(repos);
        setSelectedRepo((current) => {
          const next = current || repos[0]?.full_name || "";
          if (!current && next) {
            void saveActiveRepo({ data: { repo: next } }).catch(() => undefined);
          }
          return next;
        });
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Could not load GitHub repositories");
      })
      .finally(() => {
        if (!cancelled) setReposLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, github, loadGithubRepos]);

  async function chooseRepo(repo: string) {
    setSelectedRepo(repo);
    if (!repo) return;
    try {
      await saveActiveRepo({ data: { repo } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not select repository");
    }
  }

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
    setLastSubmittedPrompt(note.trim() || title);
    setPendingPrompt(note.trim() || title);
    setLastScreenshotBase64(base64);
    setLastScreenshotNote(note);
    setLastRun({ kind: "screen", status: "running" });
    try {
      const result = await runAnalyze({ data: { imageBase64: base64, note, mode: "fast" } });
      setAnalysisResult(result);
      setOverlayMessages([]);
      setOverlayOpen(true);
      setActiveCapability("screen");
      const entry = addHistoryEntry(title, { mode: "screen", analysis: result.analysis, fix: result.fix, messages: [] });
      setCurrentEntryId(entry.id);
      navigate({ to: "/chat", search: { id: entry.id } });
      toast.success("Analysis complete");
      setLastRun({ kind: "screen", status: "success", message: "Analysis complete" });
      setPrompt("");
      return result;
    } catch (e) {
      console.error("[analyzeImageBase64] failed:", e);
      const message = formatAnalysisError(e);
      setAnalysisError(message);
      toast.error(message);
      setLastRun({ kind: "screen", status: "error", message });
      return null;
    } finally {
      setAnalyzing(false);
      setPendingPrompt("");
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
    if (!loading && !user) navigate({ to: "/login", search: {} });
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
    if (!navigator.mediaDevices?.getDisplayMedia) {
      const message = "Screen recording is not supported by this mobile browser. Attach a screenshot instead.";
      setAnalysisError(message);
      toast.error(message);
      imageInputRef.current?.click();
      return;
    }
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
        const preCaptured = pendingFrameRef.current;
        pendingFrameRef.current = null;
        stopStream();
        setRecording(false);
        try {
          const base64 = preCaptured ?? (await videoBlobToFrameBase64(blob));
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

  async function stopRecording() {
    // Grab a frame straight off the live MediaStream BEFORE tearing it
    // down. Decoding freshly-recorded WebM blobs is unreliable across
    // browsers ("Could not load recording"); a live-stream capture always
    // works and is dramatically faster.
    try {
      const stream = streamRef.current;
      if (stream) {
        const video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play().catch(() => undefined);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const maxW = 1280;
        const vw = video.videoWidth || maxW;
        const vh = video.videoHeight || 720;
        const scale = Math.min(1, maxW / vw);
        const w = Math.floor(vw * scale);
        const h = Math.floor(vh * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          pendingFrameRef.current = canvas
            .toDataURL("image/png")
            .replace(/^data:image\/png;base64,/, "");
        }
        video.pause();
      }
    } catch (e) {
      console.warn("[stopRecording] live frame capture failed, will fall back to blob decode", e);
    }
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

    // Plain text (with or without non-image file attachments) → route to Knowledge Intelligence
    // so users get a real reply instead of a "attach a screenshot" toast.
    if (prompt.trim()) {
      await runPromptCapability("knowledge");
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
      toast.success("Knowledge enabled — type your question in the chat box and press Send.");
      return;
    }

    const repo = selectedRepo || extractRepoName(text);
    if ((capability === "system" || capability === "repo") && !repo && attachments.length === 0) {
      if (!github) {
        toast.message("Connect GitHub, choose a codebase, then ask Jeradin to analyze it.");
        await startGithubOAuth("connect", "/chat").catch((error) => toast.error(error instanceof Error ? error.message : "GitHub connection failed"));
        return;
      }
      toast.error("Choose a repository above the chat box, then Send.");
      return;
    }

    setAnalyzing(true);
    setPendingPrompt(text);
    setLastSubmittedPrompt(text || (capability === "system" ? "Scan my codebase" : "Run my GitHub code"));
    setLastRun({ kind: capability, status: "running" });
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
        setLastRun({ kind: "knowledge", status: "success", message: "Knowledge report ready" });
        return;
      }

      if (capability === "system") {
        if (attachments.length > 0) {
          const files = await attachmentsToFileInputs(attachments);
          if (files.length === 0) {
            toast.error("Attach readable code files, then Send.");
            setLastRun({ kind: "system", status: "error", message: "No readable code files" });
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
          setLastRun({ kind: "system", status: "success", message: `${res.filesAnalyzed} files analyzed` });
          return;
        }
        if (!github) {
          toast.message("Connect GitHub, choose a codebase, then ask Jeradin to analyze it.");
          await startGithubOAuth("connect", "/chat").catch((error) => toast.error(error instanceof Error ? error.message : "GitHub connection failed"));
          setLastRun({ kind: "system", status: "error", message: "GitHub not connected" });
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
        setLastRun({ kind: "system", status: "success", message: `Scanned ${repo}` });
        return;
      }

      if (!github) {
        toast.message("Connect GitHub, choose a codebase, then ask Jeradin to analyze it.");
        await startGithubOAuth("connect", "/chat").catch((error) => toast.error(error instanceof Error ? error.message : "GitHub connection failed"));
        setLastRun({ kind: "repo", status: "error", message: "GitHub not connected" });
        return;
      }
      const focus = text || "Run my GitHub code and explain its health, risks, and recent changes.";
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
      setLastRun({ kind: "repo", status: "success", message: `Audited ${repo}` });
    } catch (e) {
      console.error("[runPromptCapability] failed:", e);
      const message = formatAnalysisError(e);
      setAnalysisError(message);
      toast.error(message);
      setLastRun({ kind: capability, status: "error", message });
    } finally {
      setAnalyzing(false);
      setPendingPrompt("");
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
        overlayMessages={overlayMessages}
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
        githubConnected={!!github}
        githubLogin={github?.login ?? null}
        githubRepos={githubRepos}
        selectedRepo={selectedRepo}
        reposLoading={reposLoading}
        onSelectRepo={chooseRepo}
        pendingPrompt={pendingPrompt}
        lastSubmittedPrompt={lastSubmittedPrompt}
      />


      {/* ============= DESKTOP LAYOUT ============= */}
      <div className="hidden md:flex h-full">
      <ChatSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 px-5 text-[12px] text-white/70 shrink-0">
          <div className="flex items-center gap-2">
            <LastRunPill lastRun={lastRun} />
          </div>
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
                {lastSubmittedPrompt && (analyzing || analysisResult || systemResult || knowledgeResult || repoResult || analysisError) && (
                  <div className="ml-auto max-w-[78%] rounded-lg bg-white/[0.08] px-4 py-3 text-[13px] leading-relaxed text-white/90">
                    {lastSubmittedPrompt}
                  </div>
                )}
                {analysisError && (
                  <AnalysisError message={analysisError} />
                )}

                {!analysisError && analysisResult ? (
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
                    <ScreenAnalysisConversation
                      result={analysisResult}
                      messages={overlayMessages}
                      sending={analyzing && overlayMessages.length > 0}
                    />
                  </div>
                ) : !analysisError && systemResult ? (
                  <IntelResultFrame title="System Intelligence" icon={<Network className="h-4 w-4 text-orange-400" />}>
                    <div className="mb-4 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50">
                      {systemResult.filesAnalyzed} files analyzed
                    </div>
                    <SystemReportBody analysis={systemResult.analysis} />
                  </IntelResultFrame>
                ) : !analysisError && knowledgeResult ? (
                  <IntelResultFrame title="Knowledge Intelligence" icon={<BookOpen className="h-4 w-4 text-orange-400" />}>
                    <KnowledgeReportBody report={knowledgeResult} />
                  </IntelResultFrame>
                ) : !analysisError && repoResult ? (
                  <IntelResultFrame title="GitHub Intelligence" icon={<Github className="h-4 w-4 text-orange-400" />}>
                    <RepoReportBody report={repoResult} />
                  </IntelResultFrame>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <h1
                      className="text-center text-[44px] leading-[1.05] tracking-[-0.02em]"
                      style={{ fontFamily: "'Instrument Serif', serif" }}
                    >
                      {analyzing
                        ? activeCapability === "system"
                          ? "Scanning your codebase…"
                          : activeCapability === "repo"
                            ? "Reading your repository…"
                            : activeCapability === "knowledge"
                              ? "Researching your answer…"
                              : "Analyzing your screen…"
                        : "What are we doing today?"}
                    </h1>
                    <p className="mt-2 text-center text-[13px] text-white/55">
                      {analyzing
                        ? "Jeradin is looking at what you shared. You can keep typing — send another prompt when you're ready."
                        : "Describe the issue, let Jeradin solve it for you."}
                    </p>
                    {analyzing && (
                      <ChatRunProgress capability={activeCapability ?? "knowledge"} prompt={pendingPrompt} repo={selectedRepo} />
                    )}
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
                      knowledgeEnabled={knowledgeEnabled}
                      githubConnected={!!github}
                      githubLogin={github?.login ?? null}
                      githubRepos={githubRepos}
                      selectedRepo={selectedRepo}
                      reposLoading={reposLoading}
                      onSelectRepo={chooseRepo}
                      onSelectCapability={(m) => {
                        setActiveCapability((currentMode) => currentMode === m ? null : m);
                        setOpenedCapabilityPanel(null);
                        setAnalysisResult(null);
                        setSystemResult(null);
                        setKnowledgeResult(null);
                        setRepoResult(null);
                        setAnalysisError(null);
                        navigate({ to: "/chat", search: {} });
                      }}
                    />
                  </div>
                )}
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
                knowledgeEnabled={knowledgeEnabled}
                githubConnected={!!github}
                githubLogin={github?.login ?? null}
                githubRepos={githubRepos}
                selectedRepo={selectedRepo}
                reposLoading={reposLoading}
                onSelectRepo={chooseRepo}
                compact
                onSelectCapability={(m) => {
                  setActiveCapability((currentMode) => currentMode === m ? null : m);
                  setOpenedCapabilityPanel(null);
                  setAnalysisResult(null);
                  setSystemResult(null);
                  setKnowledgeResult(null);
                  setRepoResult(null);
                  setAnalysisError(null);
                  navigate({ to: "/chat", search: {} });
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
            screenshotBase64={lastScreenshotBase64}
            note={lastScreenshotNote}
            onResultReplace={(next) => {
              setAnalysisResult(next);
              if (currentEntryId) {
                updateHistoryEntry(currentEntryId, {
                  payload: { mode: "screen", analysis: next.analysis, fix: next.fix, messages: overlayMessages },
                });
              }
            }}
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
  if (raw.includes("429") || lower.includes("rate limit") || lower.includes("resource_exhausted")) {
    return "The analysis service is temporarily at capacity. Please wait a moment and try again.";
  }
  if (raw.includes("402") || lower.includes("out of credits")) {
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

function ScreenAnalysisConversation({
  result,
  messages,
  sending,
}: {
  result: { analysis: ScreenAnalysis; fix: FixSuggestion };
  messages: OverlayChatMessage[];
  sending: boolean;
}) {
  const { analysis, fix } = result;
  return (
    <div className="mx-auto max-w-[760px] space-y-8 text-[16px] leading-7 text-white/90">
      <article className="space-y-6">
        <p className="text-[14px] leading-6 text-white/50">{analysis.summary}</p>

        {(() => {
          const stack = analysis.stack;
          const ctx = analysis.context;
          const chips: Array<{ label: string; value: string }> = [];
          if (stack?.framework) chips.push({ label: "Framework", value: stack.framework });
          if (stack?.language) chips.push({ label: "Language", value: stack.language });
          if (stack?.database) chips.push({ label: "Database", value: stack.database });
          if (stack?.runtime) chips.push({ label: "Runtime", value: stack.runtime });
          if (stack?.buildTool) chips.push({ label: "Build", value: stack.buildTool });
          if (ctx?.ide || analysis.editor) chips.push({ label: "IDE", value: (ctx?.ide ?? analysis.editor)! });
          if (ctx?.currentFile) chips.push({ label: "File", value: `${ctx.currentFile}${ctx.cursorLine ? `:${ctx.cursorLine}` : ""}` });
          if (ctx?.workflow) chips.push({ label: "Running", value: ctx.workflow });
          if (chips.length === 0) return null;
          return (
            <section className="space-y-2">
              <h2 className="text-[19px] font-semibold text-white">Detected context</h2>
              <div className="flex flex-wrap gap-2">
                {chips.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[12px] text-white/85">
                    <span className="text-white/45">{c.label}:</span> {c.value}
                  </span>
                ))}
              </div>
            </section>
          );
        })()}

        <section className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[19px] font-semibold text-white">Root cause</h2>
            {typeof fix.confidence === "number" && (
              <span className="font-mono text-[12px] text-emerald-400/90">{fix.confidence}% confidence</span>
            )}
          </div>
          <p>{analysis.hypothesis}</p>
          {(analysis.affectedFunction || analysis.affectedDependency) && (
            <p className="font-mono text-[12px] text-white/50">
              {analysis.affectedFunction ? `fn ${analysis.affectedFunction}` : ""}
              {analysis.affectedDependency ? `${analysis.affectedFunction ? " · " : ""}pkg ${analysis.affectedDependency}` : ""}
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-[19px] font-semibold text-white">What happened</h2>
          <p>{fix.plainExplanation}</p>
          {fix.technicalExplanation && (
            <div className="rounded-md border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/40">Technical</div>
              <p className="text-[14px] leading-6 text-white/80">{fix.technicalExplanation}</p>
            </div>
          )}
          <p className="text-white/70">{fix.whyItHappened}</p>
        </section>

        {analysis.errors.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-white">Errors detected</h2>
            <ul className="list-disc space-y-2 pl-6">
              {analysis.errors.map((err, i) => (
                <li key={i} className="pl-1">
                  <span>{err.message}</span>
                  {(err.file || err.source) && (
                    <span className="block font-mono text-[12px] text-white/45">
                      {err.source}
                      {err.file ? ` · ${err.file}${err.line ? `:${err.line}` : ""}` : ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {analysis.suspectFiles.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-white">Affected files</h2>
            <ul className="list-disc space-y-1 pl-6">
              {analysis.suspectFiles.map((file, i) => (
                <li key={i} className="font-mono text-[13px] text-white/80">{file}</li>
              ))}
            </ul>
          </section>
        )}

        {fix.recommendedActions && fix.recommendedActions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-white">Recommended fix</h2>
            <ul className="space-y-1.5">
              {fix.recommendedActions.map((a, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 text-emerald-400">✓</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {fix.impact && fix.impact.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[19px] font-semibold text-white">If not fixed</h2>
            <ul className="space-y-2">
              {fix.impact.map((im, i) => (
                <li key={i} className="rounded-md border border-red-500/20 bg-red-500/[0.04] p-3">
                  <span className="font-semibold text-red-300">{im.area}</span>
                  <span className="text-white/70"> — {im.consequence}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {fix.steps.length > 0 && (
          <section className="space-y-5">
            <h2 className="text-[19px] font-semibold text-white">Step-by-step fix</h2>
            {fix.steps.map((step, i) => (
              <div key={i} className="space-y-2">
                <h3 className="text-[16px] font-semibold text-white">
                  Step {i + 1}{step.file ? ` — ${step.file}` : ""}
                </h3>
                <p className="text-white/84">{step.change}</p>
                {step.codeAfter && (
                  <div className="overflow-visible rounded-md border border-white/10">
                    <CodeBlock code={step.codeAfter} language={detectFileLanguage(step.file)} />
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {fix.learnMode && (
          <section className="space-y-2 rounded-md border border-orange-400/20 bg-orange-400/[0.04] p-4">
            <h2 className="text-[15px] font-semibold text-orange-200">Learn mode</h2>
            <p className="text-[14px] leading-6 text-white/85 italic">{fix.learnMode}</p>
          </section>
        )}

        {fix.additionalNotes && (
          <p className="border-t border-white/10 pt-5 text-[14px] leading-6 text-white/58">{fix.additionalNotes}</p>
        )}
      </article>


      {messages.length > 0 && (
        <div className="space-y-6">
          {messages.map((message, i) => (
            <div key={i} className={message.role === "user" ? "flex justify-end" : "block"}>
              {message.role === "user" ? (
                <div className="max-w-[72%] rounded-2xl bg-white/[0.09] px-4 py-2.5 text-[15px] leading-6 text-white">
                  {message.content}
                </div>
              ) : (
                <div className="max-w-[760px] whitespace-pre-wrap text-[16px] leading-7 text-white/90">
                  {message.content}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {sending && (
        <div className="inline-flex items-center gap-2 text-[14px] text-white/55">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
        </div>
      )}
    </div>
  );
}

function detectFileLanguage(file?: string | null): string {
  if (!file) return "typescript";
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    cjs: "javascript",
    mjs: "javascript",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    php: "php",
    cs: "csharp",
    c: "c",
    h: "c",
    cpp: "cpp",
    hpp: "cpp",
    json: "json",
    yml: "yaml",
    yaml: "yaml",
    toml: "toml",
    md: "markdown",
    css: "css",
    scss: "scss",
    html: "html",
    sh: "bash",
    bash: "bash",
    sql: "sql",
  };
  return map[ext] ?? "typescript";
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
  knowledgeEnabled,
  githubConnected,
  githubLogin,
  githubRepos,
  selectedRepo,
  reposLoading,
  onSelectRepo,
  compact = false,
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
  knowledgeEnabled: boolean;
  githubConnected?: boolean;
  githubLogin?: string | null;
  githubRepos: GithubRepo[];
  selectedRepo: string;
  reposLoading: boolean;
  onSelectRepo: (repo: string) => void;
  compact?: boolean;
  onSelectCapability: (m: CapabilityKey) => void;
}) {
  const selected = current ?? "screen";
  const placeholder = selected === "screen"
    ? "Paste an error, describe the bug, or start a screen recording…"
    : selected === "system"
      ? "Ask Jeradin to scan or explain the selected codebase…"
      : selected === "repo"
        ? "Ask about commits, pull requests, releases, or regressions…"
        : "Ask a question or describe what you want to research…";

  return (
    <div className={`${compact ? "mt-0" : "mt-16"} w-full`}>
      {(selected === "system" || selected === "repo") && (
        <RepoSelector
          connected={!!githubConnected}
          login={githubLogin}
          repos={githubRepos}
          value={selectedRepo}
          loading={reposLoading}
          onChange={onSelectRepo}
        />
      )}
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
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (!analyzing) onSend();
            }
          }}
          placeholder={placeholder}
          rows={2}
          className="w-full bg-transparent p-4 text-[14px] resize-none focus:outline-none placeholder:text-white/35"
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <ToolButton onClick={onAttach} icon={<Paperclip className="h-3.5 w-3.5" />} label="Attach" />
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
          knowledgeEnabled={knowledgeEnabled}
          githubConnected={githubConnected}
          githubLogin={githubLogin}
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

function LastRunPill({
  lastRun,
}: {
  lastRun: {
    kind: "screen" | "knowledge" | "system" | "repo";
    status: "running" | "success" | "error";
    message?: string;
  } | null;
}) {
  if (!lastRun) return null;
  const labels = {
    screen: "Screen Intelligence",
    knowledge: "Knowledge Intelligence",
    system: "System Intelligence",
    repo: "GitHub Intelligence",
  } as const;
  const tone =
    lastRun.status === "success"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
      : lastRun.status === "error"
        ? "border-red-400/30 bg-red-400/10 text-red-300"
        : "border-white/20 bg-white/5 text-white/70";
  const dot =
    lastRun.status === "success" ? "bg-emerald-400" : lastRun.status === "error" ? "bg-red-400" : "bg-white/60 animate-pulse";
  const statusText =
    lastRun.status === "success" ? "OK" : lastRun.status === "error" ? "Failed" : "Running…";
  return (
    <div
      title={lastRun.message ?? ""}
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span>{labels[lastRun.kind]}</span>
      <span className="text-white/40">·</span>
      <span>{statusText}</span>
    </div>
  );
}

function CapabilityDetails({
  current,
  recording,
  onRecord,
  onSend,
  knowledgeEnabled,
  githubConnected,
  githubLogin,
}: {
  current: CapabilityKey;
  recording: boolean;
  onRecord: () => void;
  onSend: () => void;
  knowledgeEnabled: boolean;
  githubConnected?: boolean;
  githubLogin?: string | null;
}) {
  const capability = CAPABILITIES.find((c) => c.key === current) ?? CAPABILITIES[0];
  const needsGithub = current === "system" || current === "repo";
  const ctaLabel =
    current === "screen"
      ? (recording ? "Stop recording" : capability.cta)
      : current === "knowledge" && knowledgeEnabled
        ? "Knowledge enabled"
      : needsGithub && githubConnected
        ? "GitHub connected"
      : capability.cta;
  const onCta =
    current === "screen"
      ? onRecord
      : needsGithub && !githubConnected
        ? () => startGithubOAuth("connect", "/chat").catch((err) => toast.error(err instanceof Error ? err.message : "GitHub connection failed"))
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
        {needsGithub && githubConnected && githubLogin && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9.5px] text-emerald-300 normal-case tracking-normal">
            <Check className="h-3 w-3" /> {githubLogin}
          </span>
        )}
      </div>
      <p className="mx-auto mt-2 max-w-[560px] text-[12.5px] leading-relaxed text-white/55">
        {capability.desc}
      </p>
      {current === "knowledge" && knowledgeEnabled && (
        <p className="mt-2 text-[11.5px] text-emerald-300/80">
          Type your question in the chat box above and press Send.
        </p>
      )}
      {needsGithub && githubConnected && (
        <p className="mt-2 text-[11.5px] text-emerald-300/80">
          Choose a codebase above, type “Run my GitHub code,” and press Send.
        </p>
      )}
      <button
        onClick={onCta}
        className="mt-3 inline-flex items-center gap-1.5 bg-white text-black px-4 py-1.5 rounded font-mono text-[10.5px] uppercase tracking-[0.22em] hover:bg-white/90 transition-colors"
      >
        {(current === "knowledge" && knowledgeEnabled) || (needsGithub && githubConnected) ? <Check className="h-3.5 w-3.5" /> : <CtaIcon className="h-3.5 w-3.5" />}
        {ctaLabel}
      </button>
    </div>
  );
}

function RepoSelector({
  connected,
  login,
  repos,
  value,
  loading,
  onChange,
}: {
  connected: boolean;
  login?: string | null;
  repos: GithubRepo[];
  value: string;
  loading: boolean;
  onChange: (repo: string) => void;
}) {
  if (!connected) {
    return (
      <button
        onClick={() => startGithubOAuth("connect", "/chat").catch((error) => toast.error(error instanceof Error ? error.message : "GitHub connection failed"))}
        className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-3 py-2.5 text-[12px] text-white/80 hover:border-white/30"
      >
        <Github className="h-4 w-4" /> Connect GitHub codebase
      </button>
    );
  }
  return (
    <div className="mb-3 flex items-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-3 py-2">
      <Github className="h-4 w-4 shrink-0 text-emerald-300" />
      <span className="hidden text-[11px] text-white/45 sm:inline">{login ? `@${login}` : "GitHub"}</span>
      <div className="relative min-w-0 flex-1">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={loading || repos.length === 0}
          aria-label="Choose GitHub repository"
          className="w-full appearance-none bg-transparent pr-7 text-[12.5px] text-white outline-none disabled:text-white/40"
        >
          <option value="" className="bg-neutral-950">{loading ? "Loading your codebases…" : repos.length ? "Choose a codebase" : "No codebases found"}</option>
          {repos.map((repo) => (
            <option key={repo.full_name} value={repo.full_name} className="bg-neutral-950">
              {repo.full_name}{repo.private ? " · private" : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/45" />
      </div>
    </div>
  );
}

function ChatRunProgress({ capability, prompt, repo }: { capability: CapabilityKey; prompt: string; repo: string }) {
  const label = capability === "system" ? "Scanning codebase" : capability === "repo" ? "Analyzing GitHub codebase" : capability === "screen" ? "Analyzing screen" : "Researching answer";
  return (
    <div className="mt-5 w-full max-w-[640px] border-l border-white/15 pl-4 text-left">
      {prompt && <p className="mb-3 text-[13px] leading-relaxed text-white/55">{prompt}</p>}
      <div className="flex items-center gap-2 text-[12.5px]">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" />
        <Shimmer className="font-mono uppercase tracking-[0.16em]">{repo && (capability === "system" || capability === "repo") ? `${label} · ${repo}` : label}</Shimmer>
      </div>
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
    desc: "Knowledge Intelligence transforms ideas into production-ready software by combining technical knowledge, market research, competitor teardowns, architecture planning and engineering best practices — grounded in a live knowledge graph, not just a chatbot completion.",
    mobileDesc: "Find repos, APIs, models",
    cta: "Enable knowledge",
    Icon: BookOpen,
  },
  {
    key: "repo",
    title: "GitHub Intelligence",
    desc: "Choose any connected GitHub codebase, then ask Jeradin to run or review it. Jeradin analyzes the code, commits, pull requests, releases, and recent changes for you.",
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
  overlayMessages,
  systemResult,
  knowledgeResult,
  repoResult,
  onClearAnalysis,
  openedCapabilityPanel,
  onOpenCapabilityPanel,
  onCloseCapabilityPanels,
  currentEntryId,
  setCurrentEntryId,
  githubConnected,
  githubLogin,
  githubRepos,
  selectedRepo,
  reposLoading,
  onSelectRepo,
  pendingPrompt,
  lastSubmittedPrompt,
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
  overlayMessages: OverlayChatMessage[];
  systemResult: { analysis: SystemAnalysis; filesAnalyzed: number } | null;
  knowledgeResult: KnowledgeReport | null;
  repoResult: GithubIntelReport | null;
  onClearAnalysis: () => void;
  openedCapabilityPanel: Exclude<CapabilityKey, "screen"> | null;
  onOpenCapabilityPanel: (m: Exclude<CapabilityKey, "screen">) => void;
  onCloseCapabilityPanels: () => void;
  currentEntryId: string | null;
  setCurrentEntryId: (id: string | null) => void;
  githubConnected: boolean;
  githubLogin: string | null;
  githubRepos: GithubRepo[];
  selectedRepo: string;
  reposLoading: boolean;
  onSelectRepo: (repo: string) => void;
  pendingPrompt: string;
  lastSubmittedPrompt: string;
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
      {analysisError ? (
        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 pb-3">
          {lastSubmittedPrompt && (
            <div className="ml-auto mb-4 mt-4 max-w-[85%] rounded-2xl bg-white/[0.08] px-4 py-3 text-[14px] leading-relaxed text-white/90">
              {lastSubmittedPrompt}
            </div>
          )}
          <AnalysisError message={analysisError} />
        </div>
      ) : analysisResult ? (
        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 pb-3">
          <div className="pt-4">
            <ScreenAnalysisConversation
              result={analysisResult}
              messages={overlayMessages}
              sending={analyzing && overlayMessages.length > 0}
            />
          </div>
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
          <IntelResultFrame title="GitHub Intelligence" icon={<Github className="h-4 w-4 text-orange-400" />}>
            <RepoReportBody report={repoResult} />
          </IntelResultFrame>
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
          {lastSubmittedPrompt && analyzing && (
            <div className="mt-4 max-w-[90%] rounded-2xl bg-white/[0.08] px-4 py-3 text-left text-[14px] leading-relaxed text-white/90">
              {lastSubmittedPrompt}
            </div>
          )}
          {analyzing && <ChatRunProgress capability={selected} prompt={pendingPrompt} repo={selectedRepo} />}
        </div>
      )}

      {/* Composer */}
      <div className="p-3 shrink-0">
        {(selected === "system" || selected === "repo") && (
          <RepoSelector
            connected={githubConnected}
            login={githubLogin}
            repos={githubRepos}
            value={selectedRepo}
            loading={reposLoading}
            onChange={onSelectRepo}
          />
        )}
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
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (!analyzing) handleMobileSend();
              }
            }}
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



