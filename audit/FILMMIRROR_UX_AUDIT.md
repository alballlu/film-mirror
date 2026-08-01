# FilmMirror P0 产品与体验审计

审计日期：2026-08-01  
正式环境：https://film-mirror.pages.dev/  
测试环境：本地 P0 修复候选，Microsoft Edge / Playwright，1440×900 与 390×844。

## 结论

当前正式站的海报失败不是单纯的网速问题，而是三项故障叠加：Cloudflare 仍在运行旧构建、TMDB 代理缺少可用的运行时 Key、首次访问会为 172 部电影逐部发起搜索。正式站电影选择页等待 6 秒后仍是 24 张没有片名的空卡。

本地 P0 候选已完成代码拆分、同源代理、按需海报请求、文字降级卡、流程状态恢复、页面版心、进度条、对比度和键盘操作修复。三组 Playwright 自动化测试通过，Flow A、Flow B 和手机端横向溢出均通过；Flow A 与 Flow B 在中间页刷新后能够恢复。

## 流程证据

### 1. 首页

正式站桌面首页：`screenshots/production-home-desktop.png`

- 两条体验路径清楚，但说明文字与背景对比度偏低。
- 正式 HTML 会额外加载 Google Fonts 和 494KB 的图表预加载块；画像图表尚未使用就进入首屏请求。
- 本地版删除外部字体阻塞、取消图表预加载，并提高次级文字对比度。

### 2. Flow A：选择电影

正式站手机页：`screenshots/production-flow-a-step1-mobile.png`  
修复后手机页：`screenshots/local-flow-a-step1-mobile-fixed.png`

- 正式站等待 6 秒后，24 张卡片仍无海报、无片名、无导演，用户无法完成选择。
- 根因之一是渐变降级层覆盖了文字，而不仅是海报接口失败。
- 修复后即使所有海报服务不可用，也能用首字、完整片名和导演继续完成任务。
- 卡片入场延迟由最多 1.15 秒压缩到 0.24 秒，降低“页面仍在加载”的错觉。

### 3. Flow A：标签确认

修复后页面：`screenshots/local-flow-a-step2.png`

- 用户能删除或补充标签，具备结果可控感。
- 当前一次展示约 30 个标签，首次用户可能难以判断哪些最重要；后续用户测试应验证是否需要默认只展示高频前 12 个。

### 4. Flow A：性格画像

修复后页面：`screenshots/local-flow-a-step3.png`

- 原组件错误复用了电影选择页的迷你进度条样式，四步进度几乎不可见；现已补全独立进度条。
- 原页面未套用已有的 720px 画像版心，说明文字横向铺满；现已恢复可读宽度。
- 结果表达完整，但“像不像我”仍缺少 1–5 分即时评分，这是验证推荐质量的关键缺口。

### 5. Flow A：推荐与延伸

修复后页面：`screenshots/local-flow-a-step4.png`

- 推荐、匹配度、职业延伸和反馈入口完整。
- 职业建议位于电影推荐之前，是否符合用户主要期待尚无数据；建议在访谈中比较“先看画像延伸”和“先看电影推荐”的偏好。
- 分享文案中的无效 Vercel 地址已统一为 Cloudflare 正式地址。

### 6. Flow B：今日推荐

修复后页面：`screenshots/local-flow-b-result.png`

- 原页面没有套用已有的 600px 结果页版心，卡片横向铺满；现已恢复聚焦布局并把海报区域居中。
- 重新推荐和分享入口清晰，但复制完成缺少明确 Toast，后续可作为小体验优化。

## 生产故障证据

1. 正式首页当前可以返回 HTTP 200，但首字节约 1.53 秒。
2. 正式 `/api/tmdb-proxy` 返回 HTTP 500。
3. 正式 `/api/health` 显示未配置有效 TMDB Key。
4. 正式 `/api/tmdb-image` 返回 `text/html` 首页，而不是 `image/*`。
5. 正式构建脚本中不存在最新提交新增的 `/api/tmdb-image` 字符串，说明 Cloudflare 没有部署最新 `main`。
6. 首次用户本地没有海报缓存时，旧逻辑会从首页开始遍历 172 部电影；P0 候选只在电影选择页请求当前可见的 24 部。

## 本地验证结果

- `npm run build`：通过。
- Playwright：3/3 流程测试通过。
- 页面 JavaScript 错误：0。
- 刷新恢复：Flow A 第 3 步与 Flow B 结果页均通过。
- 手机横向溢出：≤1px，通过。
- 本地主入口：175.38KB raw / 58.82KB gzip。
- 图表与分享能力：保持按需加载，不再从首页预加载 494KB 图表包。
- 自动测试环境仅拦截 `cloud.umami.is`，属于测试沙箱网络限制，不是页面代码异常。

## 部署前必须完成

1. 在 TMDB 后台废止仓库历史中曾公开的旧 Key，生成新 Key。
2. 在 Cloudflare Pages 中把新 Key 仅配置为加密运行时变量 `TMDB_API_KEY`；不得设置 `VITE_TMDB_API_KEY`。
3. 用户名变更后，重新确认 Cloudflare Git integration 指向 `alballlu/film-mirror`，并能跟随最新 `main`。
4. 用户确认 P0 修改后，再获得 GitHub 写权限，创建独立分支并提交；不直接覆盖 `main`。
5. Preview 部署验收三个 `/api/*` 地址和两条完整流程后，再合并正式分支。
