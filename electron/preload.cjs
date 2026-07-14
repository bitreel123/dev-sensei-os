// Preload: expose a narrow, typed API to the renderer without leaking Node.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jeradinDesktop", {
  isDesktop: true,
  monitor: {
    pickLogFile: () => ipcRenderer.invoke("monitor:pick-log-file"),
    startTail: (filePath) => ipcRenderer.invoke("monitor:tail-start", filePath),
    stopTail: (filePath) => ipcRenderer.invoke("monitor:tail-stop", filePath),
    listTailed: () => ipcRenderer.invoke("monitor:list-tailed"),
    onChunk: (cb) => {
      const handler = (_e, payload) => cb(payload);
      ipcRenderer.on("monitor:tail-chunk", handler);
      return () => ipcRenderer.removeListener("monitor:tail-chunk", handler);
    },
    onError: (cb) => {
      const handler = (_e, payload) => cb(payload);
      ipcRenderer.on("monitor:tail-error", handler);
      return () => ipcRenderer.removeListener("monitor:tail-error", handler);
    },
    onStopped: (cb) => {
      const handler = (_e, payload) => cb(payload);
      ipcRenderer.on("monitor:tail-stopped", handler);
      return () => ipcRenderer.removeListener("monitor:tail-stopped", handler);
    },
  },
});
