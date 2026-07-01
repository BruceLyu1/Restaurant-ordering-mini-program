import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { useSettingsStore } from "../../stores/settingsStore";
import { RestaurantSettings } from "../RestaurantSettings";

function renderPage() {
  window.localStorage.setItem("harbour-language", "en");
  render(
    <LanguageProvider>
      <RestaurantSettings />
    </LanguageProvider>,
  );
}

describe("RestaurantSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSettingsStore.getState().load();
  });

  it("saves restaurant details through settingsStore", () => {
    renderPage();

    fireEvent.change(screen.getByDisplayValue("海港小館"), { target: { value: "Harbour Test" } });
    fireEvent.change(screen.getByDisplayValue("2188 6688"), { target: { value: "2888 9999" } });
    fireEvent.click(screen.getByRole("button", { name: "Save restaurant details" }));

    expect(useSettingsStore.getState().restaurant.name).toBe("Harbour Test");
    expect(useSettingsStore.getState().restaurant.phone).toBe("2888 9999");
    expect(screen.getByText("Restaurant details saved")).toBeTruthy();
  });

  it("saves a valid admin PIN with restaurant settings", () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("New PIN"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Save restaurant details" }));

    expect(useSettingsStore.getState().restaurant.pin).toBe("123456");
  });

  it("does not save an invalid admin PIN", () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("New PIN"), { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Save restaurant details" }));

    expect(useSettingsStore.getState().restaurant.pin).toBe("000000");
    expect(screen.getByText("Enter a 6-digit PIN or leave it blank.")).toBeTruthy();
  });
});
