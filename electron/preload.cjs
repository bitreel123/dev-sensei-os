const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jeradinDesktop", {
  isDesktop: true,
  focus: () => ipcRenderer.invoke("app:focus"),
  notify: (payload) => ipcRenderer.invoke("app:notify", payload),
  monitor: {
    pickLogFile: () => ipcRenderer.invoke("monitor:pick-log-file"),
    startTail: (filePath) => ipcRenderer.invoke("monitor:tail-start", filePath),
    stopTail: (filePath) => ipcRenderer.invoke("monitor:tail-stop", filePath),
    listTailed: () => ipcRenderer.invoke("monitor:list-tailed"),
    onChunk: (cb) => {
      const h = (_e, p) => cb(p);
      ipcRenderer.on("monitor:tail-chunk", h);
      return () => ipcRenderer.removeListener("monitor:tail-chunk", h);
    },
    onError: (cb) => {
      const h = (_e, p) => cb(p);
      ipcRenderer.on("monitor:tail-error", h);
      return () => ipcRenderer.removeListener("monitor:tail-error", h);
    },
    onStopped: (cb) => {
      const h = (_e, p) => cb(p);
      ipcRenderer.on("monitor:tail-stopped", h);
      return () => ipcRenderer.removeListener("monitor:tail-stopped", h);
    },
  },
});
