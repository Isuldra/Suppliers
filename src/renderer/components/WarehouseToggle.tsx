// TODO: Unfinished feature — not mounted anywhere. See docs/planning/.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useWarehouseFilter, type WarehouseFilter } from '../context/WarehouseFilterContext';
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';

/**
 * Warehouse toggle component for Danish (DK) data
 * Allows users to switch between viewing L80, L87, or both warehouses
 * Only visible when DK data is loaded
 */
const WarehouseToggle: React.FC = () => {
  const { t } = useTranslation();
  const { warehouseFilter, setWarehouseFilter, showWarehouseFilter } = useWarehouseFilter();

  // Only show for DK data
  if (!showWarehouseFilter) {
    return null;
  }

  const options: { value: WarehouseFilter; labelKey: string }[] = [
    { value: '80', labelKey: 'warehouseFilter.warehouse80' },
    { value: '87', labelKey: 'warehouseFilter.warehouse87' },
    { value: 'all', labelKey: 'warehouseFilter.both' },
  ];

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 backdrop-blur-md rounded-lg border border-amber-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <BuildingStorefrontIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-0.5">
              {t('warehouseFilter.title')}
            </h3>
            <p className="text-sm text-slate-600">{t('warehouseFilter.description')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => setWarehouseFilter(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                warehouseFilter === option.value
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-amber-300 hover:bg-amber-50'
              }`}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WarehouseToggle;
