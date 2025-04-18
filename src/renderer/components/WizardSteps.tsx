import React from "react";
import { WizardStep, ValidationError } from "../types/ExcelData";

interface Step {
  id: WizardStep;
  label: string;
}

interface WizardStepsProps {
  steps: Step[];
  currentStep: WizardStep;
  validationErrors: ValidationError[];
}

const WizardSteps: React.FC<WizardStepsProps> = ({
  steps,
  currentStep,
  validationErrors,
}) => {
  const getCurrentStepIndex = (): number => {
    return steps.findIndex((step) => step.id === currentStep);
  };

  // Check if there are validation errors
  const hasErrors = validationErrors.length > 0;

  return (
    <div className="mb-4">
      {hasErrors && (
        <div className="mb-4 p-3 bg-accent bg-opacity-10 border border-accent rounded-md">
          <h3 className="text-accent font-medium mb-1">Feil ved validering:</h3>
          <ul className="list-disc pl-5 text-sm text-neutral">
            {validationErrors.map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between w-full">
        {steps.map((step, index) => {
          const currentIndex = getCurrentStepIndex();
          const isActive = step.id === currentStep;
          const isCompleted = index < currentIndex;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`rounded-full w-8 h-8 flex items-center justify-center transition-default ${
                    isActive
                      ? "bg-primary text-neutral-white"
                      : isCompleted
                      ? "bg-primary-light text-neutral-white"
                      : "bg-neutral-light text-neutral-secondary"
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`text-xs mt-1 ${
                    isActive
                      ? "text-primary font-medium"
                      : isCompleted
                      ? "text-primary-light"
                      : "text-neutral-secondary"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`h-1 w-full ${
                    index < currentIndex
                      ? "bg-primary-light"
                      : index === currentIndex
                      ? "bg-primary bg-opacity-30"
                      : "bg-neutral-light"
                  }`}
                ></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default WizardSteps;
