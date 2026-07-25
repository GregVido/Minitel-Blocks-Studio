"use strict";

const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10000;

function responseTooLargeError() {
  const error = new Error("La réponse JSON dépasse la limite de 2 Mo.");
  error.code = "RESPONSE_TOO_LARGE";
  return error;
}

async function readResponseBody(response, maxBytes) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw responseTooLargeError();

  if (!response.body || typeof response.body.getReader !== "function") {
    const body = await response.text();
    if (Buffer.byteLength(body, "utf8") > maxBytes) throw responseTooLargeError();
    return body;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    totalBytes += chunk.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw responseTooLargeError();
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, totalBytes).toString("utf8");
}

function errorMessage(error) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return String(error || "Erreur réseau inconnue");
}

async function fetchSimulationJson(fetchImplementation, rawUrl, options = {}) {
  const requestedUrl = String(rawUrl || "").trim();
  let parsedUrl;
  try {
    parsedUrl = new URL(requestedUrl);
  } catch {
    return { ok: false, url: requestedUrl, error: "L'URL est invalide." };
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { ok: false, url: requestedUrl, error: "Seules les URL HTTP et HTTPS sont acceptées." };
  }

  const timeoutMs = Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS;
  const maxBytes = Number(options.maxBytes) || DEFAULT_MAX_RESPONSE_BYTES;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImplementation(parsedUrl.toString(), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const resolvedUrl = response.url || parsedUrl.toString();
    const body = await readResponseBody(response, maxBytes);
    if (!response.ok) {
      return {
        ok: false,
        url: resolvedUrl,
        status: response.status,
        error: "Le serveur a répondu avec le code HTTP " + response.status + ".",
      };
    }
    try {
      JSON.parse(body);
    } catch {
      return {
        ok: false,
        url: resolvedUrl,
        status: response.status,
        error: "La réponse reçue n'est pas un JSON valide.",
      };
    }
    return { ok: true, url: resolvedUrl, status: response.status, body };
  } catch (error) {
    if (error && error.code === "RESPONSE_TOO_LARGE") {
      return { ok: false, url: parsedUrl.toString(), error: error.message };
    }
    return {
      ok: false,
      url: parsedUrl.toString(),
      error: controller.signal.aborted
        ? "La requête a dépassé " + Math.round(timeoutMs / 1000) + " secondes."
        : "Connexion impossible : " + errorMessage(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { fetchSimulationJson };
