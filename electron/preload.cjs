const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("minitelStudio", {
  listProjects: () => ipcRenderer.invoke("project-library:list"),
  loadProject: (id) => ipcRenderer.invoke("project-library:load", { id }),
  saveProject: ({ id, contents }) => ipcRenderer.invoke("project-library:save", { id, contents }),
  onAppSaveRequested: (callback) => {
    const listener = (_event, request) => callback(request);
    ipcRenderer.on("app-save-requested", listener);
    return () => ipcRenderer.removeListener("app-save-requested", listener);
  },
  completeAppSaveRequest: ({ id, ok }) => ipcRenderer.send("app-save-complete", { id, ok }),
  deleteProject: (id) => ipcRenderer.invoke("project-library:delete", { id }),
  exportProject: ({ suggestedName, contents }) =>
    ipcRenderer.invoke("export-project", { suggestedName, contents }),
  importProject: () => ipcRenderer.invoke("import-project"),
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
  getUpdateStatus: () => ipcRenderer.invoke("get-update-status"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("app-update-status", listener);
    return () => ipcRenderer.removeListener("app-update-status", listener);
  },
});
