import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  PanelLeft,
  Plus,
  Download,
  User as UserIcon,
  Sparkles,
  Trash2,
} from "lucide-react";
import { LogoMark } from "./logo";
import {
  loadHistory,
  removeHistoryEntry,
  saveHistory,
  subscribeHistory,
  type ChatHistoryEntry,
} from "@/lib/chat-history";
import { deleteIntelMemory } from "@/lib/intel-memory.functions";
import { supabase } from "@/integrations/supabase/client";

type ChatSidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
  userId?: string | null;
  userEmail?: string | null;
  plan?: string | null;
};

export function ChatSidebar({
  mobile = false,
  onNavigate,
  userId = null,
  userEmail = null,
  plan = null,
}: ChatSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [history, setHistory] = useState<ChatHistoryEntry[]>(() => loadHistory());
  const { pathname } = useLocation();

  useEffect(() => {
    let cancelled = false;
    let refreshSequence = 0;
    const refresh = () => {
      const sequence = ++refreshSequence;
      const local = loadHistory();
      if (!userId) {
        setHistory(local);
        return;
      }
      void (async () => {
        try {
          const { data, error } = await supabase
            .from("intel_memory")
            .select("id, mode, title, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(100);
          if (cancelled || sequence !== refreshSequence) return;
          if (error) {
            setHistory(local);
            return;
          }
          const items = Array.isArray(data) ? data : [];
          const merged = new Map(local.map((item) => [item.id, item]));
          for (const item of items) {
            const createdAt = new Date(item.created_at).getTime();
            if (!item.id || !item.title || !Number.isFinite(createdAt)) continue;
            const existing = merged.get(item.id);
            const mode = typeof item.mode === "string" ? item.mode : "screen";
            const modeLabel = mode === "repo"
              ? "GitHub"
              : mode.charAt(0).toUpperCase() + mode.slice(1);
            const title = item.title.toLowerCase().startsWith(`${modeLabel.toLowerCase()} ·`)
              ? item.title
              : `${modeLabel} · ${item.title}`;
            merged.set(item.id, {
              id: item.id,
              title,
              createdAt,
              payload: existing?.payload ?? null,
            });
          }
          const next = [...merged.values()].sort((a, b) => b.createdAt - a.createdAt);
          setHistory(next);
          const localSignature = local.map(({ id, title, createdAt }) => `${id}:${title}:${createdAt}`).join("|");
          const nextSignature = next.map(({ id, title, createdAt }) => `${id}:${title}:${createdAt}`).join("|");
          if (nextSignature !== localSignature) saveHistory(next);
        } catch (error) {
          console.error("[chat-sidebar] history lookup failed:", error);
          if (!cancelled && sequence === refreshSequence) setHistory(local);
        }
      })();
    };
    refresh();
    const unsubscribe = subscribeHistory(refresh);
    // Poll cloud memory so a chat started on mobile appears on desktop within 20s.
    const interval = userId ? window.setInterval(refresh, 20_000) : null;
    return () => {
      cancelled = true;
      unsubscribe();
      if (interval) window.clearInterval(interval);
    };
  }, [userId]);

  const initial = userEmail?.[0]?.toUpperCase() ?? "J";

  return (
    <aside
      className={`${
        mobile ? "w-full" : collapsed ? "w-[56px]" : "w-[240px]"
      } h-full min-h-0 shrink-0 border-r border-white/10 bg-[#0a0a0a] text-white flex flex-col transition-[width] duration-200`}
    >
      <div className="flex items-center justify-between px-3 h-14 border-b border-white/10">
        {!collapsed && (
          <Link to="/chat" search={{}} onClick={onNavigate} className="flex items-center gap-2">
            <LogoMark className="h-[18px] w-[18px]" />
            <span className="text-[14px] font-semibold tracking-tight">Jeradin</span>
          </Link>
        )}
        <button
          onClick={() => mobile ? onNavigate?.() : setCollapsed((v) => !v)}
          className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"
          aria-label={mobile ? "Close sidebar" : "Toggle sidebar"}
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="p-2 flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SideItem to="/chat" icon={<Plus className="h-5 w-5" />} label="New chat" collapsed={collapsed} active={pathname === "/chat"} onNavigate={onNavigate} prominent />
        <SideItem to="/pricing" icon={<Sparkles className="h-5 w-5" />} label="Upgrade" collapsed={collapsed} onNavigate={onNavigate} />



        {!collapsed && (
          <div className="mt-6 px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
            History
          </div>
        )}
        {!collapsed && history.length === 0 && (
          <div className="px-2 py-2 text-[12px] text-white/40 italic">
            No recent chats
          </div>
        )}
        {!collapsed &&
          history.map((h) => (
            <div
              key={h.id}
              className="group flex items-center gap-1 px-2 py-1.5 rounded hover:bg-white/10"
            >
              <Link
                to="/chat"
                search={{ id: h.id }}
                onClick={onNavigate}
                className="flex-1 min-w-0 text-[14px] text-white/75 truncate"
                title={h.title}
              >
                {h.title}
              </Link>
              <button
                onClick={() => {
                  removeHistoryEntry(h.id);
                  void deleteIntelMemory({ data: { id: h.id } }).catch(() => undefined);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/50 hover:text-white"
                aria-label="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
      </div>

      <div className="mt-auto shrink-0 border-t border-white/10 p-2 space-y-1">
        <SideItem to="/download" icon={<Download className="h-5 w-5" />} label="Download app" collapsed={collapsed} onNavigate={onNavigate} />
        <Link
          to="/account"
          onClick={onNavigate}
          className={`flex items-center gap-2.5 px-2 py-2 rounded hover:bg-white/10 transition-colors ${
            pathname === "/account" ? "bg-white/10" : ""
          }`}
        >
          <div className="h-9 w-9 rounded-full bg-orange-400/90 text-black flex items-center justify-center text-[14px] font-semibold shrink-0">
            {initial}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[14px] truncate">
                {userEmail ?? "Account"}
              </div>
              <div className="text-[10.5px] capitalize text-white/45">{plan ?? "free"} plan</div>
            </div>
          )}
          {!collapsed && <UserIcon className="h-3.5 w-3.5 text-white/40" />}
        </Link>
      </div>
    </aside>
  );
}

function SideItem({
  to,
  icon,
  label,
  collapsed,
  active,
  onNavigate,
  prominent,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  active?: boolean;
  onNavigate?: () => void;
  prominent?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-2 py-2.5 rounded text-[15px] hover:bg-white/10 transition-colors ${
        prominent ? "mb-1 " : ""
      }${
        active ? "bg-white/10 text-white" : "text-white/75"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
