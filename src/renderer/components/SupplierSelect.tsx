import React, { useState, useEffect, useMemo } from "react";
import { ExcelData } from "../types/ExcelData";
import supplyPlannersData from "../data/supplyPlanners.json";

interface SupplierSelectProps {
  onSupplierSelected: (supplier: string) => void;
  currentSupplier?: string;
  excelData?: ExcelData;
  selectedWeekday?: string;
  selectedPlanner: string;
}

// Define the type for weekday suppliers data
interface WeekdaySuppliers {
  [weekday: string]: string[];
}

// Define planner type
interface Planner {
  name: string;
  weekdaySuppliers: WeekdaySuppliers;
}

const SupplierSelect: React.FC<SupplierSelectProps> = ({
  onSupplierSelected,
  currentSupplier,
  // excelData, // Remove unused prop
  selectedWeekday,
  selectedPlanner,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(
    currentSupplier || ""
  );

  // Get suppliers based on selected planner and weekday, filtered to only show those with outstanding orders
  const [suppliersWithOutstandingOrders, setSuppliersWithOutstandingOrders] =
    useState<string[]>([]);
  const [importedSuppliersForWeekday, setImportedSuppliersForWeekday] =
    useState<string[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  // Fetch suppliers with outstanding orders
  useEffect(() => {
    const fetchSuppliersWithOutstandingOrders = async () => {
      setIsLoadingSuppliers(true);
      try {
        const response =
          await window.electron.getSuppliersWithOutstandingOrders();
        if (response.success && response.data) {
          setSuppliersWithOutstandingOrders(response.data);
        } else {
          console.error(
            "Failed to fetch suppliers with outstanding orders:",
            response.error
          );
          setSuppliersWithOutstandingOrders([]);
        }
      } catch (error) {
        console.error(
          "Error fetching suppliers with outstanding orders:",
          error
        );
        setSuppliersWithOutstandingOrders([]);
      } finally {
        setIsLoadingSuppliers(false);
      }
    };

    fetchSuppliersWithOutstandingOrders();
  }, []);

  // Fetch imported suppliers for the selected weekday and planner
  useEffect(() => {
    const fetchImportedSuppliers = async () => {
      if (!selectedWeekday || !selectedPlanner) {
        setImportedSuppliersForWeekday([]);
        return;
      }

      try {
        const response = await window.electron.getSuppliersForWeekday(
          selectedWeekday,
          selectedPlanner
        );
        if (response.success && response.data) {
          setImportedSuppliersForWeekday(response.data);
        } else {
          console.error(
            "Failed to fetch imported suppliers for weekday:",
            response.error
          );
          setImportedSuppliersForWeekday([]);
        }
      } catch (error) {
        console.error("Error fetching imported suppliers for weekday:", error);
        setImportedSuppliersForWeekday([]);
      }
    };

    fetchImportedSuppliers();
  }, [selectedWeekday, selectedPlanner]);

  const suppliers = useMemo<string[]>(() => {
    if (!selectedWeekday || !selectedPlanner) {
      return [];
    }

    // Use imported suppliers if available, otherwise fall back to hardcoded data
    let weekdaySuppliers: string[] = [];

    if (importedSuppliersForWeekday.length > 0) {
      // Use imported suppliers from ark 6 (Leverandør)
      weekdaySuppliers = importedSuppliersForWeekday;
    } else {
      // Fallback to hardcoded supplyPlanners.json data
      const planner = supplyPlannersData.planners.find(
        (p) => p.name === selectedPlanner
      ) as Planner | undefined;

      if (planner) {
        weekdaySuppliers = planner.weekdaySuppliers[selectedWeekday] || [];
      }
    }

    // Filter to only include suppliers that have outstanding orders
    return weekdaySuppliers.filter((supplier) =>
      suppliersWithOutstandingOrders.includes(supplier)
    );
  }, [
    selectedPlanner,
    selectedWeekday,
    suppliersWithOutstandingOrders,
    importedSuppliersForWeekday,
  ]);

  // Filter suppliers based on search term
  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) {
      return suppliers;
    }

    const searchLower = searchTerm.toLowerCase();
    return suppliers.filter((supplier: string) =>
      supplier.toLowerCase().includes(searchLower)
    );
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
    if (
      filteredSuppliers.length === 1 &&
      filteredSuppliers[0] !== selectedSupplier
    ) {
      setSelectedSupplier(filteredSuppliers[0]);
      onSupplierSelected(filteredSuppliers[0]);
    }
  }, [filteredSuppliers, selectedSupplier, onSupplierSelected]);

  return (
    <div className="w-full">
      <h2
        className="text-xl font-bold mb-4 text-neutral"
        id="supplier-select-heading"
      >
        Velg leverandør
      </h2>

      <div
        className="mb-4 p-4 bg-primary-light bg-opacity-10 border border-primary-light rounded-md"
        aria-label="Valgt innkjøpsplanlegger og ukedag"
      >
        <p className="text-primary">
          <span className="font-medium">Innkjøpsplanlegger:</span>{" "}
          {selectedPlanner}
        </p>
        <p className="text-primary mt-1">
          <span className="font-medium">Valgt ukedag:</span> {selectedWeekday}
        </p>
        <p className="text-sm text-neutral-secondary mt-1">
          Viser kun leverandører som er planlagt for{" "}
          {selectedWeekday?.toLowerCase()} og som har åpne ordre.
        </p>
      </div>

      <div className="mb-6 w-full">
        <div className="flex mb-2 w-full">
          <label htmlFor="supplier-search" className="sr-only">
            Søk etter leverandør
          </label>
          <input
            type="text"
            id="supplier-search"
            placeholder="Søk etter leverandør..."
            className="form-control w-full"
            value={searchTerm}
            onChange={handleSearch}
            aria-label="Søk etter leverandør"
            aria-controls="supplier-list"
          />
        </div>

        <div className="bg-neutral-light p-4 rounded-md shadow-sm w-full">
          {isLoadingSuppliers ? (
            <p
              className="text-sm text-neutral-secondary mb-2"
              aria-live="polite"
            >
              Laster leverandører med åpne ordre...
            </p>
          ) : (
            <p
              className="text-sm text-neutral-secondary mb-2"
              aria-live="polite"
            >
              {filteredSuppliers.length} leverandører med åpne ordre funnet
            </p>
          )}

          {isLoadingSuppliers ? (
            <p className="text-neutral-secondary italic" aria-live="polite">
              Laster...
            </p>
          ) : filteredSuppliers.length === 0 ? (
            <p className="text-neutral-secondary italic" aria-live="polite">
              Ingen leverandører med åpne ordre funnet for denne ukedagen
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
                    selectedSupplier === supplier
                      ? "bg-primary-light bg-opacity-20"
                      : ""
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
