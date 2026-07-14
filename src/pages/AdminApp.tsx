import React, { useEffect, useMemo, useState } from "react";
import { AdminAuthGuard } from "../components/admin/AdminAuthGuard";
import { MobileAdminNav } from "../components/admin/MobileAdminNav";
import { OrderCard } from "../components/admin/OrderCard";
import { PopularDishes } from "../components/admin/PopularDishes";
import { SettlementConfirmDialog } from "../components/admin/SettlementConfirmDialog";
import { Sidebar } from "../components/admin/Sidebar";
import { Icon } from "../components/ui/Icon";
import { useFormatAdminDate } from "../i18n/useFormatAdminDate";
import { useTranslation } from "../i18n/useTranslation";
import { getDataSourceMode } from "../services/dataSource";
import { listActiveOrders, listSettledOrders } from "../services/orderService";
import { useMenuStore } from "../stores/menuStore";
import { useOrderStore } from "../stores/orderStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useAuthStore } from "../stores/authStore";
import { useTableStore } from "../stores/tableStore";
import { canAccessAdminSection, getAllowedNavItems } from "../utils/adminPermissions";
import { getTablesWithOrderStatus } from "../utils/table";
import { Dashboard } from "./Dashboard";
import { MenuManagement } from "./MenuManagement";
import { PrinterSettings } from "./PrinterSettings";
import { Reports } from "./Reports";
import { RestaurantSettings } from "./RestaurantSettings";
import { StaffManagement } from "./StaffManagement";
import { TableManagement } from "./TableManagement";
import type { MealPeriod, Order } from "../types";

interface AdminAppProps {
  activeMealPeriod: MealPeriod | null;
  guestBaseUrl: string;
  now: Date;
}

