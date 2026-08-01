# FilmMirror · 电影镜像

通过用户喜欢的电影生成六维性格画像，并提供“今天看什么”的情境化推荐。

- 正式地址：https://film-mirror.pages.dev/
- 代码托管：GitHub
- 唯一生产环境：Cloudflare Pages

## 本地开发

```bash
npm install
npm run dev
npm run build
```

本地 Vite 只负责前端页面；TMDB 搜索和海报由 Cloudflare Pages Functions 提供。前端不保存、注入或直连任何 TMDB Key。

## Cloudflare Pages 部署

1. 在 Cloudflare Pages 连接 GitHub 仓库 `alballlu/film-mirror`，生产分支选择 `main`。
2. 构建命令填写 `npm run build`，输出目录填写 `dist`。
3. 在 Settings → Variables and Secrets 中新增加密变量 `TMDB_API_KEY`，并同时应用于 Production 与 Preview。
4. 重新部署后检查：
   - `/api/health` 应返回 HTTP 200 与 `"status":"ok"`。
   - `/api/tmdb-proxy?action=search&query=Inception&language=zh-CN` 应返回 JSON。
   - `/api/tmdb-image?path=/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg` 应返回 `image/*`。

不再使用 GitHub Pages 或 Vercel。GitHub 只承担代码托管、分支管理和版本追踪。

## 海报预取

运行时只会为用户当前看到的电影请求海报，不再进入首页就遍历全部 172 部电影。为了进一步减少首次访问请求，可在本地使用新的 TMDB Key 一次性补全 `tmdbPosterPath`：

```bash
node scripts/prefetch-posters.mjs
```

运行前仅在当前终端设置 `TMDB_API_KEY`；不要把 Key 写进源码或提交到 GitHub。

## 数据与复盘

- 产品复盘与四周路线：`docs/PRODUCT_REVIEW.md`
- 部署与验收清单：`docs/DEPLOYMENT_CHECKLIST.md`

## 技术栈

React 18、React Router 6、Vite 5、Recharts、Cloudflare Pages Functions、TMDB、Umami。
