import React from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { Icon } from "../ui/Icon";
import { money } from "../../utils/money";
import type { MenuItem } from "../../types";

export interface CartItem extends MenuItem {
  quantity: number;
}

interface CartBarProps {
  cartItems: CartItem[];
  itemCount: number;
  onOpen: () => void;
  total: number;
}

export function CartBar({ cartItems, itemCount, onOpen, total }: CartBarProps) {
  const { t } = useTranslation();
  if (itemCount <= 0) return null;

  return (
    <button className="cart-bar" onClick={onOpen} type="button">
      <span className="cart-icon">
        <Icon name="cart" size={23} />
        <small>{itemCount}</small>
      </span>
      <span className="cart-bar-copy">
        <em>{cartItems.slice(0, 3).map((item) => `${item.name} x${item.quantity}`).join("、")}</em>
        <strong>{money(total)}</strong>
      </span>
      <span className="cart-bar-action">{t("guestApp.confirmOrder")}</span>
    </button>
  );
}
