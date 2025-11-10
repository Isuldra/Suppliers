import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import LanguageSelector from './LanguageSelector';
import { SettingsData, DEFAULT_SETTINGS } from '../types/Settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = useState<string>('');
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [showWebhookUrl, setShowWebhookUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Product Catalog state
  const [catalogStats, setCatalogStats] = useState<{
    count: number;
    lastSync: Date | null;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch app version and settings when modal opens
      const fetchData = async () => {
        try {
          const version = await window.electron.getAppVersion();
          setAppVersion(version);
        } catch (error) {
          console.error('Failed to fetch app version:', error);
        }

        // Load settings from localStorage
        try {
          const savedSettings = localStorage.getItem('appSettings');
          if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
          }
        } catch (error) {
          console.error('Failed to load settings:', error);
        }

        // Load product catalog stats
        try {
          const stats = await window.electron.productCatalogGetStats();
          if (stats.success && stats.data) {
            setCatalogStats(stats.data);
          }
        } catch (error) {
          console.error('Failed to load catalog stats:', error);
        }
      };

      fetchData();
    }
  }, [isOpen]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('appSettings', JSON.stringify(settings));
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert(t('settings.saveFailed') || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingChange = (field: keyof SettingsData['user'], value: string | boolean) => {
    setSettings((prev) => ({
      ...prev,
      user: {
        ...prev.user,
        [field]: value,
      },
    }));
  };

  // Product Catalog handlers
  const handleSyncCatalog = async () => {
    setIsSyncing(true);
    setCatalogMessage(null);
    try {
      const result = await window.electron.productCatalogSync();
      if (result.success) {
        setCatalogMessage({
          type: 'success',
          text: `Synkronisert ${result.count} produkter fra cloud`,
        });
        // Refresh stats
        const stats = await window.electron.productCatalogGetStats();
        if (stats.success && stats.data) {
          setCatalogStats(stats.data);
        }
      } else {
        setCatalogMessage({
          type: 'error',
          text: result.error || 'Synkronisering feilet',
        });
      }
    } catch (error) {
      setCatalogMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Ukjent feil',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUploadCatalog = useCallback(async (file: File) => {
    setIsUploading(true);
    setCatalogMessage(null);
    try {
      const buffer = await file.arrayBuffer();
      const result = await window.electron.productCatalogUpload(buffer);

      if (result.success) {
        setCatalogMessage({
          type: 'success',
          text: `Lastet opp ${result.count} produkter til cloud`,
        });
        // Refresh stats
        const stats = await window.electron.productCatalogGetStats();
        if (stats.success && stats.data) {
          setCatalogStats(stats.data);
        }
      } else {
        setCatalogMessage({
          type: 'error',
          text: result.error || 'Opplasting feilet',
        });
      }
    } catch (error) {
      setCatalogMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Ukjent feil',
      });
    } finally {
      setIsUploading(false);
    }
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file && file.name.endsWith('.xlsx')) {
        handleUploadCatalog(file);
      } else {
        setCatalogMessage({
          type: 'error',
          text: 'Kun .xlsx filer er støttet',
        });
      }
    },
    [handleUploadCatalog]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    disabled: isUploading,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/60 backdrop-blur-2xl rounded-3xl border border-white/50 shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-neutral">{t('navigation.settings')}</h3>
          <button onClick={onClose} className="text-neutral-secondary hover:text-neutral text-xl">
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Language Settings */}
          <div>
            <h4 className="text-sm font-semibold text-neutral mb-3">
              {t('languages.english')} / {t('languages.norwegian')}
            </h4>
            <LanguageSelector mode="expanded" />
          </div>

          {/* Slack Integration Settings */}
          <div className="pt-4 border-t border-neutral-light">
            <h4 className="text-sm font-semibold text-neutral mb-3">
              {t('settings.slackSection')}
            </h4>

            {/* Display Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral mb-1">
                {t('settings.displayName')}
              </label>
              <input
                type="text"
                value={settings.user.displayName || ''}
                onChange={(e) => handleSettingChange('displayName', e.target.value)}
                placeholder={t('settings.displayNamePlaceholder')}
                className="w-full px-3 py-2 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-neutral-secondary mt-1">{t('settings.displayNameHelp')}</p>
            </div>

            {/* Enable Slack Notifications */}
            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.user.slackNotificationsEnabled || false}
                  onChange={(e) =>
                    handleSettingChange('slackNotificationsEnabled', e.target.checked)
                  }
                  className="w-4 h-4 text-primary border-neutral-light rounded focus:ring-primary"
                />
                <span className="text-sm font-medium text-neutral">
                  {t('settings.slackNotificationsEnabled')}
                </span>
              </label>
              <p className="text-xs text-neutral-secondary mt-1 ml-6">
                {t('settings.slackNotificationsHelp')}
              </p>
            </div>

            {/* Slack Webhook URL */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral mb-1">
                {t('settings.slackWebhookUrl')}
              </label>
              <div className="relative">
                <input
                  type={showWebhookUrl ? 'text' : 'password'}
                  value={settings.user.slackWebhookUrl || ''}
                  onChange={(e) => handleSettingChange('slackWebhookUrl', e.target.value)}
                  placeholder={t('settings.slackWebhookUrlPlaceholder')}
                  className="w-full px-3 py-2 pr-24 border border-neutral-light rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookUrl(!showWebhookUrl)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-primary hover:text-primary-dark px-2 py-1"
                >
                  {showWebhookUrl ? t('settings.hideWebhookUrl') : t('settings.showWebhookUrl')}
                </button>
              </div>
              <p className="text-xs text-neutral-secondary mt-1">
                {t('settings.slackWebhookUrlHelp')}
              </p>
            </div>
          </div>

          {/* Product Catalog Section */}
          <div className="pt-4 border-t border-neutral-light">
            <h4 className="text-sm font-semibold text-neutral mb-3">Produktkatalog</h4>

            {/* Catalog Stats */}
            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral">
                    Status:{' '}
                    {catalogStats
                      ? `${catalogStats.count.toLocaleString('nb-NO')} produkter`
                      : 'Ikke synkronisert'}
                  </p>
                  {catalogStats?.lastSync && (
                    <p className="text-xs text-neutral-secondary mt-1">
                      Sist synkronisert: {new Date(catalogStats.lastSync).toLocaleString('nb-NO')}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleSyncCatalog}
                  disabled={isSyncing}
                  className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
                >
                  {isSyncing ? 'Synkroniserer...' : 'Synkroniser'}
                </button>
              </div>
            </div>

            {/* Upload Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral mb-2">
                Last opp ny produktkatalog
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary-light/10'
                    : isUploading
                      ? 'border-neutral-light bg-gray-100 cursor-not-allowed'
                      : 'border-neutral-light hover:border-primary hover:bg-blue-50'
                }`}
              >
                <input {...getInputProps()} />
                {isUploading ? (
                  <p className="text-sm text-neutral-secondary">Laster opp produktkatalog...</p>
                ) : isDragActive ? (
                  <p className="text-sm text-primary font-medium">Slipp filen her...</p>
                ) : (
                  <div>
                    <p className="text-sm text-neutral font-medium">
                      Dra og slipp Produktkatalog.xlsx her
                    </p>
                    <p className="text-xs text-neutral-secondary mt-1">
                      eller klikk for å velge fil
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-neutral-secondary mt-2">
                Forventer kolonne A: &quot;Item No.&quot; og kolonne C: &quot;Item description&quot;
              </p>
            </div>

            {/* Message Display */}
            {catalogMessage && (
              <div
                className={`p-3 rounded-md ${
                  catalogMessage.type === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                <p className="text-sm">{catalogMessage.text}</p>
              </div>
            )}
          </div>
        </div>

        {appVersion && (
          <div className="mt-4 pt-4 border-t border-neutral-light">
            <p className="text-sm text-neutral-secondary text-center">
              {t('app.version')} {appVersion}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="btn btn-secondary px-4 py-2">
            {t('buttons.close')}
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="btn btn-primary px-4 py-2 disabled:opacity-50"
          >
            {isSaving ? '...' : t('buttons.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
