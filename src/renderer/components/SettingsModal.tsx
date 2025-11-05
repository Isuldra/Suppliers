import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";
import { SettingsData, DEFAULT_SETTINGS } from "../types/Settings";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = useState<string>("");
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [showWebhookUrl, setShowWebhookUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch app version and settings when modal opens
      const fetchData = async () => {
        try {
          const version = await window.electron.getAppVersion();
          setAppVersion(version);
        } catch (error) {
          console.error("Failed to fetch app version:", error);
        }

        // Load settings from localStorage
        try {
          const savedSettings = localStorage.getItem("appSettings");
          if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
          }
        } catch (error) {
          console.error("Failed to load settings:", error);
        }
      };

      fetchData();
    }
  }, [isOpen]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem("appSettings", JSON.stringify(settings));
      console.log("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert(t("settings.saveFailed") || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingChange = (
    field: keyof SettingsData["user"],
    value: string | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      user: {
        ...prev.user,
        [field]: value,
      },
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/60 backdrop-blur-2xl rounded-3xl border border-white/50 shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-neutral">
            {t("navigation.settings")}
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-secondary hover:text-neutral text-xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Language Settings */}
          <div>
            <h4 className="text-sm font-semibold text-neutral mb-3">
              {t("languages.english")} / {t("languages.norwegian")}
            </h4>
            <LanguageSelector mode="expanded" />
          </div>

          {/* Slack Integration Settings */}
          <div className="pt-4 border-t border-neutral-light">
            <h4 className="text-sm font-semibold text-neutral mb-3">
              {t("settings.slackSection")}
            </h4>

            {/* Display Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral mb-1">
                {t("settings.displayName")}
              </label>
              <input
                type="text"
                value={settings.user.displayName || ""}
                onChange={(e) =>
                  handleSettingChange("displayName", e.target.value)
                }
                placeholder={t("settings.displayNamePlaceholder")}
                className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-neutral-secondary mt-1">
                {t("settings.displayNameHelp")}
              </p>
            </div>

            {/* Enable Slack Notifications */}
            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.user.slackNotificationsEnabled || false}
                  onChange={(e) =>
                    handleSettingChange(
                      "slackNotificationsEnabled",
                      e.target.checked
                    )
                  }
                  className="w-4 h-4 text-primary border-neutral-light rounded focus:ring-primary"
                />
                <span className="text-sm font-medium text-neutral">
                  {t("settings.slackNotificationsEnabled")}
                </span>
              </label>
              <p className="text-xs text-neutral-secondary mt-1 ml-6">
                {t("settings.slackNotificationsHelp")}
              </p>
            </div>

            {/* Slack Webhook URL */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral mb-1">
                {t("settings.slackWebhookUrl")}
              </label>
              <div className="relative">
                <input
                  type={showWebhookUrl ? "text" : "password"}
                  value={settings.user.slackWebhookUrl || ""}
                  onChange={(e) =>
                    handleSettingChange("slackWebhookUrl", e.target.value)
                  }
                  placeholder={t("settings.slackWebhookUrlPlaceholder")}
                  className="w-full px-3 py-2 pr-24 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookUrl(!showWebhookUrl)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-primary hover:text-primary-dark px-2 py-1"
                >
                  {showWebhookUrl
                    ? t("settings.hideWebhookUrl")
                    : t("settings.showWebhookUrl")}
                </button>
              </div>
              <p className="text-xs text-neutral-secondary mt-1">
                {t("settings.slackWebhookUrlHelp")}
              </p>
            </div>
          </div>
        </div>

        {appVersion && (
          <div className="mt-4 pt-4 border-t border-neutral-light">
            <p className="text-sm text-neutral-secondary text-center">
              {t("app.version")} {appVersion}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="btn btn-secondary px-4 py-2">
            {t("buttons.close")}
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="btn btn-primary px-4 py-2 disabled:opacity-50"
          >
            {isSaving ? "..." : t("buttons.save")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
