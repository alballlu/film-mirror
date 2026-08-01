# Cloudflare Pages 部署与验收清单

## 一次性配置

- Cloudflare Pages 连接 `alballlu/film-mirror`。
- 生产分支：`main`。
- 构建命令：`npm run build`。
- 输出目录：`dist`。
- Node.js：20 或 22。
- 加密运行时变量：`TMDB_API_KEY`，同时应用于 Production 与 Preview。
- 不配置 `VITE_TMDB_API_KEY`，避免 Key 进入浏览器代码。

## 用户名变更后的检查

GitHub 用户名发生过变更。若最新提交没有触发 Cloudflare 部署，在 Pages 项目的 Git integration 中断开旧仓库并重新连接 `alballlu/film-mirror`，然后重新部署最新 `main`。

## 每次发布后

1. 首页返回 HTTP 200，HTML 不长期缓存。
2. `/api/health` 返回 HTTP 200、`status=ok`，且不显示任何 Key 片段。
3. TMDB 搜索接口返回 JSON，而不是首页 HTML。
4. 图片接口的 `Content-Type` 为 `image/jpeg` 或其他 `image/*`，不能是 `text/html`。
5. 手机端完整走通 Flow A 与 Flow B；刷新中间步骤后能恢复或安全返回上一有效步骤。
6. Umami 能看到开始、关键步骤、完成、分享和反馈事件。
7. 确认分享内容只包含 `https://film-mirror.pages.dev/`。

## 安全事项

仓库历史中曾出现过 TMDB Key。上线新版前应在 TMDB 后台废止旧 Key 并生成新 Key；不要尝试仅通过删除当前文件来处理，因为 Git 历史仍可访问旧值。
