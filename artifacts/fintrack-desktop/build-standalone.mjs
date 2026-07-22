// Builds a single-file Windows exe.
// The React frontend dist/ is pre-built and committed to the repo.
// CI only needs to: bundle the server with esbuild, then package with pkg.
import { execSync } from "child_process";
import { cpSync, mkdirSync, rmSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));

function run(label, cmd) {
  console.log(`\n▸ ${label}`);
  execSync(cmd, { cwd: root, stdio: "inherit", shell: true });
}

// 1. Bundle server + all deps into a single CJS file
if (existsSync(path.join(root, "pkg-build"))) {
  rmSync(path.join(root, "pkg-build"), { recursive: true, force: true });
}
mkdirSync(path.join(root, "pkg-build"), { recursive: true });

run(
  "Bundling server with esbuild CLI…",
  [
    "npx esbuild standalone.ts",
    "--bundle",
    "--platform=node",
    "--target=node18",
    "--format=cjs",
    `--outfile=pkg-build/server.js`,
    "--external:electron",
    "--log-level=info",
  ].join(" ")
);

// 2. Copy pre-built frontend next to bundled server
cpSync(path.join(root, "dist"), path.join(root, "pkg-build", "dist"), { recursive: true });
console.log("▸ Copied dist/");

// 3. Package everything into a single .exe
mkdirSync(path.join(root, "release"), { recursive: true });
run(
  "Packaging with @yao-pkg/pkg…",
  "npx --yes @yao-pkg/pkg pkg-build/server.js --targets node18-win-x64 --output release/FinTrack.exe"
);

console.log("\n✅  Done  →  release/FinTrack.exe");
