import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { useTableStore } from "../../stores/tableStore";
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
    useTableStore.setState({ tables: [] });
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

  it("adds a table and saves it through the table store", async () => {
    const updateTables = vi.fn().mockResolvedValue(undefined);
    useTableStore.setState({ updateTables } as Partial<ReturnType<typeof useTableStore.getState>>);

    renderWithLanguage(<TableManagement guestBaseUrl="https://example.test/app/" tables={tables} />);

    fireEvent.change(screen.getByLabelText("Table number"), { target: { value: "13" } });
    fireEvent.change(screen.getByLabelText("Seats"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Add table" }));

    await waitFor(() => {
      expect(updateTables).toHaveBeenCalledWith([
        ...tables,
        { number: "13", seats: 2, status: "available" },
      ]);
    });
  });

  it("edits table seats and deactivates tables", async () => {
    const updateTables = vi.fn().mockResolvedValue(undefined);
    useTableStore.setState({ updateTables } as Partial<ReturnType<typeof useTableStore.getState>>);

    renderWithLanguage(<TableManagement guestBaseUrl="https://example.test/app/" tables={tables} />);

    fireEvent.change(screen.getByLabelText("Seats for table 01"), { target: { value: "6" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Save table" })[0]);

    await waitFor(() => {
      expect(updateTables).toHaveBeenCalledWith([
        { number: "01", seats: 6, status: "available" },
        tables[1],
      ]);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Deactivate table" })[1]);

    await waitFor(() => {
      expect(updateTables).toHaveBeenLastCalledWith([tables[0]]);
    });
  });

  it("updates seat inputs when table data refreshes from realtime", () => {
    const { rerender } = renderWithLanguage(
      <TableManagement guestBaseUrl="https://example.test/app/" tables={tables} />,
    );

    expect((screen.getByLabelText("Seats for table 01") as HTMLInputElement).value).toBe("4");

    rerender(
      <LanguageProvider>
        <TableManagement
          guestBaseUrl="https://example.test/app/"
          tables={[
            { number: "01", seats: 8, status: "available" },
            tables[1],
          ]}
        />
      </LanguageProvider>,
    );

    expect((screen.getByLabelText("Seats for table 01") as HTMLInputElement).value).toBe("8");
  });

  it("shows a save error when table updates fail", async () => {
    const updateTables = vi.fn().mockRejectedValue(new Error("save failed"));
    useTableStore.setState({ updateTables } as Partial<ReturnType<typeof useTableStore.getState>>);

    renderWithLanguage(<TableManagement guestBaseUrl="https://example.test/app/" tables={tables} />);

    fireEvent.change(screen.getByLabelText("Table number"), { target: { value: "13" } });
    fireEvent.click(screen.getByRole("button", { name: "Add table" }));

    expect(await screen.findByText("Table save failed, please try again")).toBeTruthy();
  });
});
