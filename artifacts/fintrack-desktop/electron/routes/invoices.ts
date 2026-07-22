import { Router } from "express";
import { getDb, invoicesTable } from "../db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router({ mergeParams: true });

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
});

const invoiceInputSchema = z.object({
  invoiceNumber: z.string().optional(),
  clientName: z.string().min(1),
  clientEmail: z.string().optional(),
  clientAddress: z.string().optional(),
  issueDate: z.string(),
  dueDate: z.string(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional().default("draft"),
  lineItems: z.array(lineItemSchema),
  taxRate: z.number().min(0),
  notes: z.string().optional(),
});

function computeTotals(lineItems: { description: string; quantity: number; unitPrice: number }[], taxRate: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * (taxRate / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

function serialize(row: typeof invoicesTable.$inferSelect) {
  return {
    id: row.id,
    companyId: row.companyId,
    invoiceNumber: row.invoiceNumber,
    clientName: row.clientName,
    clientEmail: row.clientEmail ?? null,
    clientAddress: row.clientAddress ?? null,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    status: row.status,
    lineItems: typeof row.lineItems === "string" ? JSON.parse(row.lineItems) : row.lineItems,
    subtotal: row.subtotal,
    taxRate: row.taxRate,
    taxAmount: row.taxAmount,
    total: row.total,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
  };
}

router.get("/", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const { status, startDate, endDate } = req.query as Record<string, string>;
  const rows = db.select().from(invoicesTable).where(
    and(
      eq(invoicesTable.companyId, companyId),
      status ? eq(invoicesTable.status, status) : undefined,
      startDate ? gte(invoicesTable.issueDate, startDate) : undefined,
      endDate ? lte(invoicesTable.issueDate, endDate) : undefined,
    )
  ).orderBy(desc(invoicesTable.issueDate), desc(invoicesTable.id)).all();

  res.json(rows.map(serialize));
});

router.post("/", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const parsed = invoiceInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }

  const { lineItems, taxRate, invoiceNumber, ...rest } = parsed.data;
  const { subtotal, taxAmount, total } = computeTotals(lineItems, taxRate);

  const [row] = db.insert(invoicesTable).values({
    companyId,
    invoiceNumber: invoiceNumber ?? `INV-${Date.now()}`,
    lineItems: JSON.stringify(lineItems),
    taxRate,
    subtotal,
    taxAmount,
    total,
    ...rest,
  }).returning().all();

  res.status(201).json(serialize(row));
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, companyId))).all();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(row));
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = invoiceInputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.lineItems !== undefined || parsed.data.taxRate !== undefined) {
    const [existing] = db.select().from(invoicesTable)
      .where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, companyId))).all();
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

  const [row] = db.update(invoicesTable).set(updateData)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, companyId))).returning().all();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(row));
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  db.delete(invoicesTable).where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, companyId))).run();
  res.status(204).send();
});

export default router;
