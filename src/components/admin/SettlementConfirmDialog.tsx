import React from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { money } from "../../utils/money";
import { getOrderTotal } from "../../utils/order";
import type { MenuItem, Order } from "../../types";

interface SettlementConfirmDialogProps {
  isSubmitting: boolean;
  menuItems: MenuItem[];
  onCancel: () => void;
  onConfirm: () => void;
  operatorName: string;
  order: Order;
}

export function SettlementConfirmDialog({
  isSubmitting,
  menuItems,
  onCancel,
  onConfirm,
  operatorName,
  order,
}: SettlementConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <div className="admin-modal-backdrop">
      <section aria-labelledby="settlement-confirm-title" aria-modal="true" className="settlement-modal" role="dialog">
        <h2 id="settlement-confirm-title">{t("adminApp.orders.settlementConfirmTitle")}</h2>
        <p>{t("adminApp.orders.settlementConfirmDescription")}</p>
        <dl>
          <div>
            <dt>{t("adminApp.orders.settlementOrder")}</dt>
            <dd>{order.id}</dd>
          </div>
          <div>
            <dt>{t("common.table.tableLabel", { number: order.table })}</dt>
            <dd>{money(getOrderTotal(order, menuItems))}</dd>
          </div>
          <div>
            <dt>{t("adminApp.orders.settlementOperator")}</dt>
            <dd>{operatorName}</dd>
          </div>
        </dl>
        <div className="settlement-modal-actions">
          <button className="management-secondary" disabled={isSubmitting} onClick={onCancel} type="button">
            {t("common.cancel")}
          </button>
          <button className="settle-button" disabled={isSubmitting} onClick={onConfirm} type="button">
            {isSubmitting ? t("adminApp.orders.settling") : t("adminApp.orders.confirmSettlement")}
          </button>
        </div>
      </section>
    </div>
  );
}
