import React, { useEffect, useMemo, useState } from "react";

const seededTables = [
  ["01", "available"],
  ["02", "occupied"],
  ["03", "occupied"],
  ["04", "available"],
  ["05", "available"],
  ["06", "occupied"],
  ["07", "available"],
  ["08", "occupied"],
  ["09", "available"],
  ["10", "available"],
  ["11", "available"],
  ["12", "available"],
].map(([number, status]) => ({ number, status }));

const seededStaff = [
  { id: 1, name: "陳經理", role: "經理", active: true },
  { id: 2, name: "阿 May", role: "收銀員", active: true },
  { id: 3, name: "阿強", role: "樓面", active: true },
  { id: 4, name: "廚房打印機", role: "系統帳戶", active: false },
];

function money(value) {
  return `HK$ ${value.toLocaleString("zh-HK")}`;
}

function compressDishPhoto(file) {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("請選擇圖片檔案。"));
  }
  if (file.size > 8 * 1024 * 1024) {
    return Promise.reject(new Error("圖片請勿超過 8MB。"));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("圖片讀取失敗，請重新選擇。"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("圖片格式無法使用，請選擇 JPG、PNG 或 WebP。"));
      image.onload = () => {
        const maxSize = 720;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function useLocalState(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = window.localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        window.localStorage.removeItem(key);
      }
    }
    return typeof initialValue === "function" ? initialValue() : initialValue;
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

function orderTotal(order, items) {
  const priceMap = new Map(items.map((item) => [item.id, item.price]));
  return order.items.reduce(
    (total, item) => total + (priceMap.get(item.id) || 0) * item.quantity,
    0,
  );
}

function SectionHeader({ title, description, action }) {
  return (
    <header className="section-header">
      <div>
        <p>餐廳管理</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
      {action}
    </header>
  );
}

function Metric({ label, value, note }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      aria-label={label}
      aria-pressed={checked}
      className={`toggle ${checked ? "enabled" : ""}`}
      onClick={onChange}
      type="button"
    >
      <span />
    </button>
  );
}

