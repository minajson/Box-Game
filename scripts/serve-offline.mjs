/**
 * Serve the production build (out/) from this machine — no internet needed.
 *
 *   npm run build          # once, while you still have internet
 *   npm run serve:offline  # then at the event: http://localhost:3000
 *
 * Why: the game fetches pictures, mascot videos and music from its server when
 * they are first needed. Served from this laptop, that "server" is the laptop
 * itself, so a dead venue Wi-Fi cannot break a question. (Opened straight from
 * a remote host, a dropped connection would.) Zero dependencies — plain Node.
 *
 * Reachable from THIS laptop only (127.0.0.1) — the admin page at
 * /admin/questions has no PIN gate (ADMIN_AUTH_ENABLED is false), so it must not
 * be served to the venue network. To show it on another device deliberately,
 * run: HOST=0.0.0.0 npm run serve:offline
 *
 * Optional: PORT=4000 npm run serve:offline
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "out");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "127.0.0.1";

if (!existsSync(join(OUT, "index.html"))) {
  console.error("No build found. Run `npm run build` first (needs internet only once).");
  process.exit(1);
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".wav": "audio/wav",
  ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".txt": "text/plain", ".woff2": "font/woff2", ".ico": "image/x-icon",
};

createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  // Stay inside out/.
  let file = normalize(join(OUT, url));
  if (!file.startsWith(OUT)) { res.writeHead(403); return res.end(); }
  if (existsSync(file) && statSync(file).isDirectory()) {
    file = existsSync(`${file}.html`) ? `${file}.html` : join(file, "index.html");
  } else if (!existsSync(file) && existsSync(`${file}.html`)) {
    file += ".html";
  }
  if (!existsSync(file)) {
    res.writeHead(404, { "content-type": "text/plain" });
    return res.end("Not found");
  }
  const body = readFileSync(file);
  const type = TYPES[extname(file)] ?? "application/octet-stream";
  const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range ?? "");
  if (range) {
    // Video needs byte ranges to start and seek.
    const start = Number(range[1]);
    const end = range[2] ? Number(range[2]) : body.length - 1;
    res.writeHead(206, { "content-type": type, "accept-ranges": "bytes", "content-range": `bytes ${start}-${end}/${body.length}`, "content-length": end - start + 1 });
    return res.end(body.subarray(start, end + 1));
  }
  res.writeHead(200, { "content-type": type, "accept-ranges": "bytes", "cache-control": "no-cache" });
  res.end(body);
}).listen(PORT, HOST, () => {
  console.log(`Crack the Box is running offline at http://localhost:${PORT} (this laptop only)`);
  console.log(`Admin: http://localhost:${PORT}/admin/questions   (Ctrl+C to stop)`);
});
