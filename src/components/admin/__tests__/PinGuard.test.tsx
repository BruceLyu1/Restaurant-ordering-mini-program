import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    vi.useRealTimers();
    useSettingsStore.getState().load();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("locks after five incorrect PIN attempts and unlocks attempts after five minutes", () => {
    vi.useFakeTimers();
    renderGuard();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      fireEvent.paste(screen.getByTestId("pin-digits"), {
        clipboardData: { getData: () => "123456" },
      });
      act(() => {
        vi.advanceTimersByTime(600);
      });
    }

    expect(screen.getByText("Too many incorrect attempts. Try again in 5 minutes.")).toBeTruthy();
    expect((screen.getByLabelText("Digit 1") as HTMLInputElement).disabled).toBe(true);

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect((screen.getByLabelText("Digit 1") as HTMLInputElement).disabled).toBe(false);

    fireEvent.paste(screen.getByTestId("pin-digits"), {
      clipboardData: { getData: () => "000000" },
    });
    expect(screen.getByText("Protected Admin")).toBeTruthy();
  });
});
