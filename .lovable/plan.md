## What I'll do

### 1. Reconcile your balance (adewaleayomide619@gmail.com)
- Insert 4 backfill rows into `credit_usage` (mode `knowledge`, 5 credits each, tagged as reconciliation) so the audit trail matches reality.
- Update `user_credits` live row: `balance = 1980` (was 2000).
- Same reconciliation for the other two Pro grantees only if their `intel_memory` shows saved runs (I'll check and report; no silent deduction).

### 2. Fix credit deduction so it actually happens on every prompt
Root cause: in the four streaming routes (`knowledge/system/github/screen.stream.ts`) the `chargeAndRemember` call sits inside `try { ... } catch { console.warn }`. Any RPC failure (permission, RLS on `credit_usage`, JSON shape) is swallowed — that's why your ledger is empty despite successful runs.

- Remove the swallow: on charge failure, emit an `{type:"error"}` NDJSON frame so the UI shows it, and log the full error server-side.
- Add a post-stream verification step: after `chargeAndRemember` resolves, re-select `user_credits.balance` and include it in the final NDJSON `done` frame so the UI reflects the new balance immediately (no reload).
- Confirm the recent `deny-write authenticated` policies added on `credit_usage` / `user_credits` don't block the `service_role` RPC path (they shouldn't — but I'll verify with a live insert as service role in the migration).
- Add a lightweight `[credits]` server log line on every deduction (userId short + mode + new balance) so future issues are diagnosable from `server-function-logs`.

### 3. Restore full prompt editing across every surface
The `EditableUserMessage` / `SharedEditablePrompt` / `PillEditableUserMessage` components exist and are wired, but they're only discoverable when you hover — invisible on mobile and easy to miss on desktop. Also verifying no character is blocked.

- Make the **Edit** button always visible (small pencil icon anchored to every user bubble) on desktop AND mobile, not hover-only.
- Verify the composer textarea and the edit textareas have no `onBeforeInput` / `onChange` sanitizer that could strip `{`, `}`, `<`, `>`, `[`, `]`, `(`, `)`, `_`, `"`, `:` — a manual paste test of `{}{{ <div class="x"> [a,b] (c) _foo_ "bar" }}` will confirm.
- Ensure the edit action:
  - preserves history before the edited message,
  - truncates the array at that index,
  - re-submits with the same session ID so history stays one entry (no double-charge),
  - re-uses the same attachments if the original had any.

### 4. Verification (before I say it's done)
- Run the app, submit a Knowledge prompt as you, then read `credit_usage` and `user_credits` directly — must see `2000 → 1975` and one new ledger row.
- Repeat for System, GitHub, Screen.
- Edit a prior prompt on desktop and mobile with `{}{{` in it; confirm the resend replaces the assistant reply and charges exactly once (idempotent by session id).

## Technical notes
- Files touched: `src/lib/intel-memory.server.ts` (surface errors, log), `src/routes/api/intel/{knowledge,system,github,screen}.stream.ts` (propagate charge errors + emit new balance), `src/routes/chat.tsx` and `src/components/jeradin/ask-jeradin-pill.tsx` (always-visible Edit button, verify no sanitizers), one SQL migration for the 4 backfill rows + balance update.
- No schema changes; only an INSERT + UPDATE in a data migration (via the insert tool, not `migration`).
