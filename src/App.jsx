import React, { useEffect, useMemo, useState } from "react";
import { AdminSection } from "./AdminSections";

const STORAGE_KEY = "harbour-ordering-demo-orders";
const MENU_STORAGE_KEY = "harbour-admin-menu";

const seedMenuItems = [
  {
    id: "char-siu",
    name: "蜜汁叉燒飯",
    description: "明爐叉燒、時蔬、香米飯",
    category: "飯類",
    price: 68,
    image: "0% 0%",
  },
  {
    id: "shrimp-dumpling",
    name: "鮮蝦餃皇",
    description: "晶瑩薄皮，鮮蝦爽彈",
    category: "點心",
    price: 42,
    image: "100% 0%",
  },
  {
    id: "wonton-noodle",
    name: "鮮蝦雲吞麵",
    description: "竹昇細麵、鮮蝦雲吞、清湯",
    category: "麵類",
    price: 56,
    image: "0% 50%",
  },
  {
    id: "stir-fried-beef",
    name: "時蔬炒牛肉",
    description: "鑊氣十足，牛肉嫩滑",
    category: "小菜",
    price: 88,
    image: "100% 50%",
  },
  {
    id: "steamed-fish",
    name: "清蒸海上鮮",
    description: "薑蔥豉油，每日新鮮供應",
    category: "小菜",
    price: 138,
    image: "0% 100%",
  },
  {
    id: "mango-pomelo",
    name: "楊枝甘露",
    description: "香芒、柚子、西米，清甜順滑",
    category: "甜品",
    price: 38,
    image: "100% 100%",
  },
];

const categories = ["全部", "飯類", "點心", "麵類", "小菜", "甜品"];

const seedOrders = [
  {
    id: "HO-1001",
    sequence: 1001,
    table: "8",
    createdAt: "2026-06-02T11:36:00+08:00",
    status: "pending",
    items: [
      { id: "shrimp-dumpling", quantity: 2 },
      { id: "mango-pomelo", quantity: 1 },
    ],
  },
  {
    id: "HO-1002",
    sequence: 1002,
    table: "3",
    createdAt: "2026-06-02T11:41:00+08:00",
    status: "pending",
    items: [
      { id: "stir-fried-beef", quantity: 1 },
      { id: "char-siu", quantity: 2 },
    ],
  },
  {
    id: "HO-1003",
    sequence: 1003,
    table: "15",
    createdAt: "2026-06-02T11:48:00+08:00",
    status: "printed",
    items: [
      { id: "wonton-noodle", quantity: 2 },
      { id: "shrimp-dumpling", quantity: 1 },
    ],
  },
  {
    id: "HO-1004",
    sequence: 1004,
    table: "6",
    createdAt: "2026-06-02T12:02:00+08:00",
    status: "settled",
    items: [
      { id: "steamed-fish", quantity: 1 },
      { id: "char-siu", quantity: 1 },
      { id: "mango-pomelo", quantity: 2 },
    ],
  },
];

function loadOrders() {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedOrders));
    return seedOrders;
  }

  try {
    return JSON.parse(existing);
  } catch {
    return seedOrders;
  }
}

function saveOrders(orders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  window.dispatchEvent(new CustomEvent("harbour-orders-change"));
}

function loadMenuItems() {
  const existing = localStorage.getItem(MENU_STORAGE_KEY);
  if (!existing) return seedMenuItems.map((item) => ({ ...item, soldOut: false }));

  try {
    return JSON.parse(existing);
  } catch {
    return seedMenuItems.map((item) => ({ ...item, soldOut: false }));
  }
}

function money(value) {
  return `HK$ ${value.toLocaleString("zh-HK")}`;
}

function getMenuItem(id, items = seedMenuItems) {
  return items.find((item) => item.id === id);
}

function getOrderTotal(order, items = seedMenuItems) {
  return order.items.reduce(
    (total, item) => total + (getMenuItem(item.id, items)?.price || 0) * item.quantity,
    0,
  );
}

