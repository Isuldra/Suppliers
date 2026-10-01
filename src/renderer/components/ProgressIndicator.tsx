import React from 'react';
import { useTranslation } from 'react-i18next';

// Progress indicator component
export interface ProgressState {
  excelData?: unknown;
  selectedWeekday: string;
  selectedSupplier: string;
  isBulkMode: boolean;
  selectedSuppliers: string[];
  showDataReview: boolean;
  showEmailButton: boolean;
}

export const ProgressIndicator: React.FC<{ appState: ProgressState }> = ({ appState }) => {
  const { t } = useTranslation();

  const steps = [
    {
      id: 'upload',
      label: t('progress.uploadFile'),
      completed: !!appState.excelData,
    },
    {
      id: 'weekday',
      label: t('progress.selectWeekday'),
      completed: !!appState.selectedWeekday,
    },
    {
      id: 'supplier',
      label: t('progress.selectSupplier'),
      completed: appState.isBulkMode
        ? appState.selectedSuppliers.length > 0
        : !!appState.selectedSupplier,
    },
    {
      id: 'review',
      label: t('progress.reviewData'),
      completed: appState.isBulkMode ? appState.showDataReview : appState.showEmailButton,
    },
    {
      id: 'email',
      label: t('progress.sendEmail'),
      completed: false,
    },
  ];

  const currentStepIndex = steps.findIndex((step) => !step.completed);
  const activeStep = currentStepIndex === -1 ? steps.length - 1 : currentStepIndex;

  return (
    <ol className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:gap-2" aria-label="Progress">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className="relative flex min-w-0 items-center gap-3 sm:flex-col sm:text-center"
          aria-current={index === activeStep ? 'step' : undefined}
          data-step-state={
            step.completed ? 'complete' : index === activeStep ? 'active' : 'pending'
          }
        >
          {index < steps.length - 1 && (
            <div
              aria-hidden="true"
              className={`absolute top-4 left-[calc(50%+1rem)] hidden h-0.5 w-[calc(100%-2rem)] sm:block ${step.completed ? 'bg-primary' : 'bg-gray-300'}`}
            />
          )}
          <div
            className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium ${step.completed ? 'bg-primary border-primary text-neutral-white' : index === activeStep ? 'border-primary text-primary' : 'border-gray-300 text-neutral-secondary'}`}
          >
            {step.completed ? '✓' : index + 1}
          </div>
          <span
            className={`min-w-0 break-words text-sm font-medium ${step.completed ? 'text-primary' : index === activeStep ? 'text-neutral' : 'text-neutral-secondary'}`}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
};
