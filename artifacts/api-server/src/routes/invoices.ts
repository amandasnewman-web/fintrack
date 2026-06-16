import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { z } from "zod/v4";

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
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

function serialize(row: typeof invoicesTable.$inferSelect) {
  const lineItems = (row.lineItems as { description: string; quantity: number; unitPrice: number }[]) ?? [];
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
    lineItems,
    subtotal: parseFloat(row.subtotal as unknown as string),
    taxRate: parseFloat(row.taxRate as unknown as string),
    taxAmount: parseFloat(row.taxAmount as unknown as string),
    total: parseFloat(row.total as unknown as string),
    notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// GET /companies/:companyId/invoices
router.get("/", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const { status, startDate, endDate } = req.query as Record<string, string>;
  const conditions = [eq(invoicesTable.companyId, companyId)];
  if (status) conditions.push(eq(invoicesTable.status, status));
  if (startDate) conditions.push(gte(invoicesTable.issueDate, startDate));
  if (endDate) conditions.push(lte(invoicesTable.issueDate, endDate));

  const rows = await db.select().from(invoicesTable)
    .where(and(...conditions))
    .orderBy(desc(invoicesTable.issueDate), desc(invoicesTable.id));

  res.json(rows.map(serialize));
});

// POST /companies/:companyId/invoices
router.post("/", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }

  const parsed = invoiceInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const { lineItems, taxRate, invoiceNumber, ...rest } = parsed.data;
  const { subtotal, taxAmount, total } = computeTotals(lineItems, taxRate);

  // Auto-generate invoice number if not provided
  const invNum = invoiceNumber ?? `INV-${Date.now()}`;

  const [row] = await db.insert(invoicesTable).values({
    companyId,
    invoiceNumber: invNum,
    lineItems,
    taxRate: taxRate.toString(),
    subtotal: subtotal.toString(),
    taxAmount: taxAmount.toString(),
    total: total.toString(),
    ...rest,
  }).returning();

  res.status(201).json(serialize(row));
});

// GET /companies/:companyId/invoices/:id
router.get("/:id", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, companyId)));

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(row));
});

// PATCH /companies/:companyId/invoices/:id
router.patch("/:id", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = invoiceInputSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.lineItems !== undefined || parsed.data.taxRate !== undefined) {
    // Fetch existing if needed
    const [existing] = await db.select().from(invoicesTable)
      .where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, companyId)));
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

  const [row] = await db.update(invoicesTable)
    .set(updateData)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, companyId)))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(row));
});

// DELETE /companies/:companyId/invoices/:id
router.delete("/:id", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(invoicesTable)
    .where(and(eq(invoicesTable.id, id), eq(invoicesTable.companyId, companyId)));
  res.status(204).send();
});

export default router;
