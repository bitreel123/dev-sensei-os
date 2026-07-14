import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { createNotification } from "@/hooks/use-notifications";

// Mount once at the app root. Captures uncaught errors + unhandled promise
// rejections in the browser and stores them as notifications for the signed-in
// user (rate-limited, deduped) so they surface in the bell inbox + native
// desktop notifications.
export function GlobalErrorReporter() {
  const { user } = useAuth();
  const seen = useRef(new Map<string, number>());

  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    const DEDUP_MS = 60_000;
    function report(kind: string, message: string, stack?: string) {
      const key = `${kind}:${message}`.slice(0, 200);
      const now = Date.now();
      const prev = seen.current.get(key);
      if (prev && now - prev < DEDUP_MS) return;
      seen.current.set(key, now);
      createNotification({
        title: kind === "unhandledrejection" ? "Unhandled promise rejection" : "Runtime error",
        message: message.slice(0, 1000),
        severity: "high",
        category: "runtime",
        source: window.location.pathname,
        metadata: stack ? { stack: stack.slice(0, 2000) } : {},
      }).catch(() => {});
    }

    const onError = (e: ErrorEvent) => {
      const err = e.error instanceof Error ? e.error : null;
      report("error", err?.message || e.message || "Unknown error", err?.stack);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r: unknown = e.reason;
      const msg =
        r instanceof Error ? r.message : typeof r === "string" ? r : JSON.stringify(r ?? "").slice(0, 500);
      const stack = r instanceof Error ? r.stack : undefined;
      report("unhandledrejection", msg, stack);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [user]);

  return null;
}
