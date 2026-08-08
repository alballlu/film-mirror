# FilmMirror｜电影镜像

FilmMirror 是一个电影人格画像与场景化推荐产品。用户可以通过喜欢的电影生成六维偏好画像，也可以根据当下的情绪、类型和时长要求快速获得观影推荐。

- 正式地址：https://film-mirror.pages.dev/
- 代码托管：GitHub
- 唯一生产环境：Cloudflare Pages

## 核心产品路径

1. **电影人格画像**：选择电影 → 确认偏好标签 → 查看六维画像 → 获得匹配推荐。
2. **即时观影推荐**：填写当下观影情境 → 获得场景化推荐 → 反馈、重选或分享。

代码中的 `flow=a` 和 `flow=b` 仅作为历史埋点兼容标识：

- `a`：电影人格画像
- `b`：即时观影推荐

不要直接修改这些值，否则会造成 Umami 历史数据断层。

## 本地开发

```bash
npm install
npm run dev
npm run build
npm run test:analytics
```

本地 Vite 只负责前端页面。TMDB 搜索、推荐和海报由 Cloudflare Pages Functions 提供，前端不会保存或暴露 TMDB API Key。

## Cloudflare Pages 部署

1. Cloudflare Pages 连接 GitHub 仓库 `alballlu/film-mirror`，生产分支使用 `main`。
2. 构建命令为 `npm run build`，输出目录为 `dist`。
3. 在 Production 与 Preview 环境中配置加密变量 `TMDB_API_KEY`。
4. 部署后检查：
   - `/api/health`
   - `/api/tmdb-proxy?action=search&query=Inception&language=zh-CN`
   - `/api/tmdb-image?path=/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg`

GitHub Pages 与 Vercel 已停用，GitHub 只承担代码托管、分支管理和版本追踪。

## 目录说明

```text
src/components/     产品页面和共享组件
src/utils/          推荐、画像和埋点逻辑
src/services/       TMDB 数据服务
src/data/           正式运行所需数据
functions/api/      Cloudflare Pages Functions
tests/analytics/    埋点队列及流程测试
docs/               产品、部署和分析文档
docs/archive/       不参与运行的历史材料
```

更详细的代码命名和兼容约束参见 `docs/CODEBASE_GUIDE.md`，密钥及接口约定参见 `docs/SECURITY.md`。

## 海报预取

如需一次性补全本地电影数据的 `tmdbPosterPath`，可在本地临时设置 `TMDB_API_KEY` 后运行：

```bash
node scripts/prefetch-posters.mjs
```

不要把 Key 写入源码或提交到 GitHub。

## 技术栈

React 18、React Router 6、Vite 5、Cloudflare Pages Functions、TMDB、Umami、Canvas Confetti、html2canvas。
