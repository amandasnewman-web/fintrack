import { Router } from "express";
import { getDb, transactionsTable, categoriesTable } from "../db";
import { eq, and, gte, lte, sql, sum } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/summary", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const { startDate, endDate } = req.query as Record<string, string>;

  const rows = db
    .select({
      type: transactionsTable.type,
      total: sum(transactionsTable.amount),
      count: sql<number>`count(*)`,
    })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.companyId, companyId),
        startDate ? gte(transactionsTable.date, startDate) : undefined,
        endDate ? lte(transactionsTable.date, endDate) : undefined,
      )
    )
    .groupBy(transactionsTable.type)
    .all();

  let totalIncome = 0;
  let totalExpenses = 0;
  let transactionCount = 0;

  for (const row of rows) {
    const total = parseFloat(String(row.total ?? "0"));
    const cnt = Number(row.count ?? 0);
    if (row.type === "deposit") totalIncome = total;
    else totalExpenses = total;
    transactionCount += cnt;
  }

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  res.json({
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    transactionCount,
    startDate: startDate ?? firstOfMonth.toISOString().slice(0, 10),
    endDate: endDate ?? today.toISOString().slice(0, 10),
  });
});

router.get("/by-category", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const { startDate, endDate, type } = req.query as Record<string, string>;

  const rows = db
    .select({
      categoryId: transactionsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      type: transactionsTable.type,
      total: sum(transactionsTable.amount),
      count: sql<number>`count(*)`,
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .where(
      and(
        eq(transactionsTable.companyId, companyId),
        startDate ? gte(transactionsTable.date, startDate) : undefined,
        endDate ? lte(transactionsTable.date, endDate) : undefined,
        type === "expense" || type === "deposit" ? eq(transactionsTable.type, type) : undefined,
      )
    )
    .groupBy(transactionsTable.categoryId, categoriesTable.name, categoriesTable.color, transactionsTable.type)
    .all();

  const grandTotals: Record<string, number> = {};
  for (const row of rows) {
    const t = row.type;
    grandTotals[t] = (grandTotals[t] ?? 0) + parseFloat(String(row.total ?? "0"));
  }

  const result = rows.map((row) => {
    const total = parseFloat(String(row.total ?? "0"));
    const grand = grandTotals[row.type] ?? 1;
    return {
      categoryId: row.categoryId ?? null,
      categoryName: row.categoryName ?? "Uncategorized",
      type: row.type,
      total,
      count: Number(row.count ?? 0),
      percentage: grand > 0 ? Math.round((total / grand) * 10000) / 100 : 0,
      color: row.categoryColor ?? null,
    };
  });

  res.json(result);
});

router.get("/monthly", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const { startDate, endDate } = req.query as Record<string, string>;

  // SQLite: strftime('%Y', date) and strftime('%m', date)
  const rows = db
    .select({
      year: sql<number>`CAST(strftime('%Y', ${transactionsTable.date}) AS INTEGER)`,
      month: sql<number>`CAST(strftime('%m', ${transactionsTable.date}) AS INTEGER)`,
      type: transactionsTable.type,
      total: sum(transactionsTable.amount),
    })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.companyId, companyId),
        startDate ? gte(transactionsTable.date, startDate) : undefined,
        endDate ? lte(transactionsTable.date, endDate) : undefined,
      )
    )
    .groupBy(
      sql`strftime('%Y', ${transactionsTable.date})`,
      sql`strftime('%m', ${transactionsTable.date})`,
      transactionsTable.type,
    )
    .all();

  const monthMap = new Map<string, { month: number; year: number; totalIncome: number; totalExpenses: number }>();

  for (const row of rows) {
    const key = `${row.year}-${row.month}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { month: row.month, year: row.year, totalIncome: 0, totalExpenses: 0 });
    }
    const entry = monthMap.get(key)!;
    const total = parseFloat(String(row.total ?? "0"));
    if (row.type === "deposit") entry.totalIncome += total;
    else entry.totalExpenses += total;
  }

  const result = Array.from(monthMap.values()).map((m) => ({
    month: m.month,
    year: m.year,
    totalIncome: m.totalIncome,
    totalExpenses: m.totalExpenses,
    netBalance: m.totalIncome - m.totalExpenses,
  }));

  res.json(result);
});

export default router;
