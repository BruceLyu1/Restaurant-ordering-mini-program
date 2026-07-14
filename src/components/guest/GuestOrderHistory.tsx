import React from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { Icon } from "../ui/Icon";
import { StatusBadge } from "../ui/StatusBadge";
import { formatTime } from "../../utils/date";
import { money } from "../../utils/money";
import { getMenuItem, getOrderTotal } from "../../utils/order";
import type { MenuItem, Order } from "../../types";

interface GuestOrderHistoryProps {
  menuItems: MenuItem[];
  onClose: () => void;
  orders: Order[];
  tableNumber: string;
}

export function GuestOrderHistory({ menuItems, onClose, orders, tableNumber }: GuestOrderHistoryProps) {
  const { t } = useTranslation();
  const tableTotal = orders.reduce((sum, order) => sum + getOrderTotal(order, menuItems), 0);

  return (
    <div className="modal-backdrop">
      <section aria-label={t("guestApp.history.label")} aria-modal="true" className="cart-sheet order-history-sheet" role="dialog">
        <div className="sheet-handle" />
        <header>
          <div>
            <h2>{t("guestApp.history.title")}</h2>
            <p>{t("guestApp.history.summary", { count: orders.length, number: tableNumber })}</p>
          </div>
          <button className="text-button" onClick={onClose} type="button">
            {t("common.close")}
          </button>
        </header>
        {orders.length ? (
          <>
            <div className="guest-order-list">
              {orders.map((order) => (
                <article className="guest-order-card" key={order.id}>
                  <header>
                    <div>
                      <span className="order-sequence">{order.id}</span>
                      <h3>{formatTime(order.createdAt)}</h3>
                    </div>
                    <StatusBadge status={order.status} />
                  </header>
                  <div className="guest-order-lines">
                    {order.items.map((line, index) => {
                      const item = getMenuItem(line.id, menuItems);
                      const unitPrice = line.unitPrice ?? item?.price ?? 0;
                      return (
                        <div key={`${line.id}-${index}`}>
                          <span>
                            {line.name || item?.name || t("guestApp.history.removedDish")}
                            {line.notes && <small className="order-line-notes">{line.notes}</small>}
                          </span>
                          <strong>x {line.quantity}</strong>
                          <em>{money(unitPrice * line.quantity)}</em>
                        </div>
                      );
                    })}
                  </div>
                  <footer>
                    <span>{t("common.table.subtotal")}</span>
                    <strong>{money(getOrderTotal(order, menuItems))}</strong>
                  </footer>
                </article>
              ))}
            </div>
            <div className="order-history-total">
              <span>{t("guestApp.history.tableTotal")}</span>
              <strong>{money(tableTotal)}</strong>
            </div>
          </>
        ) : (
          <div className="empty-order-history">
            <Icon name="orders" size={30} />
            <h3>{t("common.empty.noTableOrders")}</h3>
            <p>{t("common.empty.noTableOrdersDesc")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
