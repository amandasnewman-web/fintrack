import { useState } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useListCategories, useDeleteCategory, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit2, Trash2 } from "lucide-react";
import { CategoryDialog } from "@/components/categories/CategoryDialog";
import { useToast } from "@/hooks/use-toast";

export default function Categories() {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const { data: categories, isLoading } = useListCategories(
    activeCompanyId as number,
    { query: { enabled: !!activeCompanyId, queryKey: getListCategoriesQueryKey(activeCompanyId as number) } }
  );

  const deleteCategory = useDeleteCategory();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteCategory.mutate({ companyId: activeCompanyId as number, id }, {
        onSuccess: () => {
          toast({ title: "Category deleted" });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey(activeCompanyId as number) });
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
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage your transaction categories</p>
        </div>
        <Button data-testid="btn-add-category" onClick={() => { setEditingCategory(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : categories?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(c => (
                <div key={c.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color || '#ccc' }} />
                    <span className="font-medium">{c.name}</span>
                    <Badge variant="outline">{c.type}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(c); setDialogOpen(true); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">No categories found.</div>
          )}
        </CardContent>
      </Card>

      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editingCategory} />
    </div>
  );
}