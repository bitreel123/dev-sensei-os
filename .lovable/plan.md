## 1. Fix "setFocusBehavior … must be either a tab or a window"

The error fires when the user picks **Entire Screen** in Chrome's share picker. `CaptureController.setFocusBehavior()` only accepts tab/window surfaces — on a monitor share it throws and the whole analysis aborts.

Change in `src/routes/chat.tsx` (`startRecording`):
- Read `stream.getVideoTracks()[0].getSettings().displaySurface` after the share dialog resolves.
- Only call `captureController.setFocusBehavior("focus-captured-surface")` when `displaySurface === "browser"` or `"window"`.
- Wrap the call in `try/catch` as a belt-and-suspenders so a future browser quirk can never blank the dashboard.
- No behavior change for tab/window shares — focus stays on the shared surface as before.

Result: sharing "Entire Screen" now succeeds, the recording proceeds, and the Ask-Jeradin pill + streaming overlay run normally.

## 2. Screen-intelligence credit cost

Per your instruction: don't touch Claude — recover cost via credits instead.

Update `INTEL_COST` in `src/lib/intel-memory.server.ts`:
- `screen`: `1` → **`2`** (fast analysis)
- `screen_deep`: `3` → **`5`** (deep dive, uses Claude Sonnet)

Also update the matching allowed-values check inside the `deduct_credit` SQL function (currently accepts `'screen' | 'screen_deep' | 'system' | 'knowledge' | 'repo'` — no schema change needed, only the client-side cost constants change). Landing-page and pricing copy that mentions "1 credit per screen scan" gets updated to "2 credits".

Preflight (`assertCreditsAvailable`) already reads from the same constant, so users under 2 credits will see the friendly "Out of credits" message instead of a mid-stream failure.

## 3. Overlay reliability (already shipped, verifying)

The extension-based overlay (v1.6.1) already handles cross-tab injection. After fix #1 lands, I'll re-verify end-to-end:
- Share Entire Screen → stop → pill appears on active non-Jeradin tab → tap → streaming overlay renders analysis + fix, with Deep Dive button.
- Share Window/Tab → same flow, focus behavior preserved.

No new extension release is required for this fix — it's all in the Jeradin web app's capture code.

## Files touched

- `src/routes/chat.tsx` — guard `setFocusBehavior` by `displaySurface`.
- `src/lib/intel-memory.server.ts` — bump `screen` to 2, `screen_deep` to 5.
- `src/routes/pricing.tsx` and any landing copy referencing "1 credit" for screen scans — update to "2 credits".

## Out of scope

- No Claude model swap, no gateway reroute, no prompt changes (per your instruction).
- No extension rebuild.
