const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const { spawnSync } = require("child_process");

const ARDUINO_CLI_VERSION = process.env.ARDUINO_CLI_VERSION || "1.5.1";
const ESP32_CORE_VERSION = process.env.ESP32_CORE_VERSION || "3.3.8";
const ESP32_INDEX_URL = "https://espressif.github.io/arduino-esp32/package_esp32_index.json";
const projectRoot = path.resolve(__dirname, "..");
const resourcesRoot = path.join(projectRoot, "resources");
const toolchainRoot = path.join(resourcesRoot, "esp32-toolchain");
const cacheRoot = path.join(projectRoot, "build", "toolchain-cache");
const markerPath = path.join(toolchainRoot, ".ready.json");
const cliPath = path.join(toolchainRoot, "arduino-cli.exe");

function assertManagedPath(target, parent) {
  const resolvedTarget = path.resolve(target);
  const resolvedParent = path.resolve(parent) + path.sep;
  if (!resolvedTarget.startsWith(resolvedParent)) {
    throw new Error(`Chemin refuse hors du projet: ${resolvedTarget}`);
  }
}

function removeManagedDirectory(target, parent) {
  assertManagedPath(target, parent);
  fs.rmSync(target, { recursive: true, force: true });
}

function yamlPath(value) {
  return JSON.stringify(path.resolve(value).replace(/\\/g, "/"));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || projectRoot,
    env: { ...process.env, ARDUINO_METRICS_ENABLED: "false", ...options.env },
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = options.capture ? `\n${result.stdout || ""}${result.stderr || ""}` : "";
    throw new Error(`${command} a termine avec le code ${result.status}.${details}`);
  }
  return result;
}

