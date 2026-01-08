import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface ICTOrderContextType {
  /** Whether to include ICT orders (besttyp 70) */
  includeICTOrders: boolean;
  /** Set whether to include ICT orders */
  setIncludeICTOrders: (include: boolean) => void;
}

const ICTOrderContext = createContext<ICTOrderContextType | undefined>(undefined);

const STORAGE_KEY = 'ict-orders-included';

export const ICTOrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from localStorage, default to false (exclude ICT orders)
  const [includeICTOrders, setIncludeICTOrdersState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    } catch {
      // Ignore localStorage errors
    }
    return false;
  });

  // Persist filter to localStorage
  const setIncludeICTOrders = useCallback((include: boolean) => {
    setIncludeICTOrdersState(include);
    try {
      localStorage.setItem(STORAGE_KEY, String(include));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const value = useMemo(
    () => ({
      includeICTOrders,
      setIncludeICTOrders,
    }),
    [includeICTOrders, setIncludeICTOrders]
  );

  return <ICTOrderContext.Provider value={value}>{children}</ICTOrderContext.Provider>;
};

export const useICTOrder = (): ICTOrderContextType => {
  const context = useContext(ICTOrderContext);
  if (context === undefined) {
    throw new Error('useICTOrder must be used within an ICTOrderProvider');
  }
  return context;
};
