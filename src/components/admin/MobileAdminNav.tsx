import React from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { navItems } from "../../utils/navigation";
import { Icon } from "../ui/Icon";

interface MobileAdminNavProps {
  activeSection: string;
  onClose: () => void;
  onNavigate: (section: string) => void;
  orderBadgeCount: number;
  restaurantName: string;
}

export function MobileAdminNav({ activeSection, onClose, onNavigate, orderBadgeCount, restaurantName }: MobileAdminNavProps) {
  const { t } = useTranslation();

  return (
    <div className="mobile-nav-backdrop" onClick={onClose}>
      <aside className="mobile-admin-nav" onClick={(event: React.MouseEvent<HTMLElement>) => event.stopPropagation()}>
        <header>
          <div className="mobile-nav-brand">
            <span className="brand-mark">
              <Icon name="store" size={20} />
            </span>
            <strong>{restaurantName}</strong>
          </div>
          <button aria-label={t("adminApp.closeManagementMenu")} className="mobile-nav-close" onClick={onClose} type="button">
            x
          </button>
        </header>
        <nav>
          {navItems.map(([section, icon]) => (
            <button
              className={section === activeSection ? "active" : ""}
              key={section}
              onClick={() => {
                onNavigate(section);
                onClose();
              }}
              type="button"
            >
              <Icon name={icon} size={18} />
              <span>{t(`navigation.${section}`)}</span>
              {section === "orders" && orderBadgeCount > 0 && <small>{orderBadgeCount}</small>}
            </button>
          ))}
        </nav>
      </aside>
    </div>
  );
}
