import { useCallback } from "react";
import { LanguageContext } from "./LanguageContext";
import { translations } from "./translations";
import type { Language, TranslationValue } from "./translations";
import { useContext } from "react";

type Params = Record<string, string | number>;

export function getNestedValue(source: TranslationValue | undefined, key: string): TranslationValue | undefined {
  return key.split(".").reduce<TranslationValue | undefined>((value, segment) => {
    if (value === undefined) return undefined;
    if (Array.isArray(value)) return value[Number(segment)];
    if (typeof value === "object" && value !== null) return value[segment];
    return undefined;
  }, source);
}

function interpolate(value: string, params: Params = {}): string {
  return value.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

export function translate(language: Language, key: string, params?: Params): string {
  const value = getNestedValue(translations[language], key);
  if (typeof value === "string") return interpolate(value, params);

  const fallback = getNestedValue(translations["zh-Hant"], key);
  if (typeof fallback === "string") {
    console.warn(`Missing translation key "${key}" for language "${language}"`);
    return interpolate(fallback, params);
  }

  console.warn(`Missing translation key "${key}"`);
  return key;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used inside LanguageProvider");
  }

  const t = useCallback(
    (key: string, params?: Params) => translate(context.language, key, params),
    [context.language],
  );

  return { ...context, t };
}
