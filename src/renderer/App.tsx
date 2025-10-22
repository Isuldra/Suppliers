import React, { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import FileUpload from "./components/FileUpload";
import DataReview from "./components/DataReview";
import EmailButton from "./components/EmailButton";
import SupplierSelect from "./components/SupplierSelect";
import WeekdaySelect from "./components/WeekdaySelect";
import LogViewer from "./components/LogViewer";
import Dashboard from "./components/Dashboard";
import BulkSupplierSelect from "./components/BulkSupplierSelect";
import BulkDataReview from "./components/BulkDataReview";
import BulkEmailPreview from "./components/BulkEmailPreview";
import { ExcelData, ValidationError } from "./types/ExcelData";
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import supplyPlannersData from "./data/supplyPlanners.json";

// Import the OneMed logo
import onemedLogo from "./assets/onemed-logo.webp";

// New AppState interface to replace WizardState
interface AppState {
  excelData?: ExcelData;
  selectedPlanner: string;
  selectedWeekday: string;
  selectedSupplier: string;
  validationErrors: ValidationError[];
  isLoading: boolean;
  showDataReview: boolean;
  showEmailButton: boolean;
  // Bulk mode state
  isBulkMode: boolean;
  selectedSuppliers: string[];
  bulkEmailData: Map<string, unknown>; // Per supplier email data
  bulkSelectedOrders: Map<string, Set<string>>; // Per supplier selected orders
  bulkSupplierEmails: Map<string, string>; // Per supplier custom emails
}

// Progress indicator component
const ProgressIndicator: React.FC<{ appState: AppState }> = ({ appState }) => {
  const steps = [
    { id: "upload", label: "Last opp fil", completed: !!appState.excelData },
    {
      id: "weekday",
      label: "Velg ukedag",
      completed: !!appState.selectedWeekday,
    },
    {
      id: "supplier",
      label: "Velg leverandør",
      completed: !!appState.selectedSupplier,
    },
    {
      id: "review",
      label: "Gjennomgå data",
      completed: appState.showDataReview,
    },
    { id: "email", label: "Send e-post", completed: appState.showEmailButton },
  ];

  const currentStepIndex = steps.findIndex((step) => !step.completed);
  const activeStep =
    currentStepIndex === -1 ? steps.length - 1 : currentStepIndex;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium ${
                step.completed
                  ? "bg-primary border-primary text-neutral-white"
                  : index === activeStep
                  ? "border-primary text-primary"
                  : "border-neutral-light text-neutral-secondary"
              }`}
            >
              {step.completed ? "✓" : index + 1}
            </div>
            <span
              className={`ml-2 text-sm font-medium ${
                step.completed
                  ? "text-primary"
                  : index === activeStep
                  ? "text-neutral"
                  : "text-neutral-secondary"
              }`}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-4 ${
                  step.completed ? "bg-primary" : "bg-neutral-light"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Keyboard shortcuts help modal
const KeyboardShortcutsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "Ctrl/Cmd + R", description: "Start på nytt" },
    { key: "Escape", description: "Gå tilbake ett steg" },
    { key: "Enter", description: "Bekreft valg" },
    { key: "Tab", description: "Naviger mellom felter" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-neutral-white p-6 rounded-md shadow-lg max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-neutral">Hurtigtaster</h3>
          <button
            onClick={onClose}
            className="text-neutral-secondary hover:text-neutral"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex justify-between items-center">
              <kbd className="px-2 py-1 bg-neutral-light rounded text-sm font-mono">
                {shortcut.key}
              </kbd>
              <span className="text-sm text-neutral-secondary">
                {shortcut.description}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <button onClick={onClose} className="btn btn-primary px-4 py-2">
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
};

// Move state to top-level App component
const App: React.FC = () => {
  // Global app state that persists across route changes
  const [appState, setAppState] = useState<AppState>({
    excelData: undefined,
    selectedPlanner: supplyPlannersData.planners[0].name,
    selectedWeekday: "",
    selectedSupplier: "",
    validationErrors: [],
    isLoading: false,
    showDataReview: false,
    showEmailButton: false,
    // Bulk mode state
    isBulkMode: false,
    selectedSuppliers: [],
    bulkEmailData: new Map(),
    bulkSelectedOrders: new Map(),
    bulkSupplierEmails: new Map(),
  });

  const handleDataParsed = (data: ExcelData) => {
    console.log("Excel data parsed in App:", data);
    setAppState((prev) => ({
      ...prev,
      excelData: data,
    }));
  };

  const handleValidationErrors = (errors: ValidationError[]) => {
    setAppState((prev) => ({
      ...prev,
      validationErrors: errors,
    }));
  };

  const handleWeekdaySelected = (weekday: string) => {
    setAppState((prev) => ({
      ...prev,
      selectedWeekday: weekday,
      selectedSupplier: "", // Reset supplier when weekday changes
    }));
  };

  const handleSupplierSelected = (supplier: string) => {
    setAppState((prev) => ({
      ...prev,
      selectedSupplier: supplier,
      showDataReview: true, // Automatically show data review when supplier is selected
      showEmailButton: false, // Reset email button state
    }));
  };

  const handleReviewComplete = () => {
    setAppState((prev) => ({
      ...prev,
      showDataReview: false,
      showEmailButton: true,
    }));
  };

  const resetApp = () => {
    setAppState({
      excelData: undefined,
      selectedPlanner: supplyPlannersData.planners[0].name,
      selectedWeekday: "",
      selectedSupplier: "",
      validationErrors: [],
      isLoading: false,
      showDataReview: false,
      showEmailButton: false,
      // Bulk mode state
      isBulkMode: false,
      selectedSuppliers: [],
      bulkEmailData: new Map(),
      bulkSelectedOrders: new Map(),
      bulkSupplierEmails: new Map(),
    });
  };

  // Bulk mode handlers
  const handleToggleBulkMode = () => {
    setAppState((prev) => ({
      ...prev,
      isBulkMode: !prev.isBulkMode,
      // Reset single supplier state when switching to bulk mode
      selectedSupplier: prev.isBulkMode ? prev.selectedSupplier : "",
      showDataReview: prev.isBulkMode ? prev.showDataReview : false,
      showEmailButton: prev.isBulkMode ? prev.showEmailButton : false,
      // Reset bulk state when switching to single mode
      selectedSuppliers: !prev.isBulkMode ? [] : prev.selectedSuppliers,
      bulkEmailData: !prev.isBulkMode ? new Map() : prev.bulkEmailData,
      bulkSelectedOrders: !prev.isBulkMode
        ? new Map()
        : prev.bulkSelectedOrders,
      bulkSupplierEmails: !prev.isBulkMode
        ? new Map()
        : prev.bulkSupplierEmails,
    }));
  };

  const handleSuppliersSelected = (suppliers: string[]) => {
    console.log("🟢 App.tsx: handleSuppliersSelected called with:", suppliers);
    console.log("🟢 suppliers type:", typeof suppliers);
    console.log("🟢 suppliers is array:", Array.isArray(suppliers));
    console.log("🟢 suppliers length:", suppliers.length);
    console.log(
      "🟢 Current appState.selectedSuppliers:",
      appState.selectedSuppliers
    );
    console.log(
      "🟢 Current appState.selectedSuppliers type:",
      typeof appState.selectedSuppliers
    );
    console.log(
      "🟢 Current appState.selectedSuppliers is array:",
      Array.isArray(appState.selectedSuppliers)
    );

    // Remove duplicates to prevent counting issues
    const uniqueSuppliers = [...new Set(suppliers)];

    setAppState((prev) => {
      const newState = {
        ...prev,
        selectedSuppliers: uniqueSuppliers,
      };
      console.log("🟢 New appState will be:", newState);
      console.log(
        "🟢 New appState.selectedSuppliers:",
        newState.selectedSuppliers
      );
      return newState;
    });

    // Also log after state update
    setTimeout(() => {
      console.log("🟢 App state after update:", appState.selectedSuppliers);
    }, 100);
  };

  const handleBulkOrdersSelected = (supplier: string, orders: Set<string>) => {
    setAppState((prev) => {
      const newBulkSelectedOrders = new Map(prev.bulkSelectedOrders);
      newBulkSelectedOrders.set(supplier, orders);
      return {
        ...prev,
        bulkSelectedOrders: newBulkSelectedOrders,
      };
    });
  };

  const handleBulkSupplierEmailChange = (supplier: string, email: string) => {
    console.log(
      "🟢 App.tsx: handleBulkSupplierEmailChange called:",
      supplier,
      email
    );
    setAppState((prev) => {
      const newBulkSupplierEmails = new Map(prev.bulkSupplierEmails);
      newBulkSupplierEmails.set(supplier, email);
      return {
        ...prev,
        bulkSupplierEmails: newBulkSupplierEmails,
      };
    });
  };

  const handleBulkComplete = () => {
    setAppState((prev) => ({
      ...prev,
      selectedSuppliers: [],
      bulkEmailData: new Map(),
      bulkSelectedOrders: new Map(),
      bulkSupplierEmails: new Map(),
      showDataReview: false,
    }));
  };

  const handleBulkDataReviewNext = (
    selectedOrders: Map<string, Set<string>>
  ) => {
    console.log(
      "🟢 App.tsx: handleBulkDataReviewNext called with selectedOrders:",
      selectedOrders
    );
    setAppState((prev) => ({
      ...prev,
      bulkSelectedOrders: selectedOrders,
      showDataReview: true, // This will show BulkEmailPreview in bulk mode
    }));
  };

  const handleBulkDataReviewBack = () => {
    setAppState((prev) => ({ ...prev, selectedSuppliers: [] }));
  };

  const handleBulkEmailPreviewBack = () => {
    setAppState((prev) => ({ ...prev, showDataReview: false }));
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <MainApp
              appState={appState}
              onDataParsed={handleDataParsed}
              onValidationErrors={handleValidationErrors}
              onWeekdaySelected={handleWeekdaySelected}
              onSupplierSelected={handleSupplierSelected}
              onReviewComplete={handleReviewComplete}
              onResetApp={resetApp}
              onToggleBulkMode={handleToggleBulkMode}
              onSuppliersSelected={handleSuppliersSelected}
              onBulkOrdersSelected={handleBulkOrdersSelected}
              onBulkSupplierEmailChange={handleBulkSupplierEmailChange}
              onBulkComplete={handleBulkComplete}
              onBulkDataReviewNext={handleBulkDataReviewNext}
              onBulkDataReviewBack={handleBulkDataReviewBack}
              onBulkEmailPreviewBack={handleBulkEmailPreviewBack}
            />
          }
        />
        <Route path="/logs" element={<LogViewer />} />
        <Route
          path="/dashboard"
          element={
            <Dashboard
              appState={appState}
              onDataParsed={handleDataParsed}
              onValidationErrors={handleValidationErrors}
              onWeekdaySelected={handleWeekdaySelected}
              onSupplierSelected={handleSupplierSelected}
              onReviewComplete={handleReviewComplete}
              onResetApp={resetApp}
              onToggleBulkMode={handleToggleBulkMode}
              onSuppliersSelected={handleSuppliersSelected}
              onBulkOrdersSelected={handleBulkOrdersSelected}
              onBulkSupplierEmailChange={handleBulkSupplierEmailChange}
              onBulkComplete={handleBulkComplete}
              onBulkDataReviewNext={handleBulkDataReviewNext}
              onBulkDataReviewBack={handleBulkDataReviewBack}
              onBulkEmailPreviewBack={handleBulkEmailPreviewBack}
            />
          }
        />
      </Routes>
    </Router>
  );
};

// MainApp component now receives state as props
interface MainAppProps {
  appState: AppState;
  onDataParsed: (data: ExcelData) => void;
  onValidationErrors: (errors: ValidationError[]) => void;
  onWeekdaySelected: (weekday: string) => void;
  onSupplierSelected: (supplier: string) => void;
  onReviewComplete: () => void;
  onResetApp: () => void;
  // Bulk mode handlers
  onToggleBulkMode: () => void;
  onSuppliersSelected: (suppliers: string[]) => void;
  onBulkOrdersSelected: (supplier: string, orders: Set<string>) => void;
  onBulkSupplierEmailChange: (supplier: string, email: string) => void;
  onBulkComplete: () => void;
  onBulkDataReviewNext: (selectedOrders: Map<string, Set<string>>) => void;
  onBulkDataReviewBack: () => void;
  onBulkEmailPreviewBack: () => void;
}

const MainApp: React.FC<MainAppProps> = ({
  appState,
  onDataParsed,
  onValidationErrors,
  onWeekdaySelected,
  onSupplierSelected,
  onReviewComplete,
  onResetApp,
  onToggleBulkMode,
  onSuppliersSelected,
  onBulkOrdersSelected: _onBulkOrdersSelected,
  onBulkSupplierEmailChange,
  onBulkComplete,
  onBulkDataReviewNext,
  onBulkDataReviewBack,
  onBulkEmailPreviewBack,
}) => {
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  useEffect(() => {
    console.log("🟢 App.tsx mounted!");
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + R to reset app
      if ((event.ctrlKey || event.metaKey) && event.key === "r") {
        event.preventDefault();
        onResetApp();
      }

      // Ctrl/Cmd + ? to show keyboard shortcuts
      if ((event.ctrlKey || event.metaKey) && event.key === "?") {
        event.preventDefault();
        setShowKeyboardShortcuts(true);
      }

      // Escape to go back one step or close modal
      if (event.key === "Escape") {
        if (showKeyboardShortcuts) {
          setShowKeyboardShortcuts(false);
        } else if (appState.showEmailButton) {
          // Go back to data review
          onReviewComplete();
        } else if (appState.showDataReview) {
          // Go back to supplier selection
          onSupplierSelected("");
        } else if (appState.selectedSupplier) {
          // Clear supplier selection
          onSupplierSelected("");
        } else if (appState.selectedWeekday) {
          // Clear weekday selection
          onWeekdaySelected("");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    appState,
    onResetApp,
    onReviewComplete,
    onSupplierSelected,
    onWeekdaySelected,
    showKeyboardShortcuts,
  ]);

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
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="btn btn-secondary text-sm">
              Dashboard
            </Link>
            <button
              onClick={() => setShowKeyboardShortcuts(true)}
              className="btn btn-secondary text-sm"
              title="Hurtigtaster (Ctrl/Cmd + ?)"
            >
              ⌨️
            </button>
            <div className="w-10">
              {/* Tomt element for å balansere layouten */}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto w-full">
          {/* Progress Indicator - Show when file is uploaded */}
          {appState.excelData && (
            <div className="bg-neutral-white p-6 rounded-md shadow-md mb-6 w-full">
              <ProgressIndicator appState={appState} />
            </div>
          )}

          {/* File Upload Section - Always visible but changes state after upload */}
          <div className="bg-neutral-white p-6 rounded-md shadow-md mb-6 w-full">
            {!appState.excelData ? (
              // Show full upload interface when no file is loaded
              <>
                <h2 className="text-xl font-bold mb-4 text-neutral">
                  Last opp Excel-fil
                </h2>
                <FileUpload
                  onDataParsed={onDataParsed}
                  onValidationErrors={onValidationErrors}
                />
              </>
            ) : (
              // Show file status when file is loaded
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-neutral">
                    Excel-fil lastet opp
                  </h2>
                  <p className="text-sm text-neutral-secondary mt-1">
                    {appState.excelData.bp.length} rader med data er klar for
                    behandling
                  </p>
                </div>
                <button onClick={onResetApp} className="btn btn-secondary">
                  Last opp ny fil
                </button>
              </div>
            )}
          </div>

          {/* Show validation errors if any */}
          {appState.validationErrors.length > 0 && (
            <div className="mb-6 p-4 bg-accent bg-opacity-10 border border-accent rounded-md w-full">
              <h3 className="text-accent font-medium mb-2">
                Feil ved validering:
              </h3>
              <ul className="list-disc pl-5 text-sm text-neutral">
                {appState.validationErrors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Configuration Section - Only show if file is uploaded */}
          {appState.excelData && (
            <div className="bg-neutral-white p-6 rounded-md shadow-md mb-6 w-full">
              <h2 className="text-xl font-bold mb-4 text-neutral">
                Konfigurasjon
              </h2>

              {/* Weekday Selection - Show directly since there's only one planner */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3 text-neutral">
                  Ukedag
                </h3>
                <WeekdaySelect
                  onWeekdaySelected={onWeekdaySelected}
                  currentWeekday={appState.selectedWeekday}
                  selectedPlanner={appState.selectedPlanner}
                />
              </div>

              {/* Bulk Mode Toggle - Only show if weekday is selected */}
              {appState.selectedWeekday && (
                <div className="mb-6 p-4 bg-neutral-light bg-opacity-30 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-neutral mb-1">
                        Sendingsmodus
                      </h3>
                      <p className="text-sm text-neutral-secondary">
                        Velg mellom enkelt leverandør eller flere leverandører
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-sm font-medium ${
                          !appState.isBulkMode
                            ? "text-primary"
                            : "text-neutral-secondary"
                        }`}
                      >
                        Enkelt leverandør
                      </span>
                      <button
                        onClick={onToggleBulkMode}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          appState.isBulkMode
                            ? "bg-primary"
                            : "bg-neutral-light"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-neutral-white transition-transform ${
                            appState.isBulkMode
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span
                        className={`text-sm font-medium ${
                          appState.isBulkMode
                            ? "text-primary"
                            : "text-neutral-secondary"
                        }`}
                      >
                        Flere leverandører
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Supplier Selection - Only show if weekday is selected */}
              {appState.selectedWeekday && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3 text-neutral">
                    {appState.isBulkMode ? "Leverandører" : "Leverandør"}
                  </h3>
                  {appState.isBulkMode ? (
                    <BulkSupplierSelect
                      onSuppliersSelected={onSuppliersSelected}
                      onOrderLinesSelected={_onBulkOrdersSelected}
                      onSupplierEmailChange={onBulkSupplierEmailChange}
                      selectedWeekday={appState.selectedWeekday}
                      selectedPlanner={appState.selectedPlanner}
                      selectedSuppliers={appState.selectedSuppliers}
                      bulkSupplierEmails={appState.bulkSupplierEmails}
                    />
                  ) : (
                    <SupplierSelect
                      onSupplierSelected={onSupplierSelected}
                      currentSupplier={appState.selectedSupplier}
                      excelData={appState.excelData}
                      selectedWeekday={appState.selectedWeekday}
                      selectedPlanner={appState.selectedPlanner}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Data Review Section - Single supplier mode */}
          {!appState.isBulkMode &&
            appState.showDataReview &&
            appState.selectedSupplier &&
            appState.excelData && (
              <div className="bg-neutral-white p-6 rounded-md shadow-md mb-6 w-full">
                <h2 className="text-xl font-bold mb-4 text-neutral">
                  Gjennomgå data
                </h2>
                <DataReview
                  excelData={appState.excelData}
                  selectedWeekday={appState.selectedWeekday}
                  selectedSupplier={appState.selectedSupplier}
                  onNext={onReviewComplete}
                />
              </div>
            )}

          {/* Email Button Section - Single supplier mode */}
          {!appState.isBulkMode &&
            appState.showEmailButton &&
            appState.selectedSupplier &&
            appState.excelData && (
              <div className="bg-neutral-white p-6 rounded-md shadow-md mb-6 w-full">
                <h2 className="text-xl font-bold mb-4 text-neutral">
                  Send e-post
                </h2>
                <EmailButton
                  excelData={appState.excelData}
                  selectedSupplier={appState.selectedSupplier}
                />
              </div>
            )}

          {/* Bulk Data Review Section - Bulk mode */}
          {appState.isBulkMode &&
            appState.selectedSuppliers.length > 0 &&
            !appState.showDataReview && (
              <div className="bg-neutral-white p-6 rounded-md shadow-md mb-6 w-full">
                <h2 className="text-xl font-bold mb-4 text-neutral">
                  Gjennomgå ordrelinjer
                </h2>
                <BulkDataReview
                  selectedSuppliers={appState.selectedSuppliers}
                  selectedWeekday={appState.selectedWeekday}
                  onNext={onBulkDataReviewNext}
                  onBack={onBulkDataReviewBack}
                />
              </div>
            )}

          {/* Bulk Email Preview Section - Bulk mode */}
          {appState.isBulkMode &&
            appState.showDataReview &&
            appState.selectedSuppliers.length > 0 && (
              <div className="bg-neutral-white p-6 rounded-md shadow-md mb-6 w-full">
                <h2 className="text-xl font-bold mb-4 text-neutral">
                  E-post forhåndsvisning og sending
                </h2>
                <BulkEmailPreview
                  selectedSuppliers={appState.selectedSuppliers}
                  selectedOrders={appState.bulkSelectedOrders}
                  bulkSupplierEmails={appState.bulkSupplierEmails}
                  onBack={onBulkEmailPreviewBack}
                  onComplete={onBulkComplete}
                />
              </div>
            )}
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      <Toaster />
    </div>
  );
};

export default App;
