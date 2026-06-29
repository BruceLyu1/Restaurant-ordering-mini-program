import React from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { DishImage } from "../ui/DishImage";
import { Icon } from "../ui/Icon";
import { money } from "../../utils/money";
import type { CartItem } from "./CartBar";

interface CartSheetProps {
  cartItems: CartItem[];
  onClose: () => void;
  onSubmit: () => void;
  tableNumber: string;
  total: number;
  updateItem: (id: string, delta: number) => void;
  updateItemNote?: (id: string, notes: string) => void;
}

export function CartSheet({ cartItems, onClose, onSubmit, tableNumber, total, updateItem, updateItemNote }: CartSheetProps) {
  const { t } = useTranslation();

  return (
    <div className="modal-backdrop">
      <section className="cart-sheet" aria-label={t("guestApp.cart")}>
        <div className="sheet-handle" />
        <header>
          <div>
            <h2>{t("guestApp.cart")}</h2>
            <p>{t("common.table.tablePrefix", { number: tableNumber, text: t("guestApp.cartHint") })}</p>
          </div>
          <button className="text-button" onClick={onClose} type="button">
            {t("common.close")}
          </button>
        </header>
        <div className="cart-lines">
          {cartItems.map((item) => (
            <article className="cart-line" key={item.id}>
              <DishImage item={item} size="small" />
              <div>
                <h3>{item.name}</h3>
                {item.notes && <small className="cart-item-notes">{item.notes}</small>}
                <strong>{money(item.price)}</strong>
                <input
                  aria-label={`${item.name} ${t("guestApp.notesPlaceholder")}`}
                  className="cart-item-notes-input"
                  onChange={(event) => updateItemNote?.(item.id, event.target.value)}
                  placeholder={t("guestApp.notesPlaceholder")}
                  value={item.notes || ""}
                />
              </div>
              <div className="cart-line-controls">
                <button onClick={() => updateItem(item.id, -1)} type="button">
                  <Icon name={item.quantity === 1 ? "trash" : "minus"} size={15} />
                </button>
                <span>{item.quantity}</span>
                <button onClick={() => updateItem(item.id, 1)} type="button">
                  <Icon name="plus" size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
        <footer className="cart-footer">
          <div>
            <span>{t("common.table.total")}</span>
            <strong>{money(total)}</strong>
          </div>
          <button className="primary-button" onClick={onSubmit} type="button">
            {t("guestApp.confirmOrder")}
          </button>
        </footer>
      </section>
    </div>
  );
}
