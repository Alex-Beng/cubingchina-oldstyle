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

| 用途 | 端点 | CORS |
|---|---|---|
| 新闻、比赛、FAQ、项目 | `api.cubing.com` | ❌ 需代理 |
| 选手、排名、纪录、统计、成绩 | `wca-api.cubing.com` | ✅ `*` 可直连 |

`api.cubing.com` 采用 Origin 白名单（仅允许 `cubing.com`），浏览器端无法直接读取响应，
因此需要一个代理中转。本项目附带一个 Cloudflare Worker 实现。

## 本地开发

```bash
npm install
npm run build:styles   # 编译 public/f 下的 LESS → public/f/build/css
npm run dev            # http://localhost:5173/cubingchina-oldstyle/
```

本地开发时，`/cubing-api/*` 由 Vite dev server 反向代理到 `api.cubing.com`，
无需额外配置。

## 构建

```bash
npm run build          # 样式 + 类型检查 + 打包 → dist/
npm run preview        # 预览生产构建
```

## 部署

### 1. 部署代理（Cloudflare Worker）

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

部署后会得到一个地址，形如：

```
https://cubingchina-oldstyle-proxy.<your-account>.workers.dev
```

免费额度为每天 10 万次请求，且带 60 秒边缘缓存。

### 2. 配置仓库变量

在 GitHub 仓库 `Settings → Secrets and variables → Actions → Variables` 中添加：

| 变量 | 值 |
|---|---|
| `VITE_CUBING_API_BASE` | 上一步得到的 Worker 地址 |

构建时 `VITE_BASE_PATH` 会自动设为 `/<仓库名>/`。

### 3. 启用 GitHub Pages

`Settings → Pages → Build and deployment → Source` 选择 **GitHub Actions**。

推送到 `master` 即可自动构建发布。

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
reference/           原站 PHP 视图与语言文件（移植参考）
scripts/             资源转换脚本（语言包、友情链接、样式编译）
src/
  api/               API 客户端（http / cubingApi / wcaApi / types）
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
worker/              Cloudflare Worker 代理
.github/workflows/   GitHub Pages 部署
```

## 已知限制

- **`api.cubing.com` 必须经代理**，否则新闻/比赛/FAQ 相关页面无法加载
- `results/competition/{wcaId}` 单次响应可达 1.4 MB，统计接口约 450 KB，已做按块加载与本地缓存
- 年度总结（summary）接口无对应 API，当前未实现
- 报名、支付、账号功能不在本项目范围内

## 许可

界面资源移植自 [CubingChina/cubingchina](https://github.com/CubingChina/cubingchina)（GPL-2.0），
详见 `LICENSE-GPL-2.0` 与 `NOTICE`。
