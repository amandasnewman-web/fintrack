import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

const companyInputSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  taxId: z.string().optional(),
});

// GET /companies
router.get("/", async (req, res) => {
  const companies = await db.select().from(companiesTable).orderBy(companiesTable.id);
  res.json(companies.map((c) => ({
    id: c.id,
    name: c.name,
    address: c.address ?? null,
    phone: c.phone ?? null,
    email: c.email ?? null,
    taxId: c.taxId ?? null,
    createdAt: c.createdAt.toISOString(),
  })));
});

// POST /companies
router.post("/", async (req, res) => {
  const parsed = companyInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const { name, address, phone, email, taxId } = parsed.data;
  const [company] = await db.insert(companiesTable).values({ name, address, phone, email, taxId }).returning();
  res.status(201).json({
    id: company.id,
    name: company.name,
    address: company.address ?? null,
    phone: company.phone ?? null,
    email: company.email ?? null,
    taxId: company.taxId ?? null,
    createdAt: company.createdAt.toISOString(),
  });
});

// GET /companies/:id
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, id));
  if (!company) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    id: company.id,
    name: company.name,
    address: company.address ?? null,
    phone: company.phone ?? null,
    email: company.email ?? null,
    taxId: company.taxId ?? null,
    createdAt: company.createdAt.toISOString(),
  });
});

// PATCH /companies/:id
router.patch("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = companyInputSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const [company] = await db
    .update(companiesTable)
    .set(parsed.data)
    .where(eq(companiesTable.id, id))
    .returning();
  if (!company) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    id: company.id,
    name: company.name,
    address: company.address ?? null,
    phone: company.phone ?? null,
    email: company.email ?? null,
    taxId: company.taxId ?? null,
    createdAt: company.createdAt.toISOString(),
  });
});

export default router;
