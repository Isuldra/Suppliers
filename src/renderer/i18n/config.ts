import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { detectAppLanguage } from '../services/languageDetectionService';

// Import translation files
import noTranslation from '../locales/no.json';
import seTranslation from '../locales/se.json';
import daTranslation from '../locales/da.json';
import fiTranslation from '../locales/fi.json';
import enTranslation from '../locales/en.json';

const resources = {
  no: {
    translation: noTranslation,
  },
  se: {
    translation: seTranslation,
  },
  da: {
    translation: daTranslation,
  },
  fi: {
    translation: fiTranslation,
  },
  en: {
    translation: enTranslation,
  },
};

/**
 * Initialize i18n with system language detection
 */
export const initializeI18n = async () => {
  // Detect the appropriate language
  const detectedLanguage = await detectAppLanguage();

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      lng: detectedLanguage, // Use detected language
      fallbackLng: 'en',

      // Language detection configuration
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'i18nextLng',
      },

      interpolation: {
        escapeValue: false,
      },

      defaultNS: 'translation',
      ns: ['translation'],
      debug: false,

      react: {
        useSuspense: false,
      },
    });

  return i18n;
};

export default i18n;
