# Wizard Interface (Excel Import Flow)

This document describes the current multi-step wizard interface implemented primarily for the **Excel data import and email reminder workflow** within the `App.tsx` component of SupplyChain OneMed.

**Note:** The current implementation is specific to this workflow. A more generic, reusable wizard framework (using concepts like a `WizardContainer` component and `WizardManager` class) is a planned enhancement. See `docs/planning/planned-features.md` for details on the desired future state.

## Overview

The application utilizes a wizard-like interface to guide users through the process of:

1. Uploading an Excel file.
2. Selecting relevant filters (Planner, Weekday, Supplier).
3. Reviewing the filtered data.
4. Triggering an email reminder based on the reviewed data.

This step-by-step approach is managed within the main `src/renderer/App.tsx` component.

## Key Implemented Features

- **Sequential Progress:** Users move through a defined sequence of steps.
- **Step Indicators:** The `src/renderer/components/WizardSteps.tsx` component displays the sequence of steps and visually indicates the current and completed steps.
- **Step-Specific Components:** Each step renders a dedicated React component responsible for its specific UI and logic (e.g., `FileUpload`, `PlannerSelect`, `DataReview`).
- **State Management:** The overall wizard state (current step, selected data like planner/weekday/supplier, loaded Excel data, validation errors) is managed within `App.tsx` using `React.useState` and the `WizardState` interface defined in `src/renderer/types/ExcelData.ts`.
- **Navigation:** Basic forward/backward navigation is handled by functions within `App.tsx` (`handleNextStep`, `handlePreviousStep`) which update the `currentStep` in the state.
- **Data Persistence (Session):** Data selected or loaded in previous steps (like the planner, supplier, or Excel data) is held within the `wizardState` in `App.tsx`, making it available to subsequent steps within the current session.
- **Validation Feedback:** Validation errors (e.g., from file parsing) are stored in the `wizardState` and can be displayed to the user (e.g., by the `WizardSteps` component).

## Implemented Workflow (Excel Import -> Email)

The specific steps managed by `App.tsx` are:

1.  **`upload`**: Render `FileUpload` component for selecting and parsing the Excel file.
2.  **`planner`**: Render `PlannerSelect` component.
3.  **`weekday`**: Render `WeekdaySelect` component.
4.  **`supplier`**: Render `SupplierSelect` component.
5.  **`review`**: Render `DataReview` component to display filtered data.
6.  **`email`**: Render `EmailButton` component to trigger the email sending process.

## State Management (`App.tsx`)

The `App.tsx` component manages the wizard's state using `useState<WizardState>`. The `WizardState` (from `src/renderer/types/ExcelData.ts`) tracks:

- `currentStep`: The ID of the currently active step (e.g., "upload", "planner", etc.).
- `excelData`: The parsed data from the uploaded Excel file.
- `selectedPlanner`, `selectedWeekday`, `selectedSupplier`: Filters selected in respective steps.
- `validationErrors`: Any errors encountered during file validation.
- `isLoading`, `progress`: Status indicators, likely used during file processing.

Helper functions within `App.tsx` (e.g., `handleDataParsed`, `handlePlannerSelected`, `handleNextStep`, `handlePreviousStep`) update this state to control the flow.

## UI Components

- **`WizardSteps.tsx`**: Displays the step indicators (progress bar).
- **`FileUpload.tsx`**: Handles file selection and parsing.
- **`PlannerSelect.tsx`**: Allows selecting a planner.
- **`WeekdaySelect.tsx`**: Allows selecting a weekday.
- **`SupplierSelect.tsx`**: Allows selecting a supplier.
- **`DataReview.tsx`**: Displays the filtered order data for review.
- **`EmailButton.tsx`**: Provides the button/action to send the email in the final step.

## Missing Features (from Generic Wizard Concept)

The current implementation, being specific to the Excel->Email flow in `App.tsx`, does not include some features often found in generic wizard frameworks:

- **Generic `WizardContainer` / `WizardManager`:** The logic is tightly coupled within `App.tsx`.
- **Draft Saving:** Automatic saving of progress (e.g., to `localStorage`) is not implemented.
- **Conditional Step Logic:** The current flow is linear; complex conditional skipping/showing of steps is not part of the `App.tsx` state management.
- **Reusable Step Validation:** While validation occurs, there isn't a generic validation function defined per step configuration as described in the generic concept.
- **Other Wizard Types:** The Email Reminder (standalone) and Supplier Creation wizards are not implemented using this structure in `App.tsx`.

## Related Files

- `src/renderer/App.tsx`: Core component managing the wizard state and flow.
- `src/renderer/components/WizardSteps.tsx`: Visual step indicator component.
- `src/renderer/types/ExcelData.ts`: Defines the `WizardState` and `WizardStep` (enum) types for this specific flow.
- Other components listed in UI Components section.
