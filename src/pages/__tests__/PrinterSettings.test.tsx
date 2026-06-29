import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { useSettingsStore } from "../../stores/settingsStore";
import { PrinterSettings } from "../PrinterSettings";

function renderPage() {
  window.localStorage.setItem("harbour-language", "en");
  render(
    <LanguageProvider>
      <PrinterSettings />
    </LanguageProvider>,
  );
}

describe("PrinterSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSettingsStore.getState().load();
  });

  it("updates printer settings immediately", () => {
    renderPage();

    fireEvent.click(screen.getByLabelText("Auto-print new orders"));
    fireEvent.change(screen.getByDisplayValue("1"), { target: { value: "2" } });

    expect(useSettingsStore.getState().printer.autoPrint).toBe(false);
    expect(useSettingsStore.getState().printer.copies).toBe("2");
  });

  it("shows save confirmation", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    expect(screen.getByText("Printer settings saved")).toBeTruthy();
  });
});
