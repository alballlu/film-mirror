const TMDB_HEALTH_URL = 'https://api.themoviedb.org/3/configuration';

export async function onRequest({ env }) {
  if (!env.TMDB_API_KEY) {
    return healthResponse({ status: 'error', tmdbConfigured: false, tmdbReachable: false }, 503);
  }

  try {
    const response = await fetch(`${TMDB_HEALTH_URL}?api_key=${env.TMDB_API_KEY}`, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
    });
    return healthResponse({
      status: response.ok ? 'ok' : 'error',
      tmdbConfigured: true,
      tmdbReachable: response.ok,
      upstreamStatus: response.status,
    }, response.ok ? 200 : 503);
  } catch {
    return healthResponse({ status: 'error', tmdbConfigured: true, tmdbReachable: false }, 503);
  }
}

function healthResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
