import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { DEFAULT_RESTAURANT_SETTINGS } from "../../services/settingsService";
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
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_DATA_SOURCE", "local");
    useSettingsStore.getState().load();
    useSettingsStore.setState({ restaurant: DEFAULT_RESTAURANT_SETTINGS });
  });

  it("saves restaurant details through settingsStore", async () => {
    renderPage();

    await waitFor(() => expect(screen.getAllByRole("textbox")).toHaveLength(3));
    const [nameInput, phoneInput] = screen.getAllByRole("textbox");
    fireEvent.change(nameInput, { target: { value: "Harbour Test" } });
    fireEvent.change(phoneInput, { target: { value: "2888 9999" } });
    expect((nameInput as HTMLInputElement).value).toBe("Harbour Test");
    expect((phoneInput as HTMLInputElement).value).toBe("2888 9999");
    fireEvent.submit(screen.getByRole("button", { name: "Save restaurant details" }).closest("form")!);

    await waitFor(() => {
      expect(useSettingsStore.getState().restaurant.name).toBe("Harbour Test");
      expect(useSettingsStore.getState().restaurant.phone).toBe("2888 9999");
      expect(screen.getByText("Restaurant details saved")).toBeTruthy();
    });
  });

  it("saves a valid admin PIN with restaurant settings", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("New PIN"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Save restaurant details" }));

    await waitFor(() => expect(useSettingsStore.getState().restaurant.pin).toBe("123456"));
  });

  it("does not save an invalid admin PIN", () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("New PIN"), { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Save restaurant details" }));

    expect(useSettingsStore.getState().restaurant.pin).toBe("000000");
    expect(screen.getByText("Enter a 6-digit PIN or leave it blank.")).toBeTruthy();
  });
});