function Dashboard({ menuItems, onNavigate, orders, tables }) {
  const todayRevenue = orders.reduce((sum, order) => sum + orderTotal(order, menuItems), 0);
  const pending = orders.filter((order) => order.status !== "settled").length;
  const occupied = tables.filter((table) => table.status === "occupied").length;
  const activeMenuItems = menuItems.filter((item) => !item.deleted);

  return (
    <section className="management-page">
      <SectionHeader
        description="掌握午市訂單、桌位和菜品狀況。"
        title="營運總覽"
      />
      <div className="metrics-row">
        <Metric label="今日營業額" note="已包含所有測試訂單" value={money(todayRevenue)} />
        <Metric label="待處理訂單" note="按下單時間順序處理" value={`${pending} 張`} />
        <Metric label="使用中桌位" note={`共 ${tables.length} 張桌`} value={`${occupied} 張`} />
        <Metric label="已上架菜品" note="菜品可以隨時售罄" value={`${activeMenuItems.length} 款`} />
      </div>
      <div className="management-split">
        <section className="management-panel">
          <header>
            <h2>最新訂單</h2>
            <button onClick={() => onNavigate("orders")} type="button">查看全部</button>
          </header>
          <div className="simple-list">
            {orders.slice(-4).reverse().map((order) => (
              <article key={order.id}>
                <div>
                  <strong>{order.table}號桌</strong>
                  <span>#{order.sequence} · {order.items.length} 款菜品</span>
                </div>
                <b>{money(orderTotal(order, menuItems))}</b>
              </article>
            ))}
          </div>
        </section>
        <section className="management-panel">
          <header>
            <h2>桌位狀況</h2>
            <button onClick={() => onNavigate("tables")} type="button">管理桌位</button>
          </header>
          <div className="table-mini-grid">
            {tables.map((table) => (
              <span className={table.status} key={table.number}>{table.number}</span>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function MenuManagement({ items, setItems }) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState({ imageUrl: "", name: "", price: "" });
  const [photoError, setPhotoError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const activeItems = items.filter((item) => !item.deleted);
  const visible = activeItems.filter((item) => item.name.includes(query.trim()));

  async function selectPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoError("");
    try {
      const imageUrl = await compressDishPhoto(file);
      setDraft((current) => ({ ...current, imageUrl }));
    } catch (error) {
      setPhotoError(error.message);
    }
  }

  function addItem(event) {
    event.preventDefault();
    if (!draft.name.trim() || !Number(draft.price)) return;
    setItems((current) => [
      ...current,
      {
        id: `custom-${Date.now()}`,
        name: draft.name.trim(),
        category: "新增菜品",
        description: "餐廳後台新增菜品",
        imageUrl: draft.imageUrl,
        price: Number(draft.price),
        deleted: false,
        soldOut: false,
      },
    ]);
    setDraft({ imageUrl: "", name: "", price: "" });
    setPhotoError("");
    setShowForm(false);
  }

  return (
    <section className="management-page">
      <SectionHeader
        action={<button className="management-primary" onClick={() => setShowForm(true)} type="button">新增菜品</button>}
        description="維護菜品照片、名稱、價格、售罄狀態和刪除下架。"
        title="菜單管理"
      />
      {showForm && (
        <form className="inline-form" onSubmit={addItem}>
          <div className="dish-photo-field">
            {draft.imageUrl ? (
              <img alt="菜品照片預覽" className="dish-photo-preview" src={draft.imageUrl} />
            ) : (
              <span className="dish-photo-empty">照片</span>
            )}
            <label className="dish-photo-upload">
              上傳照片
              <input accept="image/*" aria-label="上傳菜品照片" onChange={selectPhoto} type="file" />
            </label>
          </div>
          <input
            aria-label="菜品名稱"
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="菜品名稱"
            value={draft.name}
          />
          <input
            aria-label="菜品價格"
            min="1"
            onChange={(event) => setDraft({ ...draft, price: event.target.value })}
            placeholder="價格"
            type="number"
            value={draft.price}
          />
          <button className="management-primary" type="submit">儲存菜品</button>
          <button className="management-secondary" onClick={() => setShowForm(false)} type="button">取消</button>
          {photoError && <span className="dish-photo-error">{photoError}</span>}
        </form>
      )}
      <div className="management-toolbar">
        <input
          aria-label="搜尋菜品"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜尋菜品名稱"
          value={query}
        />
        <span>共 {activeItems.length} 款菜品</span>
      </div>
      <div className="management-panel table-panel">
        <table className="management-table">
          <thead>
            <tr>
              <th>菜品</th>
              <th>分類</th>
              <th>價格</th>
              <th>狀態</th>
              <th>售罄</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="dish-admin-cell">
                    {item.imageUrl ? (
                      <img alt={`${item.name}照片`} className="dish-admin-photo" src={item.imageUrl} />
                    ) : (
                      <span className="dish-placeholder">{item.name.slice(0, 1)}</span>
                    )}
                    <strong>{item.name}</strong>
                  </div>
                </td>
                <td>{item.category}</td>
                <td>{money(item.price)}</td>
                <td><span className={`list-status ${item.soldOut ? "inactive" : "active"}`}>{item.soldOut ? "已售罄" : "供應中"}</span></td>
                <td>
                  <Toggle
                    checked={item.soldOut}
                    label={`切換${item.name}售罄狀態`}
                    onChange={() => setItems((current) => current.map((entry) => (
                      entry.id === item.id ? { ...entry, soldOut: !entry.soldOut } : entry
                    )))}
                  />
                </td>
                <td>
                  <button
                    className="management-danger"
                    onClick={() => {
                      if (!window.confirm(`確定刪除「${item.name}」嗎？刪除後顧客端將不再顯示。`)) return;
                      setItems((current) => current.map((entry) => (
                        entry.id === item.id ? { ...entry, deleted: true } : entry
                      )));
                    }}
                    type="button"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TableManagement({ tables, setTables }) {
  const [selected, setSelected] = useState(null);

  function isQrDark(index) {
    const row = Math.floor(index / 9);
    const column = index % 9;
    const tableSeed = Number(selected.number);
    const finder = (startRow, startColumn) => (
      row >= startRow && row < startRow + 3 &&
      column >= startColumn && column < startColumn + 3
    );

    if (finder(0, 0) || finder(0, 6) || finder(6, 0)) {
      return row % 3 !== 1 || column % 3 !== 1;
    }
    return (row * 11 + column * 7 + row * column + tableSeed * 3) % 5 < 2;
  }

  return (
    <section className="management-page">
      <SectionHeader
        description="每張桌子都有獨立桌碼，顧客掃碼後會自動識別桌號。"
        title="桌位管理"
      />
      <div className="table-management-grid">
        {tables.map((table) => (
          <article className="table-card" key={table.number}>
            <div>
              <span>{table.number}</span>
              <div>
                <h2>{table.number}號桌</h2>
                <p>{table.status === "occupied" ? "用餐中" : "可使用"}</p>
              </div>
            </div>
            <footer>
              <button className="management-secondary" onClick={() => setSelected(table)} type="button">查看桌碼</button>
              <button
                className="table-status-button"
                onClick={() => setTables((current) => current.map((entry) => (
                  entry.number === table.number
                    ? { ...entry, status: entry.status === "occupied" ? "available" : "occupied" }
                    : entry
                )))}
                type="button"
              >
                {table.status === "occupied" ? "設為空桌" : "設為用餐中"}
              </button>
            </footer>
          </article>
        ))}
      </div>
      {selected && (
        <div className="admin-modal-backdrop">
          <section className="qr-modal">
            <button aria-label="關閉桌碼" className="modal-close" onClick={() => setSelected(null)} type="button">×</button>
            <div className="fake-qr">
              {Array.from({ length: 81 }, (_, index) => <i className={isQrDark(index) ? "dark" : ""} key={index} />)}
            </div>
            <h2>{selected.number}號桌桌碼</h2>
            <p>列印後放在餐桌上，顧客掃碼即可進入菜單。</p>
            <button className="management-primary" onClick={() => window.print()} type="button">列印桌碼</button>
          </section>
        </div>
      )}
    </section>
  );
}

function Reports({ menuItems, orders }) {
  const ranked = useMemo(() => {
    const quantities = new Map(menuItems.map((item) => [item.id, 0]));
    orders.forEach((order) => order.items.forEach((item) => quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity)));
    return menuItems.map((item) => ({ ...item, quantity: quantities.get(item.id) || 0 }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [menuItems, orders]);
  const revenue = orders.reduce((sum, order) => sum + orderTotal(order, menuItems), 0);
  const portions = ranked.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className="management-page">
      <SectionHeader description="按銷量排序，快速了解最受歡迎的菜品。" title="報表分析" />
      <div className="metrics-row">
        <Metric label="今日營業額" note="堂食櫃台結帳" value={money(revenue)} />
        <Metric label="訂單總數" note="包含已結帳訂單" value={`${orders.length} 張`} />
        <Metric label="售出餐點" note="按餐點數量統計" value={`${portions} 份`} />
      </div>
      <div className="management-panel table-panel">
        <table className="management-table">
          <thead><tr><th>排名</th><th>菜品</th><th>售出數量</th><th>銷售額</th></tr></thead>
          <tbody>
            {ranked.map((item, index) => (
              <tr key={item.id}>
                <td><strong className="report-rank">{index + 1}</strong></td>
                <td>{item.name}</td>
                <td>{item.quantity} 份</td>
                <td>{money(item.quantity * item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StaffManagement() {
  const [staff, setStaff] = useLocalState("harbour-admin-staff", seededStaff);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ name: "", role: "樓面" });

  function addStaff(event) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setStaff((current) => [...current, { id: Date.now(), ...draft, active: true }]);
    setDraft({ name: "", role: "樓面" });
    setShowForm(false);
  }

  return (
    <section className="management-page">
      <SectionHeader
        action={<button className="management-primary" onClick={() => setShowForm(true)} type="button">新增員工</button>}
        description="建立員工帳戶並控制後台使用權限。"
        title="員工管理"
      />
      {showForm && (
        <form className="inline-form" onSubmit={addStaff}>
          <input aria-label="員工姓名" onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="員工姓名" value={draft.name} />
          <select aria-label="員工角色" onChange={(event) => setDraft({ ...draft, role: event.target.value })} value={draft.role}>
            <option>樓面</option><option>收銀員</option><option>經理</option>
          </select>
          <button className="management-primary" type="submit">建立帳戶</button>
          <button className="management-secondary" onClick={() => setShowForm(false)} type="button">取消</button>
        </form>
      )}
      <div className="management-panel table-panel">
        <table className="management-table">
          <thead><tr><th>員工</th><th>角色</th><th>帳戶狀態</th><th>啟用</th></tr></thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id}>
                <td><strong>{member.name}</strong></td>
                <td>{member.role}</td>
                <td><span className={`list-status ${member.active ? "active" : "inactive"}`}>{member.active ? "可登入" : "已停用"}</span></td>
                <td><Toggle checked={member.active} label={`切換${member.name}帳戶狀態`} onChange={() => setStaff((current) => current.map((entry) => entry.id === member.id ? { ...entry, active: !entry.active } : entry))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PrinterSettings() {
  const [settings, setSettings] = useLocalState("harbour-admin-printer", { autoPrint: true, sound: true, printer: "廚房熱敏打印機", copies: "1" });
  const [message, setMessage] = useState("");

  function save(message) {
    setMessage(message);
    window.setTimeout(() => setMessage(""), 2400);
  }

  return (
    <section className="management-page">
      <SectionHeader description="設定後廚小票打印方式，打印失敗時可在訂單頁補打。" title="打印設定" />
      {message && <div className="save-message">{message}</div>}
      <section className="settings-panel">
        <label><span>打印機</span><select onChange={(event) => setSettings({ ...settings, printer: event.target.value })} value={settings.printer}><option>廚房熱敏打印機</option><option>前台收銀打印機</option></select></label>
        <label><span>每張訂單份數</span><select onChange={(event) => setSettings({ ...settings, copies: event.target.value })} value={settings.copies}><option>1</option><option>2</option><option>3</option></select></label>
        <div className="setting-row"><div><strong>自動打印新訂單</strong><p>后台收到顧客訂單後自動列印廚房小票。</p></div><Toggle checked={settings.autoPrint} label="自動打印新訂單" onChange={() => setSettings({ ...settings, autoPrint: !settings.autoPrint })} /></div>
        <div className="setting-row"><div><strong>新訂單提示聲</strong><p>即使打印機離線，也會播放提示聲。</p></div><Toggle checked={settings.sound} label="新訂單提示聲" onChange={() => setSettings({ ...settings, sound: !settings.sound })} /></div>
        <footer><button className="management-secondary" onClick={() => save("測試小票已加入打印隊列")} type="button">打印測試小票</button><button className="management-primary" onClick={() => save("打印設定已儲存")} type="button">儲存設定</button></footer>
      </section>
    </section>
  );
}

function RestaurantSettings() {
  const [settings, setSettings] = useLocalState("harbour-admin-settings", { name: "海港小館", phone: "2188 6688", address: "香港灣仔軒尼詩道 88 號", language: "繁體中文" });
  const [saved, setSaved] = useState(false);

  function save(event) {
    event.preventDefault();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  }

  return (
    <section className="management-page">
      <SectionHeader description="這些資料會顯示在顧客手機菜單上。" title="餐廳設定" />
      {saved && <div className="save-message">餐廳資料已儲存</div>}
      <form className="settings-panel" onSubmit={save}>
        <label><span>餐廳名稱</span><input onChange={(event) => setSettings({ ...settings, name: event.target.value })} value={settings.name} /></label>
        <label><span>聯絡電話</span><input onChange={(event) => setSettings({ ...settings, phone: event.target.value })} value={settings.phone} /></label>
        <label><span>餐廳地址</span><input onChange={(event) => setSettings({ ...settings, address: event.target.value })} value={settings.address} /></label>
        <label><span>預設語言</span><select onChange={(event) => setSettings({ ...settings, language: event.target.value })} value={settings.language}><option>繁體中文</option><option>English</option></select></label>
        <footer><button className="management-primary" type="submit">儲存餐廳資料</button></footer>
      </form>
    </section>
  );
}

export function AdminSection({ activeSection, menuItems, onMenuItemsChange, onNavigate, orders }) {
  const [tables, setTables] = useLocalState("harbour-admin-tables", seededTables);

  if (activeSection === "dashboard") return <Dashboard menuItems={menuItems} onNavigate={onNavigate} orders={orders} tables={tables} />;
  if (activeSection === "menu") return <MenuManagement items={menuItems} setItems={onMenuItemsChange} />;
  if (activeSection === "tables") return <TableManagement setTables={setTables} tables={tables} />;
  if (activeSection === "reports") return <Reports menuItems={menuItems} orders={orders} />;
  if (activeSection === "staff") return <StaffManagement />;
  if (activeSection === "printer") return <PrinterSettings />;
  return <RestaurantSettings />;
}
