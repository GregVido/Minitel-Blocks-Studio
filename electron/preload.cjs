const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("minitelStudio", {
  saveArduinoSketch: (fileName, content) =>
    ipcRenderer.invoke("save-arduino-sketch", { fileName, content }),
  uploadToEsp32: ({ code, board, port }) =>
    ipcRenderer.invoke("upload-esp32", { code, board, port }),
});
