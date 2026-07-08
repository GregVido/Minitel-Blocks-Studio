const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const fsSync = require("fs");
const { spawn } = require("child_process");

const isDevelopment = !app.isPackaged;

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
}

async function copyDirectory(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath);
    } else {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function looksLikePath(command) {
  return path.isAbsolute(command) || command.includes("/") || command.includes("\\");
}

function platformioVenvDir() {
  return path.join(app.getPath("userData"), "platformio-venv");
}

function platformioBinaryInVenv() {
  return process.platform === "win32"
    ? path.join(platformioVenvDir(), "Scripts", "platformio.exe")
    : path.join(platformioVenvDir(), "bin", "platformio");
}

function bundledPlatformioBinary() {
  if (!app.isPackaged) return "";
  return process.platform === "win32"
    ? path.join(process.resourcesPath, "platformio", "penv", "Scripts", "platformio.exe")
    : path.join(process.resourcesPath, "platformio", "bin", "platformio");
}

function platformioCandidates() {
  const candidates = [];
  if (process.env.PLATFORMIO_EXE) candidates.push(process.env.PLATFORMIO_EXE);
  const bundled = bundledPlatformioBinary();
  if (bundled) candidates.push(bundled);
  candidates.push(platformioBinaryInVenv());
  if (process.platform === "win32") {
    candidates.push(path.join(os.homedir(), ".platformio", "penv", "Scripts", "platformio.exe"));
  }
  candidates.push("platformio");
  return [...new Set(candidates)];
}

async function findPlatformio() {
  for (const command of platformioCandidates()) {
    if (looksLikePath(command) && !(await pathExists(command))) continue;
    const probe = await runCommand(command, ["--version"], app.getPath("userData"));
    if (probe.ok) {
      return { command, output: probe.output.trim() };
    }
  }
  return null;
}

async function findPython() {
  const candidates = process.platform === "win32"
    ? [
        { command: "py", args: ["-3"] },
        { command: "python", args: [] },
        { command: "python3", args: [] },
      ]
    : [
        { command: "python3", args: [] },
        { command: "python", args: [] },
      ];

  for (const candidate of candidates) {
    const probe = await runCommand(candidate.command, [...candidate.args, "--version"], app.getPath("userData"));
    if (probe.ok) {
      return candidate;
    }
  }
  return null;
}

async function installPlatformio() {
  const userData = app.getPath("userData");
  await fs.mkdir(userData, { recursive: true });
  let output = "PlatformIO introuvable. Preparation d'un environnement PlatformIO prive...\n";
  const python = await findPython();

  if (!python) {
    return {
      ok: false,
      output: output + "Python 3 est introuvable. Installe Python 3, relance l'application, puis reessaie le televersement.\n",
    };
  }

  const venvDir = platformioVenvDir();
  const createVenv = await runCommand(python.command, [...python.args, "-m", "venv", venvDir], userData);
  output += createVenv.output + "\n";
  if (!createVenv.ok) {
    return { ok: false, output: output + "Impossible de creer l'environnement Python prive.\n" };
  }

  const pythonInVenv = process.platform === "win32"
    ? path.join(venvDir, "Scripts", "python.exe")
    : path.join(venvDir, "bin", "python");
  const install = await runCommand(pythonInVenv, ["-m", "pip", "install", "--upgrade", "pip", "platformio"], userData);
  output += install.output + "\n";
  if (!install.ok) {
    return { ok: false, output: output + "Impossible d'installer PlatformIO automatiquement. Verifie la connexion Internet puis reessaie.\n" };
  }

  const command = platformioBinaryInVenv();
  const version = await runCommand(command, ["--version"], userData);
  output += version.output + "\n";
  return version.ok
    ? { ok: true, command, output }
    : { ok: false, output: output + "PlatformIO a ete installe, mais ne demarre pas correctement.\n" };
}

async function ensurePlatformio() {
  const found = await findPlatformio();
  if (found) {
    return { ok: true, command: found.command, output: "PlatformIO pret: " + found.command + "\n" + found.output + "\n" };
  }
  return installPlatformio();
}

function runCommand(command, args, cwd, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true, env: { ...process.env, PLATFORMIO_SETTING_ENABLE_TELEMETRY: "false", PIP_DISABLE_PIP_VERSION_CHECK: "1", PYTHONUTF8: "1", ...extraEnv } });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({ ok: false, exitCode: -1, output: output + "\n" + error.message });
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, exitCode: code ?? -1, output });
    });
  });
}

