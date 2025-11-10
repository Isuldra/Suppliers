import React from 'react';
import { DashboardFilter } from '../../types/Dashboard';

interface DashboardFiltersProps {
  activeFilter: DashboardFilter | null;
  onFilterChange: (filter: DashboardFilter | null) => void;
  availablePlanners: string[];
  availableSuppliers: string[];
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  activeFilter,
  onFilterChange,
  availablePlanners,
  availableSuppliers,
}) => {
  const handlePlannerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      onFilterChange(null);
    } else {
      onFilterChange({
        type: 'planner',
        value,
        label: `Innkjøper: ${value}`,
      });
    }
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      onFilterChange(null);
    } else {
      onFilterChange({
        type: 'supplier',
        value,
        label: `Leverandør: ${value}`,
      });
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-4 mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        {availablePlanners.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-secondary">
              Filtrer på innkjøper:
            </label>
            <select
              value={activeFilter?.type === 'planner' ? activeFilter.value : ''}
              onChange={handlePlannerChange}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Filtrer på innkjøper"
            >
              <option value="">Alle innkjøpere</option>
              {availablePlanners.map((planner) => (
                <option key={planner} value={planner}>
                  {planner}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-neutral-secondary">
            Filtrer på leverandør:
          </label>
          <select
            value={activeFilter?.type === 'supplier' ? activeFilter.value : ''}
            onChange={handleSupplierChange}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Filtrer på leverandør"
          >
            <option value="">Alle leverandører</option>
            {availableSuppliers.map((supplier) => (
              <option key={supplier} value={supplier}>
                {supplier}
              </option>
            ))}
          </select>
        </div>

        {activeFilter && (
          <button
            onClick={() => onFilterChange(null)}
            className="px-3 py-2 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Fjern aktivt filter"
          >
            Fjern filter
          </button>
        )}

        {activeFilter && (
          <div className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
            {activeFilter.label}
          </div>
        )}
      </div>
    </div>
  );
};
