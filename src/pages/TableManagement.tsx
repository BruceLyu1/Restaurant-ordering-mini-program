import React, { useState } from "react";
import { SectionHeader } from "../components/ui/SectionHeader";
import { useTranslation } from "../i18n/useTranslation";
import type { TableInfo } from "../types";

interface TableManagementProps {
  guestBaseUrl: string;
  tables: TableInfo[];
}

export function TableManagement({ guestBaseUrl, tables }: TableManagementProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<TableInfo | null>(null);

  function getTableGuestUrl(tableNumber: string): string {
    const url = new URL(guestBaseUrl || window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("view", "guest");
    url.searchParams.set("table", tableNumber);
    return url.toString();
  }

  function getQrCodeUrl(tableNumber: string): string {
    const tableUrl = getTableGuestUrl(tableNumber);
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(tableUrl)}`;
  }

  function copySelectedTableUrl(): void {
    if (!navigator.clipboard?.writeText) {
      window.alert(t("common.copyFailed"));
      return;
    }

    void navigator.clipboard.writeText(selectedTableUrl).catch(() => {
      window.alert(t("common.copyFailed"));
    });
  }

  const selectedTableUrl = selected ? getTableGuestUrl(selected.number) : "";
  const selectedQrUrl = selected ? getQrCodeUrl(selected.number) : "";

  return (
    <section className="management-page">
      <SectionHeader
        description={t("tableManagement.description")}
        title={t("tableManagement.title")}
      />
      <div className="table-management-grid">
        {tables.map((table) => (
          <article className={`table-card ${table.status}`} key={table.number}>
            <div>
              <span>{table.number}</span>
              <div>
                <h2>{t("common.table.tableLabel", { number: table.number })}</h2>
                <p>{table.status === "occupied" ? t("tableManagement.occupiedDesc") : t("tableManagement.availableDesc")}</p>
              </div>
            </div>
            <footer>
              <button className="management-secondary" onClick={() => setSelected(table)} type="button">{t("tableManagement.viewQr")}</button>
            </footer>
          </article>
        ))}
      </div>
      {selected && (
        <div className="admin-modal-backdrop">
          <section className="qr-modal">
            <button aria-label={t("tableManagement.closeQr")} className="modal-close" onClick={() => setSelected(null)} type="button">x</button>
            <img
              alt={t("tableManagement.qrAlt", { number: selected.number })}
              className="table-qr-image"
              src={selectedQrUrl}
            />
            <h2>{t("tableManagement.qrTitle", { number: selected.number })}</h2>
            <p>{t("tableManagement.qrDescription", { number: selected.number })}</p>
            <a className="qr-link" href={selectedTableUrl} rel="noreferrer" target="_blank">
              {selectedTableUrl}
            </a>
            <div className="qr-modal-actions">
              <button
                className="management-secondary"
                onClick={copySelectedTableUrl}
                type="button"
              >
                {t("common.copyLink")}
              </button>
              <button className="management-primary" onClick={() => window.print()} type="button">{t("common.printQr")}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
