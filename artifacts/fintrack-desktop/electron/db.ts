import Database from "better-sqlite3";
import path from "path";
import { app } from "electron";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

function getDbPath(): string {
  if (app.isPackaged) {
    return path.join(app.getPath("userData"), "fintrack.db");
  }
  return path.join(__dirname, "../../fintrack-dev.db");
}

export const companiesTable = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  taxId: text("tax_id"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const categoriesTable = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("both"),
  color: text("color"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const transactionsTable = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  notes: text("notes"),
  date: text("date").notNull(),
  referenceNumber: text("reference_number"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const invoicesTable = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientAddress: text("client_address"),
  issueDate: text("issue_date").notNull(),
  dueDate: text("due_date").notNull(),
  status: text("status").notNull().default("draft"),
  lineItems: text("line_items").notNull().default("[]"),
  taxRate: real("tax_rate").notNull().default(0),
  subtotal: real("subtotal").notNull().default(0),
  taxAmount: real("tax_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const receiptsTable = sqliteTable("receipts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull().references(() => companiesTable.id, { onDelete: "cascade" }),
  receiptNumber: text("receipt_number").notNull(),
  vendorName: text("vendor_name").notNull(),
  vendorEmail: text("vendor_email"),
  vendorAddress: text("vendor_address"),
  date: text("date").notNull(),
  categoryId: integer("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  lineItems: text("line_items").notNull().default("[]"),
  taxRate: real("tax_rate").notNull().default(0),
  subtotal: real("subtotal").notNull().default(0),
  taxAmount: real("tax_amount").notNull().default(0),
  total: real("total").notNull().default(0),
  notes: text("notes"),
  paymentMethod: text("payment_method"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;
  const sqlite = new Database(getDbPath());
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      tax_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'both',
      color TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      notes TEXT,
      date TEXT NOT NULL,
      reference_number TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      invoice_number TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_email TEXT,
      client_address TEXT,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      line_items TEXT NOT NULL DEFAULT '[]',
      tax_rate REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      receipt_number TEXT NOT NULL,
      vendor_name TEXT NOT NULL,
      vendor_email TEXT,
      vendor_address TEXT,
      date TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      line_items TEXT NOT NULL DEFAULT '[]',
      tax_rate REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      payment_method TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  _db = drizzle(sqlite, {
    schema: {
      companiesTable,
      categoriesTable,
      transactionsTable,
      invoicesTable,
      receiptsTable,
    },
  });
  return _db;
}
