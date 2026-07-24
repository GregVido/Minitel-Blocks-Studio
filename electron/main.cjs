const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const fsSync = require("fs");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");

const isDevelopment = !app.isPackaged;
let updateState = {
  status: isDevelopment ? "disabled" : "idle",
  currentVersion: app.getVersion(),
  message: isDevelopment ? "Mises a jour disponibles dans l'application installee." : "Verification au demarrage.",
};
let updaterConfigured = false;
let updateReady = false;
let updatePromptOpen = false;
let startupUpdateTimer = null;
let updateInstallRequested = false;
let updateInstallPreparing = false;
const pendingRendererSaveRequests = new Map();
const approvedWindowCloses = new WeakSet();
const managedChildren = new Set();

app.setAppUserModelId("fr.fifou.minitel-blocks-studio");

function broadcastUpdateState() {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
      window.webContents.send("app-update-status", { ...updateState });
    }
  }
}

function setUpdateState(patch) {
  updateState = { ...updateState, ...patch, currentVersion: app.getVersion() };
  broadcastUpdateState();
  return { ...updateState };
}

function handleUpdaterError(error) {
  console.error("Automatic update failed:", error);
  return setUpdateState({
    status: "error",
    percent: undefined,
    message: "Mise a jour indisponible. Clique pour reessayer.",
  });
}


function stopManagedChildren() {
  for (const child of managedChildren) {
    if (!child.pid) continue;
    try {
      if (process.platform === "win32") {
        spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
      } else {
        child.kill("SIGTERM");
      }
    } catch {
      // The process may already have stopped between discovery and cleanup.
    }
  }
  managedChildren.clear();
}

function prepareForUpdateInstall() {
  if (startupUpdateTimer) {
    clearTimeout(startupUpdateTimer);
    startupUpdateTimer = null;
  }
  stopManagedChildren();
  releaseRuntimeSubst();
}

function requestRendererProjectSave(window, reason) {
  if (!window || window.isDestroyed() || window.webContents.isDestroyed() || window.webContents.isLoadingMainFrame()) return Promise.resolve(true);
  const id = crypto.randomUUID();
  return new Promise((resolve) => {
    const finish = (ok) => {
      const pending = pendingRendererSaveRequests.get(id);
      if (!pending) return;
      clearTimeout(pending.timer);
      pendingRendererSaveRequests.delete(id);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(true), 10000);
    pendingRendererSaveRequests.set(id, { webContentsId: window.webContents.id, timer, finish });
    try {
      window.webContents.send("app-save-requested", { id, reason });
    } catch {
      finish(true);
    }
  });
}

async function installDownloadedUpdate() {
  if (!updateReady || updateInstallRequested || updateInstallPreparing) return { ...updateState };
  updateInstallPreparing = true;
  const parent = BrowserWindow.getAllWindows()[0];
  const saveReady = await requestRendererProjectSave(parent, "update");
  updateInstallPreparing = false;
  if (!saveReady) {
    return setUpdateState({ status: "ready", message: "Sauvegarde du projet impossible. Corrige le probleme puis reessaie." });
  }
  updateInstallRequested = true;
  setUpdateState({ status: "installing", message: "Ouverture de l'installation de la mise a jour..." });
  prepareForUpdateInstall();
  setImmediate(() => {
    try {
      autoUpdater.quitAndInstall(false, true);
    } catch (error) {
      updateInstallRequested = false;
      handleUpdaterError(error);
    }
  });
  return { ...updateState };
}

