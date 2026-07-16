import React, { useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { formatTime } from "../../utils/date";
import { money } from "../../utils/money";
import { getOrderTotal } from "../../utils/order";
import type { MenuItem, Order, SettlementReversalInput } from "../../types";

interface SettlementReversalDialogProps {
  isSubmitting: boolean;
  menuItems: MenuItem[];
  onCancel: () => void;
  onConfirm: (input: SettlementReversalInput) => void;
  order: Order;
}

export function SettlementReversalDialog({
  isSubmitting,
  menuItems,
  onCancel,
  onConfirm,
  order,
}: SettlementReversalDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);

  function confirm(): void {
    if (!reason.trim()) {
      setReasonError(true);
      return;
    }
    onConfirm({ reason });
  }

  return (
    <div className="admin-modal-backdrop">
      <section aria-labelledby="settlement-reversal-title" aria-modal="true" className="settlement-modal" role="dialog">
        <h2 id="settlement-reversal-title">{t("adminApp.orders.reverseSettlementTitle")}</h2>
        <p>{t("adminApp.orders.reverseSettlementDescription")}</p>
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
            <dt>{t("adminApp.orders.paymentMethod")}</dt>
            <dd>{t(`adminApp.orders.paymentMethods.${order.paymentMethod || "unrecorded"}`)}</dd>
          </div>
          {order.settledByName && (
            <div>
              <dt>{t("adminApp.orders.settlementOperator")}</dt>
              <dd>{order.settledByName}</dd>
            </div>
          )}
          {order.settledAt && (
            <div>
              <dt>{t("adminApp.orders.settledAt", { time: "" }).replace(/[:：]\s*$/, "")}</dt>
              <dd>{formatTime(order.settledAt)}</dd>
            </div>
          )}
        </dl>
        <label className="settlement-field">
          <span>{t("adminApp.orders.reverseSettlementReason")}</span>
          <textarea
            aria-describedby={reasonError ? "settlement-reversal-reason-error" : undefined}
            aria-invalid={reasonError}
            aria-label={t("adminApp.orders.reverseSettlementReason")}
            disabled={isSubmitting}
            maxLength={500}
            onChange={(event) => {
              setReason(event.target.value);
              setReasonError(false);
            }}
            placeholder={t("adminApp.orders.reverseSettlementReasonPlaceholder")}
            value={reason}
          />
          {reasonError && <small className="settlement-field-error" id="settlement-reversal-reason-error" role="alert">{t("adminApp.orders.reverseSettlementReasonRequired")}</small>}
        </label>
        <div className="settlement-modal-actions">
          <button className="management-secondary" disabled={isSubmitting} onClick={onCancel} type="button">
            {t("common.cancel")}
          </button>
          <button className="settle-button" disabled={isSubmitting} onClick={confirm} type="button">
            {isSubmitting ? t("adminApp.orders.reversingSettlement") : t("adminApp.orders.reverseSettlementConfirm")}
          </button>
        </div>
      </section>
    </div>
  );
}