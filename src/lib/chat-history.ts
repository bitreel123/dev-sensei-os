import type { ScreenAnalysis, FixSuggestion, OverlayChatMessage } from "@/lib/screen-intel.functions";
import type { SystemAnalysis } from "@/lib/system-intel.functions";
import type { KnowledgeReport } from "@/lib/knowledge-intel.functions";
import type { GithubIntelReport } from "@/lib/github-intel.functions";

export type ChatMode = "screen" | "system" | "knowledge" | "repo";

export type ChatHistoryPayload = {
  mode?: ChatMode;
  // screen (also default for legacy entries)
  analysis?: ScreenAnalysis;
  fix?: FixSuggestion;
  messages?: OverlayChatMessage[];
  // system
  system?: { analysis: SystemAnalysis; filesAnalyzed: number; input: { source: "github" | "upload"; repo?: string; projectHint?: string } };
  // knowledge
  knowledge?: { report: KnowledgeReport; input: { question: string; projectContext?: string } };
  // repo
  repo?: { report: GithubIntelReport; input: { repo: string; focus?: string } };
};

export type ChatHistoryEntry = {
  id: string;
  title: string;
  createdAt: number;
  payload?: ChatHistoryPayload | null;
};

const KEY = "jeradin.chat.history.v1";
const EVENT = "jeradin:history-updated";

export function loadHistory(): ChatHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ChatHistoryEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: ChatHistoryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, 50)));
  window.dispatchEvent(new Event(EVENT));
}

export function addHistoryEntry(title: string, payload?: ChatHistoryPayload | null, id?: string): ChatHistoryEntry {
  const entry: ChatHistoryEntry = {
    id: id ?? crypto.randomUUID(),
    title: title.trim().slice(0, 80) || "Untitled chat",
    createdAt: Date.now(),
    payload: payload ?? null,
  };
  const next = [entry, ...loadHistory().filter((e) => e.id !== entry.id)];
  saveHistory(next);
  return entry;
}

/** Update if present, otherwise create. Preserves createdAt on update. */
export function upsertHistoryEntry(id: string, title: string, payload?: ChatHistoryPayload | null): ChatHistoryEntry {
  const existing = getHistoryEntry(id);
  if (existing) {
    const updated: ChatHistoryEntry = { ...existing, title: title.trim().slice(0, 80) || existing.title, payload: payload ?? existing.payload };
    saveHistory(loadHistory().map((e) => (e.id === id ? updated : e)));
    return updated;
  }
  return addHistoryEntry(title, payload, id);
}

export function updateHistoryEntry(id: string, patch: Partial<ChatHistoryEntry>) {
  const next = loadHistory().map((e) => (e.id === id ? { ...e, ...patch } : e));
  saveHistory(next);
}

export function getHistoryEntry(id: string): ChatHistoryEntry | undefined {
  return loadHistory().find((e) => e.id === id);
}

export function removeHistoryEntry(id: string) {
  saveHistory(loadHistory().filter((e) => e.id !== id));
}

export function clearHistory() {
  saveHistory([]);
}

export function subscribeHistory(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
