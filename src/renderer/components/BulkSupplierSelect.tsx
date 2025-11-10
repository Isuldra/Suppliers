import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { ExcelRow } from '../types/ExcelData';
import supplierData from '../data/supplierData.json';
import SelectToggleButton from './SelectToggleButton';

interface BulkSupplierSelectProps {
  onSuppliersSelected: (suppliers: string[]) => void;
  onOrderLinesSelected?: (supplier: string, orderKeys: Set<string>) => void;
  onSupplierEmailChange?: (supplier: string, email: string) => void;
  selectedWeekday: string;
  selectedPlanner: string;
  selectedSuppliers: string[];
  bulkSupplierEmails?: Map<string, string>;
}

interface SupplierInfo {
  leverandør: string;
  companyId: number;
  epost: string;
  språk: string;
  språkKode: 'NO' | 'ENG';
  purredag: string;
}

interface SupplierWithDetails {
  supplier: string;
  outstandingCount: number;
  email: string;
  language: string;
  languageCode: 'NO' | 'ENG';
  isExpanded: boolean;
}

const BulkSupplierSelect: React.FC<BulkSupplierSelectProps> = ({
  onSuppliersSelected,
  onOrderLinesSelected,
  onSupplierEmailChange,
  selectedWeekday,
  selectedPlanner,
  selectedSuppliers,
  bulkSupplierEmails,
}) => {
  const { t } = useTranslation();
  console.log('🟡 BulkSupplierSelect: Component rendered with props:', {
    selectedWeekday,
    selectedPlanner,
    selectedSuppliers,
    onSuppliersSelected: typeof onSuppliersSelected,
  });
  const [suppliers, setSuppliers] = useState<SupplierWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());
  const [supplierEmails, setSupplierEmails] = useState<Map<string, string>>(new Map());
  const [excludedOrderLines, setExcludedOrderLines] = useState<Set<string>>(new Set());
  const [userHasManuallySelected, setUserHasManuallySelected] = useState(false);
  const [supplierOrders, setSupplierOrders] = useState<Map<string, ExcelRow[]>>(new Map());

  // Get supplier info from supplierData.json
  const getSupplierInfo = (supplierName: string): SupplierInfo | null => {
    const supplier = supplierData.leverandører.find((s) => s.leverandør === supplierName);
    return supplier
      ? {
          ...supplier,
          språkKode: supplier.språkKode as 'NO' | 'ENG',
        }
      : null;
  };

  // Fetch suppliers with outstanding orders for the selected weekday
  useEffect(() => {
    const fetchSuppliers = async () => {
      console.log('🟠 BulkSupplierSelect: fetchSuppliers called with:', {
        selectedWeekday,
        selectedPlanner,
      });
      setIsLoading(true);
      try {
        // Get imported suppliers from database (Excel data is source of truth)
        const suppliersResponse = await window.electron.getSuppliersForWeekday(
          selectedWeekday,
          selectedPlanner
        );

        console.log('🟠 Suppliers response:', suppliersResponse);

        let weekdaySuppliers: string[] = [];
        if (
          suppliersResponse.success &&
          suppliersResponse.data &&
          suppliersResponse.data.length > 0
        ) {
          // Use imported suppliers from Excel as primary source
          weekdaySuppliers = suppliersResponse.data;
        }
        // No fallback to hardcoded data - Excel is the only source of truth

        console.log('🟠 Final weekday suppliers:', weekdaySuppliers);

        // Get outstanding orders to count per supplier
        const outstandingOrders = await window.electron.getAllOrders();
        console.log('🟠 Outstanding orders:', outstandingOrders);

        // Create supplier details with counts
        const suppliersWithDetails: SupplierWithDetails[] = weekdaySuppliers
          .map((supplier: string) => {
            const supplierInfo = getSupplierInfo(supplier);
            const outstandingCount = outstandingOrders.filter(
              (order) => order.supplier === supplier
            ).length;

            return {
              supplier,
              outstandingCount,
              email: supplierInfo?.epost || '',
              language: supplierInfo?.språk || 'Norsk',
              languageCode: supplierInfo?.språkKode || 'NO',
              isExpanded: expandedSuppliers.has(supplier),
            };
          })
          .filter((s) => s.outstandingCount > 0) // Only show suppliers with outstanding orders
          .sort((a, b) => a.supplier.localeCompare(b.supplier));

        console.log('🟠 Final suppliers with details:', suppliersWithDetails);
        setSuppliers(suppliersWithDetails);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        setSuppliers([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedWeekday && selectedPlanner) {
      fetchSuppliers();
    }
  }, [selectedWeekday, selectedPlanner]);

  // Debug effect to track selectedSuppliers prop changes
  useEffect(() => {
    console.log('🟡 BulkSupplierSelect: selectedSuppliers prop changed to:', selectedSuppliers);
    console.log('🟡 selectedSuppliers length:', selectedSuppliers.length);
  }, [selectedSuppliers]);

  // Handle select all suppliers
  const handleSelectAll = () => {
    const allSupplierNames = suppliers.map((s) => s.supplier);
    const newSelection = selectedSuppliers.length === suppliers.length ? [] : allSupplierNames;
    setUserHasManuallySelected(true); // Mark that user has manually selected
    onSuppliersSelected(newSelection);
  };

  // Auto-select all suppliers when suppliers change (new weekday selected)
  // But only if user hasn't manually selected anything yet
  useEffect(() => {
    if (suppliers.length > 0 && !userHasManuallySelected) {
      const allSupplierNames = suppliers.map((s) => s.supplier);
      // Only auto-select if the current selection is different
      if (JSON.stringify(selectedSuppliers.sort()) !== JSON.stringify(allSupplierNames.sort())) {
        onSuppliersSelected(allSupplierNames);
      }
    }
  }, [suppliers, selectedSuppliers, onSuppliersSelected, userHasManuallySelected]);

  // Send filtered order lines to parent component
  useEffect(() => {
    if (onOrderLinesSelected && selectedSuppliers.length > 0) {
      selectedSuppliers.forEach((supplier) => {
        const orders = supplierOrders.get(supplier) || [];
        const filteredOrderKeys = new Set(
          orders
            .filter((order) => !excludedOrderLines.has(order.key || ''))
            .map((order) => order.key || '')
        );
        onOrderLinesSelected(supplier, filteredOrderKeys);
      });
    }
  }, [selectedSuppliers, excludedOrderLines, supplierOrders]);

  // Handle individual supplier selection
  const handleSupplierSelect = (supplier: string) => {
    console.log('🔵 BulkSupplierSelect: handleSupplierSelect called with:', supplier);
    console.log('🔵 Current selectedSuppliers:', selectedSuppliers);
    console.log('🔵 selectedSuppliers type:', typeof selectedSuppliers);
    console.log('🔵 selectedSuppliers is array:', Array.isArray(selectedSuppliers));

    // Create a completely new array to ensure immutability
    const currentSelection = [...selectedSuppliers];
    const isCurrentlySelected = currentSelection.includes(supplier);

    console.log('🔵 Is currently selected:', isCurrentlySelected);

    const newSelection = isCurrentlySelected
      ? currentSelection.filter((s) => s !== supplier)
      : [...currentSelection, supplier];

    // Remove any duplicates to prevent counting issues
    const uniqueSelection = [...new Set(newSelection)];

    console.log('🔵 New selection will be:', uniqueSelection);
    console.log('🔵 New selection length:', uniqueSelection.length);
    console.log('🔵 Calling onSuppliersSelected with:', uniqueSelection);

    // Mark that user has manually selected
    setUserHasManuallySelected(true);

    // Force a small delay to see if it's a timing issue
    setTimeout(() => {
      onSuppliersSelected(uniqueSelection);
    }, 0);
  };

  // Handle expanding supplier details
  const handleExpandSupplier = (supplier: string) => {
    const newExpanded = new Set(expandedSuppliers);
    if (newExpanded.has(supplier)) {
      newExpanded.delete(supplier);
    } else {
      newExpanded.add(supplier);
    }
    setExpandedSuppliers(newExpanded);
  };

  // Handle email editing
  const handleEmailChange = (supplier: string, email: string) => {
    setSupplierEmails(new Map(supplierEmails.set(supplier, email)));
    // Also notify parent component
    if (onSupplierEmailChange) {
      onSupplierEmailChange(supplier, email);
    }
  };

  // Check for mixed languages
  const selectedSuppliersInfo = suppliers.filter((s) => selectedSuppliers.includes(s.supplier));
  const hasMixedLanguages = useMemo(() => {
    if (selectedSuppliersInfo.length <= 1) return false;
    const languages = new Set(selectedSuppliersInfo.map((s) => s.languageCode));
    return languages.size > 1;
  }, [selectedSuppliersInfo]);

  // Get outstanding orders for a specific supplier

  const fetchSupplierOrders = async (supplier: string) => {
    try {
      const allOrders = await window.electron.getAllOrders();
      const filteredOrders = allOrders.filter((order) => order.supplier === supplier);
      setSupplierOrders(
        new Map(supplierOrders.set(supplier, filteredOrders as unknown as ExcelRow[]))
      );
    } catch (error) {
      console.error('Error fetching orders for supplier:', error);
    }
  };

  const handleExpandWithOrders = (supplier: string) => {
    handleExpandSupplier(supplier);
    if (!expandedSuppliers.has(supplier)) {
      fetchSupplierOrders(supplier);
    }
  };

  // Handle excluding specific order lines
  const handleOrderLineExclusion = (orderKey: string) => {
    setExcludedOrderLines((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderKey)) {
        newSet.delete(orderKey);
      } else {
        newSet.add(orderKey);
      }
      return newSet;
    });
  };

  // Get count of non-excluded orders for a supplier
  const getNonExcludedOrderCount = (supplier: string): number => {
    const orders = supplierOrders.get(supplier) || [];
    return orders.filter((order) => !excludedOrderLines.has(order.key || '')).length;
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-neutral-secondary">{t('bulkSupplierSelect.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 p-4 bg-primary-light bg-opacity-10 border border-primary-light rounded-md">
        <p className="text-primary">
          <span className="font-medium">{t('bulkSupplierSelect.planner')}</span> {selectedPlanner}
        </p>
        <p className="text-primary mt-1">
          <span className="font-medium">{t('bulkSupplierSelect.selectedWeekday')}</span>{' '}
          {selectedWeekday}
        </p>
        <p className="text-sm text-neutral-secondary mt-1">{t('bulkSupplierSelect.description')}</p>
      </div>

      {/* Language warning */}
      {hasMixedLanguages && selectedSuppliers.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                {t('bulkSupplierSelect.mixedLanguageWarning')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Select all button */}
      <div className="mb-4 flex items-center gap-2">
        <SelectToggleButton
          isSelected={selectedSuppliers.length === suppliers.length}
          onToggle={handleSelectAll}
          selectLabelKey="bulkSupplierSelect.selectAll"
          removeLabelKey="bulkSupplierSelect.removeAll"
          size="md"
        />
        <span className="ml-2 text-sm text-neutral-secondary">
          {selectedSuppliers.length} av {suppliers.length}{' '}
          {t('bulkSupplierSelect.suppliersSelected')}
        </span>
      </div>

      {/* Suppliers table */}
      <div className="bg-neutral-white border border-neutral-light rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-light">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral">
                  {t('bulkSupplierSelect.tableHeaders.select')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral">
                  {t('bulkSupplierSelect.tableHeaders.supplier')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral">
                  {t('bulkSupplierSelect.tableHeaders.outstandingLines')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral">
                  {t('bulkSupplierSelect.tableHeaders.email')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral">
                  {t('bulkSupplierSelect.tableHeaders.language')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral">
                  {t('bulkSupplierSelect.tableHeaders.details')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-light">
              {suppliers.map((supplier) => {
                console.log('🟣 Rendering supplier row for:', supplier.supplier);
                return (
                  <React.Fragment key={supplier.supplier}>
                    <tr className="hover:bg-neutral-light bg-opacity-50">
                      <td className="px-4 py-3">
                        <SelectToggleButton
                          isSelected={selectedSuppliers.includes(supplier.supplier)}
                          onToggle={() => handleSupplierSelect(supplier.supplier)}
                          selectLabelKey="bulkSupplierSelect.select"
                          removeLabelKey="bulkSupplierSelect.unselect"
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-neutral">
                        {supplier.supplier}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-light text-white">
                          {supplierOrders.has(supplier.supplier)
                            ? getNonExcludedOrderCount(supplier.supplier)
                            : supplier.outstandingCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="email"
                          value={
                            bulkSupplierEmails?.get(supplier.supplier) ||
                            supplierEmails.get(supplier.supplier) ||
                            supplier.email
                          }
                          onChange={(e) => handleEmailChange(supplier.supplier, e.target.value)}
                          className="form-control text-sm w-full min-w-64"
                          placeholder={t('bulkSupplierSelect.tableHeaders.email')}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            supplier.languageCode === 'NO'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {supplier.language}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleExpandWithOrders(supplier.supplier)}
                          className="flex items-center text-primary hover:text-primary-dark transition-colors"
                        >
                          {expandedSuppliers.has(supplier.supplier) ? (
                            <>
                              <ChevronDownIcon className="h-4 w-4 mr-1" />
                              {t('bulkSupplierSelect.show')}
                            </>
                          ) : (
                            <>
                              <ChevronRightIcon className="h-4 w-4 mr-1" />
                              {t('bulkSupplierSelect.show')}
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                    {/* Expanded row with order details */}
                    {expandedSuppliers.has(supplier.supplier) && (
                      <tr className="bg-neutral-light bg-opacity-30">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="bg-neutral-white rounded-md border border-neutral-light p-4">
                            <h4 className="text-sm font-medium text-neutral mb-3">
                              {t('bulkSupplierSelect.outstandingOrdersFor', {
                                supplier: supplier.supplier,
                              })}
                            </h4>
                            {supplierOrders.get(supplier.supplier) ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-neutral-light">
                                      <th className="text-left py-2 px-2">
                                        {t('bulkDataReview.tableHeaders.select')}
                                      </th>
                                      <th className="text-left py-2 px-2">
                                        {t('bulkDataReview.tableHeaders.poNumber')}
                                      </th>
                                      <th className="text-left py-2 px-2">
                                        {t('bulkDataReview.tableHeaders.oneMedNumber')}
                                      </th>
                                      <th className="text-left py-2 px-2">
                                        {t('bulkDataReview.tableHeaders.description')}
                                      </th>
                                      <th className="text-left py-2 px-2">
                                        {t('bulkDataReview.tableHeaders.ordered')}
                                      </th>
                                      <th className="text-left py-2 px-2">
                                        {t('bulkDataReview.tableHeaders.received')}
                                      </th>
                                      <th className="text-left py-2 px-2">
                                        {t('bulkDataReview.tableHeaders.outstanding')}
                                      </th>
                                      <th className="text-left py-2 px-2">
                                        {t('bulkDataReview.tableHeaders.eta')}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {supplierOrders
                                      .get(supplier.supplier)
                                      ?.map((order: ExcelRow, index: number) => (
                                        <tr
                                          key={order.key || index}
                                          className={`border-b border-neutral-light ${
                                            excludedOrderLines.has(order.key || '')
                                              ? 'bg-gray-100 opacity-60'
                                              : ''
                                          }`}
                                        >
                                          <td className="py-2 px-2">
                                            <input
                                              type="checkbox"
                                              checked={!excludedOrderLines.has(order.key || '')}
                                              onChange={() =>
                                                handleOrderLineExclusion(order.key || '')
                                              }
                                              className="form-checkbox h-4 w-4 text-primary"
                                            />
                                          </td>
                                          <td className="py-2 px-2 font-medium">
                                            {order.poNumber}
                                          </td>
                                          <td className="py-2 px-2">{order.itemNo}</td>
                                          <td className="py-2 px-2">{order.description}</td>
                                          <td className="py-2 px-2 text-center">
                                            {order.orderQty}
                                          </td>
                                          <td className="py-2 px-2 text-center">
                                            {order.receivedQty}
                                          </td>
                                          <td className="py-2 px-2 text-center font-medium text-primary">
                                            {order.outstandingQty ||
                                              order.orderQty - order.receivedQty}
                                          </td>
                                          <td className="py-2 px-2">
                                            {order.dueDate
                                              ? new Date(order.dueDate).toLocaleDateString('nb-NO')
                                              : 'Ikke spesifisert'}
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-4 text-neutral-secondary">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                                <p className="mt-2">Laster ordredetaljer...</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {suppliers.length === 0 && (
          <div className="text-center py-8 text-neutral-secondary">
            <p>{t('bulkSupplierSelect.noSuppliersFound')}</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedSuppliers.length > 0 && (
        <div className="mt-4 p-4 bg-primary-light bg-opacity-10 border border-primary-light rounded-md">
          <h3 className="text-sm font-medium text-primary mb-2">
            {t('bulkSupplierSelect.summary')}
          </h3>
          <p className="text-sm text-neutral">
            <strong>{[...new Set(selectedSuppliers)].length}</strong>{' '}
            {t('bulkSupplierSelect.suppliersSelected')}
          </p>
          <p className="text-sm text-neutral">
            <strong>
              {selectedSuppliers.reduce((total, supplier) => {
                const supplierData = suppliers.find((s) => s.supplier === supplier);
                return (
                  total +
                  (supplierData
                    ? supplierOrders.has(supplier)
                      ? getNonExcludedOrderCount(supplier)
                      : supplierData.outstandingCount
                    : 0)
                );
              }, 0)}
            </strong>{' '}
            {t('bulkSupplierSelect.totalOutstandingLines')}
          </p>
          {hasMixedLanguages && (
            <p className="text-sm text-yellow-700 mt-1">
              {t('bulkSupplierSelect.mixedLanguageInfo')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkSupplierSelect;
