import React, { useState } from "react";
import { SectionHeader } from "../components/ui/SectionHeader";
import { useTranslation } from "../i18n/useTranslation";
import { useTableStore } from "../stores/tableStore";
import type { TableInfo } from "../types";
import { normalizeTableNumber } from "../utils/table";

interface TableManagementProps {
  guestBaseUrl: string;
  tables: TableInfo[];
}

export function TableManagement({ guestBaseUrl, tables }: TableManagementProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<TableInfo | null>(null);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newTableSeats, setNewTableSeats] = useState("4");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const updateTables = useTableStore((state) => state.updateTables);

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

  function parseSeats(value: FormDataEntryValue | string | null): number {
    const seats = Number(value);
    return Number.isInteger(seats) && seats > 0 ? seats : 0;
  }

  function hasDuplicateTableNumber(nextTables: TableInfo[], originalNumber?: string): boolean {
    const seen = new Set<string>();
    return nextTables.some((table) => {
      const normalized = normalizeTableNumber(table.number);
      if (originalNumber && normalized === normalizeTableNumber(originalNumber)) return false;
      if (seen.has(normalized)) return true;
      seen.add(normalized);
      return false;
    });
  }

  async function saveNextTables(nextTables: TableInfo[], key: string): Promise<boolean> {
    setError("");
    setSavingKey(key);
    try {
      await updateTables(nextTables);
      return true;
    } catch {
      setError(t("tableManagement.saveFailed"));
      return false;
    } finally {
      setSavingKey(null);
    }
  }

  async function handleAddTable(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const number = normalizeTableNumber(newTableNumber);
    const seats = parseSeats(newTableSeats);
    const nextTables = [...tables, { number, seats, status: "available" as const }];

    if (!number || !seats || hasDuplicateTableNumber(nextTables)) {
      setError(t("tableManagement.invalidTable"));
      return;
    }

    if (await saveNextTables(nextTables, "new")) {
      setNewTableNumber("");
      setNewTableSeats("4");
    }
  }

  async function handleSaveTable(table: TableInfo, event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const number = normalizeTableNumber(String(formData.get("number") || ""));
    const seats = parseSeats(formData.get("seats"));
    const nextTables = tables.map((current) => (
      current.number === table.number ? { ...current, number, seats } : current
    ));

    if (!number || !seats || hasDuplicateTableNumber(nextTables, table.number)) {
      setError(t("tableManagement.invalidTable"));
      return;
    }

    await saveNextTables(nextTables, table.number);
  }

  async function handleDeactivateTable(table: TableInfo): Promise<void> {
    await saveNextTables(tables.filter((current) => current.number !== table.number), `deactivate-${table.number}`);
  }

  const selectedTableUrl = selected ? getTableGuestUrl(selected.number) : "";
  const selectedQrUrl = selected ? getQrCodeUrl(selected.number) : "";

  return (
    <section className="management-page">
      <SectionHeader
        description={t("tableManagement.description")}
        title={t("tableManagement.title")}
      />
      <form className="table-management-form" onSubmit={handleAddTable}>
        <label>
          {t("tableManagement.tableNumber")}
          <input
            aria-label={t("tableManagement.tableNumber")}
            onChange={(event) => setNewTableNumber(event.target.value)}
            value={newTableNumber}
          />
        </label>
        <label>
          {t("tableManagement.seats")}
          <input
            aria-label={t("tableManagement.seats")}
            min="1"
            onChange={(event) => setNewTableSeats(event.target.value)}
            type="number"
            value={newTableSeats}
          />
        </label>
        <button className="management-primary" disabled={savingKey === "new"} type="submit">
          {t("tableManagement.addTable")}
        </button>
      </form>
      {error && <p className="management-error">{error}</p>}
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
            <form
              className="table-card-form"
              key={`${table.number}-${table.seats}`}
              onSubmit={(event) => void handleSaveTable(table, event)}
            >
              <label>
                {t("tableManagement.tableNumberFor", { number: table.number })}
                <input
                  aria-label={t("tableManagement.tableNumberFor", { number: table.number })}
                  defaultValue={table.number}
                  name="number"
                />
              </label>
              <label>
                {t("tableManagement.seatsFor", { number: table.number })}
                <input
                  aria-label={t("tableManagement.seatsFor", { number: table.number })}
                  defaultValue={table.seats}
                  min="1"
                  name="seats"
                  type="number"
                />
              </label>
              <button
                aria-label={t("tableManagement.saveTable")}
                className="management-secondary"
                disabled={savingKey === table.number}
                type="submit"
              >
                {t("tableManagement.saveTable")}
              </button>
            </form>
            <footer>
              <button className="management-secondary" onClick={() => setSelected(table)} type="button">{t("tableManagement.viewQr")}</button>
              <button
                aria-label={t("tableManagement.deactivateTable")}
                className="management-secondary danger"
                disabled={savingKey === `deactivate-${table.number}`}
                onClick={() => void handleDeactivateTable(table)}
                type="button"
              >
                {t("tableManagement.deactivateTable")}
              </button>
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
