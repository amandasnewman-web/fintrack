# FinTrack - Multi-Company Finance Manager

  A professional financial management app for tracking expenses, deposits, invoices, and receipts across multiple companies. Built with React, Vite, Express, and PostgreSQL.

  ## Stack
  - Frontend: React + Vite, TanStack Query, Recharts, shadcn/ui, Wouter
  - API: Express 5
  - DB: PostgreSQL + Drizzle ORM
  - Monorepo: pnpm workspaces

  ## Getting Started
  1. Set the `DATABASE_URL` environment variable
  2. `pnpm install`
  3. `pnpm --filter @workspace/db run push`
  4. `pnpm --filter @workspace/api-server run dev` (port 8080)
  5. `pnpm --filter @workspace/fintrack run dev` (port varies)
  