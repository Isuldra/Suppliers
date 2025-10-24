import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface LanguageSelectorProps {
  mode?: "compact" | "expanded";
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  mode = "compact",
  className = "",
}) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: "no", name: t("languages.norwegian"), flag: "🇳🇴" },
    { code: "se", name: t("languages.swedish"), flag: "🇸🇪" },
    { code: "da", name: t("languages.danish"), flag: "🇩🇰" },
    { code: "fi", name: t("languages.finnish"), flag: "🇫🇮" },
    { code: "en", name: t("languages.english"), flag: "🇬🇧" },
  ];

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
  };

  if (mode === "expanded") {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="space-y-2">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`w-full flex items-center space-x-3 p-3 rounded-md border transition-colors ${
                i18n.language === language.code
                  ? "bg-primary text-neutral-white border-primary"
                  : "bg-neutral-white text-neutral border-neutral-light hover:bg-neutral-light"
              }`}
            >
              <span className="text-xl">{language.flag}</span>
              <span className="font-medium">{language.name}</span>
              {i18n.language === language.code && (
                <span className="ml-auto text-sm">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
        title={t("navigation.settings")}
      >
        <span className="text-xl">{currentLanguage.flag}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-1 w-48 bg-neutral-white border border-neutral-light rounded-md shadow-lg z-20">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-neutral-light transition-colors first:rounded-t-md last:rounded-b-md ${
                  i18n.language === language.code
                    ? "bg-primary text-neutral-white"
                    : "text-neutral"
                }`}
              >
                <span className="text-lg">{language.flag}</span>
                <span className="font-medium">{language.name}</span>
                {i18n.language === language.code && (
                  <span className="ml-auto text-sm">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;
