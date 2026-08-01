const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';

export async function onRequest({ request, waitUntil }) {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const requestUrl = new URL(request.url);
  const path = requestUrl.searchParams.get('path');
  if (!path || !/^\/[a-zA-Z0-9._\-/]+$/.test(path)) {
    return new Response('Invalid poster path', { status: 400 });
  }

  const cache = caches.default;
  const cacheKey = new Request(requestUrl.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const upstream = await fetch(`${TMDB_IMAGE_BASE}${path}`, {
      signal: AbortSignal.timeout(8000),
      cf: { cacheEverything: true, cacheTtl: 30 * 24 * 60 * 60 },
    });
    const contentType = upstream.headers.get('Content-Type') || '';
    if (!upstream.ok || !contentType.startsWith('image/')) {
      return new Response('Poster unavailable', { status: upstream.ok ? 502 : upstream.status });
    }

    const response = new Response(upstream.body, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=604800, s-maxage=2592000, immutable',
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    });
    waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch {
    return new Response('Poster service unavailable', { status: 504 });
  }
}
