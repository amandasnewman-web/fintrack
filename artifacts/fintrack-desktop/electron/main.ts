import { app, BrowserWindow, shell, ipcMain } from "electron";
import path from "path";
import { startApiServer } from "./server";

let mainWindow: BrowserWindow | null = null;
let apiPort = 0;

async function createWindow() {
  apiPort = await startApiServer();

  // IPC: renderer asks for the port via preload
  ipcMain.handle("get-api-port", () => apiPort);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "FinTrack",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow!.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
