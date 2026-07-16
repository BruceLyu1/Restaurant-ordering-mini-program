import React from "react";
import type { NewOrderNotice } from "../../hooks/useNewOrderAlert";
import { useTranslation } from "../../i18n/useTranslation";
import { Icon } from "../ui/Icon";

interface NewOrderAlertProps {
  notice: NewOrderNotice | null;
  onDismiss: () => void;
  onViewOrders: () => void;
}

export function NewOrderAlert({ notice, onDismiss, onViewOrders }: NewOrderAlertProps) {
  const { t } = useTranslation();
  if (!notice) return null;

  return (
    <section aria-live="polite" className="new-order-alert" role="status">
      <div className="new-order-alert-icon"><Icon name="bell" size={19} /></div>
      <div className="new-order-alert-content">
        <strong>{t("adminApp.newOrderAlert.title")}</strong>
        <p>
          {notice.count > 1
            ? t("adminApp.newOrderAlert.summary", { count: notice.count })
            : t("adminApp.newOrderAlert.description", {
              id: `#${notice.latestOrder.sequence}`,
              table: t("common.table.tableLabel", { number: notice.latestOrder.table }),
            })}
        </p>
      </div>
      <div className="new-order-alert-actions">
        <button className="new-order-alert-view" onClick={onViewOrders} type="button">
          {t("adminApp.newOrderAlert.viewOrders")}
        </button>
        <button aria-label={t("adminApp.newOrderAlert.dismiss")} className="new-order-alert-dismiss" onClick={onDismiss} type="button">
          <Icon name="close" size={16} />
        </button>
      </div>
    </section>
  );
}