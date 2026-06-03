import React, { useEffect, useMemo, useState } from "react";
import { AdminSection } from "./AdminSections";
import {
  formatAdminDate,
  getCurrentMealPeriod,
  isItemAvailableForMealPeriod,
  loadRestaurantSettings,
  SETTINGS_CHANGE_EVENT,
} from "./restaurantSettings";
import { loadPrinterSettings } from "./printerSettings";

const STORAGE_KEY = "harbour-ordering-demo-orders";
const MENU_STORAGE_KEY = "harbour-admin-menu";

const DISH_IMAGE_POSITIONS = ["0% 0%", "100% 0%", "0% 50%", "100% 50%", "0% 100%", "100% 100%"];

function seedDish(id, name, description, category, price, imageIndex) {
  return {
    id,
    name,
    description,
    category,
    price,
    image: DISH_IMAGE_POSITIONS[imageIndex % DISH_IMAGE_POSITIONS.length],
  };
}

const seedMenuItems = [
  seedDish("char-siu", "蜜汁叉燒飯", "明爐叉燒、時蔬、香米飯", "飯類", 68, 0),
  seedDish("roast-goose-rice", "燒鵝飯", "脆皮燒鵝、油香白飯、梅子醬", "飯類", 98, 0),
  seedDish("soy-chicken-rice", "豉油雞飯", "嫩滑豉油雞、薑蓉、菜心", "飯類", 62, 0),
  seedDish("hainan-chicken-rice", "海南雞飯", "白切雞、雞油飯、三色醬", "飯類", 72, 0),
  seedDish("beef-brisket-rice", "牛腩飯", "柱侯牛腩、蘿蔔、香米飯", "飯類", 78, 3),
  seedDish("curry-beef-rice", "咖喱牛腩飯", "港式咖喱、軟腍牛腩、薯仔", "飯類", 82, 3),
  seedDish("tomato-porkchop-rice", "鮮茄豬扒飯", "香煎豬扒、鮮茄汁、白飯", "飯類", 76, 3),
  seedDish("yangzhou-fried-rice", "揚州炒飯", "蝦仁、叉燒、雞蛋、青豆", "飯類", 68, 0),
  seedDish("seafood-fried-rice", "海鮮炒飯", "鮮蝦、帶子、蟹柳、蛋香飯", "飯類", 88, 4),
  seedDish("claypot-eel-rice", "鰻魚煲仔飯", "蒲燒鰻魚、煲仔飯、甜豉油", "飯類", 108, 4),

  seedDish("shrimp-dumpling", "鮮蝦餃皇", "晶瑩薄皮，鮮蝦爽彈", "點心", 42, 1),
  seedDish("pork-siu-mai", "蟹籽燒賣", "豬肉鮮蝦、蟹籽點綴", "點心", 38, 1),
  seedDish("bbq-pork-bun", "叉燒包", "鬆軟包皮、蜜汁叉燒餡", "點心", 32, 1),
  seedDish("custard-bun", "流沙奶皇包", "鹹蛋黃奶皇、熱食流心", "點心", 36, 5),
  seedDish("turnip-cake", "香煎蘿蔔糕", "臘味蘿蔔糕、外脆內軟", "點心", 34, 1),
  seedDish("spring-roll", "脆皮春卷", "鮮蔬肉絲、香脆金黃", "點心", 30, 1),
  seedDish("rice-roll", "鮮蝦腸粉", "滑身腸粉、鮮蝦、甜豉油", "點心", 46, 1),
  seedDish("phoenix-claw", "豉汁鳳爪", "蒸至軟糯、豉汁入味", "點心", 36, 3),
  seedDish("spare-ribs", "豉汁蒸排骨", "蒜香豉汁、排骨嫩滑", "點心", 42, 3),
  seedDish("xiao-long-bao", "小籠湯包", "薄皮湯汁、鮮肉餡", "點心", 44, 1),

  seedDish("wonton-noodle", "鮮蝦雲吞麵", "竹昇細麵、鮮蝦雲吞、清湯", "麵類", 56, 2),
  seedDish("beef-brisket-noodle", "牛腩湯麵", "柱侯牛腩、清湯幼麵", "麵類", 68, 2),
  seedDish("fishball-noodle", "魚蛋河粉", "彈牙魚蛋、滑身河粉", "麵類", 52, 2),
  seedDish("satay-beef-noodle", "沙嗲牛肉麵", "濃香沙嗲、嫩牛肉片", "麵類", 58, 2),
  seedDish("cart-noodle", "港式車仔麵", "多款配料、惹味湯底", "麵類", 48, 2),
  seedDish("roast-goose-lai-fun", "燒鵝瀨粉", "燒鵝件、米香瀨粉", "麵類", 88, 2),
  seedDish("dry-scallion-noodle", "薑蔥撈麵", "薑蔥油香、爽口竹昇麵", "麵類", 46, 2),
  seedDish("seafood-laksa", "海鮮喇沙", "椰香湯底、鮮蝦魚片", "麵類", 78, 4),
  seedDish("black-pepper-udon", "黑椒牛柳烏冬", "黑椒汁、牛柳、彈牙烏冬", "麵類", 82, 3),
  seedDish("tomato-egg-noodle", "番茄蛋湯麵", "鮮茄湯底、滑蛋、幼麵", "麵類", 50, 2),

  seedDish("stir-fried-beef", "時蔬炒牛肉", "鑊氣十足，牛肉嫩滑", "小菜", 88, 3),
  seedDish("steamed-fish", "清蒸海上鮮", "薑蔥豉油，每日新鮮供應", "小菜", 138, 4),
  seedDish("sweet-sour-pork", "菠蘿咕嚕肉", "酸甜開胃、外脆內嫩", "小菜", 86, 3),
  seedDish("salt-pepper-squid", "椒鹽鮮魷", "椒鹽香脆、鮮魷彈牙", "小菜", 98, 4),
  seedDish("garlic-choi-sum", "蒜蓉菜心", "清甜菜心、蒜香惹味", "小菜", 48, 3),
  seedDish("claypot-tofu", "海鮮豆腐煲", "滑豆腐、海鮮、濃郁煲汁", "小菜", 92, 4),
  seedDish("typhoon-crab", "避風塘炒蟹", "蒜酥香辣、蟹肉鮮甜", "小菜", 188, 4),
  seedDish("black-bean-clams", "豉椒炒蜆", "豉椒鮮香、蜆肉飽滿", "小菜", 88, 4),
  seedDish("swiss-wings", "瑞士雞翼", "甜豉油滷香、雞翼入味", "小菜", 58, 3),
  seedDish("mapo-tofu", "麻婆豆腐", "微辣惹味、豆腐嫩滑", "小菜", 62, 3),

  seedDish("mango-pomelo", "楊枝甘露", "香芒、柚子、西米，清甜順滑", "甜品", 38, 5),
  seedDish("egg-tart", "酥皮蛋撻", "牛油酥皮、嫩滑蛋香", "甜品", 18, 5),
  seedDish("coconut-pudding", "椰汁糕", "椰香濃郁、口感清爽", "甜品", 28, 5),
  seedDish("red-bean-soup", "陳皮紅豆沙", "紅豆綿密、陳皮清香", "甜品", 32, 5),
  seedDish("tofu-pudding", "薑汁豆腐花", "豆香細滑、薑汁微辣", "甜品", 30, 5),
  seedDish("sesame-soup", "芝麻糊", "黑芝麻香濃、熱食暖胃", "甜品", 34, 5),
  seedDish("grass-jelly", "仙草涼粉", "清涼爽滑、配糖水", "甜品", 26, 5),
  seedDish("mango-pancake", "芒果班戟", "鮮芒果、忌廉、薄班戟皮", "甜品", 42, 5),
  seedDish("pineapple-bun", "菠蘿油", "香脆菠蘿包、厚切牛油", "甜品", 24, 5),
  seedDish("milk-tea-pudding", "奶茶布甸", "港式奶茶香、滑身布甸", "甜品", 36, 5),

  seedDish("hk-milk-tea", "港式奶茶", "茶味濃厚、奶香順滑", "飲品", 22, 5),
  seedDish("lemon-tea", "凍檸茶", "紅茶清香、新鮮檸檬", "飲品", 24, 5),
  seedDish("yuenyeung", "鴛鴦", "咖啡奶茶混合、港式經典", "飲品", 25, 5),
  seedDish("lemon-coke", "凍檸樂", "可樂氣泡、檸檬清新", "飲品", 24, 5),
  seedDish("red-bean-ice", "紅豆冰", "紅豆、淡奶、碎冰", "飲品", 32, 5),
  seedDish("soy-milk", "冰豆漿", "豆香清甜、冰涼解膩", "飲品", 18, 5),
  seedDish("chrysanthemum-tea", "菊花茶", "清香回甘、冷熱皆宜", "飲品", 18, 5),
  seedDish("iced-coffee", "凍咖啡", "香濃咖啡、冰涼提神", "飲品", 25, 5),
  seedDish("lime-soda", "青檸梳打", "青檸酸香、氣泡清爽", "飲品", 28, 5),
  seedDish("bottled-water", "樽裝水", "簡單清爽、佐餐必備", "飲品", 12, 5),
];