async function download(url, destination) {
  if (fs.existsSync(destination)) return;
  const partial = `${destination}.part`;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.rmSync(partial, { force: true });
  console.log(`Telechargement du moteur ESP32 (${ARDUINO_CLI_VERSION})...`);
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Telechargement impossible (${response.status} ${response.statusText})`);
  }
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(partial));
  fs.renameSync(partial, destination);
}

function extractZip(archive, destination) {
  fs.mkdirSync(destination, { recursive: true });
  const tarResult = spawnSync("tar.exe", ["-xf", archive, "-C", destination], {
    cwd: projectRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  if (!tarResult.error && tarResult.status === 0) return;

  const escapedArchive = archive.replace(/'/g, "''");
  const escapedDestination = destination.replace(/'/g, "''");
  run("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    `Expand-Archive -LiteralPath '${escapedArchive}' -DestinationPath '${escapedDestination}' -Force`,
  ]);
}

function pruneUnsupportedTools(dataRoot) {
  const toolsRoot = path.join(dataRoot, "packages", "esp32", "tools");
  const unusedTools = [
    "esp-rv32",
    "esp32c3-libs",
    "esp32c5-libs",
    "esp32c6-libs",
    "esp32h2-libs",
    "esp32p4-libs",
    "esp32p4_es-libs",
    "esp32s2-libs",
    "esp32s3-libs",
    "openocd-esp32",
    "riscv32-esp-elf-gdb",
    "xtensa-esp-elf-gdb",
  ];
  console.log("Allegement du moteur pour les cartes ESP32 classiques...");
  for (const toolName of unusedTools) {
    const target = path.join(toolsRoot, toolName);
    if (fs.existsSync(target)) removeManagedDirectory(target, toolsRoot);
  }
}

function markerIsCurrent() {
  try {
    const marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
    return marker.arduinoCli === ARDUINO_CLI_VERSION
      && marker.esp32Core === ESP32_CORE_VERSION
      && marker.profile === "esp32-classic"
      && fs.existsSync(cliPath)
      && fs.existsSync(path.join(toolchainRoot, "data", "packages", "esp32", "hardware", "esp32", ESP32_CORE_VERSION));
  } catch {
    return false;
  }
}

async function main() {
  if (process.platform !== "win32" || process.arch !== "x64") {
    throw new Error("La preparation automatique est actuellement prevue pour Windows x64.");
  }

  if (markerIsCurrent()) {
    console.log(`Moteur ESP32 deja pret (core ${ESP32_CORE_VERSION}).`);
    return;
  }

  const existingCli = fs.existsSync(cliPath);
  if (!existingCli) {
    removeManagedDirectory(toolchainRoot, resourcesRoot);
    fs.mkdirSync(toolchainRoot, { recursive: true });
  } else {
    console.log("Reutilisation du moteur deja telecharge...");
  }
  fs.mkdirSync(cacheRoot, { recursive: true });

  const archiveName = `arduino-cli_${ARDUINO_CLI_VERSION}_Windows_64bit.zip`;
  const archivePath = path.join(cacheRoot, archiveName);
  const archiveUrl = `https://github.com/arduino/arduino-cli/releases/download/v${ARDUINO_CLI_VERSION}/${archiveName}`;
  if (!existingCli) {
    await download(archiveUrl, archivePath);
    extractZip(archivePath, toolchainRoot);
  }

  if (!fs.existsSync(cliPath)) {
    throw new Error("Le moteur de compilation n'a pas ete extrait correctement.");
  }

  const dataRoot = path.join(toolchainRoot, "data");
  const downloadsRoot = path.join(toolchainRoot, "downloads");
  const userRoot = path.join(toolchainRoot, "user");
  const configPath = path.join(toolchainRoot, "prepare-config.yaml");
  fs.mkdirSync(dataRoot, { recursive: true });
  fs.mkdirSync(downloadsRoot, { recursive: true });
  fs.mkdirSync(userRoot, { recursive: true });
  fs.writeFileSync(configPath, [
    "board_manager:",
    "  additional_urls:",
    `    - ${ESP32_INDEX_URL}`,
    "directories:",
    `  data: ${yamlPath(dataRoot)}`,
    `  downloads: ${yamlPath(downloadsRoot)}`,
    `  user: ${yamlPath(userRoot)}`,
    "metrics:",
    "  enabled: false",
    "",
  ].join("\n"));

  console.log(`Installation du coeur ESP32 ${ESP32_CORE_VERSION} dans l'application...`);
  run(cliPath, ["core", "update-index", "--config-file", configPath]);
  run(cliPath, ["core", "install", `esp32:esp32@${ESP32_CORE_VERSION}`, "--config-file", configPath]);
  run(cliPath, ["core", "list", "--config-file", configPath]);
  pruneUnsupportedTools(dataRoot);

  fs.rmSync(configPath, { force: true });
  removeManagedDirectory(downloadsRoot, toolchainRoot);
  fs.mkdirSync(downloadsRoot, { recursive: true });
  fs.writeFileSync(path.join(toolchainRoot, "THIRD_PARTY_NOTICES.txt"), [
    "Minitel Blocks Studio - composants tiers embarques",
    "",
    `Arduino CLI ${ARDUINO_CLI_VERSION} - GPL-3.0`,
    "https://github.com/arduino/arduino-cli",
    "Le texte de la licence est fourni dans ce dossier par l'archive officielle.",
    "",
    `Arduino core for ESP32 ${ESP32_CORE_VERSION} - LGPL-2.1 et licences de composants associees`,
    "https://github.com/espressif/arduino-esp32",
    "Les textes de licence sont conserves dans data/packages/esp32.",
    "",
    "Ces composants sont distribues separement du code Apache-2.0 de Minitel Blocks Studio.",
    "",
  ].join("\n"));
  fs.writeFileSync(markerPath, JSON.stringify({
    arduinoCli: ARDUINO_CLI_VERSION,
    esp32Core: ESP32_CORE_VERSION,
    profile: "esp32-classic",
    preparedAt: new Date().toISOString(),
  }, null, 2));

  console.log("Moteur ESP32 embarque pret.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
