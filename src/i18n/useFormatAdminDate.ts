import { useCallback } from "react";
import { useTranslation } from "./useTranslation";

export function useFormatAdminDate() {
  const { t } = useTranslation();

  return useCallback(
    (date: Date = new Date()): string => t("ui.date.format", {
      day: String(date.getDate()),
      month: String(date.getMonth() + 1),
      weekday: t(`ui.date.weekdays.${date.getDay()}`),
      year: String(date.getFullYear()),
    }),
    [t],
  );
}
