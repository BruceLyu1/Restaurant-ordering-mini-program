import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
