# CubingChina Old Style

旧版粗饼网（CubingChina）界面的第三方复刻站点。只读、纯静态，数据全部来自粗饼网与新站公开 API。

> 本项目与粗饼网、世界魔方协会（WCA）无隶属关系。原站点已迁移至 [cubing.com](https://cubing.com)。

## 特性

- **旧版界面**：复用粗饼网原版 HTML 结构、LESS 样式、Bootstrap 3、Font Awesome 4 与项目图标字体
- **纯静态**：构建产物可直接托管在 GitHub Pages / CDN
- **实时数据**：直连官方 API，不存储任何数据
- **三语支持**：简体中文 / 繁體中文 / English（复用原站 1092 条翻译词条）
- **只读**：不含报名、支付、后台管理等写入功能

## 数据来源

| 用途 | 端点 | CORS | 运行时来源 |
|---|---|---|---|
| 新闻、比赛、FAQ、项目 | `api.cubing.com` | ❌ 白名单 | **构建时快照**，缺失时回退代理 |
| 选手、排名、纪录、统计、成绩 | `wca-api.cubing.com` | ✅ `*` | 实时直连 |

`api.cubing.com` 采用 Origin 白名单（仅允许 `cubing.com`），浏览器端无法直接读取响应。

因此构建时会运行 `scripts/fetch-snapshot.mjs`，把需要它的少量接口抓成静态 JSON
写入 `public/data/`，随站点一起发布：

| 快照内容 | 说明 |
|---|---|
| `data/competitions/<year>.json` | 全部年份的比赛列表（26 个年份） |
| `data/competition/<alias>.json` | 当年及次年的比赛详情 |
| `data/schedule/<alias>.json` | 当年及次年的赛程 |
| `data/news/page-<n>.json` | 最近 10 页资讯 |
| `data/post/<alias>.json` | 上述资讯的详情 |
| `data/faq.json`、`data/faq-categories.json` | 常见问题 |
| `data/competition-meta.json` | 年份 / 项目筛选项 |

运行时优先读取快照，命中后**完全不请求 `api.cubing.com`**；未覆盖的数据
（如更早年份的比赛详情、更早的资讯页）才回退到实时 API / Worker 代理。
GitHub Actions 每 6 小时自动刷新一次快照。

## 本地开发

```bash
npm install
npm run build:styles     # 编译 public/f 下的 LESS → public/f/build/css
npm run build:snapshot   # 可选：生成静态快照（不生成则全部走 API）
npm run dev              # http://localhost:5173/cubingchina-oldstyle/
```

本地开发时，`/cubing-api/*` 由 Vite dev server 反向代理到 `api.cubing.com`，
因此不生成快照也能正常调试。

## 构建

```bash
npm run build          # 样式 + 类型检查 + 打包 → dist/
npm run preview        # 预览生产构建
```

## 部署

构建、快照与发布全部由 `.github/workflows/deploy.yml` 自动完成，只需两步。

### 1. 启用 GitHub Pages

`Settings → Pages → Build and deployment → Source` 选择 **GitHub Actions**。

> 注意：不要选择 "Deploy from a branch"。分支部署会把仓库根目录当作站点发布，
> 导致访问到的是源码 `index.html`（引用 `/src/main.ts`），所有 `f/` 资源都会 404。

推送到 `master` 即可自动构建发布。快照每 6 小时由定时任务刷新。

### 2. 可选：配置代理兜底

快照已覆盖主要页面，不配置代理也能正常浏览。若还希望支持更早年份的比赛详情
或更早的资讯页，可部署 Cloudflare Worker 并在
`Settings → Secrets and variables → Actions → Variables` 中设置：

| 变量 | 值 |
|---|---|
| `VITE_CUBING_API_BASE` | Worker 地址 |

构建时 `VITE_BASE_PATH` 会自动设为 `/<仓库名>/`。

#### 部署代理（Cloudflare Worker）

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

部署后会得到一个地址。本项目已部署的地址为：

```
https://cubingchina-oldstyle-proxy.pythoneralex.workers.dev
```

免费额度为每天 10 万次请求，且带 60 秒边缘缓存。

> ⚠️ **中国大陆网络**：`*.workers.dev` 域名通常被 DNS 污染（解析到 `185.60.216.50` 等无关 IP），
> 无法直接访问。若面向大陆用户且需要代理兜底，请给 Worker 绑定自有域名
> （Cloudflare Dashboard → Workers → 该 Worker → Settings → Domains & Routes → Add custom domain），
> 并把该域名写入 `VITE_CUBING_API_BASE`。

### 自定义域名 / 根路径部署

若部署在根路径（如 `https://example.com/`），设置：

```
VITE_BASE_PATH=/
```

## 环境变量

参考 `.env.example`：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `VITE_BASE_PATH` | `/cubingchina-oldstyle/` | 站点基础路径 |
| `VITE_CUBING_API_BASE` | `/cubing-api` | `api.cubing.com` 的代理地址 |
| `VITE_WCA_API_BASE` | `https://wca-api.cubing.com` | WCA API 地址 |
| `VITE_CUBING_API_DIRECT` | `0` | 设为 `1` 可直连（仅在允许的 Origin 下有效） |

## 路由

采用 Hash 路由（`/#/results/person/2023GENG02`），无需服务端 rewrite，
可直接托管于任何静态服务。

| 路径 | 对应旧站 |
|---|---|
| `/#/` | 首页（资讯流 + 近期赛事） |
| `/#/competition` | 比赛列表 |
| `/#/competition/:alias` | 比赛详情（详情/赛程/规则/交通/成绩） |
| `/#/results` | 成绩首页 |
| `/#/results/person` · `/#/results/person/:wcaId` | 选手搜索 / 选手详情 |
| `/#/results/competition` · `/:wcaId` | 赛事成绩列表 / 详情 |
| `/#/results/rankings` | 排名 |
| `/#/results/records` | 纪录 |
| `/#/results/statistics/:block?` | 统计 |
| `/#/results/battle/:ids` | 对战 |
| `/#/faq/:categoryId?` | 常见问题 |
| `/#/post/:alias` | 资讯详情 |
| `/#/tools/luckyDraw` | 抽奖工具 |
| `/#/about.html` 等 | 关于 / 联系 / 链接 / 免责声明 |

## 项目结构

```
public/f/            原站前端资源（LESS、图片、图标字体、插件）
public/static/       原站静态文件
public/data/         构建时生成的 API 快照（不入库，见 scripts/fetch-snapshot.mjs）
reference/           原站 PHP 视图与语言文件（移植参考）
scripts/             资源转换与快照脚本（语言包、友情链接、样式编译、API 快照）
src/
  api/               API 客户端（http / snapshot / cubingApi / wcaApi / types）
  components/        通用组件（加载、错误、分页）
  composables/       组合式函数
  config/            导航、友情链接配置
  data/              生成的数据（links.json）
  i18n/              多语言（locales 由 PHP 语言文件转换而来）
  layouts/           旧版布局（Header / Navibar / Footer / Breadcrumbs）
  pages/             页面组件
  router/            路由表
  styles/            补充样式
  utils/             格式化、事件映射、Markdown 渲染
worker/              Cloudflare Worker 代理（可选兜底）
.github/workflows/   GitHub Pages 部署（含每 6 小时快照刷新）
```

## 已知限制

- 快照只覆盖全部年份的比赛列表、当年与次年的比赛详情/赛程、最近 10 页资讯；
  更早年份的详情需代理兜底，未配置代理时会回退失败
- `results/competition/{wcaId}` 单次响应可达 1.4 MB，统计接口约 450 KB，已做按块加载与本地缓存
- 年度总结（summary）接口无对应 API，当前未实现
- 报名、支付、账号功能不在本项目范围内

## 许可

界面资源移植自 [CubingChina/cubingchina](https://github.com/CubingChina/cubingchina)（GPL-2.0），
详见 `LICENSE-GPL-2.0` 与 `NOTICE`。
