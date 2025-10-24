/**
 * Maps Electron system language codes to supported app languages
 */
const mapSystemLanguageToAppLanguage = (systemLang: string): string => {
  const languageMap: Record<string, string> = {
    // Norwegian variants
    nb: "no",
    nn: "no",
    no: "no",
    "nb-NO": "no",
    "nn-NO": "no",
    "no-NO": "no",

    // Swedish
    sv: "se",
    "sv-SE": "se",

    // Danish
    da: "da",
    "da-DK": "da",

    // Finnish
    fi: "fi",
    "fi-FI": "fi",

    // English
    en: "en",
    "en-US": "en",
    "en-GB": "en",
    "en-CA": "en",
    "en-AU": "en",
  };

  // Try full match first (e.g., 'nb-NO')
  if (languageMap[systemLang]) {
    return languageMap[systemLang];
  }

  // Try base language (e.g., 'nb' from 'nb-NO')
  const baseLang = systemLang.split("-")[0];
  return languageMap[baseLang] || "en"; // Default to English
};

/**
 * Detects the appropriate language for the app
 * Priority: localStorage > system language > default (no)
 */
export const detectAppLanguage = async (): Promise<string> => {
  try {
    // Check if user has previously selected a language
    const savedLanguage = localStorage.getItem("i18nextLng");
    if (
      savedLanguage &&
      ["no", "se", "da", "fi", "en"].includes(savedLanguage)
    ) {
      console.log("Using saved language preference:", savedLanguage);
      return savedLanguage;
    }

    // Get system language from Electron
    const systemInfo = await window.electron.getSystemLanguage();
    console.log("System language info:", systemInfo);

    // Try to match with preferred languages first
    for (const lang of systemInfo.preferredLanguages) {
      const mappedLang = mapSystemLanguageToAppLanguage(lang);
      if (["no", "se", "da", "fi", "en"].includes(mappedLang)) {
        console.log(
          `Detected app language from system: ${mappedLang} (from ${lang})`
        );
        return mappedLang;
      }
    }

    // Fallback to system locale
    const mappedLang = mapSystemLanguageToAppLanguage(systemInfo.systemLocale);
    console.log(
      `Using system locale: ${mappedLang} (from ${systemInfo.systemLocale})`
    );
    return mappedLang;
  } catch (error) {
    console.error("Error detecting system language:", error);
    return "en"; // Default fallback
  }
};
