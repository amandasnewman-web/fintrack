import { useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useListCompanies, useCreateCompany } from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListCompaniesQueryKey } from "@workspace/api-client-react";

export function Header() {
  const { activeCompanyId, setActiveCompanyId } = useCompany();
  const { data: companies = [], isLoading } = useListCompanies();
  const createCompany = useCreateCompany();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (companies.length > 0 && !activeCompanyId) {
      setActiveCompanyId(companies[0].id);
    }
  }, [companies, activeCompanyId, setActiveCompanyId]);

  const handleCreateDemoCompany = () => {
    createCompany.mutate(
      {
        data: {
          name: "Acme Corp",
          email: "hello@acme.com",
        },
      },
      {
        onSuccess: (newCompany) => {
          queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
          setActiveCompanyId(newCompany.id);
        },
      }
    );
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 no-print">
      <div className="flex items-center gap-4">
        {isLoading ? (
          <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
        ) : companies.length > 0 ? (
          <Select
            value={activeCompanyId?.toString()}
            onValueChange={(val) => setActiveCompanyId(Number(val))}
          >
            <SelectTrigger className="w-[200px]" data-testid="company-switcher">
              <SelectValue placeholder="Select Company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateDemoCompany}
            disabled={createCompany.isPending}
            data-testid="create-demo-company"
          >
            {createCompany.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="mr-2 h-4 w-4" />
            )}
            Create First Company
          </Button>
        )}
      </div>
      <div className="flex items-center">
        {/* User profile could go here */}
      </div>
    </header>
  );
}
