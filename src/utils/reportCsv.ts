import type { PaymentReportMethod, RevenueReport } from "../types";

export interface RevenueReportCsvLabels {
  columns: {
    amount: string;
    count: string;
    item: string;
    section: string;
  };
  metrics: {
    averageOrderValue: string;
    dateRange: string;
    itemCount: string;
    orderCount: string;
    revenue: string;
    reversalCount: string;
  };
  sections: {
    dishes: string;
    payment: string;
    reversals: string;
    staff: string;
    summary: string;
  };
}

export interface RevenueReportCsvOptions {
  endDate: string;
  labels: RevenueReportCsvLabels;
  paymentMethodLabel: (method: PaymentReportMethod) => string;
  report: RevenueReport;
  startDate: string;
}

function escapeCsvCell(value: number | string): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toAmount(value: number): string {
  return value.toFixed(2);
}

function toCsv(rows: Array<Array<number | string>>): string {
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}\r\n`;
}

export function buildRevenueReportCsv({
  endDate,
  labels,
  paymentMethodLabel,
  report,
  startDate,
}: RevenueReportCsvOptions): string {
  const rows: Array<Array<number | string>> = [
    [labels.columns.section, labels.columns.item, labels.columns.count, labels.columns.amount],
    [labels.sections.summary, labels.metrics.dateRange, `${startDate} - ${endDate}`, ""],
    [labels.sections.summary, labels.metrics.revenue, "", toAmount(report.summary.revenue)],
    [labels.sections.summary, labels.metrics.orderCount, report.summary.orderCount, ""],
    [labels.sections.summary, labels.metrics.itemCount, report.summary.itemCount, ""],
    [labels.sections.summary, labels.metrics.averageOrderValue, "", toAmount(report.summary.averageOrderValue)],
    ...report.paymentSales.map((item) => [
      labels.sections.payment,
      paymentMethodLabel(item.method),
      item.orderCount,
      toAmount(item.revenue),
    ]),
    ...report.staffSales.map((item) => [
      labels.sections.staff,
      item.name,
      item.orderCount,
      toAmount(item.revenue),
    ]),
    ...report.dishSales.map((item) => [
      labels.sections.dishes,
      item.name,
      item.quantity,
      toAmount(item.revenue),
    ]),
    [labels.sections.reversals, labels.metrics.reversalCount, report.summary.reversalCount, ""],
  ];

  return toCsv(rows);
}

export function downloadRevenueReportCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}