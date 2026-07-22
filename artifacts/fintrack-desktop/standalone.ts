import express from "express";
import path from "path";
import { createServer } from "http";
import { exec } from "child_process";
import { initDb, saveDb } from "./electron/db";
import companiesRouter from "./electron/routes/companies";
import categoriesRouter from "./electron/routes/categories";
import transactionsRouter from "./electron/routes/transactions";
import invoicesRouter from "./electron/routes/invoices";
import receiptsRouter from "./electron/routes/receipts";
import reportsRouter from "./electron/routes/reports";

const PORT = 3847;

// In a pkg exe, __dirname is the snapshot root. Static files live next to this file.
const DIST_PATH = path.join(__dirname, "dist");

async function main() {
  await initDb();

  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.sendStatus(204); return; }
    next();
  });

  app.use((req, res, next) => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
      res.on("finish", () => { if (res.statusCode < 400) saveDb(); });
    }
    next();
  });

  app.get("/api/health", (_, res) => res.json({ ok: true }));
  app.use("/api/companies", companiesRouter);
  app.use("/api/companies/:companyId/categories", categoriesRouter);
  app.use("/api/companies/:companyId/transactions", transactionsRouter);
  app.use("/api/companies/:companyId/invoices", invoicesRouter);
  app.use("/api/companies/:companyId/receipts", receiptsRouter);
  app.use("/api/companies/:companyId/reports", reportsRouter);

  app.use(express.static(DIST_PATH));
  app.get("*splat", (_, res) => res.sendFile(path.join(DIST_PATH, "index.html")));

  const server = createServer(app);
  server.listen(PORT, "127.0.0.1", () => {
    const url = `http://localhost:${PORT}`;
    console.log(`FinTrack running at ${url}`);
    const open =
      process.platform === "win32" ? `start "" "${url}"` :
      process.platform === "darwin" ? `open "${url}"` :
      `xdg-open "${url}"`;
    exec(open);
  });
}

main().catch(console.error);