async function offerDownloadedUpdate() {
  if (updatePromptOpen || !updateReady) return;
  updatePromptOpen = true;
  try {
    const options = {
      type: "info",
      title: "Mise a jour prete",
      message: "Une nouvelle version de Minitel Blocks Studio est prete.",
      detail: "Version " + (updateState.version || "") + " telechargee. L'installation affichera sa progression, puis l'application redemarrera automatiquement.",
      buttons: ["Redemarrer maintenant", "Plus tard"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    };
    const parent = BrowserWindow.getAllWindows()[0];
    const result = parent && !parent.isDestroyed()
      ? await dialog.showMessageBox(parent, options)
      : await dialog.showMessageBox(options);
    if (result.response === 0) {
      await installDownloadedUpdate();
    } else {
      setUpdateState({ status: "ready", message: "Mise a jour prete. Clique pour redemarrer." });
    }
  } finally {
    updatePromptOpen = false;
  }
}

function configureAutoUpdater() {
  if (updaterConfigured || isDevelopment || process.platform !== "win32") return;
  updaterConfigured = true;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.autoRunAppAfterInstall = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.installDirectory = path.dirname(process.execPath);

  autoUpdater.on("checking-for-update", () => {
    setUpdateState({ status: "checking", percent: undefined, message: "Recherche d'une mise a jour..." });
  });
  autoUpdater.on("update-available", (info) => {
    setUpdateState({
      status: "available",
      version: info.version,
      percent: 0,
      message: "Nouvelle version trouvee. Telechargement...",
    });
  });
  autoUpdater.on("update-not-available", () => {
    setUpdateState({
      status: "up-to-date",
      version: app.getVersion(),
      percent: undefined,
      message: "L'application est a jour.",
    });
  });
  autoUpdater.on("download-progress", (progress) => {
    const percent = Math.max(0, Math.min(100, Number(progress.percent) || 0));
    setUpdateState({
      status: "downloading",
      percent,
      message: "Mise a jour " + Math.round(percent) + " %",
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    updateReady = true;
    setUpdateState({
      status: "ready",
      version: info.version,
      percent: 100,
      message: "Mise a jour prete. Clique pour redemarrer.",
    });
    void offerDownloadedUpdate();
  });
  autoUpdater.on("error", handleUpdaterError);

  startupUpdateTimer = setTimeout(() => {
    void checkForAppUpdates();
  }, 3000);
}

async function checkForAppUpdates() {
  if (isDevelopment || process.platform !== "win32") return { ...updateState };
  if (!updaterConfigured) configureAutoUpdater();
  if (["checking", "available", "downloading", "installing"].includes(updateState.status)) return { ...updateState };
  setUpdateState({ status: "checking", percent: undefined, message: "Recherche d'une mise a jour..." });
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    handleUpdaterError(error);
  }
  return { ...updateState };
}

const SUPPORTED_BOARDS = {
  esp32dev: { fqbn: "esp32:esp32:esp32", label: "ESP32 Dev Module" },
  "nodemcu-32s": { fqbn: "esp32:esp32:nodemcu-32s", label: "NodeMCU-32S" },
  "esp32doit-devkit-v1": { fqbn: "esp32:esp32:esp32doit-devkit-v1", label: "DOIT ESP32 DevKit V1" },
};

function appIconPath() {
  const icon = app.isPackaged ? path.join(process.resourcesPath, "logo.png") : path.join(app.getAppPath(), "logo.png");
  return fsSync.existsSync(icon) ? icon : undefined;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1480,
    height: 930,
    minWidth: 1180,
    minHeight: 760,
    title: "Minitel Blocks Studio",
    icon: appIconPath(),
    backgroundColor: "#f4f7fb",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDevelopment) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:4173";
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.webContents.on("did-finish-load", () => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send("app-update-status", { ...updateState });
  });

  let closeRequestInFlight = false;
  mainWindow.on("close", (event) => {
    if (approvedWindowCloses.has(mainWindow) || updateInstallRequested) return;
    event.preventDefault();
    if (updateInstallPreparing || closeRequestInFlight) return;
    closeRequestInFlight = true;
    void requestRendererProjectSave(mainWindow, "close").then((ok) => {
      closeRequestInFlight = false;
      if (!ok) {
        if (!mainWindow.isDestroyed()) mainWindow.focus();
        return;
      }
      approvedWindowCloses.add(mainWindow);
      if (!mainWindow.isDestroyed()) mainWindow.close();
    });
  });
  return mainWindow;
}

