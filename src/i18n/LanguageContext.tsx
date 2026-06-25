import React, { createContext, useEffect, useMemo, useState } from "react";
import { SETTINGS_STORAGE_KEY } from "../services/settingsService";
import { readStorage } from "../services/storage";
import { displayNameToLanguage, LANGUAGE_STORAGE_KEY, languageDisplayNames } from "./translations";
import type { Language } from "./translations";
import type { RestaurantSettings } from "../types";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLanguage(value: string | null): value is Language {
  return value === "zh-Hant" || value === "en";
}

function detectLanguage(): Language {
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isLanguage(stored)) return stored;

  const restaurant = readStorage<Partial<RestaurantSettings> | null>(SETTINGS_STORAGE_KEY, null);
  const restaurantLanguage = restaurant?.language ? displayNameToLanguage[restaurant.language] : undefined;
  if (restaurantLanguage) return restaurantLanguage;

  return window.navigator.language.toLowerCase().startsWith("en") ? "en" : "zh-Hant";
}

export function languageToDisplayName(language: Language): string {
  return languageDisplayNames[language];
}

export function displayNameToLanguageCode(value: string): Language {
  return displayNameToLanguage[value] || "zh-Hant";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectLanguage);

  function setLanguage(nextLanguage: Language): void {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new CustomEvent("harbour-language-change"));
  }

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    function syncLanguage() {
      setLanguageState(detectLanguage());
    }

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("harbour-language-change", syncLanguage);
    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("harbour-language-change", syncLanguage);
    };
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
