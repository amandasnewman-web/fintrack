import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CompanyProvider } from "@/context/CompanyContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/dashboard";
import Transactions from "@/pages/transactions";
import Categories from "@/pages/categories";
import Reports from "@/pages/reports";
import Invoices from "@/pages/invoices";
import Receipts from "@/pages/receipts";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/categories" component={Categories} />
        <Route path="/reports" component={Reports} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/receipts" component={Receipts} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CompanyProvider>
        <TooltipProvider>
          <WouterRouter base="">
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </CompanyProvider>
    </QueryClientProvider>
  );
}

export default App;
