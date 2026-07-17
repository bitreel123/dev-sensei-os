// GitHub helpers for the code-graph ingester. Server-only.

const GITHUB_API = "https://api.github.com";

const IGNORED_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".turbo",
  "coverage", ".vercel", ".cache", "out", ".output", "target",
  "vendor", ".venv", "venv", "__pycache__", ".pnpm-store",
]);

const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|rb|php|css|scss|json|toml|yml|yaml|md|sql|sh)$/i;

export const MAX_FILE_BYTES = 60_000;
export const MAX_FILES_PER_SCAN = 400;

async function gh<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json() as Promise<T>;
}

export type RepoMeta = { default_branch: string; latest_sha: string };
export type RepoTreeItem = { path: string; sha: string; size: number };

export async function getRepoMeta(token: string, owner: string, repo: string): Promise<RepoMeta> {
  const meta = await gh<{ default_branch: string }>(`${GITHUB_API}/repos/${owner}/${repo}`, token);
  const branch = await gh<{ commit: { sha: string } }>(
    `${GITHUB_API}/repos/${owner}/${repo}/branches/${meta.default_branch}`,
    token,
  );
  return { default_branch: meta.default_branch, latest_sha: branch.commit.sha };
}

export async function listRepoTree(
  token: string,
  owner: string,
  repo: string,
  sha: string,
): Promise<RepoTreeItem[]> {
  const tree = await gh<{ tree: Array<{ path: string; type: string; sha: string; size?: number }> }>(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
    token,
  );
  return tree.tree
    .filter((n) => n.type === "blob")
    .filter((n) => !n.path.split("/").some((seg) => IGNORED_DIRS.has(seg)))
    .filter((n) => CODE_EXT.test(n.path) || n.path.endsWith("package.json"))
    .filter((n) => (n.size ?? 0) < MAX_FILE_BYTES)
    .map((n) => ({ path: n.path, sha: n.sha, size: n.size ?? 0 }))
    .slice(0, MAX_FILES_PER_SCAN);
}

export async function fetchFile(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;
    const txt = await res.text();
    return txt.slice(0, MAX_FILE_BYTES);
  } catch {
    return null;
  }
}

// Diff two commits to get changed file paths (for incremental sync).
export async function diffCommits(
  token: string,
  owner: string,
  repo: string,
  base: string,
  head: string,
): Promise<{ added: string[]; modified: string[]; removed: string[] }> {
  const j = await gh<{ files: Array<{ filename: string; status: string }> }>(
    `${GITHUB_API}/repos/${owner}/${repo}/compare/${base}...${head}`,
    token,
  );
  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];
  for (const f of j.files ?? []) {
    if (f.status === "added" || f.status === "copied") added.push(f.filename);
    else if (f.status === "removed") removed.push(f.filename);
    else modified.push(f.filename);
  }
  return { added, modified, removed };
}