function getOrderCount(order) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function formatTime(dateString) {
  return new Intl.DateTimeFormat("zh-HK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

function Icon({ name, size = 20 }) {
  const paths = {
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    cart: (
      <>
        <path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H7" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    trash: (
      <>
        <path d="M4 7h16M10 11v6M14 11v6M9 7V4h6v3M6 7l1 14h10l1-14" />
      </>
    ),
    dashboard: (
      <>
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
      </>
    ),
    orders: (
      <>
        <path d="M7 3h10v4H7zM5 5h14v16H5zM8 11h8M8 15h8" />
      </>
    ),
    utensils: (
      <>
        <path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3v18M14 3v8h3" />
      </>
    ),
    table: (
      <>
        <path d="M4 8h16M6 8v10M18 8v10M4 18h16M7 4h10v4H7z" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    printer: (
      <>
        <path d="M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1h-.2v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    store: (
      <>
        <path d="m3 10 2-6h14l2 6M5 10v10h14V10M9 20v-6h6v6" />
        <path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    rotate: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v6h6" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}

function DishImage({ item, size = "normal" }) {
  const hasPhoto = Boolean(item.imageUrl);
  const hasSprite = Boolean(item.image);

  return (
    <div
      aria-label={`${item.name}圖片`}
      className={`dish-image ${size} ${!hasPhoto && !hasSprite ? "empty" : ""}`}
      role="img"
      style={hasPhoto ? {
        backgroundImage: `url(${JSON.stringify(item.imageUrl)})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      } : { backgroundPosition: item.image }}
    >
      {!hasPhoto && !hasSprite && <span>{item.name.slice(0, 1)}</span>}
    </div>
  );
}

function ViewToggle({ view, setView }) {
  return (
    <div className="view-toggle" aria-label="切換演示畫面">
      <button
        className={view === "guest" ? "active" : ""}
        onClick={() => setView("guest")}
        type="button"
      >
        顧客點餐
      </button>
      <button
        className={view === "admin" ? "active" : ""}
        onClick={() => setView("admin")}
        type="button"
      >
        餐廳後台
      </button>
    </div>
  );
}

function GuestApp({ menuItems, onPlaceOrder, orders, setView }) {
  const [activeCategory, setActiveCategory] = useState("全部");
  const [cart, setCart] = useState({});
  const [isCartOpen, setCartOpen] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [stockNotice, setStockNotice] = useState("");

  const visibleMenu = useMemo(
    () =>
      activeCategory === "全部"
        ? menuItems.filter((item) => !item.deleted)
        : menuItems.filter((item) => !item.deleted && item.category === activeCategory),
    [activeCategory, menuItems],
  );

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, quantity]) => quantity > 0)
        .map(([id, quantity]) => {
          const item = getMenuItem(id, menuItems);
          return item ? { ...item, quantity } : null;
        })
        .filter(Boolean),
    [cart, menuItems],
  );

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );

  useEffect(() => {
    const unavailableIds = new Set(menuItems.filter((item) => item.soldOut || item.deleted).map((item) => item.id));
    const hasUnavailableItem = Object.entries(cart).some(([id, quantity]) => quantity > 0 && unavailableIds.has(id));
    if (!hasUnavailableItem) return;

    setCart((current) => Object.fromEntries(
      Object.entries(current).filter(([id]) => !unavailableIds.has(id)),
    ));
    setStockNotice("部分菜品已停止供應，已從購物車移除。");
  }, [cart, menuItems]);

  function updateItem(id, delta) {
    const item = getMenuItem(id, menuItems);
    if (delta > 0 && (!item || item.soldOut || item.deleted)) {
      setStockNotice("這款菜品已售罄，暫時不能加入購物車。");
      return;
    }

    setCart((current) => {
      const nextQuantity = Math.max(0, (current[id] || 0) + delta);
      return { ...current, [id]: nextQuantity };
    });
  }

  function submitOrder() {
    if (!cartItems.length) return;
    const order = onPlaceOrder(
      cartItems.map(({ id, quantity }) => ({ id, quantity })),
    );
    if (!order) {
      setStockNotice("部分菜品已售罄，請重新確認購物車。");
      return;
    }
    setConfirmation(order);
    setCart({});
    setCartOpen(false);
  }

  return (
    <main className="guest-shell">
      <header className="guest-header">
        <div>
          <span className="restaurant-name">海港小館</span>
          <span className="table-label">12號桌</span>
        </div>
        <button className="language-button" type="button">
          中 <span>繁</span>
        </button>
      </header>

      <section className="menu-heading">
        <div>
          <h1>菜單</h1>
          <p>落單後，廚房會按次序準備餐點。</p>
        </div>
        <button className="admin-shortcut" onClick={() => setView("admin")} type="button">
          後台演示
        </button>
      </section>

      <nav className="category-tabs" aria-label="菜品分類">
        {categories.map((category) => (
          <button
            className={category === activeCategory ? "active" : ""}
            key={category}
            onClick={() => setActiveCategory(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </nav>

      {stockNotice && (
        <div className="stock-notice">
          <span>{stockNotice}</span>
          <button aria-label="關閉提示" onClick={() => setStockNotice("")} type="button">×</button>
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
                {item.soldOut && <span className="sold-out-label">已售罄</span>}
              </div>
              <div className="menu-item-control">
                {quantity > 0 && (
                  <>
                    <button
                      aria-label={`減少${item.name}`}
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
                  aria-label={item.soldOut ? `${item.name}已售罄` : `加入${item.name}`}
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

      <section className="table-orders">
        <div>
          <h2>本桌已落單</h2>
          <p>{orders.filter((order) => order.table === "12").length || "暫無"} 張訂單</p>
        </div>
        <Icon name="orders" size={22} />
      </section>

      {itemCount > 0 && (
        <button className="cart-bar" onClick={() => setCartOpen(true)} type="button">
          <span className="cart-icon">
            <Icon name="cart" size={23} />
            <small>{itemCount}</small>
          </span>
          <span>
            <strong>{money(total)}</strong>
            <em>查看購物車</em>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      {isCartOpen && (
        <div className="modal-backdrop">
          <section className="cart-sheet" aria-label="購物車">
            <div className="sheet-handle" />
            <header>
              <div>
                <h2>購物車</h2>
                <p>12號桌 · 請確認餐點數量</p>
              </div>
              <button className="text-button" onClick={() => setCartOpen(false)} type="button">
                關閉
              </button>
            </header>
            <div className="cart-lines">
              {cartItems.map((item) => (
                <article className="cart-line" key={item.id}>
                  <DishImage item={item} size="small" />
                  <div>
                    <h3>{item.name}</h3>
                    <strong>{money(item.price)}</strong>
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
                <span>合計</span>
                <strong>{money(total)}</strong>
              </div>
              <button className="primary-button" onClick={submitOrder} type="button">
                確認下單
              </button>
            </footer>
          </section>
        </div>
      )}

      {confirmation && (
        <div className="modal-backdrop confirmation-backdrop">
          <section className="confirmation-card">
            <span className="success-icon">
              <Icon name="check" size={30} />
            </span>
            <h2>落單成功</h2>
            <p>訂單 {confirmation.id} 已送到餐廳，廚房會按次序準備。</p>
            <div className="confirmation-meta">
              <span>桌號</span>
              <strong>12號桌</strong>
              <span>金額</span>
              <strong>{money(getOrderTotal(confirmation, menuItems))}</strong>
            </div>
            <button className="primary-button" onClick={() => setConfirmation(null)} type="button">
              繼續加菜
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

const navItems = [
  ["dashboard", "dashboard", "營運總覽"],
  ["orders", "orders", "訂單管理"],
  ["menu", "utensils", "菜單管理"],
  ["tables", "table", "桌位管理"],
  ["reports", "chart", "報表分析"],
  ["staff", "user", "員工管理"],
  ["printer", "printer", "打印設定"],
  ["settings", "settings", "設定"],
];

function Sidebar({ activeSection, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="admin-brand">
        <span className="brand-mark">
          <Icon name="store" size={20} />
        </span>
        <strong>海港小館</strong>
      </div>
      <nav>
        {navItems.map(([section, icon, label]) => (
          <button className={section === activeSection ? "active" : ""} key={label} onClick={() => onNavigate(section)} type="button">
            <Icon name={icon} size={18} />
            <span>{label}</span>
            {section === "orders" && <small>2</small>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button type="button">
          <Icon name="user" size={18} />
          <span>經理帳戶</span>
        </button>
      </div>
    </aside>
  );
}

function MobileAdminNav({ activeSection, onClose, onNavigate }) {
  return (
    <div className="mobile-nav-backdrop" onClick={onClose}>
      <aside className="mobile-admin-nav" onClick={(event) => event.stopPropagation()}>
        <header>
          <div className="mobile-nav-brand">
            <span className="brand-mark">
              <Icon name="store" size={20} />
            </span>
            <strong>香港小館</strong>
          </div>
          <button aria-label="關閉管理菜單" className="mobile-nav-close" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <nav>
          {navItems.map(([section, icon, label]) => (
            <button
              className={section === activeSection ? "active" : ""}
              key={label}
              onClick={() => {
                onNavigate(section);
                onClose();
              }}
              type="button"
            >
              <Icon name={icon} size={18} />
              <span>{label}</span>
              {section === "orders" && <small>2</small>}
            </button>
          ))}
        </nav>
      </aside>
    </div>
  );
}

function StatusBadge({ status }) {
  const labels = {
    pending: "待處理",
    printed: "已列印",
    settled: "已結帳",
  };
  return <span className={`status-badge ${status}`}>{labels[status]}</span>;
}

function OrderCard({ menuItems, order, onPrint, onSettle }) {
  return (
    <article className={`order-card ${order.status}`}>
      <header>
        <div>
          <span className="order-sequence">#{order.sequence}</span>
          <h3>{order.table}號桌</h3>
        </div>
        <div className="order-time">
          <strong>{formatTime(order.createdAt)}</strong>
          <span>{getOrderCount(order)} 件餐點</span>
        </div>
      </header>
      <div className="order-lines">
        {order.items.map((line) => {
          const item = getMenuItem(line.id, menuItems);
          return (
            <div key={line.id}>
              <span>{item?.name || "已移除菜品"}</span>
              <strong>x {line.quantity}</strong>
            </div>
          );
        })}
      </div>
      <div className="order-total">
        <span>合計</span>
        <strong>{money(getOrderTotal(order, menuItems))}</strong>
      </div>
      <footer>
        <StatusBadge status={order.status} />
        <div>
          {order.status !== "settled" && (
            <button className="outline-button" onClick={() => onPrint(order.id)} type="button">
              <Icon name="printer" size={15} />
              列印
            </button>
          )}
          {order.status !== "settled" && (
            <button className="settle-button" onClick={() => onSettle(order.id)} type="button">
              <Icon name="check" size={15} />
              結帳
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}

function PopularDishes({ menuItems, orders }) {
  const ranked = useMemo(() => {
    const totals = Object.fromEntries(menuItems.map((item) => [item.id, 0]));
    orders.forEach((order) => {
      order.items.forEach((item) => {
        totals[item.id] = (totals[item.id] || 0) + item.quantity;
      });
    });
    return menuItems
      .map((item) => ({ ...item, quantity: totals[item.id] }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [menuItems, orders]);

  return (
    <aside className="ranking-panel">
      <header>
        <div>
          <h2>熱門菜式</h2>
          <p>今日銷量排行</p>
        </div>
        <Icon name="chart" size={21} />
      </header>
      <div className="ranking-list">
        {ranked.map((item, index) => (
          <article className="ranking-item" key={item.id}>
            <strong className={index < 3 ? "top-three" : ""}>{index + 1}</strong>
            <DishImage item={item} size="tiny" />
            <div>
              <h3>{item.name}</h3>
              <span>銷量 {item.quantity} 份</span>
            </div>
          </article>
        ))}
      </div>
      <button className="ranking-button" type="button">
        查看完整報表
      </button>
    </aside>
  );
}

function AdminApp({ menuItems, onMenuItemsChange, orders, onPrint, onReset, onSettle, setView }) {
  const pendingOrders = orders
    .filter((order) => order.status !== "settled")
    .sort((a, b) => a.sequence - b.sequence);
  const completedOrders = orders
    .filter((order) => order.status === "settled")
    .sort((a, b) => b.sequence - a.sequence);
  const [filter, setFilter] = useState("pending");
  const [activeSection, setActiveSection] = useState("orders");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibleOrders = filter === "pending" ? pendingOrders : completedOrders;

  return (
    <main className="admin-shell">
      <Sidebar activeSection={activeSection} onNavigate={setActiveSection} />
      {mobileMenuOpen && (
        <MobileAdminNav activeSection={activeSection} onClose={() => setMobileMenuOpen(false)} onNavigate={setActiveSection} />
      )}
      <section className="admin-workspace">
        <header className="admin-topbar">
          <button className="mobile-nav-trigger" onClick={() => setMobileMenuOpen(true)} type="button">
            <Icon name="menu" size={18} />
            管理菜單
          </button>
          <div>
            <span>2026年6月2日 · 星期二</span>
            <strong>午市營業中</strong>
          </div>
          <div>
            <button aria-label="通知" className="topbar-icon" type="button">
              <Icon name="bell" size={18} />
              {pendingOrders.some((order) => order.status === "pending") && <small />}
            </button>
            <button className="guest-shortcut" onClick={() => setView("guest")} type="button">
              返回顧客端
            </button>
          </div>
        </header>
        {activeSection !== "orders" ? (
          <AdminSection
            activeSection={activeSection}
            menuItems={menuItems}
            onMenuItemsChange={onMenuItemsChange}
            onNavigate={setActiveSection}
            orders={orders}
          />
        ) : <div className="admin-layout">
          <section className="orders-panel">
            <header className="orders-header">
              <div>
                <p>訂單管理</p>
                <h1>
                  新訂單 <span>{pendingOrders.length}</span>
                </h1>
              </div>
              <div className="admin-actions">
                <button className="reset-button" onClick={onReset} type="button">
                  <Icon name="rotate" size={15} />
                  重設演示
                </button>
              </div>
            </header>
            <div className="orders-tabs">
              <button
                className={filter === "pending" ? "active" : ""}
                onClick={() => setFilter("pending")}
                type="button"
              >
                待處理及已列印 <span>{pendingOrders.length}</span>
              </button>
              <button
                className={filter === "settled" ? "active" : ""}
                onClick={() => setFilter("settled")}
                type="button"
              >
                已結帳 <span>{completedOrders.length}</span>
              </button>
            </div>
            <div className="queue-note">
              <span>出單次序</span>
              <p>系統按照顧客提交時間排列，較早落單會優先顯示。</p>
            </div>
            <div className="orders-grid">
              {visibleOrders.length ? (
                visibleOrders.map((order) => (
                  <OrderCard key={order.id} menuItems={menuItems} onPrint={onPrint} onSettle={onSettle} order={order} />
                ))
              ) : (
                <div className="empty-state">
                  <Icon name="orders" size={30} />
                  <h3>暫時沒有訂單</h3>
                  <p>新訂單出現時，這裡會即時更新。</p>
                </div>
              )}
            </div>
          </section>
          <PopularDishes menuItems={menuItems} orders={orders} />
        </div>}
      </section>
    </main>
  );
}

function App() {
  const [view, setView] = useState(
    new URLSearchParams(window.location.search).get("view") === "admin"
      ? "admin"
      : "guest",
  );
  const [orders, setOrders] = useState(loadOrders);
  const [menuItems, setMenuItems] = useState(loadMenuItems);

  useEffect(() => {
    function syncOrders() {
      setOrders(loadOrders());
    }
    window.addEventListener("storage", syncOrders);
    window.addEventListener("harbour-orders-change", syncOrders);
    return () => {
      window.removeEventListener("storage", syncOrders);
      window.removeEventListener("harbour-orders-change", syncOrders);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    function syncMenuItems(event) {
      if (event.key === MENU_STORAGE_KEY) setMenuItems(loadMenuItems());
    }
    window.addEventListener("storage", syncMenuItems);
    return () => window.removeEventListener("storage", syncMenuItems);
  }, []);

  function placeOrder(items) {
    if (items.some((line) => {
      const item = getMenuItem(line.id, menuItems);
      return !item || item.soldOut || item.deleted;
    })) return null;

    const latestOrders = loadOrders();
    const maxSequence = Math.max(...latestOrders.map((order) => order.sequence), 1000);
    const order = {
      id: `HO-${maxSequence + 1}`,
      sequence: maxSequence + 1,
      table: "12",
      createdAt: new Date().toISOString(),
      status: "pending",
      items,
    };
    saveOrders([...latestOrders, order]);
    return order;
  }

  function updateOrderStatus(id, status) {
    saveOrders(
      loadOrders().map((order) => (order.id === id ? { ...order, status } : order)),
    );
  }

  function resetDemo() {
    saveOrders(seedOrders);
  }

  return (
    <>
      <ViewToggle setView={setView} view={view} />
      {view === "guest" ? (
        <GuestApp menuItems={menuItems} onPlaceOrder={placeOrder} orders={orders} setView={setView} />
      ) : (
        <AdminApp
          menuItems={menuItems}
          onMenuItemsChange={setMenuItems}
          onPrint={(id) => updateOrderStatus(id, "printed")}
          onReset={resetDemo}
          onSettle={(id) => updateOrderStatus(id, "settled")}
          orders={orders}
          setView={setView}
        />
      )}
    </>
  );
}

export default App;