function runCommand(command, args, cwd, extraEnv = {}) {
  return new Promise((resolve) => {
    if (updateInstallRequested) {
      resolve({ ok: false, exitCode: -1, stdout: "", stderr: "Mise a jour en cours.", output: "Mise a jour en cours." });
      return;
    }
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      env: { ...process.env, ARDUINO_METRICS_ENABLED: "false", ...extraEnv },
    });
    managedChildren.add(child);
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      managedChildren.delete(child);
      resolve(result);
    };
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      finish({ ok: false, exitCode: -1, stdout, stderr: stderr + error.message, output: stdout + stderr + error.message });
    });
    child.on("close", (code) => {
      finish({ ok: code === 0, exitCode: code == null ? -1 : code, stdout, stderr, output: stdout + stderr });
    });
  });
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function resourcesRoot() {
  return app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), "resources");
}

function toolchainRoot() {
  return path.join(resourcesRoot(), app.isPackaged ? "esp32" : "esp32-toolchain");
}

function embeddedCliPath() {
  return path.join(toolchainRoot(), process.platform === "win32" ? "arduino-cli.exe" : "arduino-cli");
}

let runtimeToolchainPromise = null;
let runtimeSubstDrive = "";
let runtimeSubstOwned = false;

function releaseRuntimeSubst() {
  if (runtimeSubstOwned && runtimeSubstDrive) {
    spawnSync("subst.exe", [runtimeSubstDrive, "/D"], { windowsHide: true });
  }
  runtimeSubstOwned = false;
  runtimeSubstDrive = "";
  runtimeToolchainPromise = null;
}


async function runtimeToolchainRoot() {
  const source = toolchainRoot();
  if (process.platform !== "win32") return source;
  if (runtimeToolchainPromise) return runtimeToolchainPromise;

  runtimeToolchainPromise = (async () => {
    const mappings = await runCommand("subst.exe", [], app.getPath("temp"));
    if (mappings.ok) {
      for (const line of mappings.stdout.split(/\r?\n/)) {
        const match = line.match(/^([A-Z]:)\\: => (.+)$/i);
        if (match && path.resolve(match[2]).toLowerCase() === path.resolve(source).toLowerCase()) {
          runtimeSubstDrive = match[1].toUpperCase();
          return runtimeSubstDrive + "\\";
        }
      }
    }

    const candidates = ["Z:", "Y:", "X:", "W:", "V:", "U:", "T:", "S:", "R:", "Q:", "P:", "O:", "N:"];
    for (const drive of candidates) {
      if (await pathExists(drive + "\\")) continue;
      const created = await runCommand("subst.exe", [drive, source], app.getPath("temp"));
      if (!created.ok) continue;
      runtimeSubstDrive = drive;
      runtimeSubstOwned = true;
      return drive + "\\";
    }
    return source;
  })();
  return runtimeToolchainPromise;
}

function yamlPath(value) {
  return JSON.stringify(path.resolve(value).replace(/\\/g, "/"));
}

async function ensureRuntimeConfig(engineRoot) {
  const runtimeRoot = path.join(app.getPath("userData"), "esp32-runtime");
  const downloadsRoot = path.join(runtimeRoot, "downloads");
  const userRoot = path.join(runtimeRoot, "sketchbook");
  const configPath = path.join(runtimeRoot, "arduino-cli.yaml");
  await fs.mkdir(downloadsRoot, { recursive: true });
  await fs.mkdir(userRoot, { recursive: true });
  await fs.writeFile(configPath, [
    "directories:",
    "  data: " + yamlPath(path.join(engineRoot, "data")),
    "  downloads: " + yamlPath(downloadsRoot),
    "  user: " + yamlPath(userRoot),
    "metrics:",
    "  enabled: false",
    "",
  ].join("\n"), "utf8");
  return configPath;
}

