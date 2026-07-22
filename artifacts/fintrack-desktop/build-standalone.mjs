// Builds a Windows installer using Inno Setup.
// No pkg — bundles Node.js portable + server.js + pre-built dist/ into a proper setup.exe.
import { execSync } from "child_process";
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const NODE_VERSION = "18.20.4";

function run(label, cmd, opts = {}) {
  console.log(`\n▸ ${label}`);
  execSync(cmd, { cwd: root, stdio: "inherit", shell: true, ...opts });
}

// 1. Clean and prepare build directory
if (existsSync(path.join(root, "pkg-build"))) {
  rmSync(path.join(root, "pkg-build"), { recursive: true, force: true });
}
mkdirSync(path.join(root, "pkg-build"), { recursive: true });
mkdirSync(path.join(root, "release"), { recursive: true });

// 2. Bundle server with esbuild
run(
  "Bundling server with esbuild…",
  [
    "npx esbuild standalone.ts",
    "--bundle",
    "--platform=node",
    "--target=node18",
    "--format=cjs",
    "--outfile=pkg-build/server.js",
    "--external:electron",
    "--log-level=info",
  ].join(" ")
);

// 3. Copy pre-built frontend
cpSync(path.join(root, "dist"), path.join(root, "pkg-build", "dist"), { recursive: true });
console.log("▸ Copied dist/");

// 4. Download Node.js portable for Windows x64
const nodeZip = path.join(root, "node-portable.zip");
const nodeDir = path.join(root, "node-portable");
run(
  `Downloading Node.js ${NODE_VERSION} portable…`,
  `powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip' -OutFile '${nodeZip}'"`
);
run(
  "Extracting node.exe…",
  `powershell -Command "Expand-Archive -Path '${nodeZip}' -DestinationPath '${nodeDir}' -Force; Copy-Item '${nodeDir}\\node-v${NODE_VERSION}-win-x64\\node.exe' '${path.join(root, "pkg-build", "node.exe")}'"`
);

// 5. Write VBScript launcher (starts node silently, opens browser)
const vbs = [
  'Dim oShell, sDir',
  'Set oShell = CreateObject("WScript.Shell")',
  'sDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\\") - 1)',
  'oShell.CurrentDirectory = sDir',
  'oShell.Run Chr(34) & sDir & "\\node.exe" & Chr(34) & " " & Chr(34) & sDir & "\\server.js" & Chr(34), 0, False',
  'WScript.Sleep 2500',
  'oShell.Run "http://localhost:3847"',
].join("\r\n");
writeFileSync(path.join(root, "pkg-build", "start.vbs"), vbs);
console.log("▸ Created start.vbs");

// 6. Compile Inno Setup installer
run(
  "Compiling Inno Setup installer…",
  `"C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe" setup.iss`
);

console.log("\n✅  Done  →  release/FinTrack-Setup.exe");
