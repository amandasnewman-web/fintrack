import { useState, useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useCreateCategory, useUpdateCategory, getListCategoriesQueryKey } from "../../lib/api-client";
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
  name: z.string().min(1, "Name is required"),
  type: z.enum(["expense", "deposit", "both"]),
  color: z.string().optional().nullable(),
});

type CategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: any | null;
};

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "expense",
      color: "#6b7280",
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        type: category.type,
        color: category.color || "#6b7280",
      });
    } else {
      form.reset({
        name: "",
        type: "expense",
        color: "#6b7280",
      });
    }
  }, [category, form, open]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (category) {
      updateCategory.mutate({
        companyId: activeCompanyId as number,
        id: category.id,
        data: {
          ...values,
          color: values.color || undefined,
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey(activeCompanyId as number) });
          onOpenChange(false);
        }
      });
    } else {
      createCategory.mutate({
        companyId: activeCompanyId as number,
        data: {
          ...values,
          color: values.color || undefined,
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey(activeCompanyId as number) });
          onOpenChange(false);
        }
      });
    }
  };

  const isPending = createCategory.isPending || updateCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Category Name</FormLabel>
                <FormControl><Input placeholder="e.g. Software Subscriptions" data-testid="input-cat-name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger data-testid="select-cat-type"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              
              <FormField control={form.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input type="color" className="w-12 p-1 h-10" {...field} value={field.value || "#000000"} />
                      <Input type="text" className="flex-1" {...field} value={field.value || ""} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Button type="submit" className="w-full" disabled={isPending} data-testid="btn-submit-category">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {category ? "Update Category" : "Save Category"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
