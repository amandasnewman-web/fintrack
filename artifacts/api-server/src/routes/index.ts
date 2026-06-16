import { Router, type IRouter } from "express";
import healthRouter from "./health";
import companiesRouter from "./companies";
import categoriesRouter from "./categories";
import transactionsRouter from "./transactions";
import reportsRouter from "./reports";
import invoicesRouter from "./invoices";
import receiptsRouter from "./receipts";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/companies", companiesRouter);
router.use("/companies/:companyId/categories", categoriesRouter);
router.use("/companies/:companyId/transactions", transactionsRouter);
router.use("/companies/:companyId/reports", reportsRouter);
router.use("/companies/:companyId/invoices", invoicesRouter);
router.use("/companies/:companyId/receipts", receiptsRouter);

export default router;
