## Fixes

### 1. Billing crash: "Cannot read properties of undefined (reading 'rest')"

Root cause (confirmed by reading `src/lib/intel-memory.server.ts:46-56` and `src/integrations/supabase/client.server.ts:64-69`): `chargeCredits` does

```ts
const rpc = supabaseAdmin.rpc as unknown as (...);
const { data, error } = await rpc("deduct_credit", { ... });
```

`supabaseAdmin` is a lazy `Proxy`. Pulling `.rpc` off it detaches the method from its owner, so when `rpc(...)` runs, `this` is `undefined` and supabase-js throws `Cannot read properties of undefined (reading 'rest')`. Every new user hits this on their first prompt because our streaming routes now propagate billing errors to the UI (`Billing failed: …`), which was the earlier fix.

Fix: call the method on the client so `this` binds correctly, and drop the manual re-typing:

```ts
const { data, error } = await supabaseAdmin.rpc("deduct_credit", { ... });
```

No other call site in `intel-memory.server.ts` has this pattern (`.from(...)` is already called directly on the proxy).

### 2. Extension overlay in the shared tab — add Deep Dive

`extension/content.js` renders the Ask Jeradin overlay but has no Deep Dive button, so users on the shared tab only see the fast pass. Add a "Deep dive" action next to the footer status that:

- posts `{ type: "JERADIN_ANALYZE_ACTIVE_TAB", payload: { imageBase64, note, mode: "deep", sessionId } }` back to the background using the previously-captured frame (stash `lastPayload` in `state` when `JERADIN_SHOW_OVERLAY` fires — extend `background.js` to include `imageBase64` + `note` in the show message),
- disables itself while running and re-streams new `stage` / `section` events into the same overlay,
- reuses the existing `sessionId` so the memory row is upserted, not duplicated.

Bump `extension/manifest.json` to `1.6.1`.

### 3. Overlay reliably appears on the shared tab immediately after "Stop sharing"

Two concrete gaps in `src/routes/chat.tsx` + `extension/background.js`:

- `requestExtensionOverlay` (chat.tsx:1156) resolves `false` after a 4s timeout. When the extension is installed but the background is cold-starting, the ACK can miss the window and we silently fall back to the in-app pill. Raise the timeout to 8s and, when the extension acks `ok:false` with a reason, surface it as a toast instead of silently switching to the pill.
- `resolveTargetTab` (background.js:48) prefers the currently-active tab. Right after `stopRecording`, the active tab is usually `jeradin.com`, so it falls through to `lastAccessed` heuristics and can pick the wrong tab. Reorder: **match by `targetTabTitle` first (already captured from `stream.getVideoTracks()[0].label`), then `lastNonJeradinTabId`, then active, then most-recent**. Also skip the sender tab and any `chrome://` / extension URLs.

Result: as soon as the user clicks "Stop sharing", the extension opens the overlay on the exact tab that was being shared, with the fast pass streaming and a working Deep dive button.

## Files touched

- `src/lib/intel-memory.server.ts` — call `supabaseAdmin.rpc(...)` directly.
- `extension/content.js` — add Deep Dive button + re-stream handling; stash last payload.
- `extension/background.js` — include `imageBase64`/`note` in `JERADIN_SHOW_OVERLAY`; reorder `resolveTargetTab` to prefer `targetTabTitle`.
- `extension/manifest.json` — version bump to 1.6.1.
- `src/routes/chat.tsx` — extend `requestExtensionOverlay` timeout to 8s and surface extension errors via toast instead of silent fallback.

## Verification

- Sign up a fresh test user → prompt → confirm no "Billing failed" toast and that a `credit_usage` row lands (`supabase--read_query`).
- Load unpacked extension, share a non-Jeradin tab, stop sharing → overlay opens on that tab within ~1s, fast pass streams, Deep dive button runs and updates the same sheet.
- If the extension is missing, the in-app pill still appears (fallback preserved).