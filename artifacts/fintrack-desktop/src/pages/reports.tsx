import { useCompany } from "@/context/CompanyContext";
import { useGetReportSummary, useGetReportByCategory, useGetMonthlyReport, getGetReportSummaryQueryKey, getGetReportByCategoryQueryKey, getGetMonthlyReportQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2, Printer } from "lucide-react";

export default function Reports() {
  const { activeCompanyId } = useCompany();

  const { data: summary, isLoading: isLoadingSummary } = useGetReportSummary(
    activeCompanyId as number,
    {},
    { query: { enabled: !!activeCompanyId, queryKey: getGetReportSummaryQueryKey(activeCompanyId as number) } }
  );

  const { data: categoryData, isLoading: isLoadingCategories } = useGetReportByCategory(
    activeCompanyId as number,
    {},
    { query: { enabled: !!activeCompanyId, queryKey: getGetReportByCategoryQueryKey(activeCompanyId as number) } }
  );

  const { data: monthlyData, isLoading: isLoadingMonthly } = useGetMonthlyReport(
    activeCompanyId as number,
    {},
    { query: { enabled: !!activeCompanyId, queryKey: getGetMonthlyReportQueryKey(activeCompanyId as number) } }
  );

  if (!activeCompanyId) {
    return <div className="p-6 text-center text-muted-foreground">Please select a company.</div>;
  }

  const handlePrint = () => {
    window.print();
  };

  const chartMonths = monthlyData?.map(m => ({
    name: `${m.month}/${m.year}`,
    Income: m.totalIncome,
    Expenses: m.totalExpenses,
  })) || [];

  return (
    <div className="space-y-6 print-container">
      <div className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Financial summaries and insights</p>
        </div>
        <Button onClick={handlePrint} variant="outline" data-testid="btn-print">
          <Printer className="w-4 h-4 mr-2" /> Print PDF
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Income</CardTitle></CardHeader>
          <CardContent>
            {isLoadingSummary ? <Loader2 className="animate-spin w-4 h-4" /> : <div className="text-2xl font-bold text-emerald-600">{formatCurrency(summary?.totalIncome || 0)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Expenses</CardTitle></CardHeader>
          <CardContent>
            {isLoadingSummary ? <Loader2 className="animate-spin w-4 h-4" /> : <div className="text-2xl font-bold text-destructive">{formatCurrency(summary?.totalExpenses || 0)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Net Balance</CardTitle></CardHeader>
          <CardContent>
            {isLoadingSummary ? <Loader2 className="animate-spin w-4 h-4" /> : <div className="text-2xl font-bold">{formatCurrency(summary?.netBalance || 0)}</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Monthly Trends</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {isLoadingMonthly ? (
              <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin w-6 h-6" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartMonths}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                  <Bar dataKey="Income" fill="hsl(var(--chart-1))" />
                  <Bar dataKey="Expenses" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {isLoadingCategories ? (
              <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin w-6 h-6" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData?.filter(c => c.type === 'expense') || []}
                    cx="50%" cy="50%" outerRadius={80}
                    dataKey="total" nameKey="categoryName"
                  >
                    {categoryData?.filter(c => c.type === 'expense').map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || `hsl(var(--chart-${(index % 5) + 1}))`} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}