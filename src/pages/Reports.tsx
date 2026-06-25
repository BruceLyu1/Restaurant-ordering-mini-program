import React, { useMemo } from "react";
import { Metric } from "../components/ui/Metric";
import { SectionHeader } from "../components/ui/SectionHeader";
import { useTranslation } from "../i18n/useTranslation";
import { getRevenueSummary, getSalesRanking } from "../services/reportService";
import { money } from "../utils/money";
import type { MenuItem, Order } from "../types";

interface ReportsProps {
  menuItems: MenuItem[];
  orders: Order[];
}

export function Reports({ menuItems, orders }: ReportsProps) {
  const { t } = useTranslation();
  const ranked = useMemo(() => getSalesRanking(orders, menuItems), [menuItems, orders]);
  const periodRevenue = getRevenueSummary(orders, menuItems);
  const portions = ranked.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className="management-page">
      <SectionHeader description={t("reports.description")} title={t("reports.title")} />
      <div className="metrics-row">
        <Metric label={t("reports.metrics.day")} note={t("reports.metrics.dayNote")} value={money(periodRevenue.day)} />
        <Metric label={t("reports.metrics.week")} note={t("reports.metrics.weekNote")} value={money(periodRevenue.week)} />
        <Metric label={t("reports.metrics.month")} note={t("reports.metrics.monthNote")} value={money(periodRevenue.month)} />
        <Metric label={t("reports.metrics.year")} note={t("reports.metrics.yearNote")} value={money(periodRevenue.year)} />
        <Metric label={t("reports.metrics.orders")} note={t("reports.metrics.ordersNote")} value={t("dashboard.values.orders", { count: orders.length })} />
        <Metric label={t("reports.metrics.portions")} note={t("reports.metrics.portionsNote")} value={t("reports.values.portions", { count: portions })} />
      </div>
      <div className="management-panel table-panel">
        <table className="management-table">
          <thead><tr><th>{t("reports.table.rank")}</th><th>{t("reports.table.dish")}</th><th>{t("reports.table.quantity")}</th><th>{t("reports.table.revenue")}</th></tr></thead>
          <tbody>
            {ranked.map((item, index) => (
              <tr key={item.id}>
                <td><strong className="report-rank">{index + 1}</strong></td>
                <td>{item.name}</td>
                <td>{t("reports.values.portions", { count: item.quantity })}</td>
                <td>{money(item.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
