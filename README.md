# 🎬 FilmMirror · 电影镜像

**选几部你喜欢的电影，发现你的电影性格画像。**

FilmMirror 通过你选择的电影，分析你的 6 维人格特质（逻辑分析、自由探索、情感共鸣、美学感知、权威质疑、内省深度），生成专属的雷达图 + 性格解读 + 个性化推荐 + 可分享的票根风格分享卡。

---

## 🚀 部署到 Cloudflare Pages（推荐 · 国内稳定）

### 1. 准备工作
- GitHub 账号（已托管代码）
- [Cloudflare 账号](https://dash.cloudflare.com/sign-up)（免费注册）
- [TMDB API Key](https://www.themoviedb.org/settings/api)（免费申请）

### 2. 部署步骤

**第一步：确保仓库已推送到 GitHub**
```bash
git push origin main
```

**第二步：打开 Cloudflare Dashboard**
1. 进入 **Workers & Pages** → **Pages** → **连接到 Git**
2. 授权 GitHub，选择 `film-mirror` 仓库
3. 构建设置：
   - **构建命令**：`npm run build`
   - **输出目录**：`dist`
4. **保存并部署**

**第三步：设置环境变量**（部署后进入 Settings → Environment variables）

| 变量名 | 值 |
|---|---|
| `TMDB_API_KEY` | 你的 TMDB API Key（Functions 后端用） |
| `VITE_TMDB_API_URL` | `/api/tmdb-proxy`（前端构建时注入） |

> ⚠️ 两个变量都要添加，且都勾选 "Production" 和 "Preview" 环境。

**第四步：重新部署** — 添加环境变量后，在 Deployments 里点 "Retry deployment" 或推一个新 commit 触发重新构建。

---

### 3. 为什么选 Cloudflare Pages？

| | GitHub Pages | Cloudflare Pages |
|---|---|---|
| 国内访问速度 | ⭐ 经常超时 | ⭐⭐⭐⭐ 香港/台北节点 |
| TMDB API | ❌ 直连，被墙 | ✅ Functions 代理 |
| 费用 | 免费 | 免费（无限带宽） |
| 自定义域名 | 支持 | 支持 + 自动 SSL |

---

## 本地开发

```bash
npm install
npm run dev        # 启动 → http://localhost:5173
npm run build      # 生产构建
```

本地运行时需要 `.env.local` 文件：

```
VITE_TMDB_API_KEY=你的TMDB_API_Key
```

---

## 关于国内域名备案

| 方案 | 费用 | 说明 |
|---|---|---|
| Cloudflare 自带 `xxx.pages.dev` | ¥0 永久免费 | 直接可用，无需备案 |
| `.com` 域名 | ~¥50/年 | 不需备案，Cloudflare 一键绑定 |
| `.cn` 域名 | ~¥29/年 | 必须 ICP 备案，耗时 ~15 工作日 |

**建议**：先用 Cloudflare 的免费域名跑起来；以后想绑 `.com` 随时加，Cloudflare 支持一键配置 + 自动 SSL。

---

## 技术栈

- React 18 + React Router 6 · Vite 5
- Recharts（雷达图）· html2canvas（分享卡截图）
- TMDB API（电影海报 + 搜索）
- Cloudflare Pages Functions（API 代理）