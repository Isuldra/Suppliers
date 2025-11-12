import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { ExcelRow } from '../types/ExcelData';
import supplierData from '../data/supplierData.json';
import SelectToggleButton from './SelectToggleButton';

interface BulkDataReviewProps {
  selectedSuppliers: string[];
  selectedWeekday: string;
  onNext: (selectedOrders: Map<string, Set<string>>) => void;
  onBack: () => void;
  bulkSelectedOrders?: Map<string, Set<string>>; // Parent state for selected orders
  onOrdersChanged?: (selectedOrders: Map<string, Set<string>>) => void; // Update parent state without navigating
}

interface SupplierInfo {
  leverandør: string;
  companyId: number;
  epost: string;
  språk: string;
  språkKode: 'NO' | 'ENG';
  purredag: string;
}

interface SupplierOrders {
  supplier: string;
  orders: ExcelRow[];
  selectedOrders: Set<string>; // Track which orders are selected for this supplier
  isExpanded: boolean;
  language: string;
  languageCode: 'NO' | 'ENG';
  email: string;
}

const BulkDataReview: React.FC<BulkDataReviewProps> = ({
  selectedSuppliers,
  selectedWeekday: _selectedWeekday,
  onNext,
  onBack,
  bulkSelectedOrders,
  onOrdersChanged,
}) => {
  const { t } = useTranslation();
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrders[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());

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

  // Serialize bulkSelectedOrders to avoid infinite loops from Map reference changes
  const bulkSelectedOrdersSerialized = useMemo(() => {
    if (!bulkSelectedOrders || bulkSelectedOrders.size === 0) return '';
    const serialized = Array.from(bulkSelectedOrders.entries())
      .map(([supplier, orders]) => `${supplier}:${Array.from(orders).sort().join(',')}`)
      .sort()
      .join('|');
    return serialized;
  }, [bulkSelectedOrders]);

  // Fetch orders for all selected suppliers
  useEffect(() => {
    const fetchOrdersForSuppliers = async () => {
      setIsLoading(true);
      try {
        const allOrders = await window.electron.getAllOrders();
        const suppliersData: SupplierOrders[] = [];

        for (const supplierName of selectedSuppliers) {
          const supplierInfo = getSupplierInfo(supplierName);
          const orders = allOrders.filter((order) => order.supplier === supplierName);

          // Use bulkSelectedOrders if available, otherwise select all by default
          const savedSelectedOrders = bulkSelectedOrders?.get(supplierName);
          const selectedOrdersSet = savedSelectedOrders
            ? new Set(savedSelectedOrders)
            : new Set(orders.map((order) => order.key));

          console.log(`🔄 BulkDataReview: Loading orders for ${supplierName}:`, {
            totalOrders: orders.length,
            savedSelectedOrders: savedSelectedOrders?.size || 0,
            selectedOrdersSet: selectedOrdersSet.size,
          });

          suppliersData.push({
            supplier: supplierName,
            orders: orders as unknown as ExcelRow[],
            selectedOrders: selectedOrdersSet,
            isExpanded: false,
            language: supplierInfo?.språk || 'Norsk',
            languageCode: supplierInfo?.språkKode || 'NO',
            email: supplierInfo?.epost || '',
          });
        }

        setSupplierOrders(suppliersData);
      } catch (error) {
        console.error('Error fetching orders for suppliers:', error);
        setSupplierOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedSuppliers.length > 0) {
      fetchOrdersForSuppliers();
    }
  }, [selectedSuppliers, bulkSelectedOrdersSerialized]);

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

  // Handle selecting/deselecting all orders for a supplier
  const handleSelectAllOrdersForSupplier = (supplier: string) => {
    setSupplierOrders((prev) => {
      const updated = prev.map((s) => {
        if (s.supplier === supplier) {
          const allOrderKeys = s.orders.map((order) => order.key);
          const newSelectedOrders =
            s.selectedOrders.size === s.orders.length ? new Set<string>() : new Set(allOrderKeys);
          // Immediately notify parent about the change WITHOUT navigating
          if (onOrdersChanged) {
            setTimeout(() => {
              const updatedMap = new Map<string, Set<string>>();
              prev.forEach((sup) => {
                updatedMap.set(
                  sup.supplier,
                  sup.supplier === supplier ? newSelectedOrders : sup.selectedOrders
                );
              });
              onOrdersChanged(updatedMap);
            }, 0);
          }
          return { ...s, selectedOrders: newSelectedOrders };
        }
        return s;
      });
      return updated;
    });
  };

  // Handle selecting/deselecting individual order
  const handleSelectOrder = (supplier: string, orderKey: string) => {
    setSupplierOrders((prev) => {
      const updated = prev.map((s) => {
        if (s.supplier === supplier) {
          const newSelectedOrders = new Set(s.selectedOrders);
          if (newSelectedOrders.has(orderKey)) {
            newSelectedOrders.delete(orderKey);
          } else {
            newSelectedOrders.add(orderKey);
          }
          // Immediately notify parent about the change WITHOUT navigating
          if (onOrdersChanged) {
            setTimeout(() => {
              const updatedMap = new Map<string, Set<string>>();
              prev.forEach((sup) => {
                updatedMap.set(
                  sup.supplier,
                  sup.supplier === supplier ? newSelectedOrders : sup.selectedOrders
                );
              });
              onOrdersChanged(updatedMap);
            }, 0);
          }
          return { ...s, selectedOrders: newSelectedOrders };
        }
        return s;
      });
      return updated;
    });
  };

  // Calculate totals
  const totals = useMemo(() => {
    const totalSuppliers = supplierOrders.length;
    const totalOrders = supplierOrders.reduce((sum, s) => sum + s.orders.length, 0);
    const selectedOrders = supplierOrders.reduce((sum, s) => sum + s.selectedOrders.size, 0);

    return { totalSuppliers, totalOrders, selectedOrders };
  }, [supplierOrders]);

  // Check for mixed languages
  const hasMixedLanguages = useMemo(() => {
    if (supplierOrders.length <= 1) return false;
    const languages = new Set(supplierOrders.map((s) => s.languageCode));
    return languages.size > 1;
  }, [supplierOrders]);

  // Check if all suppliers have at least one selected order
  const allSuppliersHaveOrders = supplierOrders.every((s) => s.selectedOrders.size > 0);

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-neutral-secondary">Laster ordredata...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with summary */}
      <div className="mb-6 p-4 bg-primary-light bg-opacity-10 border border-primary-light rounded-md">
        <h2 className="text-lg font-medium text-primary mb-2">{t('bulkDataReview.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-neutral">{t('bulkDataReview.suppliers')}</span>{' '}
            {totals.totalSuppliers}
          </div>
          <div>
            <span className="font-medium text-neutral">{t('bulkDataReview.totalOrderLines')}</span>{' '}
            {totals.totalOrders}
          </div>
          <div>
            <span className="font-medium text-primary">
              {t('bulkDataReview.selectedOrderLines')}
            </span>{' '}
            {totals.selectedOrders}
          </div>
        </div>
        {hasMixedLanguages && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            {t('bulkDataReview.mixedLanguageWarning')}
          </div>
        )}
      </div>

      {/* Suppliers list */}
      <div className="space-y-4">
        {supplierOrders.map((supplierData) => (
          <div
            key={supplierData.supplier}
            className="bg-neutral-white border border-neutral-light rounded-md overflow-hidden"
          >
            {/* Supplier header */}
            <div className="p-4 bg-neutral-light bg-opacity-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleExpandSupplier(supplierData.supplier)}
                    className="flex items-center text-primary hover:text-primary-dark transition-colors"
                  >
                    {expandedSuppliers.has(supplierData.supplier) ? (
                      <ChevronDownIcon className="h-5 w-5 mr-2" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 mr-2" />
                    )}
                    <span className="font-medium text-neutral">{supplierData.supplier}</span>
                  </button>

                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      supplierData.languageCode === 'NO'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {supplierData.language}
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-sm text-neutral-secondary">
                    {supplierData.selectedOrders.size} {t('bulkDataReview.outOf')}{' '}
                    {supplierData.orders.length} {t('bulkDataReview.selected')}
                  </span>

                  <SelectToggleButton
                    isSelected={supplierData.selectedOrders.size === supplierData.orders.length}
                    onToggle={() => handleSelectAllOrdersForSupplier(supplierData.supplier)}
                    selectLabelKey="bulkDataReview.selectAll"
                    removeLabelKey="bulkDataReview.removeAll"
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Expanded orders table */}
            {expandedSuppliers.has(supplierData.supplier) && (
              <div className="p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-light">
                        <th className="text-left py-2 px-2 w-12">
                          <input
                            type="checkbox"
                            checked={
                              supplierData.selectedOrders.size === supplierData.orders.length
                            }
                            onChange={() => handleSelectAllOrdersForSupplier(supplierData.supplier)}
                            className="h-4 w-4 text-primary focus:ring-primary border-neutral-light rounded"
                          />
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
                          {t('bulkDataReview.tableHeaders.specification')}
                        </th>
                        <th className="text-center py-2 px-2">
                          {t('bulkDataReview.tableHeaders.ordered')}
                        </th>
                        <th className="text-center py-2 px-2">
                          {t('bulkDataReview.tableHeaders.received')}
                        </th>
                        <th className="text-center py-2 px-2">
                          {t('bulkDataReview.tableHeaders.outstanding')}
                        </th>
                        <th className="text-left py-2 px-2">
                          {t('bulkDataReview.tableHeaders.eta')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierData.orders.map((order) => (
                        <tr
                          key={order.key}
                          className="border-b border-neutral-light hover:bg-neutral-light bg-opacity-30"
                        >
                          <td className="py-2 px-2">
                            <input
                              type="checkbox"
                              checked={supplierData.selectedOrders.has(order.key)}
                              onChange={() => handleSelectOrder(supplierData.supplier, order.key)}
                              className="h-4 w-4 text-primary focus:ring-primary border-neutral-light rounded"
                            />
                          </td>
                          <td className="py-2 px-2 font-medium">{order.poNumber}</td>
                          <td className="py-2 px-2">{order.itemNo}</td>
                          <td className="py-2 px-2">{order.description}</td>
                          <td className="py-2 px-2">{order.specification}</td>
                          <td className="py-2 px-2 text-center">{order.orderQty}</td>
                          <td className="py-2 px-2 text-center">{order.receivedQty}</td>
                          <td className="py-2 px-2 text-center font-medium text-primary">
                            {order.outstandingQty || order.orderQty - order.receivedQty}
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
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex justify-between">
        <button onClick={onBack} className="btn btn-secondary">
          ← {t('bulkDataReview.backToSupplierSelection')}
        </button>

        <button
          onClick={() => {
            // Create a Map of selected orders for each supplier
            const selectedOrdersMap = new Map<string, Set<string>>();
            supplierOrders.forEach((supplier) => {
              selectedOrdersMap.set(supplier.supplier, new Set(supplier.selectedOrders));
            });
            console.log(
              '🔵 BulkDataReview: Passing selectedOrdersMap to onNext:',
              selectedOrdersMap
            );
            onNext(selectedOrdersMap);
          }}
          className="btn btn-primary"
          disabled={!allSuppliersHaveOrders || totals.selectedOrders === 0}
        >
          {t('bulkDataReview.goToEmailPreview')}
        </button>
      </div>

      {/* Status message */}
      {!allSuppliersHaveOrders && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{t('bulkDataReview.validationNote')}</p>
        </div>
      )}
    </div>
  );
};

export default BulkDataReview;
