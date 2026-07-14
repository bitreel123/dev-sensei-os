# Jeradin desktop agent (Electron)

Real-time monitoring shell that tails your logs and pipes events to Jeradin's intelligence pipeline.

## Layout

- `main.cjs` — Electron main process. Owns the BrowserWindow, tray, and native log tailers (`tail -F` on macOS/Linux, `Get-Content -Wait` on Windows).
- `preload.cjs` — Exposes a narrow `window.jeradinDesktop.monitor` API to the renderer. Context isolation is on; the renderer never touches Node.

The renderer (the React app) talks to the desktop agent through `window.jeradinDesktop` and calls the `analyzeMonitorBatch` server function (`src/lib/monitor.functions.ts`) with batched log/error events. The `MonitorPanel` component (`src/components/jeradin/monitor-panel.tsx`) renders the streaming findings.

## Setup (once)

```bash
bun add -d electron @electron/packager
```

## Develop

```bash
# Terminal 1 — Vite dev server
bun run dev

# Terminal 2 — Electron pointing at the dev server
JERADIN_DEV_URL=http://localhost:8080 bunx electron ./electron/main.cjs
```

## Package

```bash
bun run build
bunx @electron/packager . "Jeradin" \
  --platform=darwin --arch=universal \
  --out=electron-release --overwrite \
  --ignore='node_modules' --ignore='^/src' --ignore='^/public' --ignore='^/electron-release'
```

Swap `--platform` to `linux` or `win32` as needed.

## Status

- [x] BrowserWindow shell that loads the app
- [x] Tray icon (best-effort on Linux)
- [x] Native log-file tailer with cross-platform command
- [x] IPC channel for chunk / error / stopped events
- [x] Server function `analyzeMonitorBatch` for AI analysis of batched events
- [x] `MonitorPanel` renderer component
- [ ] Multi-file monitoring UI (v2)
- [ ] Native notifications on new critical findings (v2)
- [ ] Auto-start on login (v2)

**Note:** The Vite `base` is already `'./'` in `vite.config.ts`? If not, add it before packaging — Electron loads `file://` URLs and absolute paths won't resolve.
