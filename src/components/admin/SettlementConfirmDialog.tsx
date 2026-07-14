import React, { useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { money } from "../../utils/money";
import { getOrderTotal } from "../../utils/order";
import { PAYMENT_METHODS, type MenuItem, type PaymentMethod, type Order, type SettlementInput } from "../../types";

interface SettlementConfirmDialogProps {
  isSubmitting: boolean;
  menuItems: MenuItem[];
  onCancel: () => void;
  onConfirm: (input: SettlementInput) => void;
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [paymentMethodError, setPaymentMethodError] = useState(false);
  const [settlementNote, setSettlementNote] = useState("");

  function confirm(): void {
    if (!paymentMethod) {
      setPaymentMethodError(true);
      return;
    }
    onConfirm({ paymentMethod, settlementNote });
  }

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
        <label className="settlement-field">
          <span>{t("adminApp.orders.paymentMethod")}</span>
          <select
            aria-label={t("adminApp.orders.paymentMethod")}
            aria-describedby={paymentMethodError ? "payment-method-error" : undefined}
            aria-invalid={paymentMethodError}
            disabled={isSubmitting}
            onChange={(event) => {
              setPaymentMethod(event.target.value as PaymentMethod | "");
              setPaymentMethodError(false);
            }}
            required
            value={paymentMethod}
          >
            <option value="">{t("adminApp.orders.paymentMethodPlaceholder")}</option>
            {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{t(`adminApp.orders.paymentMethods.${method}`)}</option>)}
          </select>
          {paymentMethodError && <small className="settlement-field-error" id="payment-method-error" role="alert">{t("adminApp.orders.paymentMethodRequired")}</small>}
        </label>
        <label className="settlement-field">
          <span>{t("adminApp.orders.settlementNote")}</span>
          <textarea
            aria-label={t("adminApp.orders.settlementNote")}
            disabled={isSubmitting}
            maxLength={500}
            onChange={(event) => setSettlementNote(event.target.value)}
            placeholder={t("adminApp.orders.settlementNotePlaceholder")}
            value={settlementNote}
          />
        </label>
        <div className="settlement-modal-actions">
          <button className="management-secondary" disabled={isSubmitting} onClick={onCancel} type="button">
            {t("common.cancel")}
          </button>
          <button className="settle-button" disabled={isSubmitting} onClick={confirm} type="button">
            {isSubmitting ? t("adminApp.orders.settling") : t("adminApp.orders.confirmSettlement")}
          </button>
        </div>
      </section>
    </div>
  );
}
