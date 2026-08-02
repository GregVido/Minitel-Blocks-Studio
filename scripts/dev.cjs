const { spawn, spawnSync } = require("child_process");
const { randomUUID } = require("crypto");
const http = require("http");
const net = require("net");
const path = require("path");

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
let serverProcess = null;
let electronProcess = null;

function probeServer(url, token) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      const isCurrentServer = response.headers["x-mbs-dev-token"] === token;
      response.resume();
      resolve(isCurrentServer);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(300, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function delay(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

async function waitForServer(url, token, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (!serverProcess || serverProcess.exitCode !== null) {
      throw new Error("Le serveur local s'est arrêté avant le démarrage de l'application.");
    }
    if (await probeServer(url, token)) return;
    await delay(250);
  }
  throw new Error("Le serveur local n'a pas démarré à temps.");
}

function parsePreferredPort(value) {
  const port = Number(value || 4173);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("Le port de développement doit être un nombre compris entre 0 et 65535.");
  }
  return port;
}

function probePort(port, host) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once("error", (error) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(null);
        return;
      }
      reject(error);
    });
    probe.listen({ port, host, exclusive: true }, () => {
      const address = probe.address();
      const availablePort = address && typeof address === "object" ? address.port : port;
      probe.close((error) => {
        if (error) reject(error);
        else resolve(availablePort);
      });
    });
  });
}

async function findAvailablePort(preferredPort, host) {
  if (preferredPort === 0) {
    const dynamicPort = await probePort(0, host);
    if (dynamicPort === null) throw new Error("Aucun port local n'est disponible.");
    return dynamicPort;
  }

  const lastCandidate = Math.min(65535, preferredPort + 100);
  for (let candidate = preferredPort; candidate <= lastCandidate; candidate += 1) {
    const availablePort = await probePort(candidate, host);
    if (availablePort !== null) return availablePort;
  }

  const fallbackPort = await probePort(0, host);
  if (fallbackPort === null) throw new Error("Aucun port local n'est disponible.");
  return fallbackPort;
}

function spawnManaged(command, args, options) {
  return spawn(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });
}

async function main() {
  const npmCli = process.env.npm_execpath;
  const build = npmCli
    ? spawnSync(process.execPath, [npmCli, "run", "build"], { stdio: "inherit", shell: false })
    : spawnSync(npmCommand, ["run", "build"], { stdio: "inherit", shell: false });
  if (build.error) throw build.error;
  if (build.status !== 0) process.exit(build.status || 1);

  const host = "127.0.0.1";
  const preferredPort = parsePreferredPort(process.env.PORT);
  const port = await findAvailablePort(preferredPort, host);
  if (port !== preferredPort && preferredPort !== 0) {
    console.log("Le port " + preferredPort + " est occupé, utilisation du port " + port + ".");
  }

  const devUrl = "http://" + host + ":" + port;
  const devToken = randomUUID();
  serverProcess = spawnManaged(process.execPath, [path.join(__dirname, "serve-dist.cjs")], {
    env: { ...process.env, HOST: host, PORT: String(port), MBS_DEV_TOKEN: devToken },
  });

  await waitForServer(devUrl, devToken);

  const electronBinary = require("electron");
  electronProcess = spawnManaged(electronBinary, ["."], {
    env: { ...process.env, VITE_DEV_SERVER_URL: devUrl },
  });

  electronProcess.on("exit", () => {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
  });
}

function stopChildren() {
  if (electronProcess) electronProcess.kill();
  if (serverProcess) serverProcess.kill();
}

process.on("SIGINT", () => {
  stopChildren();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopChildren();
  process.exit(0);
});

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    stopChildren();
    process.exit(1);
  });
}

module.exports = { findAvailablePort, parsePreferredPort };
