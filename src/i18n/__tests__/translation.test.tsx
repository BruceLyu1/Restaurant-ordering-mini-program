import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../LanguageContext";
import { translate, useTranslation } from "../useTranslation";

function LanguageProbe() {
  const { language, setLanguage, t } = useTranslation();
  return (
    <button onClick={() => setLanguage("en")} type="button">
      {language}:{t("common.table.tableLabel", { number: "12" })}
    </button>
  );
}

describe("i18n", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("translates nested keys, array indexes, placeholders, and missing key fallback", () => {
    expect(translate("en", "common.table.tableLabel", { number: "12" })).toBe("Table 12");
    expect(translate("en", "ui.date.weekdays.0")).toBe("Sunday");
    expect(translate("en", "missing.key")).toBe("missing.key");
  });

  it("detects, persists, and switches language through the provider", () => {
    window.localStorage.setItem("harbour-language", "zh-Hant");

    render(
      <LanguageProvider>
        <LanguageProbe />
      </LanguageProvider>,
    );

    expect(screen.getByRole("button").textContent).toContain("zh-Hant");
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button").textContent).toContain("en:Table 12");
    expect(window.localStorage.getItem("harbour-language")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });
});
