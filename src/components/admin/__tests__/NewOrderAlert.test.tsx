import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import { NewOrderAlert } from "../NewOrderAlert";

function renderAlert(overrides = {}) {
  const onDismiss = vi.fn();
  const onViewOrders = vi.fn();
  render(
    <LanguageProvider>
      <NewOrderAlert
        notice={{
          count: 1,
          latestOrder: { createdAt: "2026-07-16T10:00:00.000Z", id: "HO-1001", items: [], sequence: 1001, status: "pending", table: "12" },
          orderIds: ["HO-1001"],
          ...overrides,
        }}
        onDismiss={onDismiss}
        onViewOrders={onViewOrders}
      />
    </LanguageProvider>,
  );
  return { onDismiss, onViewOrders };
}

describe("NewOrderAlert", () => {
  it("shows the latest order and sends staff to the order queue", () => {
    window.localStorage.setItem("harbour-language", "en");
    const { onViewOrders } = renderAlert();

    expect(screen.getByText("New order received")).toBeTruthy();
    expect(screen.getByText(/New order #1001 from Table 12/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "View orders" }));
    expect(onViewOrders).toHaveBeenCalledTimes(1);
  });

  it("summarizes continuous orders and allows dismissal", () => {
    window.localStorage.setItem("harbour-language", "en");
    const { onDismiss } = renderAlert({ count: 2, orderIds: ["HO-1001", "HO-1002"] });

    expect(screen.getByText("2 new orders received")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss new order alert" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});