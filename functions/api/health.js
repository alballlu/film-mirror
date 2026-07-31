// Cloudflare Pages Function — 诊断健康检查
// 直接浏览器打开 /api/health 即可看到所有环境变量和 TMDB 连接状态
// 用法: https://film-mirror.pages.dev/api/health

const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function onRequest(context) {
  const { env } = context;

  const apiKey = env.TMDB_API_KEY || '';
  const hasKey = !!apiKey;
  const keyPreview = hasKey
    ? apiKey.slice(0, 4) + '****' + apiKey.slice(-4)
    : '(未设置)';

  // 测试 TMDB 连通性
  let tmdbStatus = '未测试';
  let tmdbError = null;
  if (hasKey) {
    try {
      const res = await fetch(
        `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=test&language=zh-CN`
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