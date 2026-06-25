import React from "react";
import { Metric } from "../components/ui/Metric";
import { SectionHeader } from "../components/ui/SectionHeader";
import { useTranslation } from "../i18n/useTranslation";
import { money } from "../utils/money";
import { getOrderTotal } from "../utils/order";
import type { MenuItem, Order, TableInfo } from "../types";

interface DashboardProps {
  menuItems: MenuItem[];
  onNavigate: (section: string) => void;
  orders: Order[];
  tables: TableInfo[];
}

export function Dashboard({ menuItems, onNavigate, orders, tables }: DashboardProps) {
  const { t } = useTranslation();
  const todayRevenue = orders.reduce((sum, order) => sum + getOrderTotal(order, menuItems), 0);
  const pending = orders.filter((order) => order.status !== "settled").length;
  const occupied = tables.filter((table) => table.status === "occupied").length;
  const activeMenuItems = menuItems.filter((item) => !item.deleted);

  return (
    <section className="management-page">
      <SectionHeader
        description={t("dashboard.description")}
        title={t("dashboard.title")}
      />
      <div className="metrics-row">
        <Metric label={t("dashboard.metrics.revenue")} note={t("dashboard.metrics.revenueNote")} value={money(todayRevenue)} />
        <Metric label={t("dashboard.metrics.pending")} note={t("dashboard.metrics.pendingNote")} value={t("dashboard.values.orders", { count: pending })} />
        <Metric label={t("dashboard.metrics.occupied")} note={t("dashboard.metrics.occupiedNote", { count: tables.length })} value={t("dashboard.values.tables", { count: occupied })} />
        <Metric label={t("dashboard.metrics.menuItems")} note={t("dashboard.metrics.menuItemsNote")} value={t("dashboard.values.dishes", { count: activeMenuItems.length })} />
      </div>
      <div className="management-split">
        <section className="management-panel">
          <header>
            <h2>{t("dashboard.latestOrders")}</h2>
            <button onClick={() => onNavigate("orders")} type="button">{t("common.viewAll")}</button>
          </header>
          <div className="simple-list">
            {orders.slice(-4).reverse().map((order) => (
              <article key={order.id}>
                <div>
                  <strong>{t("common.table.tableLabel", { number: order.table })}</strong>
                  <span>#{order.sequence} · {t("dashboard.values.dishes", { count: order.items.length })}</span>
                </div>
                <b>{money(getOrderTotal(order, menuItems))}</b>
              </article>
            ))}
          </div>
        </section>
        <section className="management-panel">
          <header>
            <h2>{t("dashboard.tableStatus")}</h2>
            <button onClick={() => onNavigate("tables")} type="button">{t("dashboard.manageTables")}</button>
          </header>
          <div className="table-mini-grid">
            {tables.map((table) => (
              <span className={table.status} key={table.number}>{table.number}</span>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
