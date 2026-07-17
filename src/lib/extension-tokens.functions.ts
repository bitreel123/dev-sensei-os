// Server functions for managing personal access tokens used by the
// Jeradin Chrome extension. The plaintext token is only ever returned
// once (on creation); the DB stores only a SHA-256 hex hash.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(): string {
  // 32 bytes → 43-char base64url; prefixed "jex_" so it's obvious what it is.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `jex_${b64}`;
}

export const listExtensionTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("extension_tokens")
      .select("id, label, created_at, last_used_at, revoked_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { tokens: data ?? [] };
  });

export const createExtensionToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { label?: string }) => ({
    label: (input?.label ?? "Chrome extension").slice(0, 60),
  }))
  .handler(async ({ data, context }) => {
    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const { data: row, error } = await context.supabase
      .from("extension_tokens")
      .insert({ user_id: context.userId, token_hash: tokenHash, label: data.label })
      .select("id, label, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, label: row.label, createdAt: row.created_at, token };
  });

export const revokeExtensionToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id is required");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("extension_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Shared helper used by the /api/public/extension/* routes to resolve a
// bearer token to a user_id. Exported so both public routes share the exact
// same verification logic (and touch last_used_at).
export async function resolveExtensionTokenUserId(
  token: string,
): Promise<{ userId: string; tokenId: string } | null> {
  if (!token || !token.startsWith("jex_")) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hash = await sha256Hex(token);
  const { data } = await supabaseAdmin
    .from("extension_tokens")
    .select("id, user_id, revoked_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (!data || data.revoked_at) return null;
  // Best-effort last_used_at update (don't fail the request if this misses).
  supabaseAdmin
    .from("extension_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => void 0);
  return { userId: data.user_id as string, tokenId: data.id as string };
}