const seedOrders = [
  {
    id: "HO-1001",
    sequence: 1001,
    table: "8",
    createdAt: "2026-06-02T11:36:00+08:00",
    status: "pending",
    items: [
      { id: "shrimp-dumpling", quantity: 2, unitPrice: 42 },
      { id: "mango-pomelo", quantity: 1, unitPrice: 38 },
    ],
  },
  {
    id: "HO-1002",
    sequence: 1002,
    table: "3",
    createdAt: "2026-06-02T11:41:00+08:00",
    status: "pending",
    items: [
      { id: "stir-fried-beef", quantity: 1, unitPrice: 88 },
      { id: "char-siu", quantity: 2, unitPrice: 68 },
    ],
  },
  {
    id: "HO-1003",
    sequence: 1003,
    table: "15",
    createdAt: "2026-06-02T11:48:00+08:00",
    status: "printed",
    items: [
      { id: "wonton-noodle", quantity: 2, unitPrice: 56 },
      { id: "shrimp-dumpling", quantity: 1, unitPrice: 42 },
    ],
  },
  {
    id: "HO-1004",
    sequence: 1004,
    table: "6",
    createdAt: "2026-06-02T12:02:00+08:00",
    status: "settled",
    items: [
      { id: "steamed-fish", quantity: 1, unitPrice: 138 },
      { id: "char-siu", quantity: 1, unitPrice: 68 },
      { id: "mango-pomelo", quantity: 2, unitPrice: 38 },
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
    return JSON.parse(existing).map((order) => ({
      ...order,
      items: order.items.map((item) => {
        const menuItem = getMenuItem(item.id);
        return {
          ...item,
          name: item.name || menuItem?.name,
          unitPrice: item.unitPrice ?? menuItem?.price,
        };
      }),
    }));
  } catch {
    return seedOrders;
  }
}

function saveOrders(orders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  window.dispatchEvent(new CustomEvent("harbour-orders-change"));
}

function getDefaultMenuItems() {
  return seedMenuItems.map((item) => ({ ...item, soldOut: false }));
}

function loadMenuItems() {
  const existing = localStorage.getItem(MENU_STORAGE_KEY);
  if (!existing) return getDefaultMenuItems();

  try {
    const savedItems = JSON.parse(existing);
    if (!Array.isArray(savedItems)) return getDefaultMenuItems();

    const savedIds = new Set(savedItems.map((item) => item.id));
    const newDefaultItems = seedMenuItems
      .filter((item) => !savedIds.has(item.id))
      .map((item) => ({ ...item, soldOut: false }));
    const mergedItems = [
      ...savedItems.map((item) => ({ ...item, soldOut: Boolean(item.soldOut) })),
      ...newDefaultItems,
    ];

    if (newDefaultItems.length > 0) {
      localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(mergedItems));
    }

    return mergedItems;
  } catch {
    return getDefaultMenuItems();
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
    (total, item) => total + (item.unitPrice ?? getMenuItem(item.id, items)?.price ?? 0) * item.quantity,
    0,
  );
}

