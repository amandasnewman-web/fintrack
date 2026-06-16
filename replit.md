# FinTrack - Multi-Company Finance Manager

A professional financial management app for tracking expenses, deposits, invoices, and receipts across 3 separate companies. Each company's data is fully isolated — switch between companies with the top selector.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/fintrack run dev` — run the frontend (port 23162)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TanStack Query, Recharts, shadcn/ui, Wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- **OpenAPI spec**: `lib/api-spec/openapi.yaml`
- **Generated hooks**: `lib/api-client-react/src/generated/`
- **Generated Zod schemas**: `lib/api-zod/src/generated/`
- **DB schema**: `lib/db/src/schema/` (companies, categories, transactions, invoices, receipts)
- **API routes**: `artifacts/api-server/src/routes/`
- **Frontend pages**: `artifacts/fintrack/src/pages/`
- **Company context**: `artifacts/fintrack/src/context/CompanyContext.tsx`

## Architecture decisions

- All data is scoped per company — every DB table has a `company_id` foreign key
- Company switcher is a React Context (CompanyContext) wrapping the entire app
- JSON line items stored in JSONB columns for invoices and receipts
- Reports computed server-side with SQL aggregations (no client-side math)
- `zod/v4` is externalized in esbuild config since it uses subpath exports
- PDF export uses `window.print()` with `@media print` CSS that hides nav/sidebar

## Product

- **Company Switcher**: Persistent dropdown in the header — only one company shows at a time
- **Transactions**: Track expenses and deposits with categories, dates, descriptions, reference numbers
- **Categories**: Custom categories per company with type (expense/deposit/both) and color coding
- **Reports**: Date-range filtered reports with pie charts (by category) and bar charts (monthly trends), PDF export
- **Invoices**: Create professional invoices with line items, tax calculation, status tracking (draft/sent/paid/overdue/cancelled), print to PDF
- **Receipts**: Document vendor receipts with line items, categories, payment methods, print to PDF
- **Settings**: Edit company info (name, address, phone, email, tax ID)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `zod/v4` must remain in the `external` list in `artifacts/api-server/build.mjs` — otherwise esbuild fails to bundle it
- Always re-run codegen after any OpenAPI spec changes: `pnpm --filter @workspace/api-spec run codegen`
- The orval config has `schemas` removed from the zod output to avoid TS2308 name collision on query params

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
