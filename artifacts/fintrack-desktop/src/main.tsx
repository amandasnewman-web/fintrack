import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "./lib/api-client";

async function init() {
  // In packaged Electron, ask the main process for the API port via preload bridge
  const bridge = (window as typeof window & {
    electronBridge?: { getApiPort: () => Promise<number> };
  }).electronBridge;

  if (bridge) {
    const port = await bridge.getApiPort();
    setBaseUrl(`http://127.0.0.1:${port}`);
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

init();
