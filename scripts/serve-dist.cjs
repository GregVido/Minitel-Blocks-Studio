const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.join(__dirname, "..", "dist");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
]);

function sendFile(response, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": mimeTypes.get(path.extname(filePath)) || "application/octet-stream" });
    response.end(content);
  });
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || "/", "http://" + host + ":" + port);
  const safePath = path.normalize(decodeURIComponent(requestUrl.pathname)).replace(/^([/\\])+/, "");
  const candidate = path.join(root, safePath || "index.html");
  if (!candidate.startsWith(root)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }
  fs.stat(candidate, (error, stat) => {
    if (!error && stat.isFile()) {
      sendFile(response, candidate);
      return;
    }
    sendFile(response, path.join(root, "index.html"));
  });
});

server.listen(port, host, () => {
  console.log("Minitel Blocks Studio: http://" + host + ":" + port + "/");
});
