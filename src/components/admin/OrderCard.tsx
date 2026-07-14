import React from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { Icon } from "../ui/Icon";
import { StatusBadge } from "../ui/StatusBadge";
import { formatTime } from "../../utils/date";
import { money } from "../../utils/money";
import { getMenuItem, getOrderCount, getOrderTotal } from "../../utils/order";
import type { MenuItem, Order } from "../../types";

interface OrderCardProps {
  canSettle?: boolean;
  isSettling?: boolean;
  menuItems: MenuItem[];
  order: Order;
  onPrint: (id: string) => void;
  onSettle: (id: string) => void;
}

export function OrderCard({ canSettle = true, isSettling = false, menuItems, order, onPrint, onSettle }: OrderCardProps) {
  const { t } = useTranslation();

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
        </div>
      </footer>
      {order.status === "settled" && (order.settledAt || order.settledByName || order.paymentMethod || order.settlementNote) && (
        <p className="settlement-record">
          <span>{t(`adminApp.orders.paymentMethods.${order.paymentMethod || "unrecorded"}`)}</span>
          {order.settledByName && <span>{t("adminApp.orders.settledBy", { name: order.settledByName })}</span>}
          {order.settledAt && <time dateTime={order.settledAt}>{t("adminApp.orders.settledAt", { time: formatTime(order.settledAt) })}</time>}
          {order.settlementNote && <span className="settlement-note">{t("adminApp.orders.settlementNoteRecord", { note: order.settlementNote })}</span>}
        </p>
      )}
    </article>
  );
}
