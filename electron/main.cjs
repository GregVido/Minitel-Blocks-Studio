const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const { spawn } = require("child_process");

const isDevelopment = !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1480,
    height: 930,
    minWidth: 1180,
    minHeight: 760,
    title: "Minitel Blocks Studio",
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

function platformioBinary() {
  if (process.env.PLATFORMIO_EXE) {
    return process.env.PLATFORMIO_EXE;
  }
  if (process.platform === "win32") {
    return path.join(os.homedir(), ".platformio", "penv", "Scripts", "platformio.exe");
  }
  return "platformio";
}

function runCommand(command, args, cwd, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true, env: { ...process.env, PLATFORMIO_SETTING_ENABLE_TELEMETRY: "false", ...extraEnv } });
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

  const command = platformioBinary();
  let result = await runCommand(command, args, projectPath);
  let retryNote = "";

  if (!result.ok && /platforms\.lock|HomeDirPermissionsError|PermissionError/.test(result.output)) {
    const privateCoreDir = path.join(app.getPath("userData"), "platformio-core");
    await fs.mkdir(privateCoreDir, { recursive: true });
    retryNote = "\n\nLe dossier PlatformIO global est verrouillé. Nouvel essai avec un dossier privé: " + privateCoreDir + "\n";
    const retry = await runCommand(command, args, projectPath, { PLATFORMIO_CORE_DIR: privateCoreDir });
    result = {
      ok: retry.ok,
      exitCode: retry.exitCode,
      output: result.output + retryNote + retry.output,
    };
  }

  return {
    ok: result.ok,
    exitCode: result.exitCode,
    output: "Projet: " + projectPath + "\nCommande: " + command + " " + args.join(" ") + "\n\n" + result.output,
    projectPath,
  };
});
