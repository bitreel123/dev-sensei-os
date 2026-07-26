// Client-side helper for consuming NDJSON streams from /api/intel/*.stream
import { supabase } from "@/integrations/supabase/client";

export type IntelStreamEvent =
  | { type: "stage"; id: string; label: string; status: "running" | "done" | "error"; message?: string }
  | { type: "section"; id: string; label: string; data: unknown }
  | { type: "section-error"; id: string; label: string; message: string }
  | { type: "meta"; intent?: string; entities?: string[]; [k: string]: unknown }
  | { type: "done"; meta?: Record<string, unknown> }
  | { type: "error"; message: string };

export async function streamIntel(
  endpoint: string,
  body: unknown,
  onEvent: (event: IntelStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status})`;
    try {
      const text = await res.text();
      if (text) message = text.slice(0, 400);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      let event: IntelStreamEvent;
      try {
        event = JSON.parse(line) as IntelStreamEvent;
      } catch {
        continue;
      }
      onEvent(event);
    }
  }
  const tail = buffer.trim();
  if (tail) {
    let event: IntelStreamEvent | null = null;
    try {
      event = JSON.parse(tail) as IntelStreamEvent;
    } catch {
      event = null;
    }
    if (event) onEvent(event);
  }
}
