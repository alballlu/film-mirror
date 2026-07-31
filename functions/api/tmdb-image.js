// Cloudflare Pages Function — TMDB 图片代理
// 解决 image.tmdb.org 在国内被墙的问题
// 用法: /api/tmdb-image?path=/abc123.jpg
// TMDB 图片不需要 API Key，直接代理即可

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.searchParams.get('path');

  if (!path) {
    return new Response('Missing path parameter', { status: 400 });
  }

  // 安全检查：path 必须以 / 开头且只包含合法字符
  if (!/^\/[a-zA-Z0-9._\-/]+$/.test(path)) {
    return new Response('Invalid path', { status: 400 });
  }

  const imageUrl = `${TMDB_IMAGE_BASE}${path}`;

  try {
    const imageRes = await fetch(imageUrl);

    if (!imageRes.ok) {
      return new Response('Image not found', { status: imageRes.status });
    }

    return new Response(imageRes.body, {
      status: 200,
      headers: {
        'Content-Type': imageRes.headers.get('Content-Type') || 'image/jpeg',
        // 海报图片路径不变，缓存 30 天
        'Cache-Control': 'public, max-age=2592000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response('Failed to fetch image', { status: 502 });
  }
}