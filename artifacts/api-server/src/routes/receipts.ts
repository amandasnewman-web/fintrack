import { Router } from "express";
import { db } from "@workspace/db";
import { receiptsTable, categoriesTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { z } from "zod/v4";

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
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

function serialize(row: typeof receiptsTable.$inferSelect & { categoryName?: string | null }) {
  const lineItems = (row.lineItems as { description: string; quantity: number; unitPrice: number }[]) ?? [];
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
    lineItems,
    subtotal: parseFloat(row.subtotal as unknown as string),
    taxRate: parseFloat(row.taxRate as unknown as string),
    taxAmount: parseFloat(row.taxAmount as unknown as string),
    total: parseFloat(row.total as unknown as string),
    notes: row.notes ?? null,
    paymentMethod: row.paymentMethod ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// GET /companies/:companyId/receipts
router.get("/", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const { startDate, endDate } = req.query as Record<string, string>;
  const conditions = [eq(receiptsTable.companyId, companyId)];
  if (startDate) conditions.push(gte(receiptsTable.date, startDate));
  if (endDate) conditions.push(lte(receiptsTable.date, endDate));

  const rows = await db
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
    .where(and(...conditions))
    .orderBy(desc(receiptsTable.date), desc(receiptsTable.id));

  res.json(rows.map(serialize));
});

// POST /companies/:companyId/receipts
router.post("/", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const parsed = receiptInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { lineItems, taxRate, receiptNumber, categoryId, ...rest } = parsed.data;
  const { subtotal, taxAmount, total } = computeTotals(lineItems, taxRate);
  const rcptNum = receiptNumber ?? `RCP-${Date.now()}`;

  const [row] = await db.insert(receiptsTable).values({
    companyId,
    receiptNumber: rcptNum,
    categoryId,
    lineItems,
    taxRate: taxRate.toString(),
    subtotal: subtotal.toString(),
    taxAmount: taxAmount.toString(),
    total: total.toString(),
    ...rest,
  }).returning();

  let categoryName: string | null = null;
  if (row.categoryId) {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, row.categoryId));
    categoryName = cat?.name ?? null;
  }

  res.status(201).json(serialize({ ...row, categoryName }));
});

// GET /companies/:companyId/receipts/:id
router.get("/:id", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
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
    .where(and(eq(receiptsTable.id, id), eq(receiptsTable.companyId, companyId)));

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(row));
});

// PATCH /companies/:companyId/receipts/:id
router.patch("/:id", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = receiptInputSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.lineItems !== undefined || parsed.data.taxRate !== undefined) {
    const [existing] = await db.select().from(receiptsTable)
      .where(and(eq(receiptsTable.id, id), eq(receiptsTable.companyId, companyId)));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    const lineItems = (parsed.data.lineItems ?? (existing.lineItems as { description: string; quantity: number; unitPrice: number }[]));
    const taxRate = parsed.data.taxRate ?? parseFloat(existing.taxRate as unknown as string);
    const { subtotal, taxAmount, total } = computeTotals(lineItems, taxRate);
    updateData.lineItems = lineItems;
    updateData.taxRate = taxRate.toString();
    updateData.subtotal = subtotal.toString();
    updateData.taxAmount = taxAmount.toString();
    updateData.total = total.toString();
  }

  const [row] = await db.update(receiptsTable)
    .set(updateData)
    .where(and(eq(receiptsTable.id, id), eq(receiptsTable.companyId, companyId)))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  let categoryName: string | null = null;
  if (row.categoryId) {
    const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, row.categoryId));
    categoryName = cat?.name ?? null;
  }

  res.json(serialize({ ...row, categoryName }));
});

// DELETE /companies/:companyId/receipts/:id
router.delete("/:id", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(receiptsTable)
    .where(and(eq(receiptsTable.id, id), eq(receiptsTable.companyId, companyId)));
  res.status(204).send();
});

export default router;
