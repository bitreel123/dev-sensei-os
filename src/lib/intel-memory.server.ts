// Server-only helpers for cross-device intelligence memory + credit deduction.
// Import ONLY from other *.server.ts files or from inside a server-fn handler.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type IntelMode = "screen" | "system" | "knowledge" | "repo";

// JSON-serializable value (matches Supabase's Json type shape).
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

export type MemoryEntry = {
  id: string;
  mode: IntelMode;
  title: string;
  summary: string | null;
  payload: JsonValue;
  tags: string[];
  created_at: string;
};

// Per-mode credit cost (kept in one place so pricing + billing stay in sync).
export const INTEL_COST: Record<IntelMode | "screen_deep", number> = {
  screen: 1,
  screen_deep: 3,
  system: 5,
  knowledge: 5,
  repo: 5,
};

/**
 * Atomically deduct credits. Returns { ok: false } if the user is out of credits.
 * Callers should throw a friendly error when ok=false so the UI can prompt to upgrade.
 */
export async function chargeCredits(
  userId: string,
  amount: number,
  env: "live" | "sandbox" = "live",
): Promise<{ ok: boolean; balance: number }> {
  const { data, error } = await supabaseAdmin.rpc("deduct_credit", {
    p_user_id: userId,
    p_amount: amount,
    p_env: env,
  });
  if (error) throw new Error(`credit deduction failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: !!row?.ok, balance: Number(row?.balance ?? 0) };
}

/** Persist a memory entry so Jeradin "remembers" this session for the user. */
export async function rememberIntel(
  userId: string,
  mode: IntelMode,
  entry: { title: string; summary?: string | null; payload?: JsonValue; tags?: string[] },
) {
  const { error } = await supabaseAdmin.from("intel_memory").insert({
    user_id: userId,
    mode,
    title: entry.title.slice(0, 240),
    summary: entry.summary ?? null,
    payload: (entry.payload ?? {}) as JsonValue,
    tags: entry.tags ?? [],
  });
  if (error) console.warn("[intel-memory] insert failed:", error.message);
}

/** Fetch the last N memory entries for a mode. Used to feed prompts. */
export async function recallIntel(
  userId: string,
  mode: IntelMode,
  limit = 3,
): Promise<MemoryEntry[]> {
  const { data, error } = await supabaseAdmin
    .from("intel_memory")
    .select("id, mode, title, summary, payload, tags, created_at")
    .eq("user_id", userId)
    .eq("mode", mode)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[intel-memory] recall failed:", error.message);
    return [];
  }
  return (data ?? []) as MemoryEntry[];
}

/** Render recent memory as a compact prompt suffix. Empty string if nothing to recall. */
export function memoryPromptSuffix(memories: MemoryEntry[]): string {
  if (!memories.length) return "";
  const lines = memories.map((m, i) => {
    const when = new Date(m.created_at).toISOString().slice(0, 10);
    return `${i + 1}. [${when}] ${m.title}${m.summary ? " — " + m.summary.slice(0, 300) : ""}`;
  });
  return `\n\n---\nJERADIN MEMORY — prior sessions for this user (most recent first):\n${lines.join("\n")}\n---\n`;
}

/**
 * Combined helper: charges credits, then persists a memory entry.
 * Throws a friendly error if the user is out of credits (so nothing is charged
 * and nothing is remembered for a failed session).
 */
export async function chargeAndRemember(
  userId: string,
  mode: IntelMode,
  cost: number,
  entry: { title: string; summary?: string | null; payload?: JsonValue; tags?: string[] },
  env: "live" | "sandbox" = "live",
) {
  const charge = await chargeCredits(userId, cost, env);
  if (!charge.ok) {
    throw new Error(
      `Out of credits. You have ${charge.balance} credits left; this action costs ${cost}. Upgrade at /pricing to continue.`,
    );
  }
  await rememberIntel(userId, mode, entry);
  return charge;
}
