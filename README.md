# 海港小馆扫码点餐 H5

更新时间：2026-07-16

面向香港中小餐厅的扫码点餐 H5。顾客扫码浏览菜单、加购、备注和下单；餐厅后台可接单、列印、结账、维护菜单和桌位，并管理员工账号。

## 在线入口

- 顾客点餐：[顾客端](https://brucelyu1.github.io/harbour-ordering-h5/?view=guest)
- 指定桌号示例：[2 号桌](https://brucelyu1.github.io/harbour-ordering-h5/?view=guest&table=02)
- 餐厅后台：[后台](https://brucelyu1.github.io/harbour-ordering-h5/?view=admin)

GitHub Pages 不能使用两个自定义端口，因此线上通过 `?view=guest` 与 `?view=admin` 区分入口。

## 当前能力

### 顾客端

- 按桌号浏览菜单、分类、价格、图片和售罄状态。
- 购物车支持数量调整与单品备注。
- 下单后显示订单号与本桌未结账订单。
- 后台列印、补印或结账后，通过 Realtime 与轮询同步订单状态。
- 本桌订单结账后自动关闭订单详情，并可继续点餐。
- 支持繁体中文与英文界面。

### 餐厅后台

- 订单管理：查看新订单、列印、补印、结账及经理撤销结账。
- 结账确认：结账时必须选择付款方式，可填写收银备注；记录完整结账日期时间与结账员工。
- 撤销结账：仅经理可填写原因并撤销当前结账；订单恢复至结账前状态，原付款、员工、时间和原因保留为审计记录。
- 权限：经理与收银员可列印、补印、结账；楼面可列印、补印，但不能结账。
- 菜单管理：维护菜品、分类、价格、供应时段、图片与售罄状态。
- 桌位管理：新增、编辑、停用桌位，复制点餐链接。
- 打印设置与餐厅设置：支持 Supabase 远端写入和跨窗口同步。
- 员工管理：经理可直接创建员工邮箱密码账号，并启用或停用员工；停用保留历史资料。
- 营收报表：按已结账订单及结账时间统计营业额、订单数、售出份数、客单价、菜品、员工和付款方式汇总。

## 数据模式与登录

项目支持两种数据模式：

- `local`：使用浏览器 `localStorage`，用于演示；后台使用本地 PIN。
- `supabase`：使用 Supabase 数据库、Realtime、Auth 和 RLS；后台使用员工邮箱密码登录。

Supabase 模式下，顾客端匿名浏览菜单并下单；后台操作需要已登录且启用中的员工。经理拥有完整管理权限，收银员和楼面只能访问订单与仪表盘。

员工账号流程：经理账号在 Supabase Dashboard 创建并绑定员工资料；其他员工由经理在后台创建账号，经理线下提供邮箱与初始密码。密码不会保存到员工资料或前端。

## 本地运行

安装依赖：

```bash
npm install
```

分别启动顾客端与后台：

```bash
npm run dev:guest
npm run dev:admin
```

访问地址：

```text
顾客端：http://127.0.0.1:5173/?table=02
后台：http://127.0.0.1:5174/
```

URL 参数的优先级更高，例如 `http://127.0.0.1:5173/?view=admin` 可强制进入后台。

## Supabase 配置

在 `.env.local` 配置以下公开前端变量：

```env
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_PUBLISHABLE_KEY=你的 publishable key
VITE_RESTAURANT_SLUG=harbour-demo
```

不要把 service role key、员工密码或其他密钥写入前端环境变量或提交到 Git。

### 应用数据库 migration

新增 Supabase 功能后，需要在 Supabase Dashboard 的 SQL Editor 运行对应的 `supabase/migrations/` SQL 文件。当前必须应用的后续 migration 包括：

- `20260702009000_auth_rls_staff_security.sql`：员工登录与 RLS 权限。
- `20260702010000_guest_table_open_orders_rpc.sql`：顾客端读取本桌未结账订单。
- `20260702012000_staff_account_service_role_grants.sql`：员工账号管理的服务端权限。
- `20260702013000_order_settlement_staff.sql`：结账员工、结账时间，以及经理/收银员结账权限。
- `20260702014000_revenue_report_rpc.sql`：经理专用营收报表 RPC，按已结账订单和结账时间聚合营业额、菜品销量和员工结账汇总。
- `20260702015000_payment_settlement.sql`：付款方式、收银备注、专用结账 RPC，以及按付款方式汇总的营收报表。
- `20260702016000_auth_session_profile_rpc.sql`：员工会话恢复和具体、安全的登录错误提示。
- `20260702017000_order_settlement_reversal.sql`：经理撤销结账、结账前状态及不可覆盖的审计记录。
- `20260702017100_grant_settlement_reversal_read_access.sql`：已部署项目的撤销审计读取权限修复；应在 `20260702017000` 后执行。

若未应用最新结账 migration，后台可能无法读取新增的结账字段；请先运行 migration 再验证订单流程。

## 验证命令

```bash
npm test
npx tsc --noEmit
npm run build
```

推荐联调流程：顾客端下单 -> 后台自动出现新订单 -> 后台列印 -> 后台选择付款方式并结账 -> 顾客端订单详情自动清空 -> 经理需要修正时撤销结账并重新结账。

## 技术栈

- React 19、Vite、TypeScript
- Zustand 状态管理
- Supabase JS、Postgres、Auth、RLS、Realtime、Edge Functions
- Vitest、Testing Library
- GitHub Pages（`gh-pages` 分支发布）

## 发布到 GitHub Pages

代码提交到 `main` 后仍需重新构建并发布 `dist/` 到 `gh-pages` 分支，线上页面才会更新。每次功能同步 GitHub 时，均应同步执行此发布步骤。

## 当前限制与下一步

- 当前为单餐厅试点，默认餐厅 slug 为 `harbour-demo`；多门店隔离仍待完善。
- “结账”表示门店线下已完成收款确认，尚未接入线上支付。
- 打印功能目前是订单状态与模拟打印流程，尚未接入真实 ESC/POS 打印机或本地打印服务。
- 下一阶段重点：真实打印机接入，以及手机端/微信浏览器体验优化。
