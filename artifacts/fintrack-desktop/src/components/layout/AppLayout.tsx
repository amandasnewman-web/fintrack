import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
