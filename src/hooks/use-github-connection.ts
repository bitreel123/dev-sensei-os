import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GithubConnection = {
  user_id: string;
  github_id: number;
  login: string;
  avatar_url: string | null;
  scopes: string | null;
};

export function useGithubConnection(userId: string | null) {
  const [conn, setConn] = useState<GithubConnection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setConn(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("github_connections")
      .select("user_id, github_id, login, avatar_url, scopes")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setConn((data as GithubConnection | null) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { connection: conn, loading };
}

export function startGithubOAuth(mode: "login" | "connect", returnTo = "/chat") {
  const params = new URLSearchParams({ mode, return_to: returnTo });
  window.location.href = `/api/public/github/authorize?${params.toString()}`;
}
