import { Router } from "express";
import { getDb, receiptsTable, categoriesTable } from "../db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router({ mergeParams: true });

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
});

const receiptInputSchema = z.object({
  receiptNumber: z.string().optional(),
  vendorName: z.string().min(1),
  vendorEmail: z.string().optional(),
  vendorAddress: z.string().optional(),
  date: z.string(),
  categoryId: z.number().int().optional(),
  lineItems: z.array(lineItemSchema),
  taxRate: z.number().min(0),
  notes: z.string().optional(),
  paymentMethod: z.string().optional(),
});

function computeTotals(lineItems: { description: string; quantity: number; unitPrice: number }[], taxRate: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * (taxRate / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

function serialize(row: typeof receiptsTable.$inferSelect & { categoryName?: string | null }) {
  return {
    id: row.id,
    companyId: row.companyId,
    receiptNumber: row.receiptNumber,
    vendorName: row.vendorName,
    vendorEmail: row.vendorEmail ?? null,
    vendorAddress: row.vendorAddress ?? null,
    date: row.date,
    categoryId: row.categoryId ?? null,
    categoryName: row.categoryName ?? null,
    lineItems: typeof row.lineItems === "string" ? JSON.parse(row.lineItems) : row.lineItems,
    subtotal: row.subtotal,
    taxRate: row.taxRate,
    taxAmount: row.taxAmount,
    total: row.total,
    notes: row.notes ?? null,
    paymentMethod: row.paymentMethod ?? null,
    createdAt: row.createdAt,
  };
}

router.get("/", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const { startDate, endDate } = req.query as Record<string, string>;

  const rows = db
    .select({
      id: receiptsTable.id,
      companyId: receiptsTable.companyId,
      receiptNumber: receiptsTable.receiptNumber,
      vendorName: receiptsTable.vendorName,
      vendorEmail: receiptsTable.vendorEmail,
      vendorAddress: receiptsTable.vendorAddress,
      date: receiptsTable.date,
      categoryId: receiptsTable.categoryId,
      categoryName: categoriesTable.name,
      lineItems: receiptsTable.lineItems,
      subtotal: receiptsTable.subtotal,
      taxRate: receiptsTable.taxRate,
      taxAmount: receiptsTable.taxAmount,
      total: receiptsTable.total,
      notes: receiptsTable.notes,
      paymentMethod: receiptsTable.paymentMethod,
      createdAt: receiptsTable.createdAt,
    })
    .from(receiptsTable)
    .leftJoin(categoriesTable, eq(receiptsTable.categoryId, categoriesTable.id))
    .where(
      and(
        eq(receiptsTable.companyId, companyId),
        startDate ? gte(receiptsTable.date, startDate) : undefined,
        endDate ? lte(receiptsTable.date, endDate) : undefined,
      )
    )
    .orderBy(desc(receiptsTable.date), desc(receiptsTable.id))
    .all();

  res.json(rows.map(r => serialize(r as typeof receiptsTable.$inferSelect & { categoryName: string | null })));
});

router.post("/", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const parsed = receiptInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }

  const { lineItems, taxRate, receiptNumber, categoryId, ...rest } = parsed.data;
  const { subtotal, taxAmount, total } = computeTotals(lineItems, taxRate);

  const [row] = db.insert(receiptsTable).values({
    companyId,
    receiptNumber: receiptNumber ?? `RCP-${Date.now()}`,
    categoryId,
    lineItems: JSON.stringify(lineItems),
    taxRate,
    subtotal,
    taxAmount,
    total,
    ...rest,
  }).returning().all();

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
      id: receiptsTable.id,
      companyId: receiptsTable.companyId,
      receiptNumber: receiptsTable.receiptNumber,
      vendorName: receiptsTable.vendorName,
      vendorEmail: receiptsTable.vendorEmail,
      vendorAddress: receiptsTable.vendorAddress,
      date: receiptsTable.date,
      categoryId: receiptsTable.categoryId,
      categoryName: categoriesTable.name,
      lineItems: receiptsTable.lineItems,
      subtotal: receiptsTable.subtotal,
      taxRate: receiptsTable.taxRate,
      taxAmount: receiptsTable.taxAmount,
      total: receiptsTable.total,
      notes: receiptsTable.notes,
      paymentMethod: receiptsTable.paymentMethod,
      createdAt: receiptsTable.createdAt,
    })
    .from(receiptsTable)
    .leftJoin(categoriesTable, eq(receiptsTable.categoryId, categoriesTable.id))
    .where(and(eq(receiptsTable.id, id), eq(receiptsTable.companyId, companyId)))
    .all();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(row as typeof receiptsTable.$inferSelect & { categoryName: string | null }));
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = receiptInputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.lineItems !== undefined || parsed.data.taxRate !== undefined) {
    const [existing] = db.select().from(receiptsTable)
      .where(and(eq(receiptsTable.id, id), eq(receiptsTable.companyId, companyId))).all();
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    const lineItems = parsed.data.lineItems ?? (typeof existing.lineItems === "string" ? JSON.parse(existing.lineItems) : existing.lineItems);
    const taxRate = parsed.data.taxRate ?? existing.taxRate;
    const { subtotal, taxAmount, total } = computeTotals(lineItems, taxRate);
    updateData.lineItems = JSON.stringify(lineItems);
    updateData.taxRate = taxRate;
    updateData.subtotal = subtotal;
    updateData.taxAmount = taxAmount;
    updateData.total = total;
  }

  const [row] = db.update(receiptsTable).set(updateData)
    .where(and(eq(receiptsTable.id, id), eq(receiptsTable.companyId, companyId))).returning().all();
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
  db.delete(receiptsTable).where(and(eq(receiptsTable.id, id), eq(receiptsTable.companyId, companyId))).run();
  res.status(204).send();
});

export default router;
