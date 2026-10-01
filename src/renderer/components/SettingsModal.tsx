import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';
import { Modal } from '../workspace/Primitives';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    window.electron.getAppVersion().then(
      (version) => {
        if (active) setAppVersion(version);
      },
      (error) => console.error('Failed to fetch app version:', error)
    );
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <Modal title={t('navigation.settings')} onClose={onClose}>
      <LanguageSelector mode="expanded" />
      {appVersion && (
        <p>
          {t('app.version')} {appVersion}
        </p>
      )}
      <div className="pulse-flex">
        <button onClick={onClose}>{t('buttons.close')}</button>
      </div>
    </Modal>
  );
}
