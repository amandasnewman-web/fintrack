// Builds a Windows installer using Inno Setup.
// Copies node.exe from the system PATH (already installed by actions/setup-node).
import { execSync } from "child_process";
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));

function run(label, cmd, opts = {}) {
  console.log(`\n▸ ${label}`);
  execSync(cmd, { cwd: root, stdio: "inherit", shell: true, ...opts });
}

try {
  // 1. Clean and prepare build directories
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

  // 4. Copy node.exe from the system PATH (already present from actions/setup-node)
  run(
    "Locating and copying node.exe from PATH…",
    `powershell -Command "Copy-Item -Path (Get-Command node.exe).Source -Destination pkg-build\\node.exe -Force"`
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

  // 6. Find and run Inno Setup compiler
  // Try iscc from PATH first, then the default install location
  let isccCmd;
  try {
    execSync("iscc /?", { stdio: "pipe" });
    isccCmd = "iscc";
  } catch {
    isccCmd = `"C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe"`;
  }
  run("Compiling Inno Setup installer…", `${isccCmd} setup.iss`);

  console.log("\n✅  Done  →  release/FinTrack-Setup.exe");
} catch (err) {
  console.error("\n❌ Build failed:", err.message);
  writeFileSync(path.join(root, "build-error.txt"), err.message + "\n" + (err.stderr || ""));
  process.exit(1);
}
