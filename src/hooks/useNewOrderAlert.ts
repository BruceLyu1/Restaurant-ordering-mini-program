import { useCallback, useEffect, useRef, useState } from "react";
import type { Order, StaffMember } from "../types";
import { playNewOrderSound } from "../utils/newOrderSound";

const NOTICE_DURATION_MS = 7000;

export interface NewOrderNotice {
  count: number;
  latestOrder: Order;
  orderIds: string[];
}

interface UseNewOrderAlertOptions {
  enabled: boolean;
  isReady: boolean;
  orders: Order[];
  soundEnabled: boolean;
}

export function canReceiveNewOrderAlerts(role: StaffMember["role"] | undefined): boolean {
  return role === "manager" || role === "cashier";
}

export function useNewOrderAlert({ enabled, isReady, orders, soundEnabled }: UseNewOrderAlertOptions) {
  const [notice, setNotice] = useState<NewOrderNotice | null>(null);
  const [unreadOrderIds, setUnreadOrderIds] = useState<string[]>([]);
  const knownOrderIdsRef = useRef<Set<string> | null>(null);
  const noticeRef = useRef<NewOrderNotice | null>(null);
  const initialTitleRef = useRef(typeof document === "undefined" ? "" : document.title);

  const updateNotice = useCallback((nextNotice: NewOrderNotice | null) => {
    noticeRef.current = nextNotice;
    setNotice(nextNotice);
  }, []);

  const dismissNotice = useCallback((acknowledge = true) => {
    const currentNotice = noticeRef.current;
    if (acknowledge && currentNotice) {
      const acknowledgedIds = new Set(currentNotice.orderIds);
      setUnreadOrderIds((currentIds) => currentIds.filter((id) => !acknowledgedIds.has(id)));
    }
    updateNotice(null);
  }, [updateNotice]);

  useEffect(() => {
    if (!enabled || !isReady) {
      knownOrderIdsRef.current = null;
      setUnreadOrderIds([]);
      updateNotice(null);
      return;
    }

    if (!knownOrderIdsRef.current) {
      knownOrderIdsRef.current = new Set(orders.map((order) => order.id));
      return;
    }

    const knownOrderIds = knownOrderIdsRef.current;
    const newOrders = orders.filter((order) => !knownOrderIds.has(order.id));
    orders.forEach((order) => knownOrderIds.add(order.id));
    if (!newOrders.length) return;

    const newOrderIds = newOrders.map((order) => order.id);
    setUnreadOrderIds((currentIds) => Array.from(new Set([
      ...currentIds,
      ...newOrders.filter((order) => order.status === "pending").map((order) => order.id),
    ])));

    const currentNotice = noticeRef.current;
    const noticeOrderIds = Array.from(new Set([
      ...(currentNotice?.orderIds || []),
      ...newOrderIds,
    ]));
    updateNotice({
      count: noticeOrderIds.length,
      latestOrder: newOrders[newOrders.length - 1],
      orderIds: noticeOrderIds,
    });

    if (soundEnabled) playNewOrderSound();
  }, [enabled, isReady, orders, soundEnabled, updateNotice]);

  useEffect(() => {
    if (!enabled || !isReady) return;

    const pendingOrderIds = new Set(orders.filter((order) => order.status === "pending").map((order) => order.id));
    setUnreadOrderIds((currentIds) => currentIds.filter((id) => pendingOrderIds.has(id)));
  }, [enabled, isReady, orders]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeoutId = window.setTimeout(() => dismissNotice(false), NOTICE_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [dismissNotice, notice]);

  useEffect(() => {
    const baseTitle = initialTitleRef.current;
    if (!baseTitle) return undefined;

    document.title = enabled && unreadOrderIds.length
      ? `(${unreadOrderIds.length}) ${baseTitle}`
      : baseTitle;
    return () => {
      document.title = baseTitle;
    };
  }, [enabled, unreadOrderIds.length]);

  return {
    dismissNotice: () => dismissNotice(true),
    notice,
    unreadCount: unreadOrderIds.length,
  };
}