import React from "react";
import { useTranslation } from "../../i18n/useTranslation";
import type { Order } from "../../types";

interface StatusBadgeProps {
  status: Order["status"];
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  return <span className={`status-badge ${status}`}>{t(`common.status.${status}`)}</span>;
}
