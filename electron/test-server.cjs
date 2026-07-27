const http = require("node:http");

const DEFAULT_TEST_SERVER_PORT = 6663;
const TEST_SERVER_HOST = "localhost";
const MAX_REQUEST_BYTES = 2 * 1024 * 1024;

function normalizeTestServerPort(value, fallback = DEFAULT_TEST_SERVER_PORT) {
  const port = Math.trunc(Number(value));
  return Number.isFinite(port) && port >= 1024 && port <= 65535 ? port : fallback;
}

function jsonHeaders() {
  return {
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Connection: "close",
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, jsonHeaders());
  response.end(JSON.stringify(payload, null, 2) + "\n");
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let receivedBytes = 0;
    let tooLarge = false;
    request.on("data", (chunk) => {
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_REQUEST_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });
    request.on("end", () => {
      if (tooLarge) {
        const error = new Error("Le corps JSON dépasse la limite de 2 Mo.");
        error.code = "BODY_TOO_LARGE";
        reject(error);
        return;
      }
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    request.on("error", reject);
  });
}

async function handleTestRequest(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, jsonHeaders());
    response.end();
    return;
  }

  const url = new URL(request.url || "/", "http://localhost");
  const endpoints = {
    get: "/test",
    post: "/echo",
  };

  if (url.pathname === "/") {
    sendJson(response, 200, {
      ok: true,
      server: "Minitel Blocks Studio",
      message: "Serveur de test prêt.",
      endpoints,
    });
    return;
  }

  if (url.pathname !== endpoints.get && url.pathname !== endpoints.post) {
    sendJson(response, 404, {
      ok: false,
      error: "Route inconnue.",
      endpoints,
    });
    return;
  }

  if (request.method !== "GET" && request.method !== "POST") {
    sendJson(response, 405, {
      ok: false,
      error: "Utilise une requête GET ou POST.",
      endpoints,
    });
    return;
  }

  let body = null;
  if (request.method === "POST") {
    try {
      const rawBody = await readRequestBody(request);
      body = rawBody ? JSON.parse(rawBody) : null;
    } catch (error) {
      sendJson(response, error && error.code === "BODY_TOO_LARGE" ? 413 : 400, {
        ok: false,
        error: error && error.code === "BODY_TOO_LARGE"
          ? error.message
          : "Le corps reçu n'est pas un JSON valide.",
      });
      return;
    }
  }

  sendJson(response, 200, {
    ok: true,
    message: request.method === "POST"
      ? "Requête POST reçue par Minitel Blocks Studio."
      : "Bonjour depuis le serveur de test.",
    nombre: 42,
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    body,
  });
}

function createTestServerController(options = {}) {
  const host = options.host || TEST_SERVER_HOST;
  let server = null;
  let activePort = null;

  async function stop() {
    const current = server;
    server = null;
    activePort = null;
    if (!current) return;
    await new Promise((resolve) => {
      current.close(() => resolve());
      if (typeof current.closeAllConnections === "function") current.closeAllConnections();
    });
  }

  async function start(requestedPort = DEFAULT_TEST_SERVER_PORT) {
    const numericPort = Number(requestedPort);
    const port = numericPort === 0 ? 0 : normalizeTestServerPort(numericPort);
    await stop();
    return new Promise((resolve, reject) => {
      const nextServer = http.createServer((request, response) => {
        void handleTestRequest(request, response).catch((error) => {
          if (!response.headersSent) {
            sendJson(response, 500, { ok: false, error: "Erreur du serveur de test." });
          } else {
            response.end();
          }
          console.error("Local test server request failed:", error);
        });
      });
      const handleStartupError = (error) => {
        reject(error);
      };
      nextServer.once("error", handleStartupError);
      nextServer.listen(port, host, () => {
        nextServer.off("error", handleStartupError);
        nextServer.on("error", (error) => console.error("Local test server failed:", error));
        server = nextServer;
        const address = nextServer.address();
        activePort = address && typeof address === "object" ? address.port : port;
        resolve({ host, port: activePort });
      });
    });
  }

  function status() {
    return {
      host,
      port: activePort,
      running: Boolean(server && activePort),
    };
  }

  return { start, stop, status };
}

module.exports = {
  DEFAULT_TEST_SERVER_PORT,
  createTestServerController,
  normalizeTestServerPort,
};