async function runEmbeddedCli(args, cwd) {
  if (!(await pathExists(embeddedCliPath()))) {
    return {
      ok: false,
      exitCode: -1,
      stdout: "",
      stderr: "Le moteur ESP32 integre est absent de cette installation.",
      output: "Le moteur ESP32 integre est absent de cette installation.",
    };
  }
  const engineRoot = await runtimeToolchainRoot();
  const cli = path.join(engineRoot, process.platform === "win32" ? "arduino-cli.exe" : "arduino-cli");
  const configPath = await ensureRuntimeConfig(engineRoot);
  return runCommand(cli, [...args, "--config-file", configPath, "--no-color"], cwd || app.getPath("userData"));
}

function portNumber(value) {
  const match = String(value).match(/COM(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function parseCliPorts(output) {
  try {
    const parsed = JSON.parse(output);
    const entries = Array.isArray(parsed) ? parsed : parsed.detected_ports || parsed.ports || parsed.items || [];
    return entries.map((entry) => {
      const port = entry.port || entry;
      const address = String(port.address || port.port || port.label || "").trim();
      const boards = entry.matching_boards || entry.boards || [];
      const board = boards[0] || {};
      const properties = port.properties || {};
      const details = [board.name, port.protocol_label, port.label, properties.product, properties.manufacturer]
        .filter(Boolean)
        .join(" · ");
      const fingerprint = [board.name, board.fqbn, details, properties.vid, properties.pid].filter(Boolean).join(" ");
      return {
        path: address,
        label: board.name || port.protocol_label || port.label || "Port serie " + address,
        details,
        fqbn: board.fqbn || "",
        likelyEsp32: /esp32|espressif|cp210|ch340|wch|silicon labs/i.test(fingerprint),
      };
    }).filter((port) => port.path && (process.platform !== "win32" || /^COM\d+$/i.test(port.path)));
  } catch {
    return [];
  }
}

async function registrySerialPorts() {
  if (process.platform !== "win32") return [];
  const result = await runCommand("reg.exe", ["query", "HKLM\\HARDWARE\\DEVICEMAP\\SERIALCOMM"], app.getPath("userData"));
  if (!result.ok) return [];
  const seen = new Set();
  const ports = [];
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.match(/REG_SZ\s+(COM\d+)\s*$/i);
    if (!match || seen.has(match[1].toUpperCase())) continue;
    const address = match[1].toUpperCase();
    seen.add(address);
    ports.push({ path: address, label: "Port serie " + address, details: "Detecte par Windows", fqbn: "", likelyEsp32: false });
  }
  return ports;
}

async function listSerialPorts() {
  const detected = [];
  if (await pathExists(embeddedCliPath())) {
    const result = await runEmbeddedCli(["board", "list", "--json", "--discovery-timeout", "2s"]);
    if (result.ok) detected.push(...parseCliPorts(result.stdout));
  }
  const fallback = await registrySerialPorts();
  const byPath = new Map();
  for (const port of [...detected, ...fallback]) {
    const key = port.path.toUpperCase();
    if (!byPath.has(key) || port.likelyEsp32) byPath.set(key, port);
  }
  return [...byPath.values()].sort((left, right) => {
    if (left.likelyEsp32 !== right.likelyEsp32) return left.likelyEsp32 ? -1 : 1;
    return portNumber(left.path) - portNumber(right.path) || left.path.localeCompare(right.path);
  });
}

function safeBoard(board) {
  return SUPPORTED_BOARDS[board] || SUPPORTED_BOARDS.esp32dev;
}

function safeSerialPort(value) {
  const port = String(value || "").trim();
  if (process.platform === "win32") return /^COM\d+$/i.test(port) ? port.toUpperCase() : "";
  return /^\/dev\/[A-Za-z0-9._/-]+$/.test(port) ? port : "";
}

function portableSketchCode(code) {
  return String(code || "").replace(/#include\s*<MinitelESP32\.h>/, '#include "MinitelESP32.h"');
}

async function copyLibrarySources(destination) {
  const sourceRoot = path.join(resourcesRoot(), "MinitelESP32", "src");
  await fs.copyFile(path.join(sourceRoot, "MinitelESP32.h"), path.join(destination, "MinitelESP32.h"));
  await fs.copyFile(path.join(sourceRoot, "MinitelESP32.cpp"), path.join(destination, "MinitelESP32.cpp"));
}

function safeProjectName(value) {
  const cleaned = String(value || "MinitelBlocks").replace(/[^A-Za-z0-9_-]+/g, "").slice(0, 48);
  return cleaned || "MinitelBlocks";
}

function safeProjectFileName(value) {
  const cleaned = path.basename(String(value || "Mon-projet-Minitel.mbs"))
    .replace(/[^A-Za-z0-9._ -]+/g, "")
    .trim()
    .slice(0, 96);
  const name = cleaned || "Mon-projet-Minitel.mbs";
  return /\.mbs$/i.test(name) ? name : name + ".mbs";
}

const MAX_PROJECT_FILE_SIZE = 32 * 1024 * 1024;

function projectLibraryRoot() {
  return path.join(app.getPath("userData"), "projects");
}

function safeManagedProjectId(value) {
  const id = String(value || "").trim();
  return /^[A-Za-z0-9-]{8,80}$/.test(id) ? id : "";
}

function cleanProjectTitle(value) {
  const title = String(value || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return title || "Projet sans nom";
}

function parseManagedProjectDocument(contents) {
  const document = JSON.parse(contents);
  if (!document || typeof document !== "object" || Array.isArray(document)) throw new Error("Format de projet invalide.");
  if (document.format !== undefined && document.format !== "minitel-blocks-studio") throw new Error("Format de projet invalide.");
  const project = document.project && typeof document.project === "object" && !Array.isArray(document.project) ? document.project : document;
  if (!Array.isArray(project.stacks)) throw new Error("Les blocs du projet sont absents.");
  return { document, project };
}

function countManagedBlocks(blocks) {
  if (!Array.isArray(blocks)) return 0;
  return blocks.reduce((count, block) => {
    if (!block || typeof block !== "object") return count;
    return count + 1 + countManagedBlocks(block.children) + countManagedBlocks(block.elseChildren);
  }, 0);
}

function managedProjectSummary(id, parsed, stats) {
  const { document, project } = parsed;
  const metadata = document.metadata && typeof document.metadata === "object" && !Array.isArray(document.metadata) ? document.metadata : {};
  const config = project.screenConfig && typeof project.screenConfig === "object" && !Array.isArray(project.screenConfig) ? project.screenConfig : {};
  const screens = Array.isArray(project.screens) ? project.screens : [];
  const firstScreen = screens.find((screen) => screen && typeof screen === "object") || null;
  const elements = Array.isArray(firstScreen && firstScreen.elements) ? firstScreen.elements : [];
  const previewText = elements
    .filter((element) => element && element.kind === "text" && typeof element.text === "string" && element.text.trim())
    .map((element) => element.text.replace(/[\r\n]+/g, " ").trim().slice(0, 48))
    .slice(0, 3);
  const stacks = Array.isArray(project.stacks) ? project.stacks : [];
  const requestedCreatedAt = typeof metadata.createdAt === "string" && Number.isFinite(Date.parse(metadata.createdAt)) ? metadata.createdAt : "";
  return {
    id,
    name: cleanProjectTitle(metadata.name || document.name),
    createdAt: requestedCreatedAt || stats.birthtime.toISOString(),
    modifiedAt: stats.mtime.toISOString(),
    columns: Math.max(8, Math.min(80, Math.round(Number(config.columns) || 40))),
    rows: Math.max(8, Math.min(40, Math.round(Number(config.rows) || 24))),
    colorEnabled: config.colorEnabled !== false,
    screenCount: Math.max(1, screens.length),
    blockCount: stacks.reduce((count, stack) => count + countManagedBlocks(stack && stack.blocks), 0),
    previewText,
  };
}

async function ensureProjectLibrary() {
  const root = projectLibraryRoot();
  await fs.mkdir(root, { recursive: true });
  return root;
}

async function readManagedProject(id) {
  const safeId = safeManagedProjectId(id);
  if (!safeId) throw new Error("Projet inconnu.");
  const root = await ensureProjectLibrary();
  const filePath = path.join(root, safeId + ".mbs");
  const stats = await fs.stat(filePath);
  if (!stats.isFile() || stats.size > MAX_PROJECT_FILE_SIZE) throw new Error("Ce projet est trop volumineux.");
  const contents = await fs.readFile(filePath, "utf8");
  const parsed = parseManagedProjectDocument(contents);
  return { contents, project: managedProjectSummary(safeId, parsed, stats) };
}

function compactFailure(output) {
  const value = String(output || "Erreur inconnue").trim();
  return value.length > 12000 ? value.slice(-12000) : value;
}

function sendUploadProgress(event, stage, message) {
  if (!event.sender.isDestroyed()) event.sender.send("esp32-upload-progress", { stage, message });
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    createWindow();
    configureAutoUpdater();
  });
}

app.on("second-instance", () => {
  const window = BrowserWindow.getAllWindows()[0];
  if (!window) return;
  if (window.isMinimized()) window.restore();
  window.focus();
});

app.on("will-quit", () => {
  if (startupUpdateTimer) clearTimeout(startupUpdateTimer);
  stopManagedChildren();
  releaseRuntimeSubst();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.on("app-save-complete", (event, payload) => {
  const id = String(payload && payload.id || "");
  const pending = pendingRendererSaveRequests.get(id);
  if (!pending || pending.webContentsId !== event.sender.id) return;
  pending.finish(Boolean(payload && payload.ok));
});

ipcMain.handle("get-update-status", async () => ({ ...updateState }));

ipcMain.handle("check-for-updates", async () => checkForAppUpdates());

ipcMain.handle("install-update", async () => installDownloadedUpdate());

ipcMain.handle("project-library:list", async () => {
  try {
    const root = await ensureProjectLibrary();
    const entries = await fs.readdir(root, { withFileTypes: true });
    const projects = (await Promise.all(entries
      .filter((entry) => entry.isFile() && /^[A-Za-z0-9-]{8,80}\.mbs$/i.test(entry.name))
      .map(async (entry) => {
        const id = entry.name.slice(0, -4);
        try {
          return (await readManagedProject(id)).project;
        } catch (error) {
          console.warn("Managed project ignored:", entry.name, error);
          return null;
        }
      })))
      .filter(Boolean)
      .sort((left, right) => Date.parse(right.modifiedAt) - Date.parse(left.modifiedAt));
    return { ok: true, projects };
  } catch {
    return { ok: false, projects: [], error: "Impossible de lire la bibliothèque de projets." };
  }
});

ipcMain.handle("project-library:load", async (_event, payload) => {
  try {
    return { ok: true, ...(await readManagedProject(payload && payload.id)) };
  } catch {
    return { ok: false, error: "Impossible d'ouvrir ce projet." };
  }
});

ipcMain.handle("project-library:save", async (_event, payload) => {
  const contents = String(payload && payload.contents || "");
  if (!contents.trim()) return { ok: false, error: "Le projet est vide." };
  if (Buffer.byteLength(contents, "utf8") > MAX_PROJECT_FILE_SIZE) return { ok: false, error: "Le projet est trop volumineux." };
  try {
    const parsed = parseManagedProjectDocument(contents);
    const root = await ensureProjectLibrary();
    const id = safeManagedProjectId(payload && payload.id) || crypto.randomUUID();
    const filePath = path.join(root, id + ".mbs");
    await fs.writeFile(filePath, contents, "utf8");
    const stats = await fs.stat(filePath);
    return { ok: true, project: managedProjectSummary(id, parsed, stats) };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer ce projet." };
  }
});

ipcMain.handle("project-library:delete", async (_event, payload) => {
  const id = safeManagedProjectId(payload && payload.id);
  if (!id) return { ok: false, error: "Projet inconnu." };
  try {
    const root = await ensureProjectLibrary();
    await fs.rm(path.join(root, id + ".mbs"), { force: true });
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible de supprimer ce projet." };
  }
});

ipcMain.handle("export-project", async (_event, payload) => {
  const contents = String(payload && payload.contents || "");
  if (!contents.trim()) return { ok: false, error: "Le projet est vide." };
  if (Buffer.byteLength(contents, "utf8") > 32 * 1024 * 1024) return { ok: false, error: "Le projet est trop volumineux." };
  const result = await dialog.showSaveDialog({
    title: "Sauvegarder le projet Minitel",
    defaultPath: path.join(app.getPath("documents"), safeProjectFileName(payload && payload.suggestedName)),
    buttonLabel: "Sauvegarder",
    filters: [{ name: "Projet Minitel Blocks Studio", extensions: ["mbs"] }],
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  const filePath = /\.mbs$/i.test(result.filePath) ? result.filePath : result.filePath + ".mbs";
  try {
    await fs.writeFile(filePath, contents, "utf8");
    return { ok: true, filePath };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer le projet dans ce dossier." };
  }
});

ipcMain.handle("import-project", async () => {
  const result = await dialog.showOpenDialog({
    title: "Ouvrir un projet Minitel",
    buttonLabel: "Ouvrir",
    properties: ["openFile"],
    filters: [
      { name: "Projet Minitel Blocks Studio", extensions: ["mbs"] },
      { name: "Fichier JSON", extensions: ["json"] },
    ],
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
  try {
    const filePath = result.filePaths[0];
    const stats = await fs.stat(filePath);
    if (stats.size > 32 * 1024 * 1024) return { ok: false, error: "Ce projet est trop volumineux." };
    return { ok: true, filePath, contents: await fs.readFile(filePath, "utf8") };
  } catch {
    return { ok: false, error: "Impossible de lire ce fichier de projet." };
  }
});

ipcMain.handle("list-serial-ports", async () => ({
  ok: true,
  ports: await listSerialPorts(),
  engineReady: await pathExists(embeddedCliPath()),
}));

ipcMain.handle("export-arduino-project", async (_event, payload) => {
  const projectName = safeProjectName(payload && payload.projectName);
  const result = await dialog.showOpenDialog({
    title: "Choisir ou enregistrer le dossier du projet Arduino",
    buttonLabel: "Exporter ici",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };

  const projectPath = path.join(result.filePaths[0], projectName);
  const sketchPath = path.join(projectPath, projectName + ".ino");
  if (await pathExists(sketchPath)) {
    const confirmation = await dialog.showMessageBox({
      type: "question",
      buttons: ["Remplacer", "Annuler"],
      defaultId: 0,
      cancelId: 1,
      title: "Projet deja present",
      message: "Le projet " + projectName + " existe deja dans ce dossier.",
      detail: "Les fichiers du programme et de la bibliotheque seront remplaces.",
    });
    if (confirmation.response !== 0) return { ok: false, canceled: true };
  }

  await fs.mkdir(projectPath, { recursive: true });
  await fs.writeFile(sketchPath, portableSketchCode(payload && payload.code), "utf8");
  await copyLibrarySources(projectPath);
  await fs.writeFile(path.join(projectPath, "LISEZ-MOI.txt"), [
    "PROJET ARDUINO MINITEL BLOCKS",
    "",
    "Ouvrez " + projectName + ".ino dans Arduino IDE.",
    "MinitelESP32.h et MinitelESP32.cpp sont deja inclus dans ce dossier : aucune bibliotheque Minitel n'est a installer.",
    "Choisissez votre carte ESP32 et son port, puis utilisez le bouton Televerser.",
    "",
  ].join("\r\n"), "utf8");
  return { ok: true, filePath: projectPath };
});

ipcMain.handle("upload-esp32", async (event, payload) => {
  const board = safeBoard(payload && payload.board);
  const code = portableSketchCode(payload && payload.code);
  if (!code.trim()) return { ok: false, exitCode: -1, output: "Le programme est vide." };
  if (!(await pathExists(embeddedCliPath()))) {
    return { ok: false, exitCode: -1, output: "Le moteur ESP32 integre manque dans cette installation. Reinstalle la derniere version complete de l'application." };
  }

  sendUploadProgress(event, "detect", "Recherche de l'ESP32 branche...");
  const ports = await listSerialPorts();
  const requestedPort = safeSerialPort(payload && payload.port);
  const selectedPort = requestedPort || (ports[0] && ports[0].path) || "";
  if (!selectedPort) {
    return { ok: false, exitCode: -1, output: "Aucun port serie detecte. Branche l'ESP32 avec un cable USB de donnees, puis actualise les ports." };
  }
  if (requestedPort && !ports.some((port) => port.path.toUpperCase() === requestedPort.toUpperCase())) {
    return { ok: false, exitCode: -1, output: requestedPort + " n'est plus disponible. Rebranche l'ESP32 puis actualise les ports." };
  }

  const projectRoot = path.join(os.tmpdir(), "minitel-blocks-upload");
  const sketchRoot = path.join(projectRoot, "MinitelBlocks");
  const buildRoot = path.join(projectRoot, "build");
  const resolvedTemp = path.resolve(os.tmpdir()) + path.sep;
  if (!path.resolve(projectRoot).startsWith(resolvedTemp)) {
    return { ok: false, exitCode: -1, output: "Le dossier temporaire de compilation est invalide." };
  }
  await fs.rm(projectRoot, { recursive: true, force: true });
  await fs.mkdir(sketchRoot, { recursive: true });
  await fs.mkdir(buildRoot, { recursive: true });
  await fs.writeFile(path.join(sketchRoot, "MinitelBlocks.ino"), code, "utf8");
  await copyLibrarySources(sketchRoot);

  sendUploadProgress(event, "compile", "Compilation pour " + board.label + "...");
  const compileArgs = [
    "compile",
    "--fqbn", board.fqbn,
    "--build-path", buildRoot,
    "--jobs", "0",
    "--warnings", "none",
    sketchRoot,
  ];
  let compile = await runEmbeddedCli(compileArgs, projectRoot);
  if (!compile.ok && !/(fatal error:|:\s*error:)/i.test(compile.output)) {
    sendUploadProgress(event, "compile", "Nouvel essai de compilation securise...");
    compile = await runEmbeddedCli(["compile", "--clean", ...compileArgs.slice(1, 5), "--jobs", "1", ...compileArgs.slice(7)], projectRoot);
  }
  if (!compile.ok) {
    return {
      ok: false,
      exitCode: compile.exitCode,
      output: "La compilation n'a pas abouti.\n\n" + compactFailure(compile.output),
      projectPath: sketchRoot,
      port: selectedPort,
    };
  }

  sendUploadProgress(event, "upload", "Envoi du programme sur " + selectedPort + "...");
  const upload = await runEmbeddedCli([
    "upload",
    "--fqbn", board.fqbn,
    "--port", selectedPort,
    "--build-path", buildRoot,
    sketchRoot,
  ], projectRoot);
  if (!upload.ok) {
    const bootHelp = /failed to connect|no serial data|timed out|connecting/i.test(upload.output)
      ? "\n\nMaintiens le bouton BOOT de la carte pendant le debut de l'envoi, puis reessaie."
      : "";
    return {
      ok: false,
      exitCode: upload.exitCode,
      output: "L'ESP32 a ete detecte sur " + selectedPort + ", mais l'envoi a echoue." + bootHelp + "\n\n" + compactFailure(upload.output),
      projectPath: sketchRoot,
      port: selectedPort,
    };
  }

  sendUploadProgress(event, "done", "Programme installe sur l'ESP32.");
  return {
    ok: true,
    exitCode: 0,
    output: [
      "ESP32 detecte sur " + selectedPort + ".",
      "Programme compile pour " + board.label + ".",
      "Televersement termine avec succes.",
      "La carte redemarre automatiquement.",
    ].join("\n"),
    projectPath: sketchRoot,
    port: selectedPort,
  };
});
