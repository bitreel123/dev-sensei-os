import { Bell, Check, CheckCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications, type NotificationRow } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "text-red-400 border-red-400/40",
  high: "text-orange-400 border-orange-400/40",
  medium: "text-amber-400 border-amber-400/40",
  low: "text-sky-400 border-sky-400/40",
  info: "text-white/70 border-white/20",
};

function severityClass(s: string) {
  return SEVERITY_STYLES[s] ?? SEVERITY_STYLES.info;
}

function Item({ n, onRead }: { n: NotificationRow; onRead: (id: string) => void }) {
  const unread = !n.read_at;
  const createdAt = new Date(n.created_at);
  const relativeTime = Number.isNaN(createdAt.getTime())
    ? "Recently"
    : formatDistanceToNow(createdAt, { addSuffix: true });
  return (
    <div className={`p-3 border-b border-white/5 ${unread ? "bg-white/[0.03]" : ""}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`font-mono text-[9.5px] uppercase tracking-[0.22em] border px-1.5 py-0.5 rounded ${severityClass(n.severity)}`}>
          {n.severity}
        </span>
        {n.category && <span className="font-mono text-[10px] text-white/50">{n.category}</span>}
        <span className="ml-auto font-mono text-[10px] text-white/40">
          {relativeTime}
        </span>
      </div>
      <div className="text-[13px] text-white font-medium">{n.title}</div>
      <div className="text-[12.5px] text-white/70 mt-0.5 line-clamp-3">{n.message}</div>
      {unread && (
        <button
          onClick={() => onRead(n.id)}
          className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/60 hover:text-white"
        >
          <Check className="h-3 w-3" /> Mark read
        </button>
      )}
    </div>
  );
}

export function NotificationsBell({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { items, unreadCount, markRead, markAllRead } = useNotifications(30);
  const iconColor = tone === "dark" ? "text-white" : "text-black";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`relative inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-white/10 ${iconColor}`}
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-mono flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 bg-black border-white/10 text-white">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em]">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/60 hover:text-white"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-[12.5px] text-white/50">No notifications yet.</div>
          ) : (
            items.map((n) => <Item key={n.id} n={n} onRead={markRead} />)
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
