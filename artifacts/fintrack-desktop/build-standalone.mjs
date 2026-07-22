// Build standalone Windows exe: esbuild bundles the server, pkg packages it.
// Runs on Windows (GitHub Actions) or Linux for testing.
import { build } from "esbuild";
import { execSync } from "child_process";
import { cpSync, mkdirSync, rmSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;

// ── 0. Build the React frontend ──────────────────────────────────────────────
console.log("1/4  Building React frontend with Vite...");
execSync("npx vite build", { cwd: root, stdio: "inherit", shell: true });

// ── 1. Bundle the Express server ────────────────────────────────────────────
console.log("2/4  Bundling server with esbuild...");

if (existsSync(path.join(root, "pkg-build"))) {
  rmSync(path.join(root, "pkg-build"), { recursive: true, force: true });
}
mkdirSync(path.join(root, "pkg-build"), { recursive: true });

await build({
  entryPoints: [path.join(root, "standalone.ts")],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outfile: path.join(root, "pkg-build", "server.js"),
  external: ["electron"],
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
  minify: false,
});

// ── 2. Copy the built React frontend next to the bundled server ──────────────
console.log("3/4  Copying React frontend...");
cpSync(path.join(root, "dist"), path.join(root, "pkg-build", "dist"), { recursive: true });

// ── 3. Package with pkg into a single exe ────────────────────────────────────
console.log("4/4  Packaging with pkg...");
mkdirSync(path.join(root, "release"), { recursive: true });

// pkg reads assets from the "pkg" field in package.json.
// We pass the target explicitly so it works on the current OS (Windows on CI).
execSync(
  "npx --yes @yao-pkg/pkg pkg-build/server.js --targets node18-win-x64 --output release/FinTrack.exe",
  { cwd: root, stdio: "inherit", shell: true }
);

console.log("\n✅ Done!  →  release/FinTrack.exe");
