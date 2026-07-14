import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ANALYST_INSTRUCTIONS,
  TAXONOMY_PROMPT,
  callGeminiAnalyst,
  callGeminiText,
  type Diagnosis,
} from "./intel-shared";

// A raw log/error event captured by the desktop agent (or the browser
// monitoring hook when running as a normal web app).
export type MonitorEvent = {
  ts: number;                              // epoch ms
  source: "log-file" | "console" | "network" | "terminal";
  file?: string | null;                    // originating log-file path or route
  level?: "error" | "warn" | "info" | "debug" | "unknown";
  message: string;
};

export type MonitorFinding = {
  diagnosis: Diagnosis;                    // reuses the shared analyst shape
  laymanExplanation: string;               // one paragraph, plain English
  suggestedActions: string[];              // 2-4 concrete next steps
  windowStart: number;                     // event window covered
  windowEnd: number;
  eventCount: number;
};

const MAX_EVENTS = 200;
const MAX_MESSAGE_BYTES = 2000;

export const analyzeMonitorBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { events: MonitorEvent[]; context?: string }) => {
    if (!Array.isArray(input?.events) || input.events.length === 0) {
      throw new Error("events must be a non-empty array");
    }
    const events = input.events.slice(-MAX_EVENTS).map((e) => ({
      ts: Number(e.ts) || Date.now(),
      source: e.source ?? "log-file",
      file: e.file ?? null,
      level: e.level ?? "unknown",
      message: String(e.message ?? "").slice(0, MAX_MESSAGE_BYTES),
    }));
    return { events, context: (input.context ?? "").slice(0, 2000) };
  })
  .handler(async ({ data }): Promise<{ finding: MonitorFinding | null; skipped?: string }> => {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

    // Only bother when there's something error-ish or repeated.
    const importantEvents = data.events.filter(
      (e) => e.level === "error" || e.level === "warn" || /error|exception|failed|traceback|fatal/i.test(e.message),
    );
    if (importantEvents.length === 0) {
      return { finding: null, skipped: "no error-like events in batch" };
    }

    const summarised = importantEvents
      .slice(-60)
      .map((e) => `[${new Date(e.ts).toISOString()}] ${e.level ?? "?"} ${e.source} ${e.file ?? ""}\n${e.message}`)
      .join("\n---\n");

    const system = `You are a real-time monitoring analyst watching a developer's logs, terminal output, and errors as they happen.

${TAXONOMY_PROMPT}

Your job: pick the SINGLE most important issue in this batch. Ignore noise, duplicates, and progress logs. Focus on new failures, regressions, or repeated errors.

${ANALYST_INSTRUCTIONS}`;

    const userText = `Context (may be empty):\n${data.context}\n\nMost recent error/warn events (chronological, oldest first):\n\n${summarised}`;

    const diagnosis = await callGeminiAnalyst(geminiKey, system, [
      { type: "text", text: userText },
    ]);

    // Plain-English wrapper + concrete next steps.
    const explanation = await callGeminiText(
      geminiKey,
      "You explain live monitoring findings in friendly, plain English for developers who may not be highly technical. 1 short paragraph.",
      `Diagnosis:\n${JSON.stringify(diagnosis)}\n\nRewrite the diagnosis as a single plain-English paragraph. Do not include JSON or code fences.`,
    );

    const actionsText = await callGeminiText(
      geminiKey,
      "You suggest 2-4 concrete, ordered next steps a developer can take to investigate or fix a live issue. Return one action per line, no numbering, no extra prose.",
      `Diagnosis:\n${JSON.stringify(diagnosis)}\n\nContext:\n${data.context}`,
    );
    const suggestedActions = actionsText
      .split("\n")
      .map((s) => s.replace(/^[\-\*\d.)\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 4);

    const windowStart = importantEvents[0]?.ts ?? Date.now();
    const windowEnd = importantEvents[importantEvents.length - 1]?.ts ?? Date.now();

    const finding: MonitorFinding = {
      diagnosis,
      laymanExplanation: explanation.trim(),
      suggestedActions,
      windowStart,
      windowEnd,
      eventCount: importantEvents.length,
    };
    return { finding };
  });
