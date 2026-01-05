import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Warehouse filter options for Danish (DK) data
 * - '80': Show only warehouse 80 (default)
 * - '87': Show only warehouse 87
 * - 'all': Show both warehouses
 */
export type WarehouseFilter = '80' | '87' | 'all';

interface WarehouseFilterContextType {
  /** Current warehouse filter selection */
  warehouseFilter: WarehouseFilter;
  /** Set the warehouse filter */
  setWarehouseFilter: (filter: WarehouseFilter) => void;
  /** Whether the warehouse filter should be shown (only for DK data) */
  showWarehouseFilter: boolean;
  /** The detected country from imported data */
  detectedCountry: string | null;
  /** Refresh country detection (call after file import) */
  refreshCountryDetection: () => Promise<void>;
}

const WarehouseFilterContext = createContext<WarehouseFilterContextType | undefined>(undefined);

const STORAGE_KEY = 'dk-warehouse-filter';

export const WarehouseFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from localStorage, default to '80'
  const [warehouseFilter, setWarehouseFilterState] = useState<WarehouseFilter>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === '80' || stored === '87' || stored === 'all') {
        return stored;
      }
    } catch {
      // Ignore localStorage errors
    }
    return '80';
  });

  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  // Persist filter to localStorage
  const setWarehouseFilter = useCallback((filter: WarehouseFilter) => {
    setWarehouseFilterState(filter);
    try {
      localStorage.setItem(STORAGE_KEY, filter);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Detect country from database
  const refreshCountryDetection = useCallback(async () => {
    try {
      console.log('🌍 refreshCountryDetection: Calling getPredominantCountry...');
      const result = await window.electron.getPredominantCountry();
      console.log('🌍 refreshCountryDetection: Result =', result);
      if (result.success && result.data) {
        console.log('🌍 refreshCountryDetection: Setting detectedCountry to', result.data);
        setDetectedCountry(result.data);
      } else {
        console.log('🌍 refreshCountryDetection: No country detected, setting to null');
        setDetectedCountry(null);
      }
    } catch (error) {
      console.error('🌍 refreshCountryDetection: Failed to detect country:', error);
      setDetectedCountry(null);
    }
  }, []);

  // Initial country detection
  useEffect(() => {
    refreshCountryDetection();
  }, [refreshCountryDetection]);

  // Only show warehouse filter for DK data
  const showWarehouseFilter = detectedCountry === 'DK';

  const value = useMemo(
    () => ({
      warehouseFilter,
      setWarehouseFilter,
      showWarehouseFilter,
      detectedCountry,
      refreshCountryDetection,
    }),
    [
      warehouseFilter,
      setWarehouseFilter,
      showWarehouseFilter,
      detectedCountry,
      refreshCountryDetection,
    ]
  );

  return (
    <WarehouseFilterContext.Provider value={value}>{children}</WarehouseFilterContext.Provider>
  );
};

export const useWarehouseFilter = (): WarehouseFilterContextType => {
  const context = useContext(WarehouseFilterContext);
  if (context === undefined) {
    throw new Error('useWarehouseFilter must be used within a WarehouseFilterProvider');
  }
  return context;
};
