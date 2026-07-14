import React, { useEffect, useMemo, useState } from "react";
import { Metric } from "../components/ui/Metric";
import { SectionHeader } from "../components/ui/SectionHeader";
import { useTranslation } from "../i18n/useTranslation";
import {
  getEmptyRevenueReport,
  loadRevenueReport,
  type ReportRange,
} from "../services/reportService";
import { money } from "../utils/money";
import type { MenuItem, Order } from "../types";

interface ReportsProps {
  menuItems: MenuItem[];
  orders: Order[];
}

type QuickRange = "today" | "week" | "month" | "year";
type ActiveRange = QuickRange | "custom";

function getStartOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getStartOfLocalWeek(date: Date): Date {
  const start = getStartOfLocalDay(date);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function formatDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isValidDate(date: Date): boolean {
  return Number.isFinite(date.getTime());
}

function getQuickRange(range: QuickRange, now = new Date()): { endInput: string; startInput: string } {
  const today = getStartOfLocalDay(now);
  const starts: Record<QuickRange, Date> = {
    month: new Date(today.getFullYear(), today.getMonth(), 1),
    today,
    week: getStartOfLocalWeek(today),
    year: new Date(today.getFullYear(), 0, 1),
  };
  return {
    endInput: formatDateInput(today),
    startInput: formatDateInput(starts[range]),
  };
}

export function Reports({ menuItems, orders }: ReportsProps) {
  const { t } = useTranslation();
  const defaultRange = useMemo(() => getQuickRange("today"), []);
  const [startInput, setStartInput] = useState(defaultRange.startInput);
  const [endInput, setEndInput] = useState(defaultRange.endInput);
  const [activeQuickRange, setActiveQuickRange] = useState<ActiveRange>("today");
  const [report, setReport] = useState(getEmptyRevenueReport);
  const [isLoading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const reportRange = useMemo<ReportRange>(() => ({
    end: addDays(parseDateInput(endInput), 1),
    start: parseDateInput(startInput),
  }), [endInput, startInput]);
  const isInvalidRange = !isValidDate(reportRange.start) || !isValidDate(reportRange.end) || reportRange.end <= reportRange.start;

  useEffect(() => {
    if (isInvalidRange) {
      setLoadError(t("reports.errors.invalidRange"));
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError("");

    void loadRevenueReport(orders, menuItems, reportRange)
      .then((nextReport) => {
        if (!cancelled) setReport(nextReport);
      })
      .catch((error) => {
        console.error("Load revenue report failed", error);
        if (!cancelled) setLoadError(t("reports.errors.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isInvalidRange, menuItems, orders, reportRange, t]);

  function applyQuickRange(range: QuickRange): void {
    const nextRange = getQuickRange(range);
    setActiveQuickRange(range);
    setStartInput(nextRange.startInput);
    setEndInput(nextRange.endInput);
  }

  function updateStartInput(value: string): void {
    setActiveQuickRange("custom");
    setStartInput(value);
  }

  function updateEndInput(value: string): void {
    setActiveQuickRange("custom");
    setEndInput(value);
  }

  return (
    <section className="management-page">
      <SectionHeader description={t("reports.description")} title={t("reports.title")} />
      <div className="report-filters">
        <div className="report-quick-ranges" aria-label={t("reports.filters.quickRanges")}>
          {(["today", "week", "month", "year"] as QuickRange[]).map((range) => (
            <button
              className={activeQuickRange === range ? "active" : ""}
              key={range}
              onClick={() => applyQuickRange(range)}
              type="button"
            >
              {t(`reports.filters.${range}`)}
            </button>
          ))}
        </div>
        <label>
          <span>{t("reports.filters.start")}</span>
          <input
            aria-label={t("reports.filters.start")}
            onChange={(event) => updateStartInput(event.target.value)}
            type="date"
            value={startInput}
          />
        </label>
        <label>
          <span>{t("reports.filters.end")}</span>
          <input
            aria-label={t("reports.filters.end")}
            onChange={(event) => updateEndInput(event.target.value)}
            type="date"
            value={endInput}
          />
        </label>
      </div>
      {isLoading && <p className="save-message" role="status">{t("reports.loading")}</p>}
      {loadError && <p className="save-message error" role="alert">{loadError}</p>}
      <div className="metrics-row">
        <Metric label={t("reports.metrics.revenue")} note={t("reports.metrics.revenueNote")} value={money(report.summary.revenue)} />
        <Metric label={t("reports.metrics.orders")} note={t("reports.metrics.ordersNote")} value={t("dashboard.values.orders", { count: report.summary.orderCount })} />
        <Metric label={t("reports.metrics.portions")} note={t("reports.metrics.portionsNote")} value={t("reports.values.portions", { count: report.summary.itemCount })} />
        <Metric label={t("reports.metrics.averageOrder")} note={t("reports.metrics.averageOrderNote")} value={money(report.summary.averageOrderValue)} />
      </div>
      <div className="management-panel table-panel">
        <header><h2>{t("reports.sections.dishes")}</h2></header>
        <table className="management-table">
          <thead><tr><th>{t("reports.table.rank")}</th><th>{t("reports.table.dish")}</th><th>{t("reports.table.quantity")}</th><th>{t("reports.table.revenue")}</th></tr></thead>
          <tbody>
            {report.dishSales.map((item, index) => (
              <tr key={item.id}>
                <td><strong className="report-rank">{index + 1}</strong></td>
                <td>{item.name}</td>
                <td>{t("reports.values.portions", { count: item.quantity })}</td>
                <td>{money(item.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!report.dishSales.length && <p className="report-empty">{t("reports.empty.dishes")}</p>}
      </div>
      <div className="management-panel table-panel">
        <header><h2>{t("reports.sections.staff")}</h2></header>
        <table className="management-table">
          <thead><tr><th>{t("reports.table.staff")}</th><th>{t("reports.table.orders")}</th><th>{t("reports.table.revenue")}</th></tr></thead>
          <tbody>
            {report.staffSales.map((item) => (
              <tr key={`${item.staffId ?? "unknown"}-${item.name}`}>
                <td>{item.name}</td>
                <td>{t("dashboard.values.orders", { count: item.orderCount })}</td>
                <td>{money(item.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!report.staffSales.length && <p className="report-empty">{t("reports.empty.staff")}</p>}
      </div>
    </section>
  );
}
