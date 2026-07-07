import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { useSettingsStore } from "../../stores/settingsStore";
import { PrinterSettings } from "../PrinterSettings";

const defaultPrinterSettings = {
  autoPrint: true,
  copies: "1",
  printer: "Kitchen thermal printer",
  sound: true,
};

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
    useSettingsStore.setState({ printer: defaultPrinterSettings });
  });

  it("updates printer settings immediately", () => {
    renderPage();

    fireEvent.click(screen.getByLabelText("Auto-print new orders"));
    fireEvent.change(screen.getByDisplayValue("1"), { target: { value: "2" } });

    expect(useSettingsStore.getState().printer.autoPrint).toBe(false);
    expect(useSettingsStore.getState().printer.copies).toBe("2");
  });

  it("updates both printer toggles immediately when clicked quickly", async () => {
    renderPage();

    const autoPrint = screen.getByLabelText("Auto-print new orders");
    const sound = screen.getByLabelText("New order sound");
    fireEvent.click(autoPrint);
    fireEvent.click(sound);

    await waitFor(() => {
      expect(screen.getByLabelText("Auto-print new orders").getAttribute("aria-pressed")).toBe("false");
      expect(screen.getByLabelText("New order sound").getAttribute("aria-pressed")).toBe("false");
    });
  });

  it("uses the fixed printer settings page layout", () => {
    renderPage();

    expect(document.querySelector(".printer-settings-page")).toBeTruthy();
  });

  it("shows save confirmation", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    expect(screen.getByText("Printer settings saved")).toBeTruthy();
  });

  it("keeps the save message region mounted to avoid footer layout shifts", () => {
    renderPage();

    const status = screen.getByRole("status");
    expect(status.textContent).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    expect(status.textContent).toBe("Printer settings saved");
  });
});
