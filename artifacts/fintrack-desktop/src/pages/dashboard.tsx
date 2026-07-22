import { useCompany } from "@/context/CompanyContext";
import { useGetReportSummary, useListTransactions, useGetReportByCategory, getGetReportSummaryQueryKey, getListTransactionsQueryKey, getGetReportByCategoryQueryKey } from "../lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowDownIcon, ArrowUpIcon, Wallet, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { activeCompanyId } = useCompany();

  const { data: summary, isLoading: isLoadingSummary } = useGetReportSummary(
    activeCompanyId as number,
    {},
    { query: { enabled: !!activeCompanyId, queryKey: getGetReportSummaryQueryKey(activeCompanyId as number) } }
  );

  const { data: recentTransactions, isLoading: isLoadingTransactions } = useListTransactions(
    activeCompanyId as number,
    { limit: 10 },
    { query: { enabled: !!activeCompanyId, queryKey: getListTransactionsQueryKey(activeCompanyId as number, { limit: 10 }) } }
  );

  const { data: categoryData, isLoading: isLoadingCategories } = useGetReportByCategory(
    activeCompanyId as number,
    {},
    { query: { enabled: !!activeCompanyId, queryKey: getGetReportByCategoryQueryKey(activeCompanyId as number) } }
  );

  if (!activeCompanyId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Welcome to FinTrack</h2>
          <p className="text-muted-foreground">Please create or select a company to begin.</p>
        </div>
      </div>
    );
  }

  const expensesByCategory = categoryData?.filter(c => c.type === 'expense') || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your finances</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-[120px]" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summary?.netBalance || 0)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowUpIcon className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-[120px]" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(summary?.totalIncome || 0)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownIcon className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-[120px]" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{formatCurrency(summary?.totalExpenses || 0)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-[120px]" />
            ) : (
              <div className="text-2xl font-bold">{summary?.transactionCount || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentTransactions?.items?.length ? (
              <div className="space-y-4">
                {recentTransactions.items.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.date)} · {transaction.categoryName || "Uncategorized"}
                      </p>
                    </div>
                    <div className={`font-semibold ${transaction.type === 'expense' ? 'text-destructive' : 'text-emerald-600'}`}>
                      {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                No transactions yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            {isLoadingCategories ? (
              <Skeleton className="h-[300px] w-full" />
            ) : expensesByCategory.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="total"
                      nameKey="categoryName"
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || `hsl(var(--chart-${(index % 5) + 1}))`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No expense data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
