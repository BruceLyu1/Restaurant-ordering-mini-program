import React, { useEffect, useState } from "react";
import { SectionHeader } from "../components/ui/SectionHeader";
import {
  displayNameToLanguageCode,
  languageToDisplayName,
} from "../i18n/LanguageContext";
import { useTranslation } from "../i18n/useTranslation";
import { useSettingsStore } from "../stores/settingsStore";
import type { RestaurantSettings } from "../types";

export function RestaurantSettings() {
  const { language, setLanguage, t } = useTranslation();
  const restaurant = useSettingsStore((state) => state.restaurant);
  const updateRestaurant = useSettingsStore((state) => state.updateRestaurant);
  const [settings, setSettings] = useState<RestaurantSettings>({
    ...restaurant,
    language: languageToDisplayName(language),
  });
  const [pinDraft, setPinDraft] = useState("");
  const [pinError, setPinError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings({
      ...restaurant,
      language: languageToDisplayName(language),
    });
  }, [language, restaurant]);

  function save(event: React.FormEvent): void {
    event.preventDefault();
    if (pinDraft && !/^\d{6}$/.test(pinDraft)) {
      setPinError(t("restaurantSettings.pinValidation"));
      return;
    }

    const nextSettings = pinDraft ? { ...settings, pin: pinDraft } : settings;
    updateRestaurant(nextSettings);
    setSettings(nextSettings);
    setPinDraft("");
    setPinError("");
    setLanguage(displayNameToLanguageCode(settings.language));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  }

  function updateMealPeriod(id: string, updates: { start?: string; end?: string }): void {
    setSettings({
      ...settings,
      mealPeriods: settings.mealPeriods.map((entry) => (
        entry.id === id ? { ...entry, ...updates } : entry
      )),
    });
  }

  return (
    <section className="management-page">
      <SectionHeader description={t("restaurantSettings.description")} title={t("restaurantSettings.title")} />
      {saved && <div className="save-message">{t("restaurantSettings.saved")}</div>}
      <form className="settings-panel" onSubmit={save}>
        <label><span>{t("restaurantSettings.name")}</span><input onChange={(event) => setSettings({ ...settings, name: event.target.value })} value={settings.name} /></label>
        <label><span>{t("restaurantSettings.phone")}</span><input onChange={(event) => setSettings({ ...settings, phone: event.target.value })} value={settings.phone} /></label>
        <label><span>{t("restaurantSettings.address")}</span><input onChange={(event) => setSettings({ ...settings, address: event.target.value })} value={settings.address} /></label>
        <label>
          <span>{t("restaurantSettings.language")}</span>
          <select
            onChange={(event) => {
              const nextLanguage = displayNameToLanguageCode(event.target.value);
              setLanguage(nextLanguage);
              setSettings({ ...settings, language: languageToDisplayName(nextLanguage) });
            }}
            value={settings.language}
          >
            <option>{languageToDisplayName("zh-Hant")}</option>
            <option>{languageToDisplayName("en")}</option>
          </select>
        </label>
        <section className="meal-period-settings">
          <header>
            <h2>{t("restaurantSettings.mealPeriods")}</h2>
            <p>{t("restaurantSettings.mealPeriodsDescription")}</p>
          </header>
          {settings.mealPeriods.map((period) => (
            <div className="meal-period-row" key={period.id}>
              <strong>{period.name}</strong>
              <label>
                <span>{t("restaurantSettings.start")}</span>
                <input
                  aria-label={t("restaurantSettings.startTime", { name: period.name })}
                  onChange={(event) => updateMealPeriod(period.id, { start: event.target.value })}
                  required
                  type="time"
                  value={period.start}
                />
              </label>
              <label>
                <span>{t("restaurantSettings.end")}</span>
                <input
                  aria-label={t("restaurantSettings.endTime", { name: period.name })}
                  onChange={(event) => updateMealPeriod(period.id, { end: event.target.value })}
                  required
                  type="time"
                  value={period.end}
                />
              </label>
            </div>
          ))}
        </section>
        <section className="meal-period-settings">
          <header>
            <h2>{t("restaurantSettings.changePin")}</h2>
            <p>{t("restaurantSettings.changePinDesc")}</p>
          </header>
          <div className="pin-change-row">
            <label>
              <span>{t("restaurantSettings.newPin")}</span>
              <input
                aria-label={t("restaurantSettings.newPin")}
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => {
                  setPinDraft(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setPinError("");
                }}
                placeholder={t("restaurantSettings.newPinPlaceholder")}
                type="password"
                value={pinDraft}
              />
            </label>
            {pinError && <span className="pin-error">{pinError}</span>}
          </div>
        </section>
        <footer><button className="management-primary" type="submit">{t("restaurantSettings.save")}</button></footer>
      </form>
    </section>
  );
}
