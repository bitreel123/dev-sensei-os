import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GithubRepo = {
  full_name: string;
  private: boolean;
  default_branch: string;
  pushed_at: string;
  language: string | null;
  description: string | null;
};

async function getToken(userId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("github_connections")
    .select("access_token")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { access_token?: string } | null)?.access_token ?? null;
}

export const listMyGithubRepos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const token = await getToken(context.userId);
    if (!token) return { repos: [] as GithubRepo[], connected: false };

    const res = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const raw = (await res.json()) as GithubRepo[];
    const repos = raw.map((r) => ({
      full_name: r.full_name,
      private: r.private,
      default_branch: r.default_branch,
      pushed_at: r.pushed_at,
      language: r.language,
      description: r.description,
    }));
    return { repos, connected: true };
  });

export const getActiveRepo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("github_connections")
      .select("active_repo, login")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      activeRepo: (data as { active_repo?: string | null } | null)?.active_repo ?? null,
      connected: !!data,
    };
  });

export const setActiveRepo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { repo: string | null }) => {
    if (input.repo !== null && !/^[^/\s]+\/[^/\s]+$/.test(input.repo)) {
      throw new Error("repo must be 'owner/name' or null");
    }
    return { repo: input.repo };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("github_connections")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ active_repo: data.repo } as any)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, activeRepo: data.repo };
  });
