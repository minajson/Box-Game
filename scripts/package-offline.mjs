/**
 * Builds the self-contained OFFLINE EVENT PACKAGES — one for Windows, one for Mac.
 *
 *   npm run package:offline                    # builds the game, then packages it
 *   npm run package:offline -- --skip-build    # package the existing out/ as is
 *   npm run package:offline -- --no-zip        # folders only
 *
 * Output (offline-package/, git-ignored):
 *   Crack-the-Box-NAPE-2026-Windows/  + .zip
 *   Crack-the-Box-NAPE-2026-Mac/      + .zip
 *
 * Each package is everything the event laptop needs and nothing else:
 *   START-GAME-Windows.bat | START-GAME-Mac.command   double-click launcher
 *   READ-ME-FIRST.txt        beginner instructions (USB copy → laptop → launch)
 *   VERSION.txt              which commit + which Node.js runtime this is
 *   runtime/                 a portable Node.js (official build, SHA-256 verified):
 *                              Windows: node.exe (x64)
 *                              Mac:     node-darwin-arm64 + node-darwin-x64
 *   out/                     the production build (every picture, sound, video)
 *   server/serve-offline.mjs the tiny local web server
 *   server/files.json        every game file + size, checked on each start-up
 *
 * So the laptop needs NO Node.js install, no npm, no git, no build tools and no
 * internet. The runtimes are downloaded once (needs internet on THIS machine),
 * checked against the SHA-256 values pinned below (copied from nodejs.org's
 * SHASUMS256.txt for that release) and cached in offline-package/.runtime-cache/.
 *
 * Node 22 LTS is bundled on purpose: it still runs on Windows 10 and macOS 11,
 * which older event laptops may be.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const NODE_VERSION = "v22.23.4";
const RUNTIMES = {
  "win-x64": { file: `node-${NODE_VERSION}-win-x64.zip`, sha256: "cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20" },
  "darwin-arm64": { file: `node-${NODE_VERSION}-darwin-arm64.tar.gz`, sha256: "c9e1dbc748b33ed2d14f42445191ecaf14c56259c7a9a26d0042c49ec2b66428" },
  "darwin-x64": { file: `node-${NODE_VERSION}-darwin-x64.tar.gz`, sha256: "efcc2b0db6f94bf53eddb038fe2b370277a042bd29e4f19b8f8e23598795b819" },
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "offline-package");
const CACHE = join(OUT_DIR, ".runtime-cache");
const BASE = "Crack-the-Box-NAPE-2026";
const args = process.argv.slice(2);
const sh = (cmd, a, opts = {}) => spawnSync(cmd, a, { cwd: ROOT, encoding: "utf8", ...opts });
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const crlf = (t) => t.replace(/\r?\n/g, "\r\n"); // Windows Notepad / cmd friendly

// 1. Build from the current code ------------------------------------------------
if (!args.includes("--skip-build")) {
  console.log("Building the production game (npm run build)…");
  const r = sh("npm", ["run", "build"], { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) { console.error("Build failed — packages not created."); process.exit(1); }
}
if (!existsSync(join(ROOT, "out", "index.html")) || !existsSync(join(ROOT, "out", "admin", "questions.html"))) {
  console.error("out/ is missing or incomplete. Run without --skip-build."); process.exit(1);
}

// 2. Which code is this? ---------------------------------------------------------
const commit = sh("git", ["rev-parse", "--short", "HEAD"]).stdout.trim() || "unknown";
const subject = sh("git", ["log", "-1", "--format=%s"]).stdout.trim();
// Only files that change the BUILT game count (the offline tooling itself does not).
const GAME_PATHS = ["app", "components", "lib", "data", "public", "next.config.ts", "package-lock.json", "postcss.config.mjs", "tsconfig.json"];
const dirty = sh("git", ["status", "--porcelain", "--", ...GAME_PATHS]).stdout.trim().length > 0;
const built = new Date().toISOString();

// 3. Portable Node.js runtimes (download once, verify, cache) -------------------
mkdirSync(CACHE, { recursive: true });
async function ensureRuntime(key) {
  const { file, sha256: want } = RUNTIMES[key];
  const path = join(CACHE, file);
  if (existsSync(path) && sha256(path) === want) return path;
  console.log(`Downloading ${file} from nodejs.org…`);
  const res = await fetch(`https://nodejs.org/dist/${NODE_VERSION}/${file}`);
  if (!res.ok) throw new Error(`Download of ${file} failed: HTTP ${res.status}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  const got = sha256(path);
  if (got !== want) { rmSync(path, { force: true }); throw new Error(`${file}: checksum mismatch (got ${got}) — refusing to bundle it.`); }
  return path;
}

/** Pull the node binary + its LICENSE out of an official archive. Returns file paths. */
function extractRuntime(key, archive) {
  const tmp = join(CACHE, `extract-${key}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const top = `node-${NODE_VERSION}-${key}`;
  if (key === "win-x64") {
    const r = sh("unzip", ["-q", "-o", archive, `${top}/node.exe`, `${top}/LICENSE`, "-d", tmp]);
    if (r.status !== 0) throw new Error(`unzip failed: ${r.stderr}`);
    return { bin: join(tmp, top, "node.exe"), license: join(tmp, top, "LICENSE") };
  }
  const r = sh("tar", ["-xzf", archive, "-C", tmp, `${top}/bin/node`, `${top}/LICENSE`]);
  if (r.status !== 0) throw new Error(`tar failed: ${r.stderr}`);
  return { bin: join(tmp, top, "bin", "node"), license: join(tmp, top, "LICENSE") };
}

// 4. Assemble one package -----------------------------------------------------------
function assemble({ platform, runtimeKeys, launcher, readme }) {
  const name = `${BASE}-${platform}`;
  const pkg = join(OUT_DIR, name);
  rmSync(pkg, { recursive: true, force: true });
  mkdirSync(join(pkg, "server"), { recursive: true });
  mkdirSync(join(pkg, "runtime"), { recursive: true });
  cpSync(join(ROOT, "out"), join(pkg, "out"), { recursive: true, filter: (src) => !src.endsWith(".DS_Store") });
  copyFileSync(join(ROOT, "scripts", "serve-offline.mjs"), join(pkg, "server", "serve-offline.mjs"));

  const L = join(ROOT, "scripts", "offline-launchers");
  const windows = platform === "Windows";
  const launcherText = readFileSync(join(L, launcher), "utf8");
  writeFileSync(join(pkg, launcher), windows ? crlf(launcherText) : launcherText);
  if (!windows) chmodSync(join(pkg, launcher), 0o755);
  const readmeText = readFileSync(join(L, readme), "utf8");
  writeFileSync(join(pkg, "READ-ME-FIRST.txt"), windows ? crlf(readmeText) : readmeText);

  const sums = [];
  let licensePath;
  for (const key of runtimeKeys) {
    const { bin, license } = extractRuntime(key, runtimeArchives[key]);
    const dest = join(pkg, "runtime", key === "win-x64" ? "node.exe" : `node-${key}`);
    copyFileSync(bin, dest);
    if (!windows) chmodSync(dest, 0o755);
    sums.push(`${sha256(dest)}  ${relative(join(pkg, "runtime"), dest)}`);
    licensePath = license;
  }
  copyFileSync(licensePath, join(pkg, "runtime", "LICENSE-nodejs.txt"));
  writeFileSync(join(pkg, "runtime", "SHA256SUMS.txt"), `Node.js ${NODE_VERSION} — official nodejs.org build\n${sums.join("\n")}\n`);

  writeFileSync(
    join(pkg, "VERSION.txt"),
    `Crack the Box NAPE 2026 offline package (${platform}) — commit ${commit}${dirty ? " (+ uncommitted game changes)" : ""}\n` +
      `Commit message: ${subject}\nBundled runtime: Node.js ${NODE_VERSION} (official nodejs.org build, SHA-256 verified)\nPackaged: ${built}\n`,
  );

  // Manifest of every game file (checked at every start).
  const manifest = {};
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else manifest[relative(join(pkg, "out"), p).split(sep).join("/")] = statSync(p).size;
    }
  };
  walk(join(pkg, "out"));
  writeFileSync(join(pkg, "server", "files.json"), JSON.stringify(manifest, null, 1) + "\n");

  // Zip (keeps the executable bits for the Mac launcher and runtime).
  const zipPath = join(OUT_DIR, `${name}.zip`);
  rmSync(zipPath, { force: true });
  let zipped = false;
  if (!args.includes("--no-zip") && process.platform !== "win32") zipped = sh("zip", ["-r", "-X", "-q", zipPath, name], { cwd: OUT_DIR }).status === 0;

  const total = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? total(join(dir, e.name)) : statSync(join(dir, e.name)).size), 0);
  const mb = (n) => (n / 1048576).toFixed(0);
  console.log(`\n${platform} package: ${relative(ROOT, pkg)}/  —  ${Object.keys(manifest).length} game files, ${mb(total(pkg))} MB` + (zipped ? `, zip ${mb(statSync(zipPath).size)} MB` : ""));
}

const runtimeArchives = {};
for (const key of Object.keys(RUNTIMES)) runtimeArchives[key] = await ensureRuntime(key);

// Tidy up the earlier, runtime-less package if it is still lying around.
for (const old of [BASE, `${BASE}.zip`]) rmSync(join(OUT_DIR, old), { recursive: true, force: true });

assemble({ platform: "Windows", runtimeKeys: ["win-x64"], launcher: "START-GAME-Windows.bat", readme: "README-Windows.txt" });
assemble({ platform: "Mac", runtimeKeys: ["darwin-arm64", "darwin-x64"], launcher: "START-GAME-Mac.command", readme: "README-Mac.txt" });

console.log(`\ncommit ${commit}${dirty ? " (game files have uncommitted changes!)" : ""} · Node.js ${NODE_VERSION} bundled`);
if (dirty) console.log("NOTE: the build includes uncommitted GAME changes — commit first if this is meant for the event.");
