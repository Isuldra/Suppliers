import React, { useState, useEffect } from "react";
import { UserSettings, DEFAULT_SETTINGS } from "../types/Settings";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: UserSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS.user);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const result = await window.electron.getSettings();
      if (result.success && result.data) {
        setSettings(result.data.user);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(settings);
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof UserSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-white rounded-md shadow-lg w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-neutral">Innstillinger</h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral mb-2">
              Din e-postadresse *
            </label>
            <input
              type="email"
              value={settings.senderEmail}
              onChange={(e) => handleInputChange("senderEmail", e.target.value)}
              className="w-full px-3 py-2 border border-neutral-light rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="din.epost@onemed.com"
              required
            />
            <p className="text-xs text-neutral-secondary mt-1">
              Denne adressen vil brukes som avsender for e-poster du sender.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral mb-2">
              Ditt navn (valgfritt)
            </label>
            <input
              type="text"
              value={settings.senderName || ""}
              onChange={(e) => handleInputChange("senderName", e.target.value)}
              className="w-full px-3 py-2 border border-neutral-light rounded-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="OneMed Norge AS"
            />
            <p className="text-xs text-neutral-secondary mt-1">
              Vises som avsendernavn i e-postene.
            </p>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end space-x-4">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            Avbryt
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving || !settings.senderEmail.includes("@")}
          >
            {isSaving ? "Lagrer..." : "Lagre"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
