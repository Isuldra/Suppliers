import React, { useState } from 'react';
import supplyPlannersData from '../data/supplyPlanners.json';

interface PlannerSelectProps {
  onPlannerSelected: (planner: string) => void;
  currentPlanner?: string;
}

const PlannerSelect: React.FC<PlannerSelectProps> = ({ onPlannerSelected, currentPlanner }) => {
  const [selectedPlanner, setSelectedPlanner] = useState<string>(
    currentPlanner || supplyPlannersData.planners[0].name
  );

  const handlePlannerSelect = (planner: string) => {
    setSelectedPlanner(planner);
  };

  const handleNext = () => {
    onPlannerSelected(selectedPlanner);
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-4 text-neutral">Velg innkjøpsplanlegger</h2>
      <p className="mb-6 text-neutral-secondary">
        Velg hvilken innkjøpsplanlegger du er. Dette bestemmer hvilke leverandører som vises.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {supplyPlannersData.planners.map((planner) => (
          <button
            key={planner.name}
            className={`py-3 px-4 text-center rounded-sm transition-default ${
              selectedPlanner === planner.name
                ? 'bg-primary text-neutral-white'
                : 'bg-neutral-light hover:bg-neutral-secondary hover:bg-opacity-20 text-neutral'
            }`}
            onClick={() => handlePlannerSelect(planner.name)}
          >
            {planner.name}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={handleNext} className="btn btn-primary">
          Neste
        </button>
      </div>
    </div>
  );
};

export default PlannerSelect;
