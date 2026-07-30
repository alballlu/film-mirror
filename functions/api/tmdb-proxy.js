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
    return json({ error: 'TMDB_API_KEY not configured on server' }, 500);
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

  try {
    const tmdbRes = await fetch(`${TMDB_BASE}${path}?${tmdbParams}`);
    const data = await tmdbRes.json();
    return json(data, tmdbRes.ok ? 200 : tmdbRes.status);
  } catch (e) {
    return json({ error: 'Failed to reach TMDB API', detail: e.message }, 502);
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