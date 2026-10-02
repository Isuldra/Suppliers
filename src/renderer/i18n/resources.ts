import noTranslation from '../locales/no.json';
import seTranslation from '../locales/se.json';
import daTranslation from '../locales/da.json';
import fiTranslation from '../locales/fi.json';
import enTranslation from '../locales/en.json';
import noWorkspace from '../locales/workspace/no.json';
import seWorkspace from '../locales/workspace/se.json';
import daWorkspace from '../locales/workspace/da.json';
import fiWorkspace from '../locales/workspace/fi.json';
import enWorkspace from '../locales/workspace/en.json';

type Messages = { [key: string]: string | Messages };

// Pulse uses "se" for Swedish, but Intl reads "se" as Northern Sami, which has a separate
// plural form for two. Give every Swedish plural that form so a count of two resolves.
function withDual(messages: Messages): Messages {
  const result: Messages = {};
  for (const [key, value] of Object.entries(messages)) {
    result[key] = typeof value === 'string' ? value : withDual(value);
    if (key.endsWith('_other') && typeof value === 'string') {
      result[key.replace(/_other$/, '_two')] ??= value;
    }
  }
  return result;
}

export const resources = {
  no: { translation: { ...noTranslation, workspace: noWorkspace } },
  se: { translation: { ...seTranslation, workspace: withDual(seWorkspace) } },
  da: { translation: { ...daTranslation, workspace: daWorkspace } },
  fi: { translation: { ...fiTranslation, workspace: fiWorkspace } },
  en: { translation: { ...enTranslation, workspace: enWorkspace } },
};

const DATE_LOCALES: Record<string, string> = {
  no: 'nb-NO',
  se: 'sv-SE',
  da: 'da-DK',
  fi: 'fi-FI',
  en: 'en-GB',
};

export function dateLocale(language: string) {
  return DATE_LOCALES[language] || 'nb-NO';
}
