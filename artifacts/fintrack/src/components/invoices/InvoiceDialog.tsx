import { useState, useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useCreateInvoice, useUpdateInvoice, getListInvoicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";

const lineItemSchema = z.object({
  description: z.string().min(1, "Required"),
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
});

const formSchema = z.object({
  invoiceNumber: z.string().optional().nullable(),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  clientAddress: z.string().optional().nullable(),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).default("draft"),
  lineItems: z.array(lineItemSchema).min(1, "At least one item is required"),
  taxRate: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

type InvoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: any | null;
};

export function InvoiceDialog({ open, onOpenChange, invoice }: InvoiceDialogProps) {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceNumber: "",
      clientName: "",
      clientEmail: "",
      clientAddress: "",
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "draft",
      lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
      taxRate: 0,
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  useEffect(() => {
    if (invoice) {
      form.reset({
        invoiceNumber: invoice.invoiceNumber || "",
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail || "",
        clientAddress: invoice.clientAddress || "",
        issueDate: invoice.issueDate.split("T")[0],
        dueDate: invoice.dueDate.split("T")[0],
        status: invoice.status,
        lineItems: invoice.lineItems || [{ description: "", quantity: 1, unitPrice: 0 }],
        taxRate: invoice.taxRate,
        notes: invoice.notes || "",
      });
    } else {
      form.reset({
        invoiceNumber: "",
        clientName: "",
        clientEmail: "",
        clientAddress: "",
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status: "draft",
        lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
        taxRate: 0,
        notes: "",
      });
    }
  }, [invoice, form, open]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (invoice) {
      updateInvoice.mutate({
        companyId: activeCompanyId as number,
        id: invoice.id,
        data: {
          ...values,
          invoiceNumber: values.invoiceNumber || undefined,
          clientEmail: values.clientEmail || undefined,
          clientAddress: values.clientAddress || undefined,
          notes: values.notes || undefined,
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey(activeCompanyId as number) });
          onOpenChange(false);
        }
      });
    } else {
      createInvoice.mutate({
        companyId: activeCompanyId as number,
        data: {
          ...values,
          invoiceNumber: values.invoiceNumber || undefined,
          clientEmail: values.clientEmail || undefined,
          clientAddress: values.clientAddress || undefined,
          notes: values.notes || undefined,
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey(activeCompanyId as number) });
          onOpenChange(false);
        }
      });
    }
  };

  const isPending = createInvoice.isPending || updateInvoice.isPending;
  const watchLineItems = form.watch("lineItems");
  const watchTaxRate = form.watch("taxRate");

  const subtotal = watchLineItems?.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0) || 0;
  const taxAmount = subtotal * (watchTaxRate / 100);
  const total = subtotal + taxAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? "Edit Invoice" : "Create Invoice"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="clientName" render={({ field }) => (
                <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input data-testid="input-client-name" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="clientEmail" render={({ field }) => (
                <FormItem><FormLabel>Client Email</FormLabel><FormControl><Input type="email" data-testid="input-client-email" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="issueDate" render={({ field }) => (
                <FormItem><FormLabel>Issue Date</FormLabel><FormControl><Input type="date" data-testid="input-issue-date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" data-testid="input-due-date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                <FormItem><FormLabel>Invoice Number (Optional)</FormLabel><FormControl><Input placeholder="INV-001" data-testid="input-invoice-num" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Line Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}>
                  <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>
              </div>
              
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-start">
                    <div className="flex-1">
                      <FormField control={form.control} name={`lineItems.${index}.description`} render={({ field }) => (
                        <FormItem><FormControl><Input placeholder="Description" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="w-24">
                      <FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field }) => (
                        <FormItem><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="w-32">
                      <FormField control={form.control} name={`lineItems.${index}.unitPrice`} render={({ field }) => (
                        <FormItem><FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <div className="w-24 py-2 font-medium text-right">
                      ${(watchLineItems[index]?.quantity * watchLineItems[index]?.unitPrice || 0).toFixed(2)}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-destructive mt-1" onClick={() => remove(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-muted-foreground">Tax Rate (%)</span>
                    <FormField control={form.control} name="taxRate" render={({ field }) => (
                      <FormItem className="w-20"><FormControl><Input type="number" step="0.1" min="0" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea data-testid="input-notes" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
            )} />

            <Button type="submit" className="w-full" disabled={isPending} data-testid="btn-submit-invoice">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {invoice ? "Update Invoice" : "Create Invoice"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
