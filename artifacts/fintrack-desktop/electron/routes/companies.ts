import { Router } from "express";
import { getDb, companiesTable } from "../db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const companyInputSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  taxId: z.string().optional(),
});

function serialize(c: typeof companiesTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    address: c.address ?? null,
    phone: c.phone ?? null,
    email: c.email ?? null,
    taxId: c.taxId ?? null,
    createdAt: c.createdAt,
  };
}

router.get("/", (_req, res) => {
  const db = getDb();
  const companies = db.select().from(companiesTable).orderBy(companiesTable.id).all();
  res.json(companies.map(serialize));
});

router.post("/", (req, res) => {
  const db = getDb();
  const parsed = companyInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }
  const [company] = db.insert(companiesTable).values(parsed.data).returning().all();
  res.status(201).json(serialize(company));
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [company] = db.select().from(companiesTable).where(eq(companiesTable.id, id)).all();
  if (!company) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(company));
});

router.patch("/:id", (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = companyInputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }
  const [company] = db.update(companiesTable).set(parsed.data).where(eq(companiesTable.id, id)).returning().all();
  if (!company) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(company));
});

export default router;
