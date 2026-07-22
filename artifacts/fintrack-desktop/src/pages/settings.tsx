import { useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useGetCompany, useUpdateCompany, getGetCompanyQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  taxId: z.string().optional().nullable(),
});

export default function Settings() {
  const { activeCompanyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: company, isLoading } = useGetCompany(
    activeCompanyId as number,
    { query: { enabled: !!activeCompanyId, queryKey: getGetCompanyQueryKey(activeCompanyId as number) } }
  );

  const updateCompany = useUpdateCompany();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      taxId: "",
    },
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        address: company.address || "",
        phone: company.phone || "",
        email: company.email || "",
        taxId: company.taxId || "",
      });
    }
  }, [company, form]);

  if (!activeCompanyId) {
    return <div className="p-6 text-center text-muted-foreground">Please select a company.</div>;
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateCompany.mutate(
      {
        id: activeCompanyId as number,
        data: {
          name: values.name,
          address: values.address || undefined,
          phone: values.phone || undefined,
          email: values.email || undefined,
          taxId: values.taxId || undefined,
        },
      },
      {
        onSuccess: (updatedCompany) => {
          toast({ title: "Company updated successfully" });
          queryClient.setQueryData(getGetCompanyQueryKey(activeCompanyId as number), updatedCompany);
        },
        onError: () => {
          toast({ title: "Failed to update company", variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your company information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>Update your company's contact and legal information.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corp" data-testid="input-company-name" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="billing@acme.com" data-testid="input-company-email" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" data-testid="input-company-phone" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Business St, City, ST 12345" data-testid="input-company-address" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID / EIN</FormLabel>
                      <FormControl>
                        <Input placeholder="XX-XXXXXXX" data-testid="input-company-taxid" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={updateCompany.isPending} data-testid="button-save-settings">
                  {updateCompany.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
