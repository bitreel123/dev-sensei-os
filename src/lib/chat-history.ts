import type { ScreenAnalysis, FixSuggestion, OverlayChatMessage } from "@/lib/screen-intel.functions";

export type ChatHistoryPayload = {
  analysis: ScreenAnalysis;
  fix: FixSuggestion;
  messages?: OverlayChatMessage[];
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

export function addHistoryEntry(title: string, payload?: ChatHistoryPayload | null): ChatHistoryEntry {
  const entry: ChatHistoryEntry = {
    id: crypto.randomUUID(),
    title: title.trim().slice(0, 80) || "Untitled chat",
    createdAt: Date.now(),
    payload: payload ?? null,
  };
  const next = [entry, ...loadHistory()];
  saveHistory(next);
  return entry;
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
