/**
 * Serve the production build (out/) from this machine — no internet needed.
 *
 *   npm run build          # once, while you still have internet
 *   npm run serve:offline  # then at the event: http://localhost:3000
 *
 * Or use the ready-made event package (npm run package:offline), which contains
 * this file, the build and double-click launchers — see its READ-ME-FIRST.txt.
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
 * Options (environment variables):
 *   PORT=4000          use another port (note: browser progress is stored per
 *                      address, so always use the SAME port at an event)
 *   OPEN_BROWSER=1     open the game in the default browser once it is up
 *
 * Built for a long event: a bad request cannot stop the server, a busy port gets
 * a plain-English message (and if the game is already running it simply opens
 * it), and if a files.json manifest sits next to this file (the event package
 * has one) every file is checked at start-up so a half-copied folder is caught
 * at the desk, not on stage.
 */
import { createServer, request as httpRequest } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "out");
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const URL_SHOWN = `http://localhost:${PORT}`;

const say = (m = "") => console.log(m);
const fail = (m) => {
  console.error(`\n  PROBLEM: ${m}\n`);
  process.exit(1);
};

if (!existsSync(join(OUT, "index.html"))) {
  fail("No game build found (the 'out' folder is missing).\n  If you are running from the project folder, run `npm run build` first (needs internet once).\n  If you are using the event package, the folder was not copied completely — copy it again.");
}

// -- Start-up integrity check (event package only) ------------------------------
const manifestPath = join(HERE, "files.json");
if (existsSync(manifestPath)) {
  const files = JSON.parse(readFileSync(manifestPath, "utf8"));
  const bad = [];
  for (const [rel, size] of Object.entries(files)) {
    const p = join(OUT, rel);
    if (!existsSync(p) || statSync(p).size !== size) bad.push(rel);
  }
  if (bad.length) {
    fail(`${bad.length} game file(s) are missing or damaged, for example:\n    ${bad.slice(0, 5).join("\n    ")}\n  The folder was not copied completely. Copy the whole folder again from the original.`);
  }
  say(`  Checked: all ${Object.keys(files).length} game files are present.`);
}
const versionFile = join(HERE, "..", "VERSION.txt");
if (existsSync(versionFile)) say(`  ${readFileSync(versionFile, "utf8").trim().split("\n")[0]}`);

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".wav": "audio/wav",
  ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2", ".ico": "image/x-icon",
};

function resolveFile(urlPath) {
  let file = normalize(join(OUT, urlPath));
  // Stay inside out/ (OUT + separator, so a sibling like "out-secret" can't match).
  if (file !== OUT && !file.startsWith(OUT + sep)) return { status: 403 };
  if (existsSync(file) && statSync(file).isDirectory()) {
    file = existsSync(`${file}.html`) ? `${file}.html` : join(file, "index.html");
  } else if (!existsSync(file) && existsSync(`${file}.html`)) {
    file += ".html";
  }
  if (!existsSync(file) || !statSync(file).isFile()) return { status: 404 };
  return { file };
}

const server = createServer((req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { allow: "GET, HEAD" });
      return res.end();
    }
    let urlPath;
    try {
      urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    } catch {
      res.writeHead(400, { "content-type": "text/plain" });
      return res.end("Bad request");
    }
    const hit = resolveFile(urlPath);
    if (!hit.file) {
      res.writeHead(hit.status, { "content-type": "text/plain" });
      return res.end(hit.status === 403 ? "Forbidden" : "Not found");
    }
    const size = statSync(hit.file).size;
    const type = TYPES[extname(hit.file)] ?? "application/octet-stream";
    const base = { "content-type": type, "accept-ranges": "bytes", "cache-control": "no-cache" };
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
    let start = 0;
    let end = size - 1;
    let status = 200;
    const headers = { ...base };
    if (range && (range[1] || range[2])) {
      // Video needs byte ranges to start and seek ("bytes=500-", "bytes=0-99", "bytes=-100").
      if (range[1] === "") { start = Math.max(0, size - Number(range[2])); }
      else { start = Number(range[1]); if (range[2]) end = Math.min(Number(range[2]), size - 1); }
      if (start >= size || start > end) {
        res.writeHead(416, { "content-range": `bytes */${size}` });
        return res.end();
      }
      status = 206;
      headers["content-range"] = `bytes ${start}-${end}/${size}`;
    }
    headers["content-length"] = size === 0 ? 0 : end - start + 1;
    res.writeHead(status, headers);
    if (req.method === "HEAD" || size === 0) return res.end();
    const stream = createReadStream(hit.file, { start, end });
    stream.on("error", () => res.destroy());
    res.on("close", () => stream.destroy());
    stream.pipe(res);
  } catch (e) {
    console.error(`  (request error, ignored) ${req.url}: ${e?.message}`);
    try { if (!res.headersSent) res.writeHead(500); res.end(); } catch { /* connection already gone */ }
  }
});

// Nothing a browser does should ever take the game down mid-event.
process.on("uncaughtException", (e) => console.error(`  (error, kept running) ${e?.message}`));
process.on("unhandledRejection", (e) => console.error(`  (error, kept running) ${e?.message ?? e}`));

function openBrowser() {
  if (process.env.OPEN_BROWSER !== "1") return;
  const [cmd, args] =
    process.platform === "darwin" ? ["open", [URL_SHOWN]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", "", URL_SHOWN]]
    : ["xdg-open", [URL_SHOWN]];
  try {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    child.on("error", () => say(`  Could not open the browser automatically — open ${URL_SHOWN} yourself.`));
    child.unref();
  } catch { /* fall through: the address is printed below */ }
}

server.on("error", (err) => {
  if (err.code !== "EADDRINUSE") fail(`The game could not start: ${err.message}`);
  // Something already uses the port. If it is this game, just open it.
  const probe = httpRequest({ host: "127.0.0.1", port: PORT, path: "/", timeout: 2000 }, (r) => {
    let body = "";
    r.on("data", (c) => { if (body.length < 20000) body += c; });
    r.on("end", () => {
      if (body.includes("Crack the Box")) {
        say(`\n  Crack the Box is already running at ${URL_SHOWN} — opening it.`);
        openBrowser();
        say(`  (To stop it, close the other game window.)\n`);
        process.exit(0);
      }
      fail(`Port ${PORT} is being used by another program.\n  Close that program and start the game again.\n  (Do not switch to a different port during the event: the game's saved progress belongs to one address.)`);
    });
  });
  probe.on("error", () => fail(`Port ${PORT} is already in use by another program. Close it and start the game again.`));
  probe.on("timeout", () => { probe.destroy(); });
  probe.end();
});

server.listen(PORT, HOST, () => {
  say(`\n  Crack the Box is running offline at ${URL_SHOWN} (this laptop only)`);
  say(`  Admin: ${URL_SHOWN}/admin/questions`);
  say(`  Leave this window open while you play. Close it (or press Ctrl+C) to stop.\n`);
  openBrowser();
});
