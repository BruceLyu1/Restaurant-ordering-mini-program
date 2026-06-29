import React from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { Icon } from "../ui/Icon";
import { StatusBadge } from "../ui/StatusBadge";
import { formatTime } from "../../utils/date";
import { money } from "../../utils/money";
import { getMenuItem, getOrderCount, getOrderTotal } from "../../utils/order";
import type { MenuItem, Order } from "../../types";

interface OrderCardProps {
  menuItems: MenuItem[];
  order: Order;
  onPrint: (id: string) => void;
  onSettle: (id: string) => void;
}

export function OrderCard({ menuItems, order, onPrint, onSettle }: OrderCardProps) {
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
          {order.status !== "settled" && (
            <button className="settle-button" onClick={() => onSettle(order.id)} type="button">
              <Icon name="check" size={15} />
              {t("adminApp.orders.settle")}
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}
