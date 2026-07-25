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

/** Persist a memory entry so Jeradin "remembers" this session for the user.
 * When `sessionId` is provided (a UUID from the client), the row is upserted
 * so retries within the same chat session overwrite the previous entry instead
 * of creating duplicates in the sidebar history. */
export async function rememberIntel(
  userId: string,
  mode: IntelMode,
  entry: { title: string; summary?: string | null; payload?: JsonValue; tags?: string[]; sessionId?: string },
) {
  const row = {
    user_id: userId,
    mode,
    title: entry.title.slice(0, 240),
    summary: entry.summary ?? null,
    payload: (entry.payload ?? {}) as JsonValue,
    tags: entry.tags ?? [],
    ...(entry.sessionId ? { id: entry.sessionId } : {}),
  };
  // `intel_memory.id` exists in older projects without a unique constraint,
  // so PostgREST upsert(onConflict: "id") fails silently. Update first and
  // insert only when no row exists, while always scoping updates to the owner.
  let error: { message: string } | null = null;
  if (entry.sessionId) {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("intel_memory")
      .select("id")
      .eq("id", entry.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (lookupError) {
      error = lookupError;
    } else if (existing) {
      const result = await supabaseAdmin
        .from("intel_memory")
        .update(row)
        .eq("id", entry.sessionId)
        .eq("user_id", userId);
      error = result.error;
    } else {
      const result = await supabaseAdmin.from("intel_memory").insert(row);
      error = result.error;
    }
  } else {
    const result = await supabaseAdmin.from("intel_memory").insert(row);
    error = result.error;
  }
  if (error) console.warn("[intel-memory] persist failed:", error.message);
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
  entry: { title: string; summary?: string | null; payload?: JsonValue; tags?: string[]; sessionId?: string },
  env: "live" | "sandbox" = "live",
) {
  // Idempotent by sessionId: if this session already has a memory row for this
  // user, treat this call as an in-place update (no credit charge). Prevents
  // double-billing when the user re-submits the same prompt in the same chat.
  if (entry.sessionId) {
    const { data: existing } = await supabaseAdmin
      .from("intel_memory")
      .select("id")
      .eq("id", entry.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      await rememberIntel(userId, mode, entry);
      return { ok: true, balance: -1 };
    }
  }
  const charge = await chargeCredits(userId, cost, env);
  if (!charge.ok) {
    throw new Error(
      `Out of credits. You have ${charge.balance} credits left; this action costs ${cost}. Upgrade at /pricing to continue.`,
    );
  }
  await rememberIntel(userId, mode, entry);
  return charge;
}


/** Verify that a user can afford an intelligence run before paid work starts. */
export async function assertCreditsAvailable(
  userId: string,
  cost: number,
  env: "live" | "sandbox" = "live",
) {
  const { data, error } = await supabaseAdmin
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .eq("environment", env)
    .maybeSingle();
  if (error) {
    console.warn("[intel-memory] credit preflight failed:", error.message);
    return;
  }
  const balance = Number((data as { balance?: number } | null)?.balance ?? 0);
  if (balance < cost) {
    throw new Error(
      `Out of credits. You have ${balance} credits left; this action costs ${cost}. Upgrade at /pricing to continue.`,
    );
  }
}
