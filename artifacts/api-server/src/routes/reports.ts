import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, categoriesTable } from "@workspace/db";
import { eq, and, gte, lte, sql, sum } from "drizzle-orm";

const router = Router({ mergeParams: true });

// GET /companies/:companyId/reports/summary
router.get("/summary", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const { startDate, endDate } = req.query as Record<string, string>;

  const conditions = [eq(transactionsTable.companyId, companyId)];
  if (startDate) conditions.push(gte(transactionsTable.date, startDate));
  if (endDate) conditions.push(lte(transactionsTable.date, endDate));

  const rows = await db
    .select({
      type: transactionsTable.type,
      total: sum(transactionsTable.amount),
      count: sql<number>`count(*)::int`,
    })
    .from(transactionsTable)
    .where(and(...conditions))
    .groupBy(transactionsTable.type);

  let totalIncome = 0;
  let totalExpenses = 0;
  let transactionCount = 0;

  for (const row of rows) {
    const total = parseFloat(row.total ?? "0");
    const cnt = Number(row.count ?? 0);
    if (row.type === "deposit") {
      totalIncome = total;
    } else {
      totalExpenses = total;
    }
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

// GET /companies/:companyId/reports/by-category
router.get("/by-category", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const { startDate, endDate, type } = req.query as Record<string, string>;

  const conditions = [eq(transactionsTable.companyId, companyId)];
  if (startDate) conditions.push(gte(transactionsTable.date, startDate));
  if (endDate) conditions.push(lte(transactionsTable.date, endDate));
  if (type === "expense" || type === "deposit") conditions.push(eq(transactionsTable.type, type));

  const rows = await db
    .select({
      categoryId: transactionsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      type: transactionsTable.type,
      total: sum(transactionsTable.amount),
      count: sql<number>`count(*)::int`,
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .where(and(...conditions))
    .groupBy(transactionsTable.categoryId, categoriesTable.name, categoriesTable.color, transactionsTable.type)
    .orderBy(sql`sum(${transactionsTable.amount}) desc`);

  // compute grand totals per type for percentage
  const grandTotals: Record<string, number> = {};
  for (const row of rows) {
    const t = row.type;
    grandTotals[t] = (grandTotals[t] ?? 0) + parseFloat(row.total ?? "0");
  }

  const result = rows.map((row) => {
    const total = parseFloat(row.total ?? "0");
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

// GET /companies/:companyId/reports/monthly
router.get("/monthly", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const { startDate, endDate } = req.query as Record<string, string>;

  const conditions = [eq(transactionsTable.companyId, companyId)];
  if (startDate) conditions.push(gte(transactionsTable.date, startDate));
  if (endDate) conditions.push(lte(transactionsTable.date, endDate));

  const rows = await db
    .select({
      year: sql<number>`extract(year from ${transactionsTable.date}::date)::int`,
      month: sql<number>`extract(month from ${transactionsTable.date}::date)::int`,
      type: transactionsTable.type,
      total: sum(transactionsTable.amount),
    })
    .from(transactionsTable)
    .where(and(...conditions))
    .groupBy(
      sql`extract(year from ${transactionsTable.date}::date)`,
      sql`extract(month from ${transactionsTable.date}::date)`,
      transactionsTable.type,
    )
    .orderBy(
      sql`extract(year from ${transactionsTable.date}::date)`,
      sql`extract(month from ${transactionsTable.date}::date)`,
    );

  // Group by year+month
  const monthMap = new Map<string, { month: number; year: number; totalIncome: number; totalExpenses: number }>();

  for (const row of rows) {
    const key = `${row.year}-${row.month}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { month: row.month, year: row.year, totalIncome: 0, totalExpenses: 0 });
    }
    const entry = monthMap.get(key)!;
    const total = parseFloat(row.total ?? "0");
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
