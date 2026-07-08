const { spawn, spawnSync } = require("child_process");
const http = require("http");
const path = require("path");

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm" : "npm";
let serverProcess = null;
let electronProcess = null;

function waitForServer(url, attemptsLeft) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve();
    });
    request.on("error", () => {
      if (attemptsLeft <= 0) {
        reject(new Error("Local server did not start in time."));
        return;
      }
      setTimeout(() => {
        waitForServer(url, attemptsLeft - 1).then(resolve, reject);
      }, 250);
    });
    request.setTimeout(300, () => request.destroy());
  });
}

function spawnManaged(command, args, options) {
  return spawn(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });
}

async function main() {
  const build = spawnSync(npmCommand, ["run", "build"], { stdio: "inherit", shell: false });
  // console.log(build)
  // if (build.status !== 0) {
  //   process.exit(build.status || 1);
  // }

  const port = process.env.PORT || "4173";
  const devUrl = "http://127.0.0.1:" + port;
  serverProcess = spawnManaged(process.execPath, [path.join(__dirname, "serve-dist.cjs")], {
    env: { ...process.env, PORT: port },
  });

  await waitForServer(devUrl, 80);

  const electronBinary = require("electron");
  electronProcess = spawnManaged(electronBinary, ["."], {
    env: { ...process.env, VITE_DEV_SERVER_URL: devUrl },
  });

    console.log("fh")

  electronProcess.on("exit", () => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });
}

process.on("SIGINT", () => {
  if (electronProcess) electronProcess.kill();
  if (serverProcess) serverProcess.kill();
  process.exit(0);
});

main().catch((error) => {
  console.error(error);
  if (serverProcess) serverProcess.kill();
  process.exit(1);
});
