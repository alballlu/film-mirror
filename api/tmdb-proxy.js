// Vercel Serverless Function — TMDB API 反向代理
// 部署到 Vercel 后，前端调 /api/tmdb-proxy 替代直接调 api.themoviedb.org
// 用法: /api/tmdb-proxy?action=search&query=xxx&year=2020&language=zh-CN&page=1

const TMDB_BASE = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY || '';

// 允许的 action → TMDB 端点映射（白名单防滥用）
const ENDPOINTS = {
  search: '/search/movie',
  keywords: '/movie/[id]/keywords',
  recommendations: '/movie/[id]/recommendations',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'TMDB_API_KEY not configured on server' });
  }

  const { action, id, ...restParams } = req.query;

  if (!action || !ENDPOINTS[action]) {
    return res.status(400).json({
      error: 'Missing or invalid action. Allowed: search, keywords, recommendations',
    });
  }

  // 构建 TMDB 路径 + 参数（转发所有参数，仅在服务端注入 api_key）
  let path = ENDPOINTS[action].replace('[id]', id || '');
  const params = new URLSearchParams({ api_key: API_KEY, ...restParams });

  const url = `${TMDB_BASE}${path}?${params}`;

  try {
    const tmdbRes = await fetch(url);
    const data = await tmdbRes.json();

    // 透传状态码
    if (!tmdbRes.ok) {
      return res.status(tmdbRes.status).json(data);
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'Failed to reach TMDB API', detail: e.message });
  }
}