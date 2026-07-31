// Cloudflare Pages Function — 诊断健康检查
// ⚠️ 此文件是模板，构建时由 scripts/inject-env.js 替换 __TMDB_API_KEY__ 后生成 health.js
// 直接浏览器打开 /api/health 即可看到环境变量和 TMDB 连接状态

const TMDB_BASE = 'https://api.themoviedb.org/3';
// __TMDB_API_KEY__ 会在构建时被替换为真实的 API Key
const API_KEY = '__TMDB_API_KEY__';

export async function onRequest() {
  const hasKey = !!API_KEY;
  const keyPreview = hasKey
    ? API_KEY.slice(0, 4) + '****' + API_KEY.slice(-4)
    : '(未设置 — 构建脚本未注入)';

  // 测试 TMDB 连通性
  let tmdbStatus = '未测试';
  let tmdbError = null;
  if (hasKey) {
    try {
      const res = await fetch(
        `${TMDB_BASE}/search/movie?api_key=${API_KEY}&query=test&language=zh-CN`
      );
      tmdbStatus = `HTTP ${res.status}`;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        tmdbError = body.status_message || body.error || JSON.stringify(body);
      }
    } catch (e) {
      tmdbStatus = '连接失败';
      tmdbError = e.message;
    }
  }

  return new Response(
    JSON.stringify({
      status: hasKey && tmdbStatus === 'HTTP 200' ? 'ok' : 'error',
      buildInjection: hasKey,   // true = 构建脚本成功注入 Key
      env: {
        TMDB_API_KEY: keyPreview,
        hasTMDB_API_KEY: hasKey,
      },
      tmdb: {
        status: tmdbStatus,
        error: tmdbError,
      },
      usage: {
        frontendProxy: '/api/tmdb-proxy?action=search&query=xxx&language=zh-CN',
        healthCheck: '/api/health',
      },
    }, null, 2),
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  );
}