// Resolves the caller of an extension request to a user id.
// Accepts either:
//  - A legacy jex_… personal access token (extension_tokens table), or
//  - A Supabase access token (JWT) from an active jeradin.com session.

import { resolveExtensionTokenUserId } from "./extension-tokens.functions";

export type ExtensionCaller = { userId: string; email: string | null };

export async function resolveExtensionCaller(
  authHeader: string | null | undefined,
): Promise<ExtensionCaller | null> {
  const raw = (authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!raw) return null;

  // Legacy pat: jex_...
  if (raw.startsWith("jex_")) {
    const resolved = await resolveExtensionTokenUserId(raw);
    if (!resolved) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.auth.admin.getUserById(resolved.userId);
    return { userId: resolved.userId, email: data.user?.email ?? null };
  }

  // Supabase access token (JWT: 3 dot-separated parts)
  if (raw.split(".").length === 3) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.getUser(raw);
    if (error || !data.user) return null;
    return { userId: data.user.id, email: data.user.email ?? null };
  }

  return null;
}
