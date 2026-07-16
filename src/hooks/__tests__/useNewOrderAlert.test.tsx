import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "../../types";
import { playNewOrderSound } from "../../utils/newOrderSound";
import { canReceiveNewOrderAlerts, useNewOrderAlert } from "../useNewOrderAlert";

vi.mock("../../utils/newOrderSound", () => ({ playNewOrderSound: vi.fn() }));

function order(id: string, status: Order["status"] = "pending"): Order {
  return {
    createdAt: "2026-07-16T10:00:00.000Z",
    id,
    items: [],
    sequence: Number(id.replace("HO-", "")),
    status,
    table: "12",
  };
}

describe("useNewOrderAlert", () => {
  beforeEach(() => {
    document.title = "Harbour";
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("uses the first successful load only as a baseline", () => {
    const { result, rerender } = renderHook(
      ({ orders, ready }) => useNewOrderAlert({ enabled: true, isReady: ready, orders, soundEnabled: true }),
      { initialProps: { orders: [order("HO-1001")], ready: false } },
    );

    rerender({ orders: [order("HO-1001")], ready: true });
    expect(result.current.notice).toBeNull();
    expect(result.current.unreadCount).toBe(0);

    rerender({ orders: [order("HO-1001"), order("HO-1002")] , ready: true });
    expect(result.current.notice).toMatchObject({ count: 1, latestOrder: { id: "HO-1002" } });
    expect(result.current.unreadCount).toBe(1);
    expect(document.title).toBe("(1) Harbour");
    expect(playNewOrderSound).toHaveBeenCalledTimes(1);
  });

  it("merges continuous orders and clears unread reminders when orders are printed or dismissed", () => {
    const { result, rerender } = renderHook(
      ({ orders }) => useNewOrderAlert({ enabled: true, isReady: true, orders, soundEnabled: false }),
      { initialProps: { orders: [order("HO-1001")] } },
    );

    rerender({ orders: [order("HO-1001"), order("HO-1002")] });
    rerender({ orders: [order("HO-1001"), order("HO-1002"), order("HO-1003")] });
    expect(result.current.notice).toMatchObject({ count: 2, latestOrder: { id: "HO-1003" } });
    expect(result.current.unreadCount).toBe(2);

    rerender({ orders: [order("HO-1001"), order("HO-1002", "printed"), order("HO-1003")] });
    expect(result.current.unreadCount).toBe(1);

    act(() => result.current.dismissNotice());
    expect(result.current.notice).toBeNull();
    expect(result.current.unreadCount).toBe(0);
    expect(document.title).toBe("Harbour");
  });

  it("detects auto-printed new orders without adding an unread pending badge", () => {
    const { result, rerender } = renderHook(
      ({ orders }) => useNewOrderAlert({ enabled: true, isReady: true, orders, soundEnabled: false }),
      { initialProps: { orders: [order("HO-1001")] } },
    );

    rerender({ orders: [order("HO-1001"), order("HO-1002", "printed")] });
    expect(result.current.notice?.latestOrder.id).toBe("HO-1002");
    expect(result.current.unreadCount).toBe(0);
    expect(playNewOrderSound).not.toHaveBeenCalled();
  });

  it("limits alerts to managers and cashiers", () => {
    expect(canReceiveNewOrderAlerts("manager")).toBe(true);
    expect(canReceiveNewOrderAlerts("cashier")).toBe(true);
    expect(canReceiveNewOrderAlerts("floor")).toBe(false);
  });
});