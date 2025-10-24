import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-neutral-white p-6 rounded-md shadow-lg max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-neutral">
            {t('navigation.settings')}
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-secondary hover:text-neutral text-xl"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-6">
          <LanguageSelector mode="expanded" />
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="btn btn-secondary px-4 py-2"
          >
            {t('buttons.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;