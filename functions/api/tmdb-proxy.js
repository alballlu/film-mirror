const TMDB_BASE = 'https://api.themoviedb.org/3';

const ENDPOINTS = {
  search: '/search/movie',
  discover: '/discover/movie',
  keywords: '/movie/[id]/keywords',
  recommendations: '/movie/[id]/recommendations',
};

const CACHE_TTL = {
  search: 6 * 60 * 60,
  discover: 6 * 60 * 60,
  keywords: 24 * 60 * 60,
  recommendations: 6 * 60 * 60,
};

export async function onRequest(context) {
  const { request, env, waitUntil } = context;

  if (request.method === 'OPTIONS') return corsResponse(null, 204);
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const apiKey = env.TMDB_API_KEY;
  if (!apiKey) {
    return json({ error: 'TMDB service is not configured' }, 503);
  }

  const requestUrl = new URL(request.url);
  const action = requestUrl.searchParams.get('action');
  const id = requestUrl.searchParams.get('id');

  if (!action || !ENDPOINTS[action]) {
    return json({ error: 'Invalid action' }, 400);
  }
  if (!['search', 'discover'].includes(action) && !/^\d+$/.test(id || '')) {
    return json({ error: 'Invalid movie id' }, 400);
  }

  const cache = caches.default;
  const cacheKey = new Request(requestUrl.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const upstreamParams = new URLSearchParams({ api_key: apiKey });
  requestUrl.searchParams.forEach((value, key) => {
    if (key !== 'action' && key !== 'id') upstreamParams.set(key, value);
  });

  const path = ENDPOINTS[action].replace('[id]', id || '');
  const upstreamUrl = `${TMDB_BASE}${path}?${upstreamParams}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
    const body = await upstream.text();
    const response = new Response(body, {
      status: upstream.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': upstream.ok
          ? `public, max-age=300, s-maxage=${CACHE_TTL[action]}`
          : 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });

    if (upstream.ok) waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    return json({ error: error.name === 'TimeoutError' ? 'TMDB timeout' : 'TMDB unavailable' }, 504);
  }
}

function json(data, status = 200) {
  return corsResponse(JSON.stringify(data), status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
}

function corsResponse(body, status, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      ...extraHeaders,
    },
  });
}
