import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { IntelMode, MemoryEntry } from "./intel-memory.server";

export type { MemoryEntry } from "./intel-memory.server";

export const listIntelMemory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { mode?: IntelMode; limit?: number } = {}) => ({
    mode: input.mode && (["screen", "system", "knowledge", "repo"] as IntelMode[]).includes(input.mode) ? input.mode : undefined,
    limit: Math.min(Math.max(input.limit ?? 20, 1), 100),
  }))
  .handler(async ({ data, context }) => {
    const { recallIntel } = await import("./intel-memory.server");
    if (data.mode) {
      const items = await recallIntel(context.userId, data.mode, data.limit);
      return { items };
    }
    // All modes, interleaved by recency.
    const results = await Promise.all(
      (["screen", "system", "knowledge", "repo"] as IntelMode[]).map((m) => recallIntel(context.userId, m, data.limit)),
    );
    const merged = results.flat().sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    );
    return { items: merged.slice(0, data.limit) as MemoryEntry[] };
  });

export const getIntelMemory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id is required");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: item, error } = await supabaseAdmin
      .from("intel_memory")
      .select("id, mode, title, summary, payload, tags, created_at")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { item: (item as MemoryEntry | null) ?? null };
  });

export const deleteIntelMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id is required");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("intel_memory")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
