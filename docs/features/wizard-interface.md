# Wizard Interface

This document provides detailed information about the wizard interface functionality in Supplier Reminder Pro.

## Overview

The wizard interface provides a step-by-step guided workflow for common tasks in Supplier Reminder Pro. This approach simplifies complex processes by breaking them down into logical, sequential steps, improving user experience and reducing errors.

## Key Features

### Multi-Step Navigation

The wizard interface implements flexible navigation between steps:

- **Sequential Progress**: Guided forward/backward movement through steps
- **Step Validation**: Input validation before proceeding to next step
- **Progress Tracking**: Visual indicators of current position and completion
- **Conditional Logic**: Dynamic step sequencing based on previous choices

### User Interface Components

The wizard uses consistent UI components across all steps:

- **Step Indicators**: Visual representation of all steps and current position
- **Navigation Controls**: Clear next/back buttons with appropriate labeling
- **Contextual Help**: Step-specific guidance and tooltips
- **Confirmation Dialogs**: Verification before committing changes or canceling

### Data Persistence

Data handling within the wizard ensures nothing is lost:

- **Form State Persistence**: Data maintained across steps even if navigating backward
- **Draft Saving**: Automatic saving of progress for later continuation
- **Validation Rules**: Immediate feedback for input validation
- **Final Review**: Comprehensive review step before final submission

## Wizard Types

The application includes several specialized wizards:

### Excel Import Wizard

Guides users through importing supplier and order data:

1. **File Selection**: Upload or select Excel file
2. **Validation**: Automatic file validation with error reporting
3. **Mapping**: Map columns to application fields if needed
4. **Preview**: Review data before import
5. **Confirmation**: Commit data to database

### Email Reminder Wizard

Simplifies the process of sending reminder emails:

1. **Supplier Selection**: Choose suppliers to receive reminders
2. **Order Selection**: Select orders to include in reminders
3. **Template Selection**: Choose or customize email template
4. **Preview**: Review emails before sending
5. **Confirmation**: Send emails and record communication

### Supplier Creation Wizard

Streamlines adding new suppliers:

1. **Basic Information**: Enter core supplier details
2. **Contact Information**: Add contact persons and methods
3. **Category Assignment**: Categorize supplier
4. **Settings**: Set supplier-specific settings
5. **Review**: Confirm all information before saving

## Implementation Details

### Wizard State Management

```typescript
// Example of wizard state management
interface WizardState {
  currentStep: number;
  steps: WizardStep[];
  data: Record<string, any>;
  errors: Record<string, string[]>;
  isComplete: boolean;
}

interface WizardStep {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  isValid: (data: Record<string, any>) => boolean;
  validationRules?: ValidationRule[];
  isOptional?: boolean;
  isVisible?: (data: Record<string, any>) => boolean;
}

class WizardManager {
  private state: WizardState;

  constructor(steps: WizardStep[], initialData: Record<string, any> = {}) {
    this.state = {
      currentStep: 0,
      steps: steps.filter(
        (step) => !step.isVisible || step.isVisible(initialData)
      ),
      data: initialData,
      errors: {},
      isComplete: false,
    };
  }

  public getCurrentStep(): WizardStep {
    return this.state.steps[this.state.currentStep];
  }

  public updateData(newData: Record<string, any>): void {
    this.state.data = { ...this.state.data, ...newData };

    // Revalidate steps if needed
    this.validateCurrentStep();

    // Update visible steps based on new data
    this.updateVisibleSteps();
  }

  public nextStep(): boolean {
    if (!this.canMoveNext()) {
      return false;
    }

    if (this.state.currentStep < this.state.steps.length - 1) {
      this.state.currentStep++;
      return true;
    } else {
      this.state.isComplete = true;
      return false;
    }
  }

  public previousStep(): boolean {
    if (this.state.currentStep > 0) {
      this.state.currentStep--;
      return true;
    }
    return false;
  }

  public canMoveNext(): boolean {
    const currentStep = this.getCurrentStep();
    return currentStep.isOptional || currentStep.isValid(this.state.data);
  }

  public isLastStep(): boolean {
    return this.state.currentStep === this.state.steps.length - 1;
  }

  private validateCurrentStep(): void {
    const step = this.getCurrentStep();
    if (!step.validationRules) {
      return;
    }

    const errors: string[] = [];
    for (const rule of step.validationRules) {
      if (!rule.validate(this.state.data)) {
        errors.push(rule.errorMessage);
      }
    }

    if (errors.length > 0) {
      this.state.errors[step.id] = errors;
    } else {
      delete this.state.errors[step.id];
    }
  }

  private updateVisibleSteps(): void {
    const visibleSteps = this.state.steps.filter(
      (step) => !step.isVisible || step.isVisible(this.state.data)
    );

    // Adjust current step if needed after visibility changes
    if (visibleSteps.length !== this.state.steps.length) {
      this.state.steps = visibleSteps;
      this.state.currentStep = Math.min(
        this.state.currentStep,
        visibleSteps.length - 1
      );
    }
  }
}
```

### Wizard Component Implementation

