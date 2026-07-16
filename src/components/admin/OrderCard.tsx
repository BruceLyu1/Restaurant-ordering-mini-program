import React from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { Icon } from "../ui/Icon";
import { StatusBadge } from "../ui/StatusBadge";
import { formatDateTime, formatTime } from "../../utils/date";
import { money } from "../../utils/money";
import { getMenuItem, getOrderCount, getOrderTotal } from "../../utils/order";
import type { MenuItem, Order } from "../../types";

interface OrderCardProps {
  canReverseSettlement?: boolean;
  canSettle?: boolean;
  isReversingSettlement?: boolean;
  isSettling?: boolean;
  menuItems: MenuItem[];
  order: Order;
  onPrint: (id: string) => void;
  onReverseSettlement?: (id: string) => void;
  onSettle: (id: string) => void;
  showSettlementReversal?: boolean;
}

export function OrderCard({
  canReverseSettlement = false,
  canSettle = true,
  isReversingSettlement = false,
  isSettling = false,
  menuItems,
  order,
  onPrint,
  onReverseSettlement,
  onSettle,
  showSettlementReversal = false,
}: OrderCardProps) {
  const { t } = useTranslation();
  const latestReversal = order.settlementReversals?.at(-1);

  return (
    <article className={`order-card ${order.status}`}>
      <header>
        <div>
          <span className="order-sequence">#{order.sequence}</span>
          <h3>{t("common.table.tableLabel", { number: order.table })}</h3>
        </div>
        <div className="order-time">
          <strong>{formatTime(order.createdAt)}</strong>
          <span>{t("adminApp.orders.itemCount", { count: getOrderCount(order) })}</span>
        </div>
      </header>
      <div className="order-lines">
        {order.items.map((line) => {
          const item = getMenuItem(line.id, menuItems);
          return (
            <div key={line.id}>
              <span>
                {line.name || item?.name || t("adminApp.orders.removedDish")}
                {line.notes && <small className="order-line-notes">{line.notes}</small>}
              </span>
              <strong>x {line.quantity}</strong>
            </div>
          );
        })}
      </div>
      <div className="order-total">
        <span>{t("common.table.total")}</span>
        <strong>{money(getOrderTotal(order, menuItems))}</strong>
      </div>
      <footer>
        <StatusBadge status={order.status} />
        <div>
          {order.status !== "settled" && (
            <button className="outline-button" onClick={() => onPrint(order.id)} type="button">
              <Icon name="printer" size={15} />
              {order.status === "printed" ? t("adminApp.orders.reprint") : t("common.print")}
            </button>
          )}
          {order.status !== "settled" && canSettle && (
            <button className="settle-button" disabled={isSettling} onClick={() => onSettle(order.id)} type="button">
              <Icon name="check" size={15} />
              {t("adminApp.orders.settle")}
            </button>
          )}
          {order.status === "settled" && canReverseSettlement && onReverseSettlement && (
            <button className="outline-button" disabled={isReversingSettlement} onClick={() => onReverseSettlement(order.id)} type="button">
              <Icon name="rotate" size={15} />
              {t("adminApp.orders.reverseSettlement")}
            </button>
          )}
        </div>
      </footer>
      {order.status === "settled" && (order.settledAt || order.settledByName || order.paymentMethod || order.settlementNote) && (
        <p className="settlement-record">
          <span>{t(`adminApp.orders.paymentMethods.${order.paymentMethod || "unrecorded"}`)}</span>
          {order.settledByName && <span>{t("adminApp.orders.settledBy", { name: order.settledByName })}</span>}
          {order.settledAt && <time dateTime={order.settledAt}>{t("adminApp.orders.settledAt", { time: formatDateTime(order.settledAt) })}</time>}
          {order.settlementNote && <span className="settlement-note">{t("adminApp.orders.settlementNoteRecord", { note: order.settlementNote })}</span>}
        </p>
      )}
      {showSettlementReversal && latestReversal && (
        <p className="settlement-reversal-record">
          {t("adminApp.orders.settlementReversalRecord", {
            name: latestReversal.reversedByName,
            reason: latestReversal.reason,
            time: formatDateTime(latestReversal.reversedAt),
          })}
        </p>
      )}
    </article>
  );
}
