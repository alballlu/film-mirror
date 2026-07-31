// 构建时将 TMDB_API_KEY 注入到 Cloudflare Functions 文件中
// 解决 Cloudflare Pages Functions 运行时 env 变量不生效的问题
//
// Cloudflare Pages 构建流程：
//   1. 克隆仓库
//   2. 运行 npm run build (= node scripts/inject-env.js && vite build)
//   3. 本脚本读取 process.env.TMDB_API_KEY → 写入 functions/api/*.js
//   4. Cloudflare 部署 dist/ + functions/（此时 .js 文件已含真实 Key）

const fs = require('fs');
const path = require('path');

// Cloudflare Pages 的环境变量行为不一致：
// - TMDB_API_KEY（无前缀）可能在构建时不可用
// - VITE_TMDB_API_KEY（VITE_ 前缀）构建时一定可用
// 优先用 TMDB_API_KEY，fallback 到 VITE_TMDB_API_KEY
const apiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || '';

const functionDir = path.join(__dirname, '..', 'functions', 'api');
const templates = ['tmdb-proxy', 'health'];

let ok = 0;
for (const name of templates) {
  const templatePath = path.join(functionDir, `${name}.template.js`);
  const outputPath = path.join(functionDir, `${name}.js`);

  if (!fs.existsSync(templatePath)) {
    console.warn(`[inject-env] ⚠️  模板不存在: ${templatePath}`);
    continue;
  }

  let content = fs.readFileSync(templatePath, 'utf-8');
  content = content.replace(/__TMDB_API_KEY__/g, apiKey);
  fs.writeFileSync(outputPath, content, 'utf-8');
  console.log(`[inject-env] ✅ 已生成 ${name}.js (key: ${apiKey ? '已注入' : '⚠️ 空'})`);
  ok++;
}

if (!apiKey) {
  console.warn('[inject-env] ⚠️  TMDB_API_KEY 环境变量为空！Functions 代理将无法连接 TMDB');
  console.warn('[inject-env] → 请在 Cloudflare Dashboard 的 Variables and secrets 中设置 TMDB_API_KEY');
} else {
  console.log(`[inject-env] 🎉 全部 ${ok} 个 Function 已注入 Key，代理将正常工作`);
}