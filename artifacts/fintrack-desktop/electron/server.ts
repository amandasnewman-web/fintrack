import express from "express";
import path from "path";
import { createServer } from "http";
import companiesRouter from "./routes/companies";
import categoriesRouter from "./routes/categories";
import transactionsRouter from "./routes/transactions";
import invoicesRouter from "./routes/invoices";
import receiptsRouter from "./routes/receipts";
import reportsRouter from "./routes/reports";

export async function startApiServer(): Promise<number> {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.sendStatus(204); return; }
    next();
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/companies", companiesRouter);
  app.use("/api/companies/:companyId/categories", categoriesRouter);
  app.use("/api/companies/:companyId/transactions", transactionsRouter);
  app.use("/api/companies/:companyId/invoices", invoicesRouter);
  app.use("/api/companies/:companyId/receipts", receiptsRouter);
  app.use("/api/companies/:companyId/reports", reportsRouter);

  return new Promise((resolve) => {
    const server = createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as { port: number };
      resolve(addr.port);
    });
  });
}
