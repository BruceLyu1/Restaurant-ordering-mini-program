import React from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { Icon } from "../ui/Icon";
import { money } from "../../utils/money";
import { getOrderTotal } from "../../utils/order";
import type { MenuItem, Order } from "../../types";

interface ConfirmationCardProps {
  menuItems: MenuItem[];
  onClose: () => void;
  onViewOrderHistory: () => void;
  order: Order;
  tableNumber: string;
}

export function ConfirmationCard({ menuItems, onClose, onViewOrderHistory, order, tableNumber }: ConfirmationCardProps) {
  const { t } = useTranslation();

  return (
    <div className="modal-backdrop confirmation-backdrop">
      <section className="confirmation-card">
        <span className="success-icon">
          <Icon name="check" size={30} />
        </span>
        <h2>{t("guestApp.confirmation.title")}</h2>
        <p>{t("guestApp.confirmation.description", { id: order.id })}</p>
        <div className="confirmation-meta">
          <span>{t("guestApp.confirmation.table")}</span>
          <strong>{t("common.table.tableLabel", { number: tableNumber })}</strong>
          <span>{t("common.table.amountLabel")}</span>
          <strong>{money(getOrderTotal(order, menuItems))}</strong>
        </div>
        <button className="primary-button" onClick={onClose} type="button">
          {t("guestApp.confirmation.continueOrdering")}
        </button>
        <button className="secondary-wide-button" onClick={onViewOrderHistory} type="button">
          {t("guestApp.confirmation.viewTableOrders")}
        </button>
      </section>
    </div>
  );
}
