// Cloudflare Pages Function — TMDB API 反向代理
// 部署后前端调 /api/tmdb-proxy 替代直接调 api.themoviedb.org
// 用法: /api/tmdb-proxy?action=search&query=xxx&year=2020&language=zh-CN

const TMDB_BASE = 'https://api.themoviedb.org/3';

const ENDPOINTS = {
  search: '/search/movie',
  keywords: '/movie/[id]/keywords',
  recommendations: '/movie/[id]/recommendations',
};

export async function onRequest(context) {
  const { request, env } = context;
  const API_KEY = env.TMDB_API_KEY || '';

  console.log(`[tmdb-proxy] 收到请求: ${request.url}`);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!API_KEY) {
    console.error('[tmdb-proxy] ⚠️ TMDB_API_KEY 未配置！请在 Cloudflare Dashboard → Settings → Environment variables 中添加');
    return json({
      error: 'TMDB_API_KEY 未在服务器配置',
      hint: '请在 Cloudflare Dashboard → Settings → Environment variables 中添加 TMDB_API_KEY 变量，然后重新部署',
      hasKey: false,
    }, 500);
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const id = url.searchParams.get('id');

  if (!action || !ENDPOINTS[action]) {
    return json({ error: 'Missing or invalid action. Allowed: search, keywords, recommendations' }, 400);
  }

  let path = ENDPOINTS[action].replace('[id]', id || '');
  const tmdbParams = new URLSearchParams({ api_key: API_KEY });
  url.searchParams.forEach((v, k) => {
    if (k !== 'action' && k !== 'id') tmdbParams.set(k, v);
  });

  const tmdbUrl = `${TMDB_BASE}${path}?${tmdbParams}`;
  console.log(`[tmdb-proxy] → 代理到 TMDB: ${action}`);

  try {
    const tmdbRes = await fetch(tmdbUrl);
    const data = await tmdbRes.json();
    console.log(`[tmdb-proxy] ← TMDB 响应: HTTP ${tmdbRes.status}`);
    return json(data, tmdbRes.ok ? 200 : tmdbRes.status);
  } catch (e) {
    console.error(`[tmdb-proxy] ❌ 无法连接 TMDB API: ${e.message}`);
    return json({
      error: '无法连接 TMDB API',
      detail: e.message,
      hasKey: !!API_KEY,
    }, 502);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}