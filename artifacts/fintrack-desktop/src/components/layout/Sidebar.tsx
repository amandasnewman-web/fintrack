import { Link, useLocation } from "wouter";
import { useCompany } from "@/context/CompanyContext";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Receipt, FileText, PieChart, Settings, Tags } from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Transactions", href: "/transactions", icon: Receipt },
    { name: "Categories", href: "/categories", icon: Tags },
    { name: "Invoices", href: "/invoices", icon: FileText },
    { name: "Receipts", href: "/receipts", icon: Receipt },
    { name: "Reports", href: "/reports", icon: PieChart },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground no-print">
      <div className="flex h-16 items-center px-6 font-bold text-xl tracking-tight text-primary">
        FinTrack
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              data-testid={`nav-${item.name.toLowerCase()}`}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-sidebar-primary"
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
