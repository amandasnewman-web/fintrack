import { useState, useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useCreateReceipt, useUpdateReceipt, useListCategories, getListReceiptsQueryKey } from "../../lib/api-client";
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
  receiptNumber: z.string().optional().nullable(),
  vendorName: z.string().min(1, "Vendor name is required"),
  vendorEmail: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  vendorAddress: z.string().optional().nullable(),
  date: z.string().min(1, "Date is required"),
  categoryId: z.coerce.number().optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1, "At least one item is required"),
  taxRate: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
});

type ReceiptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt?: any | null;
};

export function ReceiptDialog({ open, onOpenChange, receipt }: ReceiptDialogProps) {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const createReceipt = useCreateReceipt();
  const updateReceipt = useUpdateReceipt();

  const { data: categories } = useListCategories(
    activeCompanyId as number,
    { query: { enabled: !!activeCompanyId } }
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      receiptNumber: "",
      vendorName: "",
      vendorEmail: "",
      vendorAddress: "",
      date: new Date().toISOString().split("T")[0],
      categoryId: null,
      lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
      taxRate: 0,
      notes: "",
      paymentMethod: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  useEffect(() => {
    if (receipt) {
      form.reset({
        receiptNumber: receipt.receiptNumber || "",
        vendorName: receipt.vendorName,
        vendorEmail: receipt.vendorEmail || "",
        vendorAddress: receipt.vendorAddress || "",
        date: receipt.date.split("T")[0],
        categoryId: receipt.categoryId || null,
        lineItems: receipt.lineItems || [{ description: "", quantity: 1, unitPrice: 0 }],
        taxRate: receipt.taxRate,
        notes: receipt.notes || "",
        paymentMethod: receipt.paymentMethod || "",
      });
    } else {
      form.reset({
        receiptNumber: "",
        vendorName: "",
        vendorEmail: "",
        vendorAddress: "",
        date: new Date().toISOString().split("T")[0],
        categoryId: null,
        lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
        taxRate: 0,
        notes: "",
        paymentMethod: "",
      });
    }
  }, [receipt, form, open]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const payload = {
      ...values,
      receiptNumber: values.receiptNumber || undefined,
      vendorEmail: values.vendorEmail || undefined,
      vendorAddress: values.vendorAddress || undefined,
      categoryId: values.categoryId || undefined,
      notes: values.notes || undefined,
      paymentMethod: values.paymentMethod || undefined,
    };

    if (receipt) {
      updateReceipt.mutate({
        companyId: activeCompanyId as number,
        id: receipt.id,
        data: payload
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey(activeCompanyId as number) });
          onOpenChange(false);
        }
      });
    } else {
      createReceipt.mutate({
        companyId: activeCompanyId as number,
        data: payload as any
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey(activeCompanyId as number) });
          onOpenChange(false);
        }
      });
    }
  };

  const isPending = createReceipt.isPending || updateReceipt.isPending;
  const watchLineItems = form.watch("lineItems");
  const watchTaxRate = form.watch("taxRate");

  const subtotal = watchLineItems?.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0) || 0;
  const taxAmount = subtotal * (watchTaxRate / 100);
  const total = subtotal + taxAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{receipt ? "Edit Receipt" : "Add Receipt"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="vendorName" render={({ field }) => (
                <FormItem><FormLabel>Vendor Name</FormLabel><FormControl><Input data-testid="input-vendor-name" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" data-testid="input-date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="categoryId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value ? field.value.toString() : ""} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-category"><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                <FormItem><FormLabel>Payment Method</FormLabel><FormControl><Input placeholder="Credit Card, Cash, etc." data-testid="input-payment" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
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

            <Button type="submit" className="w-full" disabled={isPending} data-testid="btn-submit-receipt">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {receipt ? "Update Receipt" : "Save Receipt"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
