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
  excelData,
  selectedWeekday,
  selectedPlanner,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(
    currentSupplier || ""
  );

  // Get suppliers based on selected planner and weekday
  const suppliers = useMemo<string[]>(() => {
    // Find the planner data
    const planner = supplyPlannersData.planners.find(
      (p) => p.name === selectedPlanner
    ) as Planner | undefined;

    if (!planner || !selectedWeekday) {
      return [];
    }

    // Get suppliers for the selected weekday
    return planner.weekdaySuppliers[selectedWeekday] || [];
  }, [selectedPlanner, selectedWeekday]);

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
  };

  const handleNext = () => {
    if (selectedSupplier) {
      onSupplierSelected(selectedSupplier);
    }
  };

  // Auto-select if there's only one supplier after filtering
  useEffect(() => {
    if (
      filteredSuppliers.length === 1 &&
      filteredSuppliers[0] !== selectedSupplier
    ) {
      setSelectedSupplier(filteredSuppliers[0]);
    }
  }, [filteredSuppliers, selectedSupplier]);

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
          {selectedWeekday?.toLowerCase()}.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex mb-2">
          <label htmlFor="supplier-search" className="sr-only">
            Søk etter leverandør
          </label>
          <input
            type="text"
            id="supplier-search"
            placeholder="Søk etter leverandør..."
            className="form-control"
            value={searchTerm}
            onChange={handleSearch}
            aria-label="Søk etter leverandør"
            aria-controls="supplier-list"
          />
        </div>

        <div className="bg-neutral-light p-4 rounded-md shadow-sm">
          <p className="text-sm text-neutral-secondary mb-2" aria-live="polite">
            {filteredSuppliers.length} leverandører funnet
          </p>

          {filteredSuppliers.length === 0 ? (
            <p className="text-neutral-secondary italic" aria-live="polite">
              Ingen leverandører funnet
            </p>
          ) : (
            <div
              className="max-h-96 overflow-y-auto border border-neutral-light rounded-sm bg-neutral-white"
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

      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={!selectedSupplier}
          className={`btn ${
            selectedSupplier
              ? "btn-primary"
              : "bg-neutral-secondary text-neutral-light cursor-not-allowed"
          }`}
          aria-label={
            selectedSupplier
              ? `Velg leverandør ${selectedSupplier} og gå videre`
              : "Velg en leverandør for å fortsette"
          }
          aria-disabled={!selectedSupplier}
        >
          Neste
        </button>
      </div>
    </div>
  );
};

export default SupplierSelect;
