import React, { useState } from "react";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Toggle } from "../components/ui/Toggle";
import { useTranslation } from "../i18n/useTranslation";
import { useSettingsStore } from "../stores/settingsStore";

export function PrinterSettings() {
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.printer);
  const updatePrinter = useSettingsStore((state) => state.updatePrinter);
  const [message, setMessage] = useState("");

  function save(message: string): void {
    setMessage(message);
    window.setTimeout(() => setMessage(""), 2400);
  }

  return (
    <section className="management-page">
      <SectionHeader description={t("printerSettings.description")} title={t("printerSettings.title")} />
      {message && <div className="save-message">{message}</div>}
      <section className="settings-panel">
        <label><span>{t("printerSettings.printer")}</span><select onChange={(event) => updatePrinter({ ...settings, printer: event.target.value })} value={settings.printer}><option>{t("printerSettings.kitchenPrinter")}</option><option>{t("printerSettings.cashierPrinter")}</option></select></label>
        <label><span>{t("printerSettings.copies")}</span><select onChange={(event) => updatePrinter({ ...settings, copies: event.target.value })} value={settings.copies}><option>1</option><option>2</option><option>3</option></select></label>
        <div className="setting-row"><div><strong>{t("printerSettings.autoPrint")}</strong><p>{t("printerSettings.autoPrintDesc")}</p></div><Toggle checked={settings.autoPrint} label={t("printerSettings.autoPrint")} onChange={() => updatePrinter({ ...settings, autoPrint: !settings.autoPrint })} /></div>
        <div className="setting-row"><div><strong>{t("printerSettings.sound")}</strong><p>{t("printerSettings.soundDesc")}</p></div><Toggle checked={settings.sound} label={t("printerSettings.sound")} onChange={() => updatePrinter({ ...settings, sound: !settings.sound })} /></div>
        <footer><button className="management-secondary" onClick={() => save(t("printerSettings.testQueued"))} type="button">{t("printerSettings.printTest")}</button><button className="management-primary" onClick={() => save(t("printerSettings.saved"))} type="button">{t("printerSettings.save")}</button></footer>
      </section>
    </section>
  );
}
