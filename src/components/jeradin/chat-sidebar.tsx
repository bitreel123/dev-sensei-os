import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  PanelLeft,
  Plus,
  MessagesSquare,
  FolderKanban,
  Download,
  User as UserIcon,
  Sparkles,
  Brain,
  Trash2,
} from "lucide-react";
import { LogoMark } from "./logo";
import { useAuth } from "@/hooks/use-auth";
import {
  loadHistory,
  removeHistoryEntry,
  subscribeHistory,
  type ChatHistoryEntry,
} from "@/lib/chat-history";

export function ChatSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  const { user } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    setHistory(loadHistory());
    return subscribeHistory(() => setHistory(loadHistory()));
  }, []);

  const initial = user?.email?.[0]?.toUpperCase() ?? "J";

  return (
    <aside
      className={`${
        collapsed ? "w-[56px]" : "w-[240px]"
      } shrink-0 border-r border-white/10 bg-[#0a0a0a] text-white flex flex-col transition-[width] duration-200`}
    >
      <div className="flex items-center justify-between px-3 h-14 border-b border-white/10">
        {!collapsed && (
          <Link to="/chat" className="flex items-center gap-2">
            <LogoMark className="h-[18px] w-[18px]" />
            <span className="text-[14px] font-semibold tracking-tight">Jeradin</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="p-2 flex-1 overflow-y-auto">
        <SideItem to="/chat" icon={<Plus className="h-4 w-4" />} label="New chat" collapsed={collapsed} active={pathname === "/chat"} />
        <SideItem to="/chat" icon={<MessagesSquare className="h-4 w-4" />} label="Chats" collapsed={collapsed} />
        <SideItem to="/chat" icon={<FolderKanban className="h-4 w-4" />} label="Projects" collapsed={collapsed} />
        <SideItem to="/pricing" icon={<Sparkles className="h-4 w-4" />} label="Upgrade" collapsed={collapsed} />

        {!collapsed && (
          <div className="mt-6 px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
            Recents
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
                className="flex-1 min-w-0 text-[12.5px] text-white/75 truncate"
                title={h.title}
              >
                {h.title}
              </Link>
              <button
                onClick={() => removeHistoryEntry(h.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/50 hover:text-white"
                aria-label="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
      </div>

      <div className="border-t border-white/10 p-2 space-y-1">
        <SideItem to="/download" icon={<Download className="h-4 w-4" />} label="Download app" collapsed={collapsed} />
        <Link
          to="/account"
          className={`flex items-center gap-2.5 px-2 py-2 rounded hover:bg-white/10 transition-colors ${
            pathname === "/account" ? "bg-white/10" : ""
          }`}
        >
          <div className="h-6 w-6 rounded-full bg-orange-400/90 text-black flex items-center justify-center text-[11px] font-semibold shrink-0">
            {initial}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[13px] truncate">
                {user?.email ?? "Account"}
              </div>
              <div className="text-[10.5px] text-white/45">Free plan</div>
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
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 px-2 py-2 rounded text-[13px] hover:bg-white/10 transition-colors ${
        active ? "bg-white/10 text-white" : "text-white/75"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
