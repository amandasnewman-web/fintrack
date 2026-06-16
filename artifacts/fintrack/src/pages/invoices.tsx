import { useState } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useListInvoices, useDeleteInvoice, getListInvoicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Plus, Edit2, Trash2, Printer } from "lucide-react";
import { InvoiceDialog } from "@/components/invoices/InvoiceDialog";
import { useToast } from "@/hooks/use-toast";

export default function Invoices() {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);

  const { data: invoices, isLoading } = useListInvoices(
    activeCompanyId as number,
    {},
    { query: { enabled: !!activeCompanyId, queryKey: getListInvoicesQueryKey(activeCompanyId as number) } }
  );

  const deleteInvoice = useDeleteInvoice();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      deleteInvoice.mutate({ companyId: activeCompanyId as number, id }, {
        onSuccess: () => {
          toast({ title: "Invoice deleted" });
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey(activeCompanyId as number) });
        }
      });
    }
  };

  if (!activeCompanyId) {
    return <div className="p-6 text-center text-muted-foreground">Please select a company.</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20';
      case 'sent': return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      case 'overdue': return 'bg-destructive/10 text-destructive hover:bg-destructive/20';
      default: return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage your client invoices</p>
        </div>
        <Button data-testid="btn-create-invoice" onClick={() => { setEditingInvoice(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Create Invoice
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : invoices?.length ? (
            <div className="space-y-4">
              {invoices.map(inv => (
                <div key={inv.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{inv.invoiceNumber || 'Draft'} - {inv.clientName}</div>
                    <div className="text-sm text-muted-foreground">Due: {formatDate(inv.dueDate)}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getStatusColor(inv.status)} variant="outline">{inv.status}</Badge>
                    <div className="font-bold">{formatCurrency(inv.total)}</div>
                    <div className="flex gap-1 no-print">
                      <Button variant="ghost" size="icon" onClick={() => window.print()}><Printer className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditingInvoice(inv); setDialogOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(inv.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">No invoices found.</div>
          )}
        </CardContent>
      </Card>
      
      <InvoiceDialog open={dialogOpen} onOpenChange={setDialogOpen} invoice={editingInvoice} />
    </div>
  );
}