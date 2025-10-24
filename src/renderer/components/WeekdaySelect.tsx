import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [selectedWeekday, setSelectedWeekday] = useState<string>(
    currentWeekday || ""
  );
  const [importedWeekdays, setImportedWeekdays] = useState<string[]>([]);

  // Auto-select when component mounts or currentWeekday changes
  useEffect(() => {
    if (currentWeekday && currentWeekday !== selectedWeekday) {
      setSelectedWeekday(currentWeekday);
    }
  }, [currentWeekday]);

  // Fetch imported weekdays for the selected planner
  useEffect(() => {
    const fetchImportedWeekdays = async () => {
      if (!selectedPlanner) {
        setImportedWeekdays([]);
        return;
      }

      try {
        const response = await window.electron.getAllSupplierPlanning();
        if (response.success && response.data) {
          // Get unique weekdays for the selected planner
          const weekdays = new Set<string>();
          response.data.forEach((planning) => {
            if (planning.planner_name === selectedPlanner) {
              weekdays.add(planning.weekday);
            }
          });
          setImportedWeekdays(Array.from(weekdays));
        } else {
          console.error("Failed to fetch imported weekdays:", response.error);
          setImportedWeekdays([]);
        }
      } catch (error) {
        console.error("Error fetching imported weekdays:", error);
        setImportedWeekdays([]);
      }
    };

    fetchImportedWeekdays();
  }, [selectedPlanner]);

  // Function to translate weekday names
  const translateWeekday = (weekday: string): string => {
    const weekdayMap: { [key: string]: string } = {
      Mandag: t("weekdays.monday"),
      Tirsdag: t("weekdays.tuesday"),
      Onsdag: t("weekdays.wednesday"),
      Torsdag: t("weekdays.thursday"),
      Fredag: t("weekdays.friday"),
    };
    return weekdayMap[weekday] || weekday;
  };

  // Get available weekdays for the selected planner
  const availableWeekdays = useMemo<Weekday[]>(() => {
    const weekdayOrder: Weekday[] = [
      "Mandag",
      "Tirsdag",
      "Onsdag",
      "Torsdag",
      "Fredag",
    ];

    // Use imported weekdays if available, otherwise fall back to hardcoded data
    if (importedWeekdays.length > 0) {
      const filteredWeekdays = importedWeekdays.filter((weekday) =>
        weekdayOrder.includes(weekday as Weekday)
      ) as Weekday[];

      // Sort by the natural weekday order
      return filteredWeekdays.sort(
        (a, b) => weekdayOrder.indexOf(a) - weekdayOrder.indexOf(b)
      );
    }

    // Fallback to hardcoded supplyPlanners.json data
    const planner = supplyPlannersData.planners.find(
      (p) => p.name === selectedPlanner
    ) as Planner | undefined;

    if (!planner) return [];

    const weekdays = Object.keys(planner.weekdaySuppliers).filter(
      (weekday) =>
        Array.isArray(planner.weekdaySuppliers[weekday as Weekday]) &&
        planner.weekdaySuppliers[weekday as Weekday]!.length > 0
    ) as Weekday[];

    // Sort by the natural weekday order
    return weekdays.sort(
      (a, b) => weekdayOrder.indexOf(a) - weekdayOrder.indexOf(b)
    );
  }, [selectedPlanner, importedWeekdays]);

  const handleWeekdaySelect = (weekday: string) => {
    setSelectedWeekday(weekday);
    onWeekdaySelected(weekday); // Automatically call the callback
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
      <p className="mb-4 text-neutral-secondary">
        {t("weekdaySelect.description")}
      </p>

      <div className="mb-6">
        <div className="bg-neutral-light p-4 rounded-md shadow-sm">
          <p className="text-sm text-neutral-secondary mb-2" aria-live="polite">
            {availableWeekdays.length === 0
              ? t("weekdaySelect.noWeekdays")
              : `${availableWeekdays.length} ${t(
                  "weekdaySelect.weekdaysAvailable"
                )}`}
          </p>

          <div
            className="space-y-2 w-full"
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
                  <span className="font-medium">
                    {translateWeekday(weekday)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {availableWeekdays.length === 0 && (
            <p className="text-neutral-secondary italic mt-2">
              {t("weekdaySelect.noSuppliersPlanned")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WeekdaySelect;
