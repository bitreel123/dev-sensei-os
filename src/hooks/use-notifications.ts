import { useCallback, useEffect, useState } from "react";
import { supabase as typedSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

// notifications table isn't in the generated types yet; use a loose alias.
const supabase = typedSupabase as unknown as {
  from: (table: string) => any;
  channel: (name: string) => any;
  removeChannel: (c: unknown) => void;
  auth: typeof typedSupabase.auth;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  severity: "info" | "low" | "medium" | "high" | "critical" | string;
  category: string | null;
  title: string;
  message: string;
  source: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type CreateNotificationInput = {
  title: string;
  message: string;
  severity?: NotificationRow["severity"];
  category?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown>;
};

type DesktopBridge = {
  isDesktop?: boolean;
  notify?: (p: { title: string; body: string; severity?: string }) => Promise<unknown>;
};
function desktop(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { jeradinDesktop?: DesktopBridge }).jeradinDesktop ?? null;
}

export function useNotifications(limit = 30) {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("notifications" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    setItems((data as unknown as NotificationRow[]) ?? []);
    setLoading(false);
  }, [user, limit]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime + polling fallback
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as unknown as NotificationRow;
          setItems((prev) => [row, ...prev].slice(0, limit));
          // Native OS notification when running in Electron
          desktop()?.notify?.({ title: row.title, body: row.message, severity: row.severity });
        },
      )
      .subscribe();
    const t = setInterval(refresh, 60_000);
    return () => { supabase.removeChannel(channel); clearInterval(t); };
  }, [user, limit, refresh]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from("notifications" as never).update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications" as never)
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .eq("user_id", user.id);
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
  }, [user]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  return { items, loading, unreadCount, refresh, markRead, markAllRead };
}

export async function createNotification(input: CreateNotificationInput): Promise<NotificationRow | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return null;
  const row = {
    user_id: uid,
    title: input.title.slice(0, 200),
    message: input.message.slice(0, 2000),
    severity: input.severity ?? "info",
    category: input.category ?? null,
    source: input.source ?? null,
    metadata: input.metadata ?? {},
  };
  const { data } = await supabase.from("notifications" as never).insert(row).select().single();
  return (data as unknown as NotificationRow) ?? null;
}
