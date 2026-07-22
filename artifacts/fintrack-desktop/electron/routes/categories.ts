import { Router } from "express";
import { getDb, categoriesTable } from "../db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

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
    createdAt: c.createdAt,
  };
}

router.get("/", (req, res) => {
  const db = getDb();
  const companyId = parseInt((req.params as Record<string, string>).companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }
  const rows = db.select().from(categoriesTable).where(eq(categoriesTable.companyId, companyId)).orderBy(categoriesTable.name).all();
  res.json(rows.map(serialize));
});

router.post("/", (req, res) => {
  const db = getDb();
  const companyId = parseInt((req.params as Record<string, string>).companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "Invalid companyId" }); return; }
  const parsed = categoryInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }
  const [row] = db.insert(categoriesTable).values({ companyId, ...parsed.data }).returning().all();
  res.status(201).json(serialize(row));
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  const companyId = parseInt((req.params as Record<string, string>).companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = categoryInputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }
  const [row] = db.update(categoriesTable).set(parsed.data)
    .where(and(eq(categoriesTable.id, id), eq(categoriesTable.companyId, companyId))).returning().all();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(row));
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  const companyId = parseInt((req.params as Record<string, string>).companyId);
  const id = parseInt(req.params.id);
  if (isNaN(companyId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  db.delete(categoriesTable).where(and(eq(categoriesTable.id, id), eq(categoriesTable.companyId, companyId))).run();
  res.status(204).send();
});

export default router;
