import { useState, useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useCreateTransaction, useUpdateTransaction, useListCategories, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  type: z.enum(["expense", "deposit"]),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().min(1, "Description is required"),
  categoryId: z.coerce.number().optional().nullable(),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
});

type TransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: any | null;
};

export function TransactionDialog({ open, onOpenChange, transaction }: TransactionDialogProps) {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();

  const { data: categories } = useListCategories(
    activeCompanyId as number,
    { query: { enabled: !!activeCompanyId } }
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "expense",
      amount: 0,
      description: "",
      categoryId: null,
      date: new Date().toISOString().split("T")[0],
      notes: "",
      referenceNumber: "",
    },
  });

  useEffect(() => {
    if (transaction) {
      form.reset({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        categoryId: transaction.categoryId || null,
        date: transaction.date.split("T")[0],
        notes: transaction.notes || "",
        referenceNumber: transaction.referenceNumber || "",
      });
    } else {
      form.reset({
        type: "expense",
        amount: 0,
        description: "",
        categoryId: null,
        date: new Date().toISOString().split("T")[0],
        notes: "",
        referenceNumber: "",
      });
    }
  }, [transaction, form, open]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (transaction) {
      updateTransaction.mutate({
        companyId: activeCompanyId as number,
        id: transaction.id,
        data: {
          ...values,
          categoryId: values.categoryId || null,
          notes: values.notes || undefined,
          referenceNumber: values.referenceNumber || undefined,
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(activeCompanyId as number) });
          onOpenChange(false);
        }
      });
    } else {
      createTransaction.mutate({
        companyId: activeCompanyId as number,
        data: {
          ...values,
          categoryId: values.categoryId || undefined,
          notes: values.notes || undefined,
          referenceNumber: values.referenceNumber || undefined,
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(activeCompanyId as number) });
          onOpenChange(false);
        }
      });
    }
  };

  const isPending = createTransaction.isPending || updateTransaction.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-type"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="deposit">Deposit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl><Input type="number" step="0.01" data-testid="input-amount" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Input placeholder="Office Supplies" data-testid="input-description" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
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
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl><Input type="date" data-testid="input-date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="referenceNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Reference Number</FormLabel>
                <FormControl><Input placeholder="Receipt or Check #" data-testid="input-reference" {...field} value={field.value || ""} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" className="w-full" disabled={isPending} data-testid="btn-submit-transaction">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {transaction ? "Update Transaction" : "Save Transaction"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
