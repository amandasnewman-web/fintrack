import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, categoriesTable } from "@workspace/db";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router({ mergeParams: true });

const transactionInputSchema = z.object({
  categoryId: z.number().int().optional(),
  type: z.enum(["expense", "deposit"]),
  amount: z.number().min(0.01),
  description: z.string().min(1),
  notes: z.string().optional(),
  date: z.string(),
  referenceNumber: z.string().optional(),
});

function serialize(t: typeof transactionsTable.$inferSelect & { categoryName?: string | null }) {
  return {
    id: t.id,
    companyId: t.companyId,
    categoryId: t.categoryId ?? null,
    categoryName: t.categoryName ?? null,
    type: t.type,
    amount: parseFloat(t.amount as unknown as string),
    description: t.description,
    notes: t.notes ?? null,
    date: t.date,
    referenceNumber: t.referenceNumber ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

// GET /companies/:companyId/transactions
router.get("/", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const { type, categoryId, startDate, endDate, limit = "50", offset = "0" } = req.query as Record<string, string>;

  const conditions = [eq(transactionsTable.companyId, companyId)];
  if (type === "expense" || type === "deposit") conditions.push(eq(transactionsTable.type, type));
  if (categoryId) conditions.push(eq(transactionsTable.categoryId, parseInt(categoryId)));
  if (startDate) conditions.push(gte(transactionsTable.date, startDate));
  if (endDate) conditions.push(lte(transactionsTable.date, endDate));

  const where = and(...conditions);

  const [totalResult, rows] = await Promise.all([
    db.select({ count: count() }).from(transactionsTable).where(where),
    db
      .select({
        id: transactionsTable.id,
        companyId: transactionsTable.companyId,
        categoryId: transactionsTable.categoryId,
        categoryName: categoriesTable.name,
        type: transactionsTable.type,
        amount: transactionsTable.amount,
        description: transactionsTable.description,
        notes: transactionsTable.notes,
        date: transactionsTable.date,
        referenceNumber: transactionsTable.referenceNumber,
        createdAt: transactionsTable.createdAt,
      })
      .from(transactionsTable)
      .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
      .where(where)
      .orderBy(desc(transactionsTable.date), desc(transactionsTable.id))
      .limit(parseInt(limit))
      .offset(parseInt(offset)),
  ]);

  res.json({
    items: rows.map(serialize),
    total: totalResult[0]?.count ?? 0,
  });
});

// POST /companies/:companyId/transactions
router.post("/", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const parsed = transactionInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { categoryId, type, amount, description, notes, date, referenceNumber } = parsed.data;
  const [row] = await db
    .insert(transactionsTable)
    .values({ companyId, categoryId, type, amount: amount.toString(), description, notes, date, referenceNumber })
    .returning();

  let categoryName: string | null = null;
  if (row.categoryId) {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, row.categoryId));
    categoryName = cat?.name ?? null;
  }

  res.status(201).json(serialize({ ...row, categoryName }));
});

// GET /companies/:companyId/transactions/:id
router.get("/:id", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({
      id: transactionsTable.id,
      companyId: transactionsTable.companyId,
      categoryId: transactionsTable.categoryId,
      categoryName: categoriesTable.name,
      type: transactionsTable.type,
      amount: transactionsTable.amount,
      description: transactionsTable.description,
      notes: transactionsTable.notes,
      date: transactionsTable.date,
      referenceNumber: transactionsTable.referenceNumber,
      createdAt: transactionsTable.createdAt,
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .where(and(eq(transactionsTable.id, id), eq(transactionsTable.companyId, companyId)));

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(row));
});

// PATCH /companies/:companyId/transactions/:id
router.patch("/:id", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = transactionInputSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount.toString();

  const [row] = await db
    .update(transactionsTable)
    .set(updateData)
    .where(and(eq(transactionsTable.id, id), eq(transactionsTable.companyId, companyId)))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  let categoryName: string | null = null;
  if (row.categoryId) {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, row.categoryId));
    categoryName = cat?.name ?? null;
  }

  res.json(serialize({ ...row, categoryName }));
});

// DELETE /companies/:companyId/transactions/:id
router.delete("/:id", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(transactionsTable)
    .where(and(eq(transactionsTable.id, id), eq(transactionsTable.companyId, companyId)));
  res.status(204).send();
});

export default router;
