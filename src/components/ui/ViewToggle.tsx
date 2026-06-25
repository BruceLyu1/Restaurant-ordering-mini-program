import React from "react";
import { useTranslation } from "../../i18n/useTranslation";

interface ViewToggleProps {
  view: "guest" | "admin";
  setView: (view: "guest" | "admin") => void;
}

export function ViewToggle({ view, setView }: ViewToggleProps) {
  const { t } = useTranslation();

  return (
    <div className="view-toggle" aria-label={t("ui.viewToggle.label")}>
      <button
        className={view === "guest" ? "active" : ""}
        onClick={() => setView("guest")}
        type="button"
      >
        {t("ui.viewToggle.guest")}
      </button>
      <button
        className={view === "admin" ? "active" : ""}
        onClick={() => setView("admin")}
        type="button"
      >
        {t("ui.viewToggle.admin")}
      </button>
    </div>
  );
}
