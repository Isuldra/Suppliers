import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { resetLanguageToSystem } from '../services/languageDetectionService';

interface LanguageSelectorProps {
  mode?: 'compact' | 'expanded';
  className?: string;
}

interface DropdownPosition {
  top: number;
  right: number;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  mode = 'compact',
  className = '',
}) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, right: 0 });

  // Calculate dropdown position based on button location
  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4, // 4px margin (mt-1)
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  // Calculate dropdown position when opening and update on resize/scroll
  useEffect(() => {
    if (isOpen) {
      updatePosition();

      // Update position on window resize and scroll
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, updatePosition]);

  const languages = [
    { code: 'no', name: t('languages.norwegian'), flag: '🇳🇴' },
    { code: 'se', name: t('languages.swedish'), flag: '🇸🇪' },
    { code: 'da', name: t('languages.danish'), flag: '🇩🇰' },
    { code: 'fi', name: t('languages.finnish'), flag: '🇫🇮' },
    { code: 'en', name: t('languages.english'), flag: '🇬🇧' },
  ];

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    // Mark that user has manually selected a language
    localStorage.setItem('userSelectedLanguage', 'true');
    setIsOpen(false);
  };

  const handleResetToSystem = async () => {
    const systemLanguage = await resetLanguageToSystem();
    i18n.changeLanguage(systemLanguage);
    setIsOpen(false);
  };

  if (mode === 'expanded') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="space-y-2">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`w-full flex items-center space-x-3 p-3 rounded-md border transition-colors ${
                i18n.language === language.code
                  ? 'bg-primary text-neutral-white border-primary'
                  : 'bg-neutral-white text-neutral border-neutral-light hover:bg-neutral-light'
              }`}
            >
              <span className="text-xl">{language.flag}</span>
              <span className="font-medium">{language.name}</span>
              {i18n.language === language.code && <span className="ml-auto text-sm">✓</span>}
            </button>
          ))}
        </div>
        <div className="border-t border-neutral-light pt-4">
          <button
            onClick={handleResetToSystem}
            className="w-full flex items-center space-x-3 p-3 rounded-md border border-neutral-light bg-neutral-white text-neutral hover:bg-neutral-light transition-colors"
          >
            <span className="text-xl">🔄</span>
            <span className="font-medium">Reset to system language</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="h-11 w-11 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-xl border border-white/30 flex items-center justify-center hover:from-white/30 hover:to-white/20 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl group"
        title={t('navigation.language') || 'Language'}
      >
        <span className="text-xl group-hover:scale-110 transition-transform duration-200">
          {currentLanguage.flag}
        </span>
      </button>

      {isOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />

            {/* Dropdown */}
            <div
              className="fixed w-48 bg-neutral-white border border-neutral-light rounded-md shadow-lg z-[9999]"
              style={{
                top: dropdownPosition.top,
                right: dropdownPosition.right,
              }}
            >
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-neutral-light transition-colors ${
                    i18n.language === language.code
                      ? 'bg-primary text-neutral-white'
                      : 'text-neutral'
                  }`}
                >
                  <span className="text-lg">{language.flag}</span>
                  <span className="font-medium">{language.name}</span>
                  {i18n.language === language.code && <span className="ml-auto text-sm">✓</span>}
                </button>
              ))}
              <div className="border-t border-neutral-light">
                <button
                  onClick={handleResetToSystem}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-neutral-light transition-colors text-neutral text-sm"
                >
                  <span className="text-sm">🔄</span>
                  <span>Reset to system language</span>
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};

export default LanguageSelector;
