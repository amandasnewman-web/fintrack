// Preload script: runs in the renderer context before page scripts
// Used to inject the API port so React can call the local Express server
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronBridge", {
  getApiPort: () => ipcRenderer.invoke("get-api-port"),
});
