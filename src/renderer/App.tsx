import React, { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
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
import SettingsModal from "./components/SettingsModal";
// WelcomeScreen removed - language is now detected automatically
import LanguageSelector from "./components/LanguageSelector";
import { ExcelData, ValidationError } from "./types/ExcelData";
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import supplyPlannersData from "./data/supplyPlanners.json";
import { SlackService } from "./services/slackService";
import {
  Cog6ToothIcon,
  ChartBarIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";

// i18n is now initialized asynchronously in index.tsx

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
  const { t } = useTranslation();

  const steps = [
    {
      id: "upload",
      label: t("progress.uploadFile"),
      completed: !!appState.excelData,
    },
    {
      id: "weekday",
      label: t("progress.selectWeekday"),
      completed: !!appState.selectedWeekday,
    },
    {
      id: "supplier",
      label: t("progress.selectSupplier"),
      completed: !!appState.selectedSupplier,
    },
    {
      id: "review",
      label: t("progress.reviewData"),
      completed: appState.showDataReview,
    },
    {
      id: "email",
      label: t("progress.sendEmail"),
      completed: appState.showEmailButton,
    },
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
                  : "border-gray-300 text-neutral-secondary"
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
                  step.completed ? "bg-primary" : "bg-gray-300"
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
  const { t } = useTranslation();

  if (!isOpen) return null;

  const shortcuts = [
    { key: "Ctrl/Cmd + R", description: t("keyboardShortcuts.reset") },
    { key: "Escape", description: t("keyboardShortcuts.goBack") },
    { key: "Enter", description: t("keyboardShortcuts.confirm") },
    { key: "Tab", description: t("keyboardShortcuts.navigate") },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/60 backdrop-blur-2xl rounded-3xl border border-white/50 shadow-2xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-neutral">
            {t("keyboardShortcuts.title")}
          </h3>
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
            {t("buttons.close")}
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
  const { t } = useTranslation();
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [appVersion, setAppVersion] = useState<string>("");
  // Welcome screen removed - language is now detected automatically

  useEffect(() => {
    console.log("🟢 App.tsx mounted!");

    // Fetch app version
    const fetchVersion = async () => {
      try {
        const version = await window.electron.getAppVersion();
        setAppVersion(version);
      } catch (error) {
        console.error("Failed to fetch app version:", error);
      }
    };

    fetchVersion();

    // Listen for update available events and send Slack notification
    const unsubscribeUpdate = window.electron.onUpdateAvailable(
      (info: unknown) => {
        console.log("Update available:", info);

        // Type guard for update info
        const updateInfo = info as { version?: string };
        if (!updateInfo.version) return;

        // Send Slack notification (non-blocking)
        SlackService.sendDeploymentNotification({
          version: updateInfo.version as string,
          timestamp: new Date().toLocaleString("no-NO", {
            dateStyle: "short",
            timeStyle: "short",
          }),
        }).catch((error: Error) => {
          console.error("Failed to send Slack deployment notification:", error);
        });
      }
    );

    return () => {
      unsubscribeUpdate();
    };
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
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `
          radial-gradient(circle at 20% 30%, rgba(73, 120, 134, 0.25) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(106, 153, 167, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(184, 216, 233, 0.2) 0%, transparent 50%),
          linear-gradient(135deg, #e0f2f5 0%, #b8d8e9 30%, #a8d0e0 60%, #ffffff 100%)
        `,
      }}
    >
      <div className="bg-gradient-to-r from-primary via-primary to-primary-dark text-neutral-white shadow-lg backdrop-blur-lg">
        <div className="container-app py-4 px-4">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {appVersion && (
                <span className="text-xs text-neutral-white/70 bg-white/10 backdrop-blur-sm border border-white/20 px-2 py-1 rounded">
                  v{appVersion}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="h-11 px-5 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-xl border border-white/30 text-white text-sm font-semibold flex items-center gap-2.5 hover:from-white/30 hover:to-white/20 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <ChartBarIcon className="w-5 h-5" />
                {t("navigation.dashboard")}
              </Link>
              <LanguageSelector mode="compact" />
              <button
                onClick={() => setShowSettings(true)}
                className="h-11 w-11 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-xl border border-white/30 flex items-center justify-center hover:from-white/30 hover:to-white/20 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl group"
                title={t("navigation.settings")}
              >
                <Cog6ToothIcon className="w-5 h-5 text-white/90 group-hover:text-white" />
              </button>
              <button
                onClick={() => setShowKeyboardShortcuts(true)}
                className="h-11 w-11 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-xl border border-white/30 flex items-center justify-center hover:from-white/30 hover:to-white/20 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl group"
                title={`${t("navigation.keyboardShortcuts")} (Ctrl/Cmd + ?)`}
              >
                <CommandLineIcon className="w-5 h-5 text-white/90 group-hover:text-white" />
              </button>
            </div>
          </div>
          {/* Title row */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-1">{t("app.title")}</h1>
            <p className="text-sm text-neutral-white/80">
              {t("app.welcome.description")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div
          className={`mx-auto w-full bg-white/20 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl ${
            appState.isBulkMode
              ? "max-w-7xl lg:max-w-6xl md:max-w-4xl px-4 sm:px-6 lg:px-8 p-4 sm:p-6 lg:p-8"
              : "max-w-4xl p-6 sm:p-8"
          }`}
        >
          {/* Progress Indicator - Show when file is uploaded */}
          {appState.excelData && (
            <div className="bg-white/50 backdrop-blur-2xl rounded-xl border border-white/40 shadow-xl p-6 mb-6 w-full transition-all duration-300 hover:bg-white/60 hover:shadow-2xl">
              <ProgressIndicator appState={appState} />
            </div>
          )}

          {/* File Upload Section - Always visible but changes state after upload */}
          <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6 mb-6 w-full transition-all duration-300 hover:bg-white/70 hover:shadow-2xl">
            {!appState.excelData ? (
              // Show full upload interface when no file is loaded
              <>
                <h2 className="text-xl font-bold mb-4 text-slate-900">
                  {t("fileUpload.title")}
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
                  <h2 className="text-xl font-bold text-slate-900">
                    {t("fileUpload.fileLoaded")}
                  </h2>
                  <p className="text-sm text-slate-700 mt-1">
                    {appState.excelData.bp.length} {t("fileUpload.rowsReady")}
                  </p>
                </div>
                <button onClick={onResetApp} className="btn btn-secondary">
                  {t("fileUpload.uploadNewFile")}
                </button>
              </div>
            )}
          </div>

          {/* Show validation errors if any */}
          {appState.validationErrors.length > 0 && (
            <div className="mb-6 p-4 bg-accent bg-opacity-10 border border-accent rounded-md w-full">
              <h3 className="text-accent font-medium mb-2">
                {t("validation.errors")}
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
            <div className="bg-white/50 backdrop-blur-2xl rounded-xl border border-white/40 shadow-xl p-6 mb-6 w-full transition-all duration-300 hover:bg-white/60 hover:shadow-2xl">
              <h2 className="text-xl font-bold mb-4 text-slate-900">
                {t("configuration.title")}
              </h2>

              {/* Weekday Selection - Show directly since there's only one planner */}
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3 text-neutral">
                  {t("configuration.weekday")}
                </h3>
                <WeekdaySelect
                  onWeekdaySelected={onWeekdaySelected}
                  currentWeekday={appState.selectedWeekday}
                  selectedPlanner={appState.selectedPlanner}
                />
              </div>

              {/* Bulk Mode Toggle - Only show if weekday is selected */}
              {appState.selectedWeekday && (
                <div className="mb-6 p-4 bg-white/40 backdrop-blur-md rounded-lg border border-white/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-slate-900 mb-1">
                        {t("configuration.sendingMode")}
                      </h3>
                      <p className="text-sm text-slate-700">
                        {t("configuration.sendingModeDescription")}
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
                        {t("configuration.singleSupplier")}
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
                        {t("configuration.multipleSuppliers")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Supplier Selection - Only show if weekday is selected */}
              {appState.selectedWeekday && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3 text-slate-900">
                    {appState.isBulkMode
                      ? t("configuration.suppliers")
                      : t("configuration.supplier")}
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
              <div className="bg-white/50 backdrop-blur-2xl rounded-xl border border-white/40 shadow-xl p-6 mb-6 w-full transition-all duration-300 hover:bg-white/60 hover:shadow-2xl">
                <h2 className="text-xl font-bold mb-4 text-slate-900">
                  {t("dataReview.title")}
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
              <div className="bg-white/50 backdrop-blur-2xl rounded-xl border border-white/40 shadow-xl p-6 mb-6 w-full transition-all duration-300 hover:bg-white/60 hover:shadow-2xl">
                <h2 className="text-xl font-bold mb-4 text-slate-900">
                  {t("email.title")}
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
              <div className="bg-white/50 backdrop-blur-2xl rounded-xl border border-white/40 shadow-xl p-6 mb-6 w-full transition-all duration-300 hover:bg-white/60 hover:shadow-2xl">
                <h2 className="text-xl font-bold mb-4 text-slate-900">
                  {t("dataReview.reviewOrderLines")}
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
              <div className="bg-white/50 backdrop-blur-2xl rounded-xl border border-white/40 shadow-xl p-6 mb-6 w-full transition-all duration-300 hover:bg-white/60 hover:shadow-2xl">
                <h2 className="text-xl font-bold mb-4 text-slate-900">
                  {t("email.previewAndSend")}
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

      {/* Welcome Screen removed - language is now detected automatically */}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

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
