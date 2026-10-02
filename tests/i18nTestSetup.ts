import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from '../src/renderer/i18n/resources';

// The workspace tests find controls by their Norwegian text.
export async function initNorwegian() {
  await i18n.use(initReactI18next).init({
    resources,
    lng: 'no',
    fallbackLng: 'no',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  await i18n.changeLanguage('no');
  return i18n;
}
