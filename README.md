# 海港小馆扫码点餐系统

> 面向香港中小型餐厅的轻量化扫码点餐与后台营运系统。顾客用手机点餐，员工在同一套后台完成接单、列印、结账、经营统计与必要的账务修正。

[在线顾客端](https://brucelyu1.github.io/Restaurant-ordering-mini-program/?view=guest) · [后台演示](https://brucelyu1.github.io/Restaurant-ordering-mini-program/?view=admin) · [指定 02 号桌](https://brucelyu1.github.io/Restaurant-ordering-mini-program/?view=guest&table=02)

## 项目定位

海港小馆不是一套追求功能堆叠的餐饮 ERP，而是围绕小型餐厅日常工作设计的点餐工具：员工可以快速看到新订单、确认厨房列印、完成收款；经理可以在不离开后台的情况下维护菜单、员工、桌位并查看可靠的日结数据。

系统同时支持本地演示模式和 Supabase 云端模式。前者适合展示与开发，后者提供 Auth、RLS、Realtime、订单审计和跨设备同步。

## 核心能力

### 顾客点餐

- 根据桌号打开菜单，按分类浏览菜品、售价、图片、供应时段和售罄状态。
- 购物车支持数量调整及单品备注；提交后显示订单编号与本桌未结账订单。
- 顾客端通过 Realtime 与轮询同步订单状态；后台列印、结账或撤销结账后，页面状态会同步更新。
- 支持繁体中文与英文切换，适配手机点餐场景。

### 餐厅后台

- 新订单队列、厨房列印/补印，以及经理和收银员的结账流程。
- 结账时必须选择付款方式：现金、八达通、信用卡、微信支付、支付宝香港、FPS 或其他；可填写最多 500 字的收银备注。
- 经理可撤销当前已结账订单并填写原因。系统保留原付款方式、原结账员工、原结账时间和撤销操作人的不可覆盖审计记录，订单恢复到结账前的待处理或已列印状态。
- 新订单提醒：经理和收银员会在后台收到页面提示、可选声音提示和浏览器标签未读数量；首次载入历史订单不会误提醒。
- 菜单、桌位、员工、餐厅资料和打印设置均可在后台维护。

### 经理报表与日结

- 基于**当前有效的已结账订单**和结账时间统计营业额、订单数、售出份数与客单价。
- 支持今日、本周、本月、本年及自定义日期范围；结束日期按包含当天处理。
- 展示菜品销售排行、付款方式汇总、员工结账汇总和撤销结账次数。
- 可导出 UTF-8 BOM CSV，适合使用 Excel 查看；导出包含结算汇总、付款方式、员工、菜品及撤销次数，不包含收银备注、撤销原因或逐笔订单明细。

## 角色与权限

| 角色 | 可用范围 |
| --- | --- |
| 经理 | 全部后台模块、菜单/桌位/员工/设置管理、报表、撤销结账 |
| 收银员 | 仪表盘和订单处理，可列印及完成结账，可接收新订单提醒 |
| 楼面员工 | 仪表盘和订单处理，可列印及补印；不提供结账、报表或提醒权限 |

权限在 Supabase 模式中由 Supabase Auth、RLS 和受控 RPC 共同执行，前端导航仅作为体验层限制。

## 订单与账务流程

```text
顾客扫码点餐
    -> 后台收到新订单提醒
    -> 员工列印 / 补印厨房单
    -> 经理或收银员选择付款方式并结账
    -> 订单进入有效营收与日结报表
    -> 如需修正，经理撤销结账并重新结账
```

撤销后的订单不会计入当前营业额、付款方式、员工或菜品销售统计；撤销事件本身会按撤销发生时间进入日结次数。

## 在线访问

GitHub Pages 为静态站点，使用 URL 参数区分页面：

| 用途 | 地址 |
| --- | --- |
| 顾客点餐 | `https://brucelyu1.github.io/Restaurant-ordering-mini-program/?view=guest` |
| 指定桌号点餐 | `https://brucelyu1.github.io/Restaurant-ordering-mini-program/?view=guest&table=02` |
| 餐厅后台 | `https://brucelyu1.github.io/Restaurant-ordering-mini-program/?view=admin` |

## 技术架构

- **前端**：React 19、TypeScript、Vite
- **状态管理**：Zustand
- **云端数据**：Supabase Postgres、Realtime、Auth、RLS、Edge Functions
- **测试**：Vitest、Testing Library
- **部署**：GitHub Pages（发布 `dist/` 到 `gh-pages` 分支）

```text
src/
  components/    页面组件与可复用 UI
  pages/         顾客端、订单后台、报表和管理页面
  services/      本地/Supabase 数据服务与 RPC 调用
  stores/        Zustand 状态与同步逻辑
  utils/         订单、营收、CSV 等纯计算工具
supabase/
  migrations/    数据库结构、RLS 与业务 RPC
  functions/     staff-account 员工账号 Edge Function
```

## 数据模式

### `local`：本地演示

使用浏览器 `localStorage` 保存菜单、订单和设置，适合演示、界面开发和自动化测试。后台使用本地 PIN 登录，不依赖 Supabase。

### `supabase`：云端运行

订单、菜单、桌位、员工和设置存储在 Supabase；后台员工使用邮箱与密码登录。顾客端可以匿名浏览菜单和提交订单，后台写入与报表操作通过 RLS 和 RPC 受限。

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`。

```env
# local：本地演示；supabase：云端数据模式
VITE_DATA_SOURCE=local

# 仅在 supabase 模式下需要
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_RESTAURANT_SLUG=harbour-demo
```

### 3. 启动页面

```bash
# 顾客端：http://127.0.0.1:5173/?table=02
npm run dev:guest

# 后台：http://127.0.0.1:5174/?view=admin
npm run dev:admin
```

也可以使用 `npm run dev` 启动 Vite 默认服务。URL 中的 `view` 与 `table` 参数优先于页面默认入口。

## Supabase 部署

首次接入 Supabase 时，请先阅读 [supabase/README.md](supabase/README.md)，并按其中顺序初始化 schema、权限、Realtime、种子资料和员工账号能力。

对于已有项目：

1. 在 Supabase SQL Editor 按文件名顺序应用 `supabase/migrations/` 中尚未执行的 migration。
2. 若要由经理在后台创建员工登录账号，部署 `supabase/functions/staff-account`，并仅在 Supabase Edge Function Secret 中设置 service role key。
3. 本次日结报表升级必须应用 `20260702018000_daily_settlement_report.sql`；它会扩展 `get_revenue_report`，按 `reversed_at` 返回撤销结账次数。
4. 将 `VITE_DATA_SOURCE` 改为 `supabase`，填入项目 URL、publishable key 与餐厅 slug 后重新构建前端。

> 不要将 service role key、员工密码或任何私钥写入 `.env.local` 的 `VITE_` 变量、GitHub Pages 构建产物或 Git 仓库。浏览器只应使用 Supabase publishable key。

## 验证与质量检查

```bash
npm test
npx tsc --noEmit
npm run build
```

当前测试覆盖订单流、付款方式、撤销结账审计、角色权限、Supabase RPC 映射、新订单提醒、营收报表和 CSV 导出。

## 当前边界

- 这是单餐厅版本，默认餐厅 slug 为 `harbour-demo`；不提供多门店总部管理。
- “结账”记录线下已确认收款，不处理线上支付扣款。
- 打印流程目前管理订单状态与模拟打印队列，尚未连接真实 ESC/POS 打印机或本地打印代理。
- 暂不包含库存、会员营销、复杂拆单/并桌/分账、退款审批、完整会计或班次交接体系。

## 发布 GitHub Pages

每次提交功能后，需要重新构建并将 `dist/` 发布到 `gh-pages` 分支，GitHub Pages 才会更新。生产构建命令为：

```bash
npm run build
```

项目使用相对资源路径，因此可部署在 GitHub Pages 的仓库子路径下。