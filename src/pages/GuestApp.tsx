import React, { useEffect, useMemo, useState } from "react";
import { CartBar } from "../components/guest/CartBar";
import { CartSheet } from "../components/guest/CartSheet";
import { ConfirmationCard } from "../components/guest/ConfirmationCard";
import { GuestOrderHistory } from "../components/guest/GuestOrderHistory";
import { DishImage } from "../components/ui/DishImage";
import { Icon } from "../components/ui/Icon";
import { useTranslation } from "../i18n/useTranslation";
import { isItemAvailableForMealPeriod } from "../services/settingsService";
import { useMenuStore } from "../stores/menuStore";
import { useOrderStore } from "../stores/orderStore";
import { useSettingsStore } from "../stores/settingsStore";
import { money } from "../utils/money";
import { getMenuItem } from "../utils/order";
import { listOrdersByTable } from "../services/orderService";
import type { MealPeriod, Order } from "../types";
import type { CartItem } from "../components/guest/CartBar";

interface GuestAppProps {
  activeMealPeriod: MealPeriod | null;
  setView: (view: "guest" | "admin") => void;
  tableNumber: string;
}

const ALL_CATEGORY = "__all";

export function GuestApp({ activeMealPeriod, setView, tableNumber }: GuestAppProps) {
  const { language, setLanguage, t } = useTranslation();
  const menuItems = useMenuStore((state) => state.items);
  const orders = useOrderStore((state) => state.orders);
  const restaurantName = useSettingsStore((state) => state.restaurant.name);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [isCartOpen, setCartOpen] = useState(false);
  const [isSubmittingOrder, setSubmittingOrder] = useState(false);
  const [isOrderHistoryOpen, setOrderHistoryOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<Order | null>(null);
  const [stockNotice, setStockNotice] = useState("");
  const tableOrders = useMemo(
    () => listOrdersByTable(orders, tableNumber),
    [orders, tableNumber],
  );
  const periodMenuItems = useMemo(
    () => menuItems.filter((item) => !item.deleted && isItemAvailableForMealPeriod(item, activeMealPeriod)),
    [activeMealPeriod, menuItems],
  );
  const categories = useMemo(
    () => [ALL_CATEGORY, ...new Set(periodMenuItems.map((item) => item.category).filter(Boolean))],
    [periodMenuItems],
  );
  const cumulativeDishSales = useMemo(() => {
    const totals: Record<string, number> = {};
    orders.forEach((order) => {
      order.items.forEach((item) => {
        totals[item.id] = (totals[item.id] || 0) + item.quantity;
      });
    });
    return totals;
  }, [orders]);

  const visibleMenu = useMemo(
    () => {
      if (activeCategory !== ALL_CATEGORY) {
        return periodMenuItems.filter((item) => item.category === activeCategory);
      }

      const indexMap = new Map(periodMenuItems.map((item, index) => [item.id, index]));
      return [...periodMenuItems].sort((a, b) => {
        const salesDiff = (cumulativeDishSales[b.id] || 0) - (cumulativeDishSales[a.id] || 0);
        if (salesDiff !== 0) return salesDiff;
        return (indexMap.get(a.id) ?? 0) - (indexMap.get(b.id) ?? 0);
      });
    },
    [activeCategory, cumulativeDishSales, periodMenuItems],
  );

  const cartItems = useMemo(
    () => Object.entries(cart).reduce<CartItem[]>((items, [id, quantity]) => {
      if (quantity <= 0) return items;
      const item = getMenuItem(id, menuItems);
      if (!item) return items;
      items.push({ ...item, notes: itemNotes[id] || "", quantity });
      return items;
    }, []),
    [cart, itemNotes, menuItems],
  );

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  const hasTableOrders = tableOrders.length > 0;
  const guestShellClassName = [
    "guest-shell",
    itemCount > 0 ? "has-cart-bar" : "",
  ].filter(Boolean).join(" ");

  useEffect(() => {
    if (!categories.includes(activeCategory)) setActiveCategory(ALL_CATEGORY);
  }, [activeCategory, categories]);

  useEffect(() => {
    const unavailableIds = new Set(menuItems
      .filter((item) => item.soldOut || item.deleted || !isItemAvailableForMealPeriod(item, activeMealPeriod))
      .map((item) => item.id));
    const hasUnavailableItem = Object.entries(cart).some(([id, quantity]) => quantity > 0 && unavailableIds.has(id));
    if (!hasUnavailableItem) return;

    setCart((current) => Object.fromEntries(
      Object.entries(current).filter(([id]) => !unavailableIds.has(id)),
    ));
    setStockNotice(t("guestApp.stockRemoved"));
  }, [activeMealPeriod, cart, menuItems, t]);

  function updateItem(id: string, delta: number): void {
    const item = getMenuItem(id, menuItems);
    if (delta > 0 && (!item || item.soldOut || item.deleted || !isItemAvailableForMealPeriod(item, activeMealPeriod))) {
      setStockNotice(t("guestApp.stockUnavailable"));
      return;
    }

    setCart((current) => {
      const nextQuantity = Math.max(0, (current[id] || 0) + delta);
      if (nextQuantity === 0) {
        setItemNotes((notes) => Object.fromEntries(Object.entries(notes).filter(([key]) => key !== id)));
      }
      return { ...current, [id]: nextQuantity };
    });
  }

  function updateItemNote(id: string, notes: string): void {
    setItemNotes((current) => {
      const trimmedNotes = notes.trimStart();
      if (!trimmedNotes) {
        return Object.fromEntries(Object.entries(current).filter(([key]) => key !== id));
      }
      return { ...current, [id]: trimmedNotes };
    });
  }

  async function submitOrder(): Promise<void> {
    if (!cartItems.length || isSubmittingOrder) return;
    setSubmittingOrder(true);
    try {
      const order = await useOrderStore.getState().placeOrder({
        activeMealPeriod,
        items: cartItems.map(({ id, name, notes, price, quantity }) => ({
          id,
          name,
          notes: notes?.trim() || undefined,
          quantity,
          unitPrice: price,
        })),
        menuItems: useMenuStore.getState().items,
        printerSettings: useSettingsStore.getState().printer,
        table: tableNumber,
      });
      if (!order) {
        setStockNotice(t("guestApp.stockSubmitFailed"));
        return;
      }
      setConfirmation(order);
      setCart({});
      setItemNotes({});
      setCartOpen(false);
    } finally {
      setSubmittingOrder(false);
    }
  }

  return (
    <main className={guestShellClassName}>
      <header className="guest-header">
        <div>
          <span className="restaurant-name">{restaurantName}</span>
          <span className="table-label">{t("common.table.tableLabel", { number: tableNumber })}</span>
        </div>
        <div className="guest-header-actions">
          <button className="language-button" onClick={() => setLanguage(language === "zh-Hant" ? "en" : "zh-Hant")} type="button">
            {t("guestApp.languageToggle")}
          </button>
          <button className="admin-shortcut" onClick={() => setView("admin")} type="button">
            {t("guestApp.adminShortcut")}
          </button>
        </div>
      </header>

      <section className="guest-menu-tabs" aria-label={t("guestApp.navigationLabel")}>
        <button className="active" type="button">{t("guestApp.menuTab")}</button>
        <button onClick={() => setOrderHistoryOpen(true)} type="button">
          {t("guestApp.orderDetails")}
          {hasTableOrders && <small>{tableOrders.length}</small>}
        </button>
      </section>

      <nav className="category-tabs" aria-label={t("guestApp.categoryLabel")}>
        {categories.map((category) => (
          <button
            className={category === activeCategory ? "active" : ""}
            key={category}
            onClick={(event) => {
              setActiveCategory(category);
              event.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            }}
            type="button"
          >
            {category === ALL_CATEGORY ? t("guestApp.categoryAll") : category}
          </button>
        ))}
      </nav>

      <div className={`service-notice ${activeMealPeriod ? "" : "closed"}`}>
        {activeMealPeriod
          ? t("guestApp.serviceOpen", { end: activeMealPeriod.end, name: activeMealPeriod.name, start: activeMealPeriod.start })
          : t("guestApp.serviceClosed")}
      </div>

      {stockNotice && (
        <div className="stock-notice">
          <span>{stockNotice}</span>
          <button aria-label={t("guestApp.closeNotice")} onClick={() => setStockNotice("")} type="button">x</button>
        </div>
      )}

      <section className="menu-list">
        {visibleMenu.map((item) => {
          const quantity = cart[item.id] || 0;
          return (
            <article className={`menu-item ${item.soldOut ? "sold-out" : ""}`} key={item.id}>
              <DishImage item={item} />
              <div className="menu-item-copy">
                <h2>{item.name}</h2>
                <p>{item.description}</p>
                <strong>{money(item.price)}</strong>
                {item.soldOut && <span className="sold-out-label">{t("guestApp.soldOut")}</span>}
              </div>
              <div className="menu-item-control">
                {quantity > 0 && (
                  <>
                    <button
                      aria-label={t("guestApp.decreaseItem", { name: item.name })}
                      className="quantity-control secondary"
                      onClick={() => updateItem(item.id, -1)}
                      type="button"
                    >
                      <Icon name="minus" size={16} />
                    </button>
                    <span>{quantity}</span>
                  </>
                )}
                <button
                  aria-label={item.soldOut ? t("guestApp.itemSoldOut", { name: item.name }) : t("guestApp.addItem", { name: item.name })}
                  className="quantity-control"
                  disabled={item.soldOut}
                  onClick={() => updateItem(item.id, 1)}
                  type="button"
                >
                  <Icon name="plus" size={18} />
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <CartBar cartItems={cartItems} itemCount={itemCount} onOpen={() => setCartOpen(true)} total={total} />

      {isCartOpen && (
        <CartSheet
          cartItems={cartItems}
          isSubmitting={isSubmittingOrder}
          onClose={() => setCartOpen(false)}
          onSubmit={submitOrder}
          tableNumber={tableNumber}
          total={total}
          updateItem={updateItem}
          updateItemNote={updateItemNote}
        />
      )}

      {confirmation && (
        <ConfirmationCard
          menuItems={menuItems}
          onClose={() => setConfirmation(null)}
          onViewOrderHistory={() => {
            setConfirmation(null);
            setOrderHistoryOpen(true);
          }}
          order={confirmation}
          tableNumber={tableNumber}
        />
      )}

      {isOrderHistoryOpen && (
        <GuestOrderHistory menuItems={menuItems} onClose={() => setOrderHistoryOpen(false)} orders={tableOrders} tableNumber={tableNumber} />
      )}
    </main>
  );
}
