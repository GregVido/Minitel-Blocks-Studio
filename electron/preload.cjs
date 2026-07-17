const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("minitelStudio", {
  exportArduinoProject: ({ projectName, code }) =>
    ipcRenderer.invoke("export-arduino-project", { projectName, code }),
  listSerialPorts: () => ipcRenderer.invoke("list-serial-ports"),
  uploadToEsp32: ({ code, board, port }) =>
    ipcRenderer.invoke("upload-esp32", { code, board, port }),
  onUploadProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("esp32-upload-progress", listener);
    return () => ipcRenderer.removeListener("esp32-upload-progress", listener);
  },
});
