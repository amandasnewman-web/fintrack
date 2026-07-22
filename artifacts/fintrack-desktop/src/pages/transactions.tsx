import { useState } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useListTransactions, useDeleteTransaction, getListTransactionsQueryKey, getListCategoriesQueryKey, useListCategories } from "../lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Edit2 } from "lucide-react";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import { useToast } from "@/hooks/use-toast";

export default function Transactions() {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  
  const params: any = {};
  if (typeFilter !== "all") params.type = typeFilter;
  if (categoryFilter !== "all") params.categoryId = Number(categoryFilter);

  const { data: transactionsData, isLoading } = useListTransactions(
    activeCompanyId as number,
    params,
    { query: { enabled: !!activeCompanyId, queryKey: getListTransactionsQueryKey(activeCompanyId as number, params) } }
  );

  const { data: categories } = useListCategories(
    activeCompanyId as number,
    { query: { enabled: !!activeCompanyId, queryKey: getListCategoriesQueryKey(activeCompanyId as number) } }
  );

  const deleteTransaction = useDeleteTransaction();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      deleteTransaction.mutate({ companyId: activeCompanyId as number, id }, {
        onSuccess: () => {
          toast({ title: "Transaction deleted" });
          queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(activeCompanyId as number) });
        }
      });
    }
  };

  if (!activeCompanyId) {
    return <div className="p-6 text-center text-muted-foreground">Please select a company.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">Manage your income and expenses</p>
        </div>
        <Button data-testid="btn-add-transaction" onClick={() => { setEditingTransaction(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Transaction
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : transactionsData?.items?.length ? (
            <div className="space-y-4">
              {transactionsData.items.map(t => (
                <div key={t.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{t.description}</div>
                    <div className="text-sm text-muted-foreground">{formatDate(t.date)} - {t.categoryName || 'Uncategorized'}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`font-semibold ${t.type === 'expense' ? 'text-destructive' : 'text-emerald-600'}`}>
                      {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                    </div>
                    <Button variant="ghost" size="icon" data-testid={`btn-edit-${t.id}`} onClick={() => { setEditingTransaction(t); setDialogOpen(true); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" data-testid={`btn-delete-${t.id}`} onClick={() => handleDelete(t.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">No transactions found.</div>
          )}
        </CardContent>
      </Card>

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} transaction={editingTransaction} />
    </div>
  );
}