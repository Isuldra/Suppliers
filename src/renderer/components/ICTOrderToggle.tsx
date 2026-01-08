import React from 'react';
import { useTranslation } from 'react-i18next';
import { ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { useWarehouseFilter } from '../context/WarehouseFilterContext';

interface ICTOrderToggleProps {
  includeICTOrders: boolean;
  onToggle: (include: boolean) => void;
}

/**
 * ICT Order toggle component
 * Allows users to optionally include/exclude ICT orders (besttyp 70)
 * Only visible for DK data (same logic as warehouse filter)
 */
const ICTOrderToggle: React.FC<ICTOrderToggleProps> = ({ includeICTOrders, onToggle }) => {
  const { t } = useTranslation();
  const { showWarehouseFilter } = useWarehouseFilter();

  // Only show for DK data (same logic as warehouse filter)
  if (!showWarehouseFilter) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 backdrop-blur-md rounded-lg border border-blue-200 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ComputerDesktopIcon className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              {t('ictOrderToggle.title', 'ICT Orders (besttyp 70)')}
            </h3>
            <p className="text-xs text-slate-600">
              {t(
                'ictOrderToggle.description',
                'Include ICT Sweden orders (besttyp 70) in the results. Company code 87 orders are always excluded.'
              )}
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={includeICTOrders}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          <span className="ml-3 text-sm font-medium text-slate-700">
            {includeICTOrders
              ? t('ictOrderToggle.included', 'Included')
              : t('ictOrderToggle.excluded', 'Excluded')}
          </span>
        </label>
      </div>
    </div>
  );
};

export default ICTOrderToggle;
