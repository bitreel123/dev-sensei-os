# System Intelligence — Phases 1 + 2 + 3

Turn the current one-shot summarizer into a **living digital twin** of the codebase: a persistent graph in Postgres, kept in sync with GitHub, queried by 10 specialized reasoning modes.

I'll ship all three phases in one continuous build. Phase 1 lays the foundation; Phase 2 makes it durable and incremental; Phase 3 exposes it as the 10 modes you described.

---

## Phase 1 — Real ingestion & graph storage

**Goal:** replace the 60-file cap + text dump with a real parsed graph, stored in your database.

**New database tables** (per user + per repo, RLS scoped to `auth.uid()`):
- `code_repos` — one row per connected repo (`owner/name`, default branch, last synced SHA, last full-scan time).
- `code_files` — every ingested file (path, language, size, SHA, summary, embedding).
- `code_symbols` — functions / classes / exports / routes / tables extracted via AST (name, kind, file_id, line range, signature, docstring, embedding).
- `code_edges` — typed relationships between symbols/files: `imports`, `calls`, `renders`, `reads_table`, `writes_table`, `defines_route`, `depends_on_package`.
- `code_chunks` — semantic chunks of file content (for RAG retrieval), pgvector-embedded.

All tables get RLS: users can only see their own rows. `pgvector` enabled; HNSW index on embeddings.

**Ingestion pipeline** (new `src/lib/code-graph/*.server.ts`):
1. Walk the full repo tree via GitHub API — no 60-file cap. Skip `node_modules`, build output, lockfiles, binaries.
2. For each source file: parse with a lightweight regex/AST pass (TS/JS/Python/Go first, then Java/Ruby/PHP) to extract imports, exports, function/class definitions, JSX components, DB table references, route definitions.
3. Chunk file content (~1000 chars, 100 overlap) and embed via `google/gemini-embedding-001`.
4. Insert `code_files` → `code_symbols` → `code_edges` → `code_chunks` in a single transaction per file.
5. Store `last_scanned_sha` on `code_repos` when done.

**Trigger:** the existing "Analyze system" button now enqueues a background scan (server function returns immediately with a `scan_id`); UI polls a small `scan_status` row for progress.

---

## Phase 2 — Persistent memory & incremental sync

**Goal:** the graph survives across sessions and stays fresh without re-scanning everything.

- **Cache-first reads:** every mode reads from the stored graph, not GitHub, unless the graph is stale.
- **Incremental updates:** a `POST /api/public/github/webhook` route receives `push` events. For each changed file in the diff:
  - Delete its old symbols/edges/chunks.
  - Re-parse and re-embed only that file.
  - Update `code_repos.last_scanned_sha`.
- **Manual "Re-sync" button** on the System panel for repos without webhook access — diffs `last_scanned_sha…HEAD` and updates changed files only.
- **Snapshot history:** a lightweight `code_snapshots` table (repo_id, sha, taken_at, node_count, edge_count) so we can later diff snapshots for change intelligence.

Result: after the first scan, every subsequent question is answered in <2s from local Postgres + a targeted LLM call over retrieved context — no more full re-reads.

---

## Phase 3 — The 10 intelligence modes

A single mode-router server function: `runIntelMode({ repo, mode, question, focusPath? })`.

Each mode is a small strategy: it queries the graph in a mode-specific way, retrieves the top-K relevant chunks/symbols via embedding + graph traversal, and calls the LLM with a mode-specific system prompt returning structured JSON.

| # | Mode | What it queries | What it returns |
|---|------|-----------------|-----------------|
| 1 | **Architecture** | files + edges grouped by folder/layer | Mermaid graph + layer summary |
| 2 | **Dependency** | `depends_on_package` edges + `imports` chains | Dep tree, unused deps, version risks |
| 3 | **Impact** | reverse-BFS on `calls`/`imports` from `focusPath` | "If you change X, these Y files/tests break" |
| 4 | **Data Flow** | `reads_table`/`writes_table` edges | Which endpoints touch which tables, w/ Mermaid |
| 5 | **Business Logic** | symbols tagged as route/handler + their call trees | Plain-English feature map |
| 6 | **Knowledge** | free-form RAG over `code_chunks` | ChatGPT-style Q&A grounded in the repo |
| 7 | **Security** | routes + auth middleware presence + secret refs | Findings list (severity, file, line, fix) |
| 8 | **Performance** | N+1 patterns, missing indexes, large bundles | Hotspot list |
| 9 | **Technical Debt** | TODO/FIXME, dead exports, cyclomatic complexity | Debt score + top offenders |
| 10 | **Refactoring** | duplicate symbol signatures, oversized files | Concrete refactor suggestions |

Modes 1-6 ship fully; 7-10 ship with the graph queries wired and a v1 prompt (they'll get sharper as we tune them).

**UI (System panel in the dashboard):**
- Repo picker (existing) → "Scan repo" button → progress bar.
- After scan: 10 mode chips. Selecting one shows a mode-specific input (question, or a file picker for Impact).
- Results render in the same ChatGPT-style block already used for Screen Intelligence, with Mermaid diagrams inline where applicable.

---

## Technical notes (for reference)

- **Parsing:** start with regex-based extractors per language (fast, Worker-safe). Tree-sitter WASM is a later upgrade — its Worker bundling is fragile and not needed for v1 signal quality.
- **Embeddings:** `google/gemini-embedding-001` (3072-dim, halfvec-indexed).
- **LLM:** Claude Sonnet 4.5 for mode reasoning (already wired via `ANTHROPIC_API_KEY`); Gemini stays reserved for Screen Intelligence.
- **Background scans:** implemented as a server function that streams progress into a `scan_status` row; no separate queue infrastructure needed for v1.
- **Webhook security:** HMAC-verify GitHub's `X-Hub-Signature-256` before any DB write. New `GITHUB_WEBHOOK_SECRET` will be requested via `add_secret`.
- **No client leakage:** all graph queries and LLM calls happen in `*.functions.ts` / `*.server.ts`; `supabaseAdmin` loaded inside handlers only.

---

## Order of execution

1. Migration: `pgvector` + all 6 new tables + RLS + GRANTs.
2. Ingestion pipeline + scan server function + progress polling.
3. Webhook route + incremental updater + manual re-sync.
4. Mode router + 10 mode implementations.
5. Rewire the System panel UI to the new flow.
6. End-to-end test on a real repo.

Ready to start on the migration when you approve.