function getOrderCount(order) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function isSameLocalDate(dateString, date = new Date()) {
  const value = new Date(dateString);
  return (
    value.getFullYear() === date.getFullYear() &&
    value.getMonth() === date.getMonth() &&
    value.getDate() === date.getDate()
  );
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

function GuestOrderHistory({ menuItems, onClose, orders }) {
  const tableTotal = orders.reduce((sum, order) => sum + getOrderTotal(order, menuItems), 0);

  return (
    <div className="modal-backdrop">
      <section className="cart-sheet order-history-sheet" aria-label="本桌訂單明細">
        <div className="sheet-handle" />
        <header>
          <div>
            <h2>本桌訂單</h2>
            <p>12號桌 · 已提交 {orders.length} 張訂單</p>
          </div>
          <button className="text-button" onClick={onClose} type="button">
            關閉
          </button>
        </header>
        {orders.length ? (
          <>
            <div className="guest-order-list">
              {orders.map((order) => (
                <article className="guest-order-card" key={order.id}>
                  <header>
                    <div>
                      <span className="order-sequence">{order.id}</span>
                      <h3>{formatTime(order.createdAt)}</h3>
                    </div>
                    <StatusBadge status={order.status} />
                  </header>
                  <div className="guest-order-lines">
                    {order.items.map((line, index) => {
                      const item = getMenuItem(line.id, menuItems);
                      const unitPrice = line.unitPrice ?? item?.price ?? 0;
                      return (
                        <div key={`${line.id}-${index}`}>
                          <span>{line.name || item?.name || "已下架菜品"}</span>
                          <strong>x {line.quantity}</strong>
                          <em>{money(unitPrice * line.quantity)}</em>
                        </div>
                      );
                    })}
                  </div>
                  <footer>
                    <span>小計</span>
                    <strong>{money(getOrderTotal(order, menuItems))}</strong>
                  </footer>
                </article>
              ))}
            </div>
            <div className="order-history-total">
              <span>本桌合計</span>
              <strong>{money(tableTotal)}</strong>
            </div>
          </>
        ) : (
          <div className="empty-order-history">
            <Icon name="orders" size={30} />
            <h3>暫時沒有訂單</h3>
            <p>確認下單後，這裡會顯示訂單號、菜品和金額。</p>
          </div>
        )}
      </section>
    </div>
  );
}

function GuestApp({ activeMealPeriod, menuItems, onPlaceOrder, orders, setView }) {
  const [activeCategory, setActiveCategory] = useState("全部");
  const [cart, setCart] = useState({});
  const [isCartOpen, setCartOpen] = useState(false);
  const [isOrderHistoryOpen, setOrderHistoryOpen] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [stockNotice, setStockNotice] = useState("");
  const tableOrders = useMemo(
    () =>
      orders
        .filter((order) => order.table === "12" && order.status !== "settled")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [orders],
  );
  const periodMenuItems = useMemo(
    () => menuItems.filter((item) => !item.deleted && isItemAvailableForMealPeriod(item, activeMealPeriod)),
    [activeMealPeriod, menuItems],
  );
  const categories = useMemo(
    () => ["全部", ...new Set(periodMenuItems.map((item) => item.category).filter(Boolean))],
    [periodMenuItems],
  );

  const visibleMenu = useMemo(
    () =>
      activeCategory === "全部"
        ? periodMenuItems
        : periodMenuItems.filter((item) => item.category === activeCategory),
    [activeCategory, periodMenuItems],
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
    if (!categories.includes(activeCategory)) setActiveCategory("全部");
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
    setStockNotice("部分菜品已停止供應，已從購物車移除。");
  }, [activeMealPeriod, cart, menuItems]);

  function updateItem(id, delta) {
    const item = getMenuItem(id, menuItems);
    if (delta > 0 && (!item || item.soldOut || item.deleted || !isItemAvailableForMealPeriod(item, activeMealPeriod))) {
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
      cartItems.map(({ id, name, price, quantity }) => ({ id, name, quantity, unitPrice: price })),
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
            onClick={(event) => {
              setActiveCategory(category);
              event.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            }}
            type="button"
          >
            {category}
          </button>
        ))}
      </nav>

      <div className={`service-notice ${activeMealPeriod ? "" : "closed"}`}>
        {activeMealPeriod
          ? `目前供應：${activeMealPeriod.name} ${activeMealPeriod.start}–${activeMealPeriod.end}`
          : "目前非營業時段，暫時無法下單。"}
      </div>

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

      <button className="table-orders" onClick={() => setOrderHistoryOpen(true)} type="button">
        <div>
          <h2>本桌已落單</h2>
          <p>{tableOrders.length ? `${tableOrders.length} 張訂單 · 點擊查看明細` : "暫無訂單 · 點擊查看"}</p>
        </div>
        <Icon name="orders" size={22} />
      </button>

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
            <button
              className="secondary-wide-button"
              onClick={() => {
                setConfirmation(null);
                setOrderHistoryOpen(true);
              }}
              type="button"
            >
              查看本桌訂單
            </button>
          </section>
        </div>
      )}

      {isOrderHistoryOpen && (
        <GuestOrderHistory menuItems={menuItems} onClose={() => setOrderHistoryOpen(false)} orders={tableOrders} />
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
              <span>{line.name || item?.name || "已移除菜品"}</span>
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
              {order.status === "printed" ? "補印" : "列印"}
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
        {ranked.length > 0 ? (
          ranked.map((item, index) => (
          <article className="ranking-item" key={item.id}>
            <strong className={index < 3 ? "top-three" : ""}>{index + 1}</strong>
            <DishImage item={item} size="tiny" />
            <div>
              <h3>{item.name}</h3>
              <span>銷量 {item.quantity} 份</span>
            </div>
          </article>
          ))
        ) : (
          <div className="ranking-empty">
            <Icon name="orders" size={26} />
            <strong>暫時沒有熱門菜式</strong>
            <span>今天有新訂單後，這裡會即時排序。</span>
          </div>
        )}
      </div>
      {ranked.length > 0 && (
        <button className="ranking-button" type="button">
        查看完整報表
        </button>
      )}
    </aside>
  );
}

