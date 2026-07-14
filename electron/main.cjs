// Electron main process — Jeradin desktop agent shell.
const {
  app, BrowserWindow, ipcMain, dialog, Menu, Tray, nativeImage, Notification, shell,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const isDev = !!process.env.JERADIN_DEV_URL;
const APP_URL = process.env.JERADIN_DEV_URL || null;

let mainWindow = null;
let tray = null;
const tailers = new Map();

function trayIconPath() {
  return path.join(__dirname, "tray-icon.png");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#000000",
    title: "Jeradin",
    icon: trayIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev && APP_URL) mainWindow.loadURL(APP_URL);
  else mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));

  mainWindow.on("closed", () => { mainWindow = null; });
}

function focusMain() {
  if (!mainWindow) { createWindow(); return; }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  try {
    let image = nativeImage.createFromPath(trayIconPath());
    if (image.isEmpty()) image = nativeImage.createEmpty();
    else image = image.resize({ width: 18, height: 18 });
    if (process.platform === "darwin") image.setTemplateImage(true);
    tray = new Tray(image);
    tray.setToolTip("Jeradin — real-time intelligence");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Show Jeradin", click: () => focusMain() },
        { type: "separator" },
        { label: "Quit", role: "quit" },
      ]),
    );
    tray.on("click", () => focusMain());
  } catch (err) {
    console.warn("[jeradin] tray init failed:", err?.message);
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  for (const p of tailers.values()) { try { p.kill(); } catch {} }
  tailers.clear();
});

// -------------------- IPC: notifications & window --------------------

ipcMain.handle("app:focus", () => { focusMain(); return { ok: true }; });

ipcMain.handle("app:notify", (_evt, payload) => {
  try {
    if (!Notification.isSupported()) return { ok: false, error: "notifications unsupported" };
    const n = new Notification({
      title: String(payload?.title ?? "Jeradin"),
      body: String(payload?.body ?? "").slice(0, 500),
      urgency: payload?.severity === "critical" || payload?.severity === "high" ? "critical" : "normal",
      silent: false,
      icon: trayIconPath(),
    });
    n.on("click", () => focusMain());
    n.show();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
});

// -------------------- IPC: log tailing --------------------

ipcMain.handle("monitor:pick-log-file", async () => {
  const res = await dialog.showOpenDialog({
    title: "Pick a log file to monitor",
    properties: ["openFile"],
    filters: [
      { name: "Logs", extensions: ["log", "txt", "out", "err"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  return res.filePaths[0];
});

ipcMain.handle("monitor:tail-start", (_evt, filePath) => {
  if (!filePath || typeof filePath !== "string") return { ok: false, error: "invalid path" };
  if (!fs.existsSync(filePath)) return { ok: false, error: "file not found" };
  if (tailers.has(filePath)) return { ok: true, alreadyTailing: true };

  const isWin = process.platform === "win32";
  const child = isWin
    ? spawn("powershell.exe", ["-NoProfile", "-Command", `Get-Content -Path "${filePath}" -Tail 200 -Wait`])
    : spawn("tail", ["-n", "200", "-F", filePath]);

  child.stdout.on("data", (buf) => {
    const chunk = buf.toString("utf8");
    mainWindow?.webContents.send("monitor:tail-chunk", { filePath, chunk, ts: Date.now() });
  });
  child.stderr.on("data", (buf) => {
    mainWindow?.webContents.send("monitor:tail-error", { filePath, message: buf.toString("utf8") });
  });
  child.on("exit", (code) => {
    tailers.delete(filePath);
    mainWindow?.webContents.send("monitor:tail-stopped", { filePath, code });
  });

  tailers.set(filePath, child);
  return { ok: true };
});

ipcMain.handle("monitor:tail-stop", (_evt, filePath) => {
  const p = tailers.get(filePath);
  if (!p) return { ok: false, error: "not tailing" };
  try { p.kill(); } catch {}
  tailers.delete(filePath);
  return { ok: true };
});

ipcMain.handle("monitor:list-tailed", () => Array.from(tailers.keys()));
