import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { TableManagement } from "../TableManagement";
import type { TableInfo } from "../../types";

const tables: TableInfo[] = [
  { number: "01", seats: 4, status: "available" },
  { number: "02", seats: 4, status: "occupied" },
];

function renderWithLanguage(ui: React.ReactElement) {
  window.localStorage.setItem("harbour-language", "en");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("TableManagement", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders table cards and opens/closes the QR modal", () => {
    renderWithLanguage(<TableManagement guestBaseUrl="https://example.test/app/" tables={tables} />);

    expect(screen.getByText("Available: no unsettled orders")).toBeTruthy();
    expect(screen.getByText("Occupied: unsettled orders exist")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "View QR code" })[0]);
    expect(screen.getByText("Table 01 QR code")).toBeTruthy();
    expect(screen.getByText("https://example.test/app/?view=guest&table=01")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close table QR" }));
    expect(screen.queryByText("Table 01 QR code")).toBeNull();
  });

  it("shows a translated alert when copying the QR link fails", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("blocked")),
      },
    });

    renderWithLanguage(<TableManagement guestBaseUrl="https://example.test/app/" tables={tables} />);

    fireEvent.click(screen.getAllByRole("button", { name: "View QR code" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await vi.waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Copy failed, please copy the link manually");
    });
  });
});
