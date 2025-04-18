import React, { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import FileUpload from "./components/FileUpload";
import WizardSteps from "./components/WizardSteps";
import DataReview from "./components/DataReview";
import EmailButton from "./components/EmailButton";
import SupplierSelect from "./components/SupplierSelect";
import WeekdaySelect from "./components/WeekdaySelect";
import PlannerSelect from "./components/PlannerSelect";
import {
  ExcelData,
  ValidationError,
  WizardStep,
  WizardState,
  ExcelRow,
} from "./types/ExcelData";

// Import the OneMed logo
import onemedLogo from "./assets/onemed-logo.webp";

const steps = [
  { id: "upload" as WizardStep, label: "Last opp fil" },
  { id: "planner" as WizardStep, label: "Velg innkjøpsplanlegger" },
  { id: "weekday" as WizardStep, label: "Velg ukedag" },
  { id: "supplier" as WizardStep, label: "Velg leverandør" },
  { id: "review" as WizardStep, label: "Gjennomgå data" },
  { id: "email" as WizardStep, label: "Send e-post" },
];

const App: React.FC = () => {
  useEffect(() => {
    console.log("🟢 App.tsx mounted!");
  }, []);

  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: "upload",
    validationErrors: [],
    isLoading: false,
    progress: 0,
  });

  const handleDataParsed = (data: ExcelData) => {
    console.log("Excel data parsed in App:", data);
    setWizardState((prev) => ({
      ...prev,
      excelData: data,
      currentStep: "planner",
    }));
  };

  const handleValidationErrors = (errors: ValidationError[]) => {
    setWizardState((prev) => ({
      ...prev,
      validationErrors: errors,
    }));
  };

  const handlePlannerSelected = (planner: string) => {
    setWizardState((prev) => ({
      ...prev,
      selectedPlanner: planner,
      currentStep: "weekday",
    }));
  };

  const handleWeekdaySelected = (weekday: string) => {
    setWizardState((prev) => ({
      ...prev,
      selectedWeekday: weekday,
      currentStep: "supplier",
    }));
  };

  const handleSupplierSelected = (supplier: string) => {
    setWizardState((prev) => ({
      ...prev,
      selectedSupplier: supplier,
      currentStep: "review",
    }));
  };

  const handleNextStep = () => {
    setWizardState((prev) => ({
      ...prev,
      currentStep: "email",
    }));
  };

  const handlePreviousStep = () => {
    setWizardState((prev) => {
      // Determine previous step based on current step
      let previousStep: WizardStep = "upload";

      if (prev.currentStep === "planner") {
        previousStep = "upload";
      } else if (prev.currentStep === "weekday") {
        previousStep = "planner";
      } else if (prev.currentStep === "supplier") {
        previousStep = "weekday";
      } else if (prev.currentStep === "review") {
        previousStep = "supplier";
      } else if (prev.currentStep === "email") {
        previousStep = "review";
      }

      return {
        ...prev,
        currentStep: previousStep,
      };
    });
  };

  const renderCurrentStep = () => {
    switch (wizardState.currentStep) {
      case "upload":
        return (
          <FileUpload
            onDataParsed={handleDataParsed}
            onValidationErrors={handleValidationErrors}
          />
        );
      case "planner":
        return (
          <div className="w-full">
            <PlannerSelect
              onPlannerSelected={handlePlannerSelected}
              currentPlanner={wizardState.selectedPlanner}
            />
            <div className="flex justify-between mt-4">
              <button
                onClick={handlePreviousStep}
                className="btn btn-secondary"
              >
                Tilbake
              </button>
              <div className="flex-grow"></div>
            </div>
          </div>
        );
      case "weekday":
        return (
          <div className="w-full">
            <WeekdaySelect
              onWeekdaySelected={handleWeekdaySelected}
              currentWeekday={wizardState.selectedWeekday}
              selectedPlanner={wizardState.selectedPlanner || "Joakim"}
            />
            <div className="flex justify-between mt-4">
              <button
                onClick={handlePreviousStep}
                className="btn btn-secondary"
              >
                Tilbake
              </button>
              <div className="flex-grow"></div>
            </div>
          </div>
        );
      case "supplier":
        return (
          <div className="w-full">
            <SupplierSelect
              onSupplierSelected={handleSupplierSelected}
              currentSupplier={wizardState.selectedSupplier}
              excelData={wizardState.excelData}
              selectedWeekday={wizardState.selectedWeekday}
              selectedPlanner={wizardState.selectedPlanner || "Joakim"}
            />
            <div className="flex justify-between mt-4">
              <button
                onClick={handlePreviousStep}
                className="btn btn-secondary"
              >
                Tilbake
              </button>
              <div className="flex-grow"></div>
            </div>
          </div>
        );
      case "review":
        return (
          <div className="w-full">
            <DataReview
              excelData={wizardState.excelData}
              selectedWeekday={wizardState.selectedWeekday}
              selectedSupplier={wizardState.selectedSupplier}
              onNext={handleNextStep}
              onPrevious={handlePreviousStep}
            />
          </div>
        );
      case "email":
        return (
          <div className="w-full">
            <EmailButton
              excelData={wizardState.excelData}
              selectedSupplier={wizardState.selectedSupplier}
              onPrevious={handlePreviousStep}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-light">
      <div className="p-4 bg-primary text-neutral-white shadow-md">
        <div className="container-app flex items-center justify-between">
          <div>
            <img src={onemedLogo} alt="OneMed Logo" className="h-10" />
          </div>
          <div className="flex-grow text-center">
            <h1 className="text-2xl font-bold">OneMed SupplyChain</h1>
          </div>
          <div className="w-10">
            {/* Tomt element for å balansere layouten */}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col container-app mx-auto">
        <div className="mb-6">
          <WizardSteps
            steps={steps}
            currentStep={wizardState.currentStep}
            validationErrors={wizardState.validationErrors}
          />
        </div>

        <div className="bg-neutral-white p-6 rounded-md shadow-md flex-1">
          {renderCurrentStep()}
        </div>
      </div>
      <Toaster />
    </div>
  );
};

export default App;
