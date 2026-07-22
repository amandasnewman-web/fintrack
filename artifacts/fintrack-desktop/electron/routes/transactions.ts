import { Router } from "express";
import { getDb, transactionsTable, categoriesTable } from "../db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { z } from "zod";

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
    amount: t.amount,
    description: t.description,
    notes: t.notes ?? null,
    date: t.date,
    referenceNumber: t.referenceNumber ?? null,
    createdAt: t.createdAt,
  };
}

router.get("/", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const { type, categoryId, startDate, endDate, limit = "50", offset = "0" } = req.query as Record<string, string>;

  let query = db
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
    .where(
      and(
        eq(transactionsTable.companyId, companyId),
        type === "expense" || type === "deposit" ? eq(transactionsTable.type, type) : undefined,
        categoryId ? eq(transactionsTable.categoryId, parseInt(categoryId)) : undefined,
        startDate ? gte(transactionsTable.date, startDate) : undefined,
        endDate ? lte(transactionsTable.date, endDate) : undefined,
      )
    )
    .orderBy(desc(transactionsTable.date), desc(transactionsTable.id));

  const allRows = query.all();
  const total = allRows.length;
  const lim = parseInt(limit);
  const off = parseInt(offset);
  const rows = allRows.slice(off, off + lim);

  res.json({ items: rows.map(r => serialize(r as typeof transactionsTable.$inferSelect & { categoryName: string | null })), total });
});

router.post("/", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const parsed = transactionInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }

  const { categoryId, type, amount, description, notes, date, referenceNumber } = parsed.data;
  const [row] = db.insert(transactionsTable)
    .values({ companyId, categoryId, type, amount, description, notes, date, referenceNumber })
    .returning().all();

  let categoryName: string | null = null;
  if (row.categoryId) {
    const [cat] = db.select().from(categoriesTable).where(eq(categoriesTable.id, row.categoryId)).all();
    categoryName = cat?.name ?? null;
  }

  res.status(201).json(serialize({ ...row, categoryName }));
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = db
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
    .where(and(eq(transactionsTable.id, id), eq(transactionsTable.companyId, companyId)))
    .all();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(row as typeof transactionsTable.$inferSelect & { categoryName: string | null }));
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = transactionInputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }

  const [row] = db.update(transactionsTable).set(parsed.data)
    .where(and(eq(transactionsTable.id, id), eq(transactionsTable.companyId, companyId))).returning().all();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  let categoryName: string | null = null;
  if (row.categoryId) {
    const [cat] = db.select().from(categoriesTable).where(eq(categoriesTable.id, row.categoryId)).all();
    categoryName = cat?.name ?? null;
  }

  res.json(serialize({ ...row, categoryName }));
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  db.delete(transactionsTable).where(and(eq(transactionsTable.id, id), eq(transactionsTable.companyId, companyId))).run();
  res.status(204).send();
});

export default router;