function safeBoard(board) {
  const allowed = new Set(["esp32dev", "nodemcu-32s", "esp32doit-devkit-v1"]);
  return allowed.has(board) ? board : "esp32dev";
}

function resourcesRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "resources");
  }
  return path.join(app.getAppPath(), "resources");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("save-arduino-sketch", async (_event, payload) => {
  const defaultPath = payload && payload.fileName ? payload.fileName : "MinitelBlocks.ino";
  const result = await dialog.showSaveDialog({
    title: "Exporter le sketch Arduino",
    defaultPath,
    filters: [
      { name: "Sketch Arduino", extensions: ["ino"] },
      { name: "Tous les fichiers", extensions: ["*"] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true };
  }

  await fs.writeFile(result.filePath, payload.content, "utf8");
  return { ok: true, filePath: result.filePath };
});

ipcMain.handle("upload-esp32", async (_event, payload) => {
  const board = safeBoard(payload && payload.board ? payload.board : "esp32dev");
  const uploadPort = payload && payload.port ? String(payload.port).trim() : "";
  const code = payload && payload.code ? String(payload.code) : "";
  const projectPath = path.join(os.tmpdir(), "minitel-blocks-upload");
  const srcPath = path.join(projectPath, "src");
  const libPath = path.join(projectPath, "lib", "MinitelESP32");

  await fs.rm(projectPath, { recursive: true, force: true });
  await fs.mkdir(srcPath, { recursive: true });
  await fs.mkdir(path.dirname(libPath), { recursive: true });
  await copyDirectory(path.join(resourcesRoot(), "MinitelESP32"), libPath);

  const platformioIni = [
    "[env:minitel_esp32]",
    "platform = espressif32",
    "board = " + board,
    "framework = arduino",
    "monitor_speed = 115200",
    "upload_speed = 921600",
    "lib_deps =",
    "",
  ].join("\n");

  await fs.writeFile(path.join(projectPath, "platformio.ini"), platformioIni, "utf8");
  await fs.writeFile(path.join(srcPath, "main.cpp"), code, "utf8");

  const args = ["run", "-e", "minitel_esp32", "-t", "upload"];
  if (uploadPort) {
    args.push("--upload-port", uploadPort);
  }

  const platformio = await ensurePlatformio();
  if (!platformio.ok) {
    return {
      ok: false,
      exitCode: -1,
      output: "Projet: " + projectPath + "\n\n" + platformio.output,
      projectPath,
    };
  }

  const command = platformio.command;
  const privateCoreDir = path.join(app.getPath("userData"), "platformio-core");
  await fs.mkdir(privateCoreDir, { recursive: true });
  let result = await runCommand(command, args, projectPath, { PLATFORMIO_CORE_DIR: privateCoreDir });
  let retryNote = "";

  if (!result.ok && /platforms\.lock|HomeDirPermissionsError|PermissionError/.test(result.output)) {
    const retryCoreDir = path.join(app.getPath("userData"), "platformio-core-retry");
    await fs.mkdir(retryCoreDir, { recursive: true });
    retryNote = "\n\nLe dossier PlatformIO est verrouille. Nouvel essai avec un dossier prive: " + retryCoreDir + "\n";
    const retry = await runCommand(command, args, projectPath, { PLATFORMIO_CORE_DIR: retryCoreDir });
    result = {
      ok: retry.ok,
      exitCode: retry.exitCode,
      output: result.output + retryNote + retry.output,
    };
  }

  return {
    ok: result.ok,
    exitCode: result.exitCode,
    output: "Projet: " + projectPath + "\nCommande: " + command + " " + args.join(" ") + "\nCore PlatformIO: " + privateCoreDir + "\n\n" + platformio.output + "\n" + result.output,
    projectPath,
  };
});