function AdminApp({ activeMealPeriod, menuItems, now, onMenuItemsChange, orders, onPrint, onReset, onSettle, setView }) {
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
            <span>{formatAdminDate(now)}</span>
            <strong>{activeMealPeriod ? `${activeMealPeriod.name}營業中` : "非營業時段"}</strong>
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
  const [restaurantSettings, setRestaurantSettings] = useState(loadRestaurantSettings);
  const [now, setNow] = useState(() => new Date());
  const activeMealPeriod = getCurrentMealPeriod(restaurantSettings, now);

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
    const intervalId = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    function syncRestaurantSettings() {
      setRestaurantSettings(loadRestaurantSettings());
    }
    window.addEventListener("storage", syncRestaurantSettings);
    window.addEventListener(SETTINGS_CHANGE_EVENT, syncRestaurantSettings);
    return () => {
      window.removeEventListener("storage", syncRestaurantSettings);
      window.removeEventListener(SETTINGS_CHANGE_EVENT, syncRestaurantSettings);
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
      return !item || item.soldOut || item.deleted || !isItemAvailableForMealPeriod(item, activeMealPeriod);
    })) return null;

    const latestOrders = loadOrders();
    const maxSequence = Math.max(...latestOrders.map((order) => order.sequence), 1000);
    const printerSettings = loadPrinterSettings();
    const order = {
      id: `HO-${maxSequence + 1}`,
      sequence: maxSequence + 1,
      table: "12",
      createdAt: new Date().toISOString(),
      status: printerSettings.autoPrint ? "printed" : "pending",
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
        <GuestApp activeMealPeriod={activeMealPeriod} menuItems={menuItems} onPlaceOrder={placeOrder} orders={orders} setView={setView} />
      ) : (
        <AdminApp
          activeMealPeriod={activeMealPeriod}
          menuItems={menuItems}
          now={now}
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
