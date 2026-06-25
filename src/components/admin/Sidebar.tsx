import React from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { navItems } from "../../utils/navigation";
import { Icon } from "../ui/Icon";

interface SidebarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  orderBadgeCount: number;
  restaurantName: string;
}

export function Sidebar({ activeSection, onNavigate, orderBadgeCount, restaurantName }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="sidebar">
      <div className="admin-brand">
        <span className="brand-mark">
          <Icon name="store" size={20} />
        </span>
        <strong>{restaurantName}</strong>
      </div>
      <nav>
        {navItems.map(([section, icon]) => (
          <button className={section === activeSection ? "active" : ""} key={section} onClick={() => onNavigate(section)} type="button">
            <Icon name={icon} size={18} />
            <span>{t(`navigation.${section}`)}</span>
            {section === "orders" && orderBadgeCount > 0 && <small>{orderBadgeCount}</small>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button type="button">
          <Icon name="user" size={18} />
          <span>{t("adminApp.account")}</span>
        </button>
      </div>
    </aside>
  );
}
