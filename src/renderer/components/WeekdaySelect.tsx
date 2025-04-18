import React, { useState, useMemo } from "react";
import supplyPlannersData from "../data/supplyPlanners.json";

interface WeekdaySelectProps {
  onWeekdaySelected: (weekday: string) => void;
  currentWeekday?: string;
  selectedPlanner: string;
}

// Define the weekday type
type Weekday = "Mandag" | "Tirsdag" | "Onsdag" | "Torsdag" | "Fredag";

// Planner type
interface Planner {
  name: string;
  weekdaySuppliers: {
    [key in Weekday]?: string[];
  };
}

const WeekdaySelect: React.FC<WeekdaySelectProps> = ({
  onWeekdaySelected,
  currentWeekday,
  selectedPlanner,
}) => {
  const [selectedWeekday, setSelectedWeekday] = useState<string>(
    currentWeekday || ""
  );

  // Get available weekdays for the selected planner
  const availableWeekdays = useMemo<Weekday[]>(() => {
    const planner = supplyPlannersData.planners.find(
      (p) => p.name === selectedPlanner
    ) as Planner | undefined;

    if (!planner) return [];

    return Object.keys(planner.weekdaySuppliers).filter(
      (weekday) =>
        Array.isArray(planner.weekdaySuppliers[weekday as Weekday]) &&
        planner.weekdaySuppliers[weekday as Weekday]!.length > 0
    ) as Weekday[];
  }, [selectedPlanner]);

  const handleWeekdaySelect = (weekday: string) => {
    setSelectedWeekday(weekday);
  };

  const handleNext = () => {
    if (selectedWeekday) {
      onWeekdaySelected(selectedWeekday);
    }
  };

  // Handle keyboard navigation for weekday selection
  const handleWeekdayKeyDown = (e: React.KeyboardEvent, weekday: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleWeekdaySelect(weekday);
    }
  };

  return (
    <div className="w-full">
      <h2
        className="text-xl font-bold mb-4 text-neutral"
        id="weekday-select-heading"
      >
        Velg ukedag
      </h2>

      <div className="mb-4 p-4 bg-primary-light bg-opacity-10 border border-primary-light rounded-md">
        <p className="text-primary">
          <span className="font-medium">Innkjøpsplanlegger:</span>{" "}
          {selectedPlanner}
        </p>
        <p className="text-sm text-neutral-secondary mt-2">
          Velg en ukedag for å se leverandører som er planlagt for den dagen.
        </p>
      </div>

      <div className="mb-6">
        <div className="bg-neutral-light p-4 rounded-md shadow-sm">
          <p className="text-sm text-neutral-secondary mb-2" aria-live="polite">
            {availableWeekdays.length === 0
              ? "Ingen ukedager funnet for denne planleggeren"
              : `${availableWeekdays.length} ukedager tilgjengelig`}
          </p>

          <div
            className="space-y-2"
            role="radiogroup"
            aria-labelledby="weekday-select-heading"
          >
            {availableWeekdays.map((weekday) => (
              <div
                key={weekday}
                className={`p-3 rounded-sm cursor-pointer transition-default ${
                  selectedWeekday === weekday
                    ? "bg-primary-light text-neutral-white"
                    : "bg-neutral-white hover:bg-neutral-light"
                }`}
                onClick={() => handleWeekdaySelect(weekday)}
                onKeyDown={(e) => handleWeekdayKeyDown(e, weekday)}
                tabIndex={0}
                role="radio"
                aria-checked={selectedWeekday === weekday}
              >
                <div className="flex items-center">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                      selectedWeekday === weekday
                        ? "border-neutral-white"
                        : "border-neutral"
                    }`}
                  >
                    {selectedWeekday === weekday && (
                      <div className="w-3 h-3 rounded-full bg-neutral-white"></div>
                    )}
                  </div>
                  <span className="font-medium">{weekday}</span>
                </div>
              </div>
            ))}
          </div>

          {availableWeekdays.length === 0 && (
            <p className="text-neutral-secondary italic mt-2">
              Det er ingen leverandører planlagt for denne planleggeren.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={!selectedWeekday}
          className={`btn ${
            selectedWeekday
              ? "btn-primary"
              : "bg-neutral-secondary text-neutral-light cursor-not-allowed"
          }`}
          aria-disabled={!selectedWeekday}
          aria-label={
            selectedWeekday
              ? `Velg ${selectedWeekday} og gå videre`
              : "Velg en ukedag for å fortsette"
          }
        >
          Neste
        </button>
      </div>
    </div>
  );
};

export default WeekdaySelect;
