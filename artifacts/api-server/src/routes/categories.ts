import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router({ mergeParams: true });

const categoryInputSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["expense", "deposit", "both"]),
  color: z.string().optional(),
});

function serialize(c: typeof categoriesTable.$inferSelect) {
  return {
    id: c.id,
    companyId: c.companyId,
    name: c.name,
    type: c.type,
    color: c.color ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

// GET /companies/:companyId/categories
router.get("/", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }
  const rows = await db.select().from(categoriesTable)
    .where(eq(categoriesTable.companyId, companyId))
    .orderBy(categoriesTable.name);
  res.json(rows.map(serialize));
});

// POST /companies/:companyId/categories
router.post("/", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }
  const parsed = categoryInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const [row] = await db.insert(categoriesTable).values({ companyId, ...parsed.data }).returning();
  res.status(201).json(serialize(row));
});

// PATCH /companies/:companyId/categories/:id
router.patch("/:id", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = categoryInputSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const [row] = await db
    .update(categoriesTable)
    .set(parsed.data)
    .where(and(eq(categoriesTable.id, id), eq(categoriesTable.companyId, companyId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(row));
});

// DELETE /companies/:companyId/categories/:id
router.delete("/:id", async (req, res) => {
  const companyId = parseInt(req.params.companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(categoriesTable)
    .where(and(eq(categoriesTable.id, id), eq(categoriesTable.companyId, companyId)));
  res.status(204).send();
});

export default router;
