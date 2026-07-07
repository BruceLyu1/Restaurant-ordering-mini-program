# 海港小馆扫码点餐 H5

更新时间：2026-07-07

这是一个面向香港中小餐厅的扫码点餐 H5 应用。顾客扫码后可以在手机上浏览菜单、加入购物车、填写单品备注并下单；餐厅后台可以接收订单、打印/补印、结账、维护菜单、管理桌位、配置打印与餐厅设置，并查看营业报表。

项目默认仍可作为前端演示系统运行，数据保存在浏览器本地 `localStorage`；同时已经加入 Supabase 试点模式，可通过环境变量切换到远端数据、Storage 和 Realtime 同步。

## 在线演示

- 顾客点餐端：[https://brucelyu1.github.io/harbour-ordering-h5/?view=guest](https://brucelyu1.github.io/harbour-ordering-h5/?view=guest)
- 指定桌号示例：[https://brucelyu1.github.io/harbour-ordering-h5/?view=guest&table=02](https://brucelyu1.github.io/harbour-ordering-h5/?view=guest&table=02)
- 餐厅后台：[https://brucelyu1.github.io/harbour-ordering-h5/?view=admin](https://brucelyu1.github.io/harbour-ordering-h5/?view=admin)

后台默认 PIN：`000000`。

## 当前状态

- 前端已完成模块化重构、TypeScript 迁移、Zustand 状态层、轻量 i18n、核心测试补强和移动端体验修复。
- `localStorage` 模式可完整演示顾客下单、后台处理、菜单维护、桌位管理、打印设置、餐厅设置、员工管理和报表。
- Supabase 试点模式已经支持菜单、订单、桌位、打印设置、餐厅设置的远端读写与 Realtime 刷新。
- 菜品图片可上传到 Supabase Storage `dish-photos` bucket。
- 菜单告罄、打印设置开关、餐厅设置保存已处理快速点击/旧快照回拉导致的状态抖动问题。
- GitHub Pages 当前通过 `gh-pages` 分支发布，代码同步到 `main` 后需要重新 build 并推送 `gh-pages`。

## Supabase 试点模式

项目支持 `local` / `supabase` 数据源切换。默认不配置环境变量时使用 `localStorage` 演示模式；本地 `.env.local` 配置以下变量后启用 Supabase：

```env
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_PUBLISHABLE_KEY=你的 publishable key
```

当前 Supabase 试点链路包括：

- 菜单：读取、写入、告罄状态、分类、图片上传、Realtime 刷新。
- 订单：顾客下单写入 `orders` / `order_lines`，后台打印、补印、结账与 Realtime 刷新。
- 桌位：后台新增、修改、停用、复制点餐链接，远端写入与 Realtime 刷新。
- 打印设置：打印机、份数、自动打印、提示音写入 Supabase，并同步其他后台窗口。
- 餐厅设置：餐厅名、电话、地址、默认语言、营业时段写入 Supabase，并同步其他窗口。

试点阶段仍使用 `harbour-demo` 餐厅和 demo RPC，部分 anon/authenticated 调用暂时开放。正式试点前需要接入 Supabase Auth、员工登录、权限控制和 RLS 收紧。

## 主要功能

### 顾客端

- 根据 URL 参数识别桌号，例如 `?view=guest&table=02`。
- 按分类浏览菜单，展示图片、名称、描述、价格、售罄状态和供应时段。
- 支持加入购物车、增减数量、删除菜品、填写单品备注和确认下单。
- 下单后展示订单号、桌号、金额、订单状态和单品备注。
- 可查看本桌未结账订单详情，后台结账后顾客端同步清空。
- 支持繁体中文 / English UI 切换，切换只影响界面文案，不翻译餐厅自定义业务数据。

### 餐厅后台

- 后台入口有 6 位数字 PIN 保护。
- 运营总览：查看待处理订单、营业额、桌位和菜单概况。
- 订单管理：查看新订单、打印、补印、结账，并显示顾客填写的单品备注。
- 菜单管理：新增、编辑、删除/下架菜品，维护图片、名称、描述、分类、价格、供应时段和售罄状态。
- 分类管理：新增、重命名、合并重复分类、删除分类并下架相关菜品。
- 桌位管理：新增、修改、停用桌位，查看桌位状态，复制点餐链接。
- 打印设置：选择模拟打印机、设置份数、自动打印和提示音。
- 餐厅设置：维护餐厅名、电话、地址、默认语言、供应时段和后台 PIN。
- 员工管理：本地演示模式支持新增员工、设置角色、启用或停用账号。
- 报表分析：查看日/周/月/年营收、订单数、售出份数和菜品排行。

## 技术栈

- React 19
- Vite
- TypeScript
- Zustand
- Vitest
- Testing Library
- Supabase JS
- 原生 CSS

## 代码结构

```text
src/
  components/   可复用 UI、顾客端组件、后台组件
  data/         演示用种子数据
  i18n/         轻量翻译表、语言上下文、日期格式化
  pages/        顾客端和后台页面
  services/     本地存储、Supabase、订单、菜单、桌位、设置服务层
  stores/       Zustand 前端业务状态
  styles/       按业务域拆分的 CSS
  types/        TypeScript 业务类型
  utils/        金额、日期、分类、订单、桌位、图片工具
supabase/
  migrations/   Supabase schema、demo RPC、Realtime publication 迁移
docs/
  项目状态、用户手册、项目计划文档
```

## 本地运行

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

常用访问地址：

```text
http://127.0.0.1:5173/?view=guest
http://127.0.0.1:5173/?view=guest&table=02
http://127.0.0.1:5173/?view=admin
```

端口可能被 Vite 自动调整，请以终端实际输出为准。

## 验证命令

运行测试：

```bash
npm test
```

TypeScript 检查：

```bash
npx tsc --noEmit
```

生产构建：

```bash
npm run build
```

## Supabase migration

新增或更新 Supabase 功能后，需要把 `supabase/migrations/` 中的新 SQL 应用到 Supabase 项目。

当前与最近阶段相关的迁移包括：

- `20260702004000_menu_write_realtime_demo.sql`
- `20260702005000_table_write_realtime_demo.sql`
- `20260702006000_printer_settings_write_realtime_demo.sql`
- `20260702007000_restaurant_settings_write_realtime_demo.sql`

可在 Supabase Dashboard 的 SQL Editor 中运行对应 SQL，然后用以下查询确认 RPC 和 Realtime publication 是否生效：

```sql
select proname
from pg_proc
where proname in (
  'save_demo_menu_items',
  'save_demo_tables',
  'save_demo_printer_settings',
  'save_demo_restaurant_settings'
);

select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
```

## GitHub Pages 发布流程

GitHub Pages 来源分支是 `gh-pages`，不是 `main`。每次同步代码到 GitHub 后，需要同步发布 Pages：

1. 在 `main` 上提交并推送代码。
2. 执行 `npm run build` 生成 `dist/`。
3. 将 `dist/` 内容复制到 `gh-pages` worktree。
4. 在 `gh-pages` 分支提交 `deploy latest site`。
5. 推送 `gh-pages` 到 GitHub。
6. 确认 GitHub Pages build 状态为 `built`。

最近一次已同步状态：

- `main`：`280655b feat: sync settings with supabase`
- `gh-pages`：`8bb0093 deploy latest site`

## 推荐验收流程

1. 打开顾客端，例如 `?view=guest&table=02`。
2. 添加几道菜到购物车，并给其中一道菜填写备注。
3. 确认下单。
4. 切换到后台订单管理，输入默认 PIN `000000`。
5. 确认后台能看到新订单和备注。
6. 点击打印，确认订单状态变为已打印。
7. 回到顾客端订单详情，确认状态同步变化。
8. 后台点击结账。
9. 回到顾客端，确认本桌订单清空。
10. 在后台菜单管理中修改售罄状态，确认顾客端同步刷新。
11. 在打印设置中快速切换开关、打印机和份数，确认按钮不抖动且状态不漏。
12. 在餐厅设置中修改餐厅资料和营业时段，确认刷新后仍保留；Supabase 模式下确认其他窗口同步。

## 当前限制

- Supabase 仍处于试点模式，demo RPC 暂时开放；正式试点前需要接入 Supabase Auth、员工登录、权限控制和 RLS。
- 员工管理仍主要是本地演示数据，尚未完成 Supabase 写入同步。
- 后台 PIN 仍是前端演示保护；不应视为正式身份认证。
- 暂未接入真实打印机或 ESC/POS 打印服务。
- `localStorage` 模式下不同设备之间不会同步数据。
- 暂未做正式多门店、多餐厅权限隔离。
- 暂未接入在线支付、会员、优惠券和外卖功能。

## 下一步建议

下一阶段建议先做员工管理 Supabase 写入，然后接入员工登录和 RLS 收紧：

- 员工资料从本地迁移到 Supabase `staff_members`。
- 后台登录接入 Supabase Auth。
- 区分经理、收银、楼面等角色。
- 将菜单、桌位、打印设置、餐厅设置 demo RPC 的开放写入权限逐步收紧为员工权限。
- 顾客端继续保留公开读菜单、公开下单能力。