export function AdminApp({ activeMealPeriod, guestBaseUrl, now }: AdminAppProps) {
  const { t } = useTranslation();
  const formatAdminDate = useFormatAdminDate();
  const menuItems = useMenuStore((state) => state.items);
  const orders = useOrderStore((state) => state.orders);
  const tables = useTableStore((state) => state.tables);
  const pendingOrders = useMemo(() => listActiveOrders(orders), [orders]);
  const newOrderCount = useMemo(() => orders.filter((order) => order.status === "pending").length, [orders]);
  const completedOrders = useMemo(() => listSettledOrders(orders), [orders]);
  const restaurantName = useSettingsStore((state) => state.restaurant.name);
  const staffProfile = useAuthStore((state) => state.staffProfile);
  const signOut = useAuthStore((state) => state.signOut);
  const [filter, setFilter] = useState<"pending" | "settled">("pending");
  const [activeSection, setActiveSection] = useState("orders");
  const [actionError, setActionError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settlementOrder, setSettlementOrder] = useState<Order | null>(null);
  const [settlingOrderId, setSettlingOrderId] = useState<string | null>(null);
  const isSupabaseMode = getDataSourceMode() === "supabase";
  const permissionProfile = isSupabaseMode
    ? staffProfile
    : { active: true, id: 0, name: "Local Admin", role: "manager" };
  const visibleOrders = filter === "pending" ? pendingOrders : completedOrders;
  const tablesWithStatus = useMemo(() => getTablesWithOrderStatus(tables, orders), [orders, tables]);
  const allowedNavItems = useMemo(() => getAllowedNavItems(permissionProfile), [permissionProfile]);
  const canSettleOrders = permissionProfile?.role === "manager" || permissionProfile?.role === "cashier";

  useEffect(() => {
    if (!canAccessAdminSection(permissionProfile, activeSection)) setActiveSection("orders");
  }, [activeSection, permissionProfile]);

  async function handlePrint(id: string): Promise<void> {
    setActionError("");
    try {
      await useOrderStore.getState().updateStatus(id, "printed", useMenuStore.getState().items);
    } catch (error) {
      console.error("Print order failed", error);
      setActionError(t("adminApp.printFailed"));
    }
  }

  function handleReset(): void {
    if (isSupabaseMode) return;
    if (!window.confirm(t("adminApp.actions.resetDemoConfirm"))) return;
    useOrderStore.getState().resetDemo(useMenuStore.getState().items);
  }

  function handleSettle(id: string): void {
    const order = orders.find((entry) => entry.id === id);
    if (!order || !canSettleOrders) return;
    setActionError("");
    setSettlementOrder(order);
  }

  async function confirmSettlement(): Promise<void> {
    if (!settlementOrder || settlingOrderId) return;
    setActionError("");
    setSettlingOrderId(settlementOrder.id);
    try {
      await useOrderStore.getState().updateStatus(settlementOrder.id, "settled", useMenuStore.getState().items);
      setSettlementOrder(null);
    } catch (error) {
      console.error("Settle order failed", error);
      setActionError(t("adminApp.settleFailed"));
    } finally {
      setSettlingOrderId(null);
    }
  }

  async function handleSignOut(): Promise<void> {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed", error);
    }
  }

  function getStaffRoleLabel(): string {
    if (!staffProfile) return "";
    return t(`staffManagement.roles.${staffProfile.role}`);
  }

  function renderAdminSection() {
    if (!canAccessAdminSection(permissionProfile, activeSection)) return null;
    if (activeSection === "dashboard") return <Dashboard menuItems={menuItems} onNavigate={setActiveSection} orders={orders} tables={tablesWithStatus} />;
    if (activeSection === "menu") return <MenuManagement />;
    if (activeSection === "tables") return <TableManagement guestBaseUrl={guestBaseUrl} tables={tablesWithStatus} />;
    if (activeSection === "reports") return <Reports menuItems={menuItems} orders={orders} />;
    if (activeSection === "staff") return <StaffManagement />;
    if (activeSection === "printer") return <PrinterSettings />;
    return <RestaurantSettings />;
  }

  return (
    <AdminAuthGuard>
    <main className="admin-shell">
      <Sidebar activeSection={activeSection} navItemsOverride={allowedNavItems} onNavigate={setActiveSection} orderBadgeCount={newOrderCount} restaurantName={restaurantName} />
      {mobileMenuOpen && (
        <MobileAdminNav activeSection={activeSection} navItemsOverride={allowedNavItems} onClose={() => setMobileMenuOpen(false)} onNavigate={setActiveSection} orderBadgeCount={newOrderCount} restaurantName={restaurantName} />
      )}
      <section className="admin-workspace">
        <header className="admin-topbar">
          <button className="mobile-nav-trigger" onClick={() => setMobileMenuOpen(true)} type="button">
            <Icon name="menu" size={18} />
            {t("adminApp.managementMenu")}
          </button>
          <div>
            <span>{formatAdminDate(now)}</span>
            <strong>{activeMealPeriod ? t("adminApp.mealPeriodOpen", { name: activeMealPeriod.name }) : t("adminApp.mealPeriodClosed")}</strong>
          </div>
          <div className="admin-topbar-actions">
            <button aria-label={t("adminApp.notification")} className="topbar-icon" type="button">
              <Icon name="bell" size={18} />
              {pendingOrders.some((order) => order.status === "pending") && <small />}
            </button>
            {isSupabaseMode && staffProfile && (
              <div className="admin-session">
                <span>{t("adminApp.signedInAs")}</span>
                <strong>{staffProfile.name}</strong>
                <small>{getStaffRoleLabel()}</small>
                <button className="sign-out-button" onClick={handleSignOut} type="button">
                  <Icon name="log-out" size={16} />
                  {t("adminApp.signOut")}
                </button>
              </div>
            )}
          </div>
        </header>
        {activeSection !== "orders" ? renderAdminSection() : (
          <div className="admin-layout">
            <section className="orders-panel">
              <header className="orders-header">
                <div>
                  <p>{t("adminApp.orders.label")}</p>
                  <h1>
                    {t("adminApp.orders.heading")}<span>{pendingOrders.length}</span>
                  </h1>
                </div>
                {!isSupabaseMode && (
                  <div className="admin-actions">
                    <button className="reset-button" onClick={handleReset} type="button">
                      <Icon name="rotate" size={15} />
                      {t("adminApp.actions.resetDemo")}
                    </button>
                  </div>
                )}
              </header>
              <div className="orders-tabs">
                <button
                  className={filter === "pending" ? "active" : ""}
                  onClick={() => setFilter("pending")}
                  type="button"
                >
                  {t("adminApp.orders.activeTab")}<span>{pendingOrders.length}</span>
                </button>
                <button
                  className={filter === "settled" ? "active" : ""}
                  onClick={() => setFilter("settled")}
                  type="button"
                >
                  {t("adminApp.orders.completedTab")}<span>{completedOrders.length}</span>
                </button>
              </div>
              {actionError && <p className="management-error">{actionError}</p>}
              <div className="queue-note">
                <span>{t("adminApp.orders.flowTitle")}</span>
                <p>{t("adminApp.orders.flowDescription")}</p>
              </div>
              <div className="orders-grid">
                {visibleOrders.length ? (
                  visibleOrders.map((order) => (
                    <OrderCard
                      canSettle={canSettleOrders}
                      isSettling={settlingOrderId === order.id}
                      key={order.id}
                      menuItems={menuItems}
                      onPrint={handlePrint}
                      onSettle={handleSettle}
                      order={order}
                    />
                  ))
                ) : (
                  <div className="empty-state">
                    <Icon name="orders" size={30} />
                    <h3>{t("common.empty.noOrders")}</h3>
                    <p>{t("common.empty.noOrdersDesc")}</p>
                  </div>
                )}
              </div>
              {settlementOrder && (
                <SettlementConfirmDialog
                  isSubmitting={settlingOrderId === settlementOrder.id}
                  menuItems={menuItems}
                  onCancel={() => setSettlementOrder(null)}
                  onConfirm={() => void confirmSettlement()}
                  operatorName={staffProfile?.name || t("adminApp.orders.localOperator")}
                  order={settlementOrder}
                />
              )}
            </section>
            <PopularDishes menuItems={menuItems} onOpenReports={() => setActiveSection("reports")} orders={orders} />
          </div>
        )}
      </section>
    </main>
    </AdminAuthGuard>
  );
}
