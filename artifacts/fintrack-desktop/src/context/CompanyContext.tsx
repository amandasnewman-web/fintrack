import { createContext, useContext, useState, ReactNode } from "react";

export const CompanyContext = createContext<{
  activeCompanyId: number | null;
  setActiveCompanyId: (id: number) => void;
}>({ activeCompanyId: null, setActiveCompanyId: () => {} });

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);
  
  return (
    <CompanyContext.Provider value={{ activeCompanyId, setActiveCompanyId }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
