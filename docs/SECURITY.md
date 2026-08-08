# FilmMirror 安全约定

## 密钥管理

- `TMDB_API_KEY` 只配置在 Cloudflare Pages 的加密环境变量中。
- 前端代码、JSON、测试、截图和 GitHub 提交中不得出现真实 Key。
- 不使用 `VITE_TMDB_API_KEY`；所有 `VITE_` 变量都会被打包到浏览器端。
- 如果密钥曾进入 Git 历史，应立即在 TMDB 后台撤销并重新生成，不能只删除当前文件。

## API 目录

`functions/api/` 是 Cloudflare Pages Functions 的服务端接口目录。接口地址可以被公网访问，但源码只读取 `env.TMDB_API_KEY`，不会把密钥返回给浏览器。

- `tmdb-proxy.js`：限制可请求的 TMDB 路径，并设置缓存和超时。
- `tmdb-image.js`：代理允许的 TMDB 海报资源。
- `health.js`：只返回配置和连通状态，不回显 Key 或 Key 片段。

## 发布前检查

1. 运行 `npm run test:analytics`。
2. 运行两条 E2E 流程测试。
3. 运行 `npm run build`。
4. 检查暂存改动中是否出现密钥或 `.env` 文件。
5. 定期处理 Dependabot 提交的依赖更新 PR。
