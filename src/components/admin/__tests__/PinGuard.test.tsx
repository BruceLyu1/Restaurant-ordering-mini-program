import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import { useSettingsStore } from "../../../stores/settingsStore";
import { PinGuard } from "../PinGuard";

function renderGuard() {
  window.localStorage.setItem("harbour-language", "en");
  render(
    <LanguageProvider>
      <PinGuard>
        <div>Protected Admin</div>
      </PinGuard>
    </LanguageProvider>,
  );
}

describe("PinGuard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    useSettingsStore.getState().load();
  });

  it("shows the PIN form and hides children by default", () => {
    renderGuard();

    expect(screen.getByRole("heading", { name: "Admin Verification" })).toBeTruthy();
    expect(screen.queryByText("Protected Admin")).toBeNull();
  });

  it("unlocks with the configured PIN", () => {
    renderGuard();

    ["0", "0", "0", "0", "0", "0"].forEach((digit, index) => {
      fireEvent.change(screen.getByLabelText(`Digit ${index + 1}`), { target: { value: digit } });
    });

    expect(screen.getByText("Protected Admin")).toBeTruthy();
    expect(window.sessionStorage.getItem("harbour-admin-unlocked")).toBe("1");
  });

  it("shows an error for an incorrect PIN", () => {
    renderGuard();

    ["1", "2", "3", "4", "5", "6"].forEach((digit, index) => {
      fireEvent.change(screen.getByLabelText(`Digit ${index + 1}`), { target: { value: digit } });
    });

    expect(screen.getByText("Incorrect PIN, please try again")).toBeTruthy();
    expect(screen.queryByText("Protected Admin")).toBeNull();
  });

  it("unlocks when a six-digit PIN is pasted", () => {
    renderGuard();

    fireEvent.paste(screen.getByTestId("pin-digits"), {
      clipboardData: { getData: () => "000000" },
    });

    expect(screen.getByText("Protected Admin")).toBeTruthy();
  });
});
