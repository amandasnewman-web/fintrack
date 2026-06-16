import { useState } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useListReceipts, useDeleteReceipt, getListReceiptsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import { ReceiptDialog } from "@/components/receipts/ReceiptDialog";
import { useToast } from "@/hooks/use-toast";

export default function Receipts() {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<any>(null);

  const { data: receipts, isLoading } = useListReceipts(
    activeCompanyId as number,
    {},
    { query: { enabled: !!activeCompanyId, queryKey: getListReceiptsQueryKey(activeCompanyId as number) } }
  );

  const deleteReceipt = useDeleteReceipt();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this receipt?")) {
      deleteReceipt.mutate({ companyId: activeCompanyId as number, id }, {
        onSuccess: () => {
          toast({ title: "Receipt deleted" });
          queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey(activeCompanyId as number) });
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
          <h1 className="text-3xl font-bold tracking-tight">Receipts</h1>
          <p className="text-muted-foreground">Manage your expense receipts</p>
        </div>
        <Button data-testid="btn-add-receipt" onClick={() => { setEditingReceipt(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Receipt
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : receipts?.length ? (
            <div className="space-y-4">
              {receipts.map(rec => (
                <div key={rec.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{rec.vendorName}</div>
                    <div className="text-sm text-muted-foreground">{formatDate(rec.date)} - {rec.receiptNumber || 'No receipt #'}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-bold">{formatCurrency(rec.total)}</div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingReceipt(rec); setDialogOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(rec.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">No receipts found.</div>
          )}
        </CardContent>
      </Card>
      
      <ReceiptDialog open={dialogOpen} onOpenChange={setDialogOpen} receipt={editingReceipt} />
    </div>
  );
}