```jsx
// React component example for wizard interface
const WizardContainer = ({ steps, initialData, onComplete, onCancel }) => {
  const [wizardState, setWizardState] = useState({
    currentStep: 0,
    data: initialData || {},
    isDirty: false,
  });

  // Create ref to save draft periodically
  useEffect(() => {
    const saveDraftInterval = setInterval(() => {
      if (wizardState.isDirty) {
        localStorage.setItem("wizardDraft", JSON.stringify(wizardState.data));
        setWizardState((prev) => ({ ...prev, isDirty: false }));
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(saveDraftInterval);
  }, [wizardState.isDirty]);

  const handleDataChange = useCallback((stepId, newData) => {
    setWizardState((prev) => ({
      ...prev,
      data: { ...prev.data, [stepId]: newData },
      isDirty: true,
    }));
  }, []);

  const handleNext = useCallback(() => {
    const currentStep = steps[wizardState.currentStep];

    // Validate current step
    if (
      currentStep.validate &&
      !currentStep.validate(wizardState.data[currentStep.id])
    ) {
      return;
    }

    if (wizardState.currentStep < steps.length - 1) {
      setWizardState((prev) => ({
        ...prev,
        currentStep: prev.currentStep + 1,
      }));
    } else {
      // Final step - complete wizard
      onComplete(wizardState.data);
    }
  }, [wizardState, steps, onComplete]);

  const handleBack = useCallback(() => {
    if (wizardState.currentStep > 0) {
      setWizardState((prev) => ({
        ...prev,
        currentStep: prev.currentStep - 1,
      }));
    }
  }, [wizardState]);

  const handleCancel = useCallback(() => {
    if (wizardState.isDirty) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to cancel?"
        )
      ) {
        onCancel();
      }
    } else {
      onCancel();
    }
  }, [wizardState.isDirty, onCancel]);

  // Get current step component
  const CurrentStepComponent = steps[wizardState.currentStep].component;

  return (
    <div className="wizard-container">
      <div className="wizard-header">
        <h2>{steps[wizardState.currentStep].title}</h2>
        <div className="wizard-progress">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`step-indicator ${
                index < wizardState.currentStep
                  ? "completed"
                  : index === wizardState.currentStep
                  ? "active"
                  : ""
              }`}
            >
              <div className="step-number">{index + 1}</div>
              <div className="step-title">{step.title}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="wizard-content">
        <CurrentStepComponent
          data={wizardState.data[steps[wizardState.currentStep].id] || {}}
          onChange={(data) =>
            handleDataChange(steps[wizardState.currentStep].id, data)
          }
        />
      </div>

      <div className="wizard-footer">
        <button className="btn btn-secondary" onClick={handleCancel}>
          Cancel
        </button>

        <div>
          {wizardState.currentStep > 0 && (
            <button className="btn btn-outline" onClick={handleBack}>
              Back
            </button>
          )}

          <button className="btn btn-primary" onClick={handleNext}>
            {wizardState.currentStep < steps.length - 1 ? "Next" : "Complete"}
          </button>
        </div>
      </div>
    </div>
  );
};
```

## Usage Examples

### Setting Up an Email Reminder Wizard

```jsx
// Example of email reminder wizard configuration
const emailReminderSteps = [
  {
    id: "supplierSelection",
    title: "Select Suppliers",
    component: SupplierSelectionStep,
    validate: (data) => data.selectedSuppliers?.length > 0,
  },
  {
    id: "orderSelection",
    title: "Select Orders",
    component: OrderSelectionStep,
    validate: (data) => data.selectedOrders?.length > 0,
  },
  {
    id: "templateSelection",
    title: "Email Template",
    component: TemplateSelectionStep,
    validate: (data) => data.templateId != null,
  },
  {
    id: "emailPreview",
    title: "Preview Emails",
    component: EmailPreviewStep,
    validate: () => true, // Always valid as it's just a preview
  },
  {
    id: "confirmation",
    title: "Confirmation",
    component: ConfirmationStep,
    validate: () => true, // Always valid as it's just confirmation
  },
];

const EmailReminderWizard = () => {
  const handleComplete = async (data) => {
    try {
      // Process the completed wizard data
      const result = await window.electron.sendReminderEmails({
        suppliers: data.supplierSelection.selectedSuppliers,
        orders: data.orderSelection.selectedOrders,
        templateId: data.templateSelection.templateId,
        customMessage: data.templateSelection.customMessage,
      });

      if (result.success) {
        toast.success("Reminder emails sent successfully");
        navigate("/dashboard");
      } else {
        toast.error(`Failed to send emails: ${result.error}`);
      }
    } catch (error) {
      console.error("Error sending reminder emails:", error);
      toast.error("An error occurred while sending reminder emails");
    }
  };

  const handleCancel = () => {
    navigate("/dashboard");
  };

  return (
    <WizardContainer
      steps={emailReminderSteps}
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
};
```

## Integration with Other Features

The wizard interface integrates with other application features:

- **Database Service**: Retrieves and stores data through database API
- **Email Templates**: Uses email template system for preview and sending
- **Supplier Management**: Connects with supplier data
- **Order Tracking**: Integrates with order tracking functionality
- **Form Validation**: Implements consistent validation rules

## Customization

The wizard framework supports customization in several ways:

- **Custom Steps**: Create specialized steps for specific workflows
- **Conditional Logic**: Define complex step visibility rules
- **Validation Rules**: Implement custom validation logic
- **UI Themes**: Customize appearance to match application theme
- **Extensions**: Add wizard-specific functionality as needed

## Best Practices

1. **Clear Instructions**: Provide clear guidance at each step
2. **Consistent UI**: Maintain consistent layout and controls across steps
3. **Progress Indication**: Always show current position in the wizard
4. **Error Handling**: Provide clear error messages with resolution guidance
5. **Save Progress**: Automatically save progress to prevent data loss

## Troubleshooting

Common issues and their solutions:

1. **Navigation Issues**: Check step validation rules for preventing advancement
2. **Data Loss**: Verify that data persistence is working correctly
3. **Validation Errors**: Review specific validation errors and input requirements
4. **Performance Problems**: Optimize data handling for large datasets
5. **UI Inconsistencies**: Ensure consistent styling across all wizard steps

## Related Features

- [Email Reminders](email-reminders.md) - Used with the email reminder wizard
- [Supplier Management](supplier-management.md) - Integrated with supplier creation wizard
- [Excel Import](excel-import.md) - Used with the data import wizard
