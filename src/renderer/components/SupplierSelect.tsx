import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExcelData } from '../types/ExcelData';

interface SupplierSelectProps {
  onSupplierSelected: (supplier: string) => void;
  currentSupplier?: string;
  excelData?: ExcelData;
  selectedWeekday?: string;
  selectedPlanner: string;
}

const SupplierSelect: React.FC<SupplierSelectProps> = ({
  onSupplierSelected,
  currentSupplier,
  // excelData, // Remove unused prop
  selectedWeekday,
  selectedPlanner,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(currentSupplier || '');

  // Get suppliers based on selected planner and weekday, filtered to only show those with outstanding orders
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  // Fetch suppliers with outstanding orders for the selected weekday (same logic as BulkSupplierSelect)
  useEffect(() => {
    const fetchSuppliers = async () => {
      if (!selectedWeekday || !selectedPlanner) {
        setSuppliers([]);
        return;
      }

      setIsLoadingSuppliers(true);
      try {
        // Get imported suppliers from database (Excel data is source of truth)
        const suppliersResponse = await window.electron.getSuppliersForWeekday(
          selectedWeekday,
          selectedPlanner
        );

        let weekdaySuppliers: string[] = [];
        if (
          suppliersResponse.success &&
          suppliersResponse.data &&
          suppliersResponse.data.length > 0
        ) {
          // Use imported suppliers from Excel as primary source
          weekdaySuppliers = suppliersResponse.data;
        }

        // Get outstanding orders to count per supplier (same as BulkSupplierSelect)
        const outstandingOrders = await window.electron.getAllOrders();

        // Filter to only include suppliers that have outstanding orders (same logic as BulkSupplierSelect)
        const suppliersWithOutstandingOrders = weekdaySuppliers.filter((supplier: string) => {
          const outstandingCount = outstandingOrders.filter(
            (order) => order.supplier === supplier
          ).length;
          return outstandingCount > 0;
        });

        setSuppliers(suppliersWithOutstandingOrders);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        setSuppliers([]);
      } finally {
        setIsLoadingSuppliers(false);
      }
    };

    fetchSuppliers();
  }, [selectedWeekday, selectedPlanner]);

  // Filter suppliers based on search term
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) {
      return suppliers;
    }

    const searchLower = searchTerm.toLowerCase();
    return suppliers.filter((supplier: string) => supplier.toLowerCase().includes(searchLower));
  }, [suppliers, searchTerm]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSupplierSelect = (supplier: string) => {
    setSelectedSupplier(supplier);
    // Automatically trigger the callback when supplier is selected
    onSupplierSelected(supplier);
  };

  // Auto-select if there's only one supplier after filtering
  useEffect(() => {
    if (filteredSuppliers.length === 1 && filteredSuppliers[0] !== selectedSupplier) {
      setSelectedSupplier(filteredSuppliers[0]);
      onSupplierSelected(filteredSuppliers[0]);
    }
  }, [filteredSuppliers, selectedSupplier, onSupplierSelected]);

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-4 text-neutral" id="supplier-select-heading">
        {t('supplierSelect.title')}
      </h2>

      <div
        className="mb-4 p-4 bg-primary-light bg-opacity-10 border border-primary-light rounded-md"
        aria-label={
          t('supplierSelect.planner') +
          ' ' +
          selectedPlanner +
          ' ' +
          t('supplierSelect.selectedWeekday') +
          ' ' +
          selectedWeekday
        }
      >
        <p className="text-primary">
          <span className="font-medium">{t('supplierSelect.planner')}</span> {selectedPlanner}
        </p>
        <p className="text-primary mt-1">
          <span className="font-medium">{t('supplierSelect.selectedWeekday')}</span>{' '}
          {selectedWeekday}
        </p>
        <p className="text-sm text-neutral-secondary mt-1">
          {t('supplierSelect.description', {
            weekday: selectedWeekday?.toLowerCase(),
          })}
        </p>
      </div>

      <div className="mb-6 w-full">
        <div className="flex mb-2 w-full">
          <label htmlFor="supplier-search" className="sr-only">
            {t('supplierSelect.searchPlaceholder')}
          </label>
          <input
            type="text"
            id="supplier-search"
            placeholder={t('supplierSelect.searchPlaceholder')}
            className="form-control w-full"
            value={searchTerm}
            onChange={handleSearch}
            aria-label={t('supplierSelect.searchPlaceholder')}
            aria-controls="supplier-list"
          />
        </div>

        <div className="bg-neutral-light p-4 rounded-md shadow-sm w-full">
          {isLoadingSuppliers ? (
            <p className="text-sm text-neutral-secondary mb-2" aria-live="polite">
              {t('supplierSelect.loadingSuppliers')}
            </p>
          ) : (
            <p className="text-sm text-neutral-secondary mb-2" aria-live="polite">
              {filteredSuppliers.length} {t('supplierSelect.suppliersFound')}
            </p>
          )}

          {isLoadingSuppliers ? (
            <p className="text-neutral-secondary italic" aria-live="polite">
              {t('supplierSelect.loading')}
            </p>
          ) : filteredSuppliers.length === 0 ? (
            <p className="text-neutral-secondary italic" aria-live="polite">
              {t('supplierSelect.noSuppliersFound')}
            </p>
          ) : (
            <div
              className="h-64 overflow-y-auto border border-neutral-light rounded-sm bg-neutral-white w-full"
              id="supplier-list"
              role="listbox"
              aria-labelledby="supplier-select-heading"
            >
              {filteredSuppliers.map((supplier: string) => (
                <button
                  key={supplier}
                  className={`w-full text-left p-3 border-b border-neutral-light hover:bg-neutral-light transition-default ${
                    selectedSupplier === supplier ? 'bg-primary-light bg-opacity-20' : ''
                  }`}
                  onClick={() => handleSupplierSelect(supplier)}
                  role="option"
                  aria-selected={selectedSupplier === supplier}
                >
                  {supplier}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierSelect;
