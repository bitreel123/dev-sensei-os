## What's actually broken

**1. Screen Intelligence isn't decrementing credits.**
Checked the ledger for adewaleayomide619@gmail.com: last row is a `knowledge` charge on 2026-07-25 (balance 1980). Across the entire `credit_usage` table there are **zero rows** with mode `screen` or `screen_deep` — the screen path has never billed anyone. Two concrete causes:

- `src/routes/api/public/extension/analyze.ts` (used by the Chrome extension popup path) calls `runFastScreenIntel` and returns the result **without ever calling `chargeAndRemember`**. Confirmed by reading the file.
- The dashboard path (`analyzeScreenAndSuggestFix` in `src/lib/screen-intel.functions.ts`) does call `chargeAndRemember`, but a failure inside `chargeAndRemember` (e.g. RPC error, dynamic import throw) is only `console.warn`ed inside `rememberIntel` — while a throw from `chargeCredits` would abort the whole handler. Given the user still saw a completed result but no charge landed, this suggests the fast dashboard path in `screen-intel.functions.ts` isn't the one being hit at all in current sessions — the streaming route + extension route are. Streaming path (`screen.stream.ts`) does bill, but if the client never renders through it (e.g. dashboard falls back to the non-streaming `runAnalyze`), we still get no row. Need to unify.

**2. "Deep dive" button missing from the overlay in the screenshot.**
`screen-intel-overlay.tsx` only renders the Deep dive pill when `screenshotBase64 && !didDeepDive`. When the overlay is opened from a **restored history entry** (sidebar click), `chat.tsx` sets `analysisResult` but doesn't repopulate `lastScreenshotBase64` — so the button is hidden. Screenshot confirms this (user opened a saved "Screen recording" entry).

**3. Chrome Web Store timing (question, no code):**
Cross-tab overlay (Gmail, VS Code, any site) is only possible via the installed extension — browsers block one site from injecting UI into another. Google review is typically **1–3 business days** for first submission, occasionally up to 7 if `<all_urls>` + `scripting` get extra scrutiny. Post-approval updates usually clear within hours.

## Fix plan

### A. Bill every screen intel path, once, and log failures loudly

1. **`src/routes/api/public/extension/analyze.ts`** — add the same `assertCreditsAvailable` → `runFastScreenIntel` → `chargeAndRemember` sequence used by the streaming route. Use `INTEL_COST.screen` (2 credits). Return a 402 with a friendly message on insufficient balance.
2. **`src/lib/intel-memory.server.ts`** — in `chargeCredits`, when `supabaseAdmin.rpc("deduct_credit", …)` returns an error OR `data` is null, `console.error` the full error and **throw** instead of silently returning `{ ok: false, balance: 0 }`. Today a null result is indistinguishable from "insufficient credits" — this silent path is why the screen charge could vanish without surfacing.
3. **Dashboard path** — in `src/routes/chat.tsx` `analyzeImageBase64`, keep using `runAnalyze` (server fn), but after a successful run also re-fetch `use-user-data` credit balance so the sidebar "1980 credits" updates immediately instead of looking stuck. Currently the UI reads a stale cached balance.

### B. Restore Deep dive on history-opened overlays

In `src/routes/chat.tsx`, when a history entry with `mode: "screen"` is restored:
- If `entry.payload.screenshotBase64` was persisted, hydrate `lastScreenshotBase64` from it.
- Otherwise (older rows without the image) render the Deep dive button as **disabled** with a tooltip: *"Re-record to enable deep dive"* — better than hiding it entirely.

Also add `screenshotBase64` to the history payload when saving new screen analyses (currently we save `{ analysis, fix, messages }` but drop the image). Keep the image under a size cap (~800KB base64, downscaled) to avoid bloating localStorage.

### C. Verify

- Run one Screen Intelligence in the dashboard → check `SELECT * FROM credit_usage WHERE mode='screen' ORDER BY created_at DESC LIMIT 1;` returns a fresh row, and sidebar shows 1978.
- Reload a saved "Screen recording" history entry → Deep dive button visible; clicking it streams the deep report into the same overlay.
- Trigger the public extension endpoint with a valid `jex_` token → 200 with result + one new `credit_usage` row.

## Not doing this turn

- Publishing to Chrome Web Store (needs your Google dev account + $5 fee).
- Changing extension packaging or model routing.
- Any UI restructure outside the overlay/deep-dive fix.
