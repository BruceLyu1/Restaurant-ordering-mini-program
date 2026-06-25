import React, { useMemo } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { DishImage } from "../ui/DishImage";
import { Icon } from "../ui/Icon";
import { isSameLocalDate } from "../../utils/date";
import type { MenuItem, Order } from "../../types";

interface PopularDishesProps {
  menuItems: MenuItem[];
  onOpenReports: () => void;
  orders: Order[];
}

interface RankedDish extends MenuItem {
  quantity: number;
}

export function PopularDishes({ menuItems, onOpenReports, orders }: PopularDishesProps) {
  const { t } = useTranslation();
  const ranked = useMemo(() => {
    const totals: Record<string, number> = Object.fromEntries(menuItems.map((item) => [item.id, 0]));
    orders
      .filter((order) => isSameLocalDate(order.createdAt))
      .forEach((order) => {
        order.items.forEach((item) => {
          totals[item.id] = (totals[item.id] || 0) + item.quantity;
        });
      });
    return menuItems
      .map((item) => ({ ...item, quantity: totals[item.id] || 0 }))
      .filter((item) => item.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity);
  }, [menuItems, orders]) as RankedDish[];

  return (
    <aside className="ranking-panel">
      <header>
        <div>
          <h2>{t("popularDishes.title")}</h2>
          <p>{t("popularDishes.subtitle")}</p>
        </div>
        <Icon name="chart" size={21} />
      </header>
      <div className="ranking-list">
        {ranked.length > 0 ? (
          ranked.map((item, index) => (
            <article className="ranking-item" key={item.id}>
              <strong className={index < 3 ? "top-three" : ""}>{index + 1}</strong>
              <DishImage item={item} size="tiny" />
              <div>
                <h3>{item.name}</h3>
                <span>{t("popularDishes.sales", { count: item.quantity })}</span>
              </div>
            </article>
          ))
        ) : (
          <div className="ranking-empty">
            <Icon name="orders" size={26} />
            <strong>{t("common.empty.noPopularDishes")}</strong>
            <span>{t("common.empty.noPopularDishesDesc")}</span>
          </div>
        )}
      </div>
      {ranked.length > 0 && (
        <button className="ranking-button" onClick={onOpenReports} type="button">
          {t("popularDishes.viewReports")}
        </button>
      )}
    </aside>
  );
}
