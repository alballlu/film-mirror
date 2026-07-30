import movies from '../data/movies.json';
import tmdbGenreMap from '../data/tmdbGenreMap.json';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const BASE_URL = 'https://api.themoviedb.org/3';
const BASE_IMG = 'https://image.tmdb.org/t/p/w342';

// Vercel 代理模式：设置 VITE_TMDB_API_URL=/api/tmdb-proxy 后，
// 所有 TMDB API 调用走同源代理（解决中国大陆网络限制 + 隐藏 API Key）
const PROXY_URL = import.meta.env.VITE_TMDB_API_URL || '';
const USE_PROXY = !!PROXY_URL;
const MISSING_KEY = !USE_PROXY && !API_KEY;

// ── 请求超时配置 ──────────────────────────────────────────────
const FETCH_TIMEOUT = 5000; // 单次请求超时 5 秒

/**
 * 带超时的 fetch 封装
 * 超时后自动 Abort，不阻塞 UI
 */
async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── 统一 TMDB API 请求：有代理走代理，无代理直连 ──────────────
async function tmdbFetch(endpoint, queryParams = {}) {
  if (USE_PROXY) {
    // 走 Vercel Serverless 代理（API Key 在服务端注入，前端不传）
    const proxyParams = new URLSearchParams(queryParams);
    const url = `${PROXY_URL}?${proxyParams}`;
    return fetchWithTimeout(url);
  }
  // 直连 TMDB API
  const params = new URLSearchParams({ api_key: API_KEY, ...queryParams });
  const url = `${BASE_URL}${endpoint}?${params}`;
  return fetchWithTimeout(url);
}

// ── 搜索缓存（sessionStorage, 5min TTL）────────────────────────
const SEARCH_CACHE_PREFIX = 'tmdb_search_';
const SEARCH_CACHE_TTL = 5 * 60 * 1000;

function getSearchCache(query) {
  const normalized = query.trim().toLowerCase();
  try {
    const raw = sessionStorage.getItem(SEARCH_CACHE_PREFIX + normalized);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > SEARCH_CACHE_TTL) {
      sessionStorage.removeItem(SEARCH_CACHE_PREFIX + normalized);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setSearchCache(query, data) {
  const normalized = query.trim().toLowerCase();
  try {
    sessionStorage.setItem(
      SEARCH_CACHE_PREFIX + normalized,
      JSON.stringify({ data, ts: Date.now() })
    );
  } catch {
    // sessionStorage 满了就忽略
  }
}

// ── Rate Limiter（TMDB 搜索限速）─────────────────────────────
let lastSearchTime = 0;
const MIN_SEARCH_INTERVAL = 260; // ms

async function rateLimitedSearch(queryParams) {
  const now = Date.now();
  const wait = Math.max(0, MIN_SEARCH_INTERVAL - (now - lastSearchTime));
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastSearchTime = Date.now();
  return tmdbFetch('/search/movie', queryParams);
}

// ── 海报缓存管理 ──────────────────────────────────────────────
const CACHE_KEY = 'film_mirror_posters';
const CACHE_VERSION = 2;

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    if (data._version === CACHE_VERSION) return data;
    return {};
  } catch {
    return {};
  }
}

function saveCache(cache) {
  cache._version = CACHE_VERSION;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

const cache = loadCache();

// ── 多源海报 URL ──────────────────────────────────────────────
export function getPosterSources(path) {
  if (!path) return [];
  const directUrl = `${BASE_IMG}${path}`;
  const weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(directUrl)}&default=1`;
  return [directUrl, weservUrl];
}

export function getPosterUrl(path) {
  if (!path) return '';
  return `${BASE_IMG}${path}`;
}

export function getStaticPosterPath(movieId) {
  const movie = movies.find((m) => m.id === movieId);
  return movie?.tmdbPosterPath || '';
}

export function getCachedPoster(movieId) {
  return cache[movieId] || '';
}

// ── 海报搜索（单部电影）──────────────────────────────────────
async function searchMovie(title, year) {
  const res = await tmdbFetch('/search/movie', {
    action: 'search',
    query: title,
    year: String(year),
    language: 'zh-CN',
  });
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);
  const data = await res.json();
  return data.results?.[0]?.poster_path || null;
}

async function fetchPoster(movie) {
  try {
    const path = await searchMovie(movie.title, movie.year);
    if (path) {
      cache[movie.id] = path;
      saveCache(cache);
      return path;
    }
    cache[movie.id] = null;
    saveCache(cache);
    return null;
  } catch {
    return null;
  }
}

export async function fetchPosterForMovie(movie) {
  if (cache[movie.id] !== undefined) return cache[movie.id];
  return fetchPoster(movie);
}

// ── 海报队列节流（并发 batch + 超时控制）─────────────────────
const RATE_QUEUE = [];
let processing = false;
const POSTER_CONCURRENCY = 3; // 每批并发数
const BATCH_DELAY = 300;      // 批次间延迟 ms

async function processQueue() {
  if (processing) return;
  processing = true;
  while (RATE_QUEUE.length > 0) {
    // 取一批（最多 POSTER_CONCURRENCY 个）并发处理
    const batch = RATE_QUEUE.splice(0, POSTER_CONCURRENCY);

    await Promise.allSettled(
      batch.map(async ({ movie, resolve }) => {
        // 缓存命中直接返回
        const cachedPath = cache[movie.id];
        if (cachedPath !== undefined) {
          resolve(cachedPath);
          return;
        }
        try {
          const result = await fetchPoster(movie);
          resolve(result);
        } catch {
          // fetchPoster 内部已 catch，但保险起见再包一层
          resolve(null);
        }
      })
    );

    // 批次间延迟，避免触发 TMDB 限速
    if (RATE_QUEUE.length > 0) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY));
    }
  }
  processing = false;
}

export function fetchPosterThrottled(movie) {
  if (cache[movie.id] !== undefined) {
    return Promise.resolve(cache[movie.id]);
  }
  return new Promise((resolve) => {
    RATE_QUEUE.push({ movie, resolve });
    processQueue();
  });
}

// ── TMDB 流派 ID → 本地 tag ──────────────────────────────────
export function genreIdsToTags(genreIds) {
  const tags = [];
  for (const gid of genreIds) {
    const mapped = tmdbGenreMap[String(gid)];
    if (mapped) tags.push(...mapped);
  }
  return [...new Set(tags)];
}

// ── TMDB Keywords → 本地 tag 映射（关键词增强）───────────────
const KEYWORD_TO_TAG_MAP = {
  'plot twist': '反转', 'nonlinear timeline': '非线性叙事', 'mind-bending': '烧脑',
  'puzzle': '推理', 'detective': '推理', 'investigation': '推理',
  'logic': '智性', 'rationality': '智性', 'philosophy': '哲学',
  'time loop': '时间', 'time travel': '时间', 'parallel universe': '多元宇宙',
  'artificial intelligence': '人工智能', 'technology': '人工智能',
  'road trip': '公路', 'journey': '旅程', 'adventure': '冒险',
  'exploration': '探索', 'travel': '旅行', 'wanderlust': '旅行',
  'escape': '逃离', 'freedom': '自由', 'rebellion': '反叛',
  'wilderness': '自然', 'ocean': '海洋', 'space': '太空',
  'survival': '生存',
  'love': '爱情', 'romance': '浪漫', 'friendship': '友谊',
  'family': '家庭', 'mother son relationship': '亲情', 'father daughter relationship': '亲情',
  'grief': '告别', 'loss': '告别', 'nostalgia': '怀旧',
  'coming of age': '成长', 'healing': '治愈', 'loneliness': '孤独',
  'melancholy': '忧郁', 'warmth': '温暖', 'hope': '希望',
  'sacrifice': '牺牲', 'redemption': '转变',
  'visual': '视觉美学', 'cinematography': '视觉美学', 'color': '色彩',
  'surrealism': '超现实', 'dream': '梦境', 'slow cinema': '极简美学',
  'beauty': '美学', 'aesthetics': '美学', 'minimalism': '极简美学',
  'neon': '霓虹', 'noir': '黑暗', 'darkness': '黑暗',
  'music': '音乐', 'jazz': '爵士', 'poetry': '诗歌',
  'social commentary': '社会', 'satire': '黑色幽默', 'class': '阶级',
  'injustice': '正义', 'corruption': '体制', 'resistance': '体制反抗',
  'revolution': '革命', 'conspiracy': '权威质疑', 'paranoia': '权威质疑',
  'crime': '犯罪', 'violence': '暴力美学',
  'ethics': '伦理', 'moral ambiguity': '人性',
  'feminism': '女性', 'racism': '种族',
  'identity': '身份认同', 'self discovery': '自我发现', 'memory': '记忆',
  'psychology': '心理', 'trauma': '创伤', 'mental illness': '心理',
  'introspection': '内省', 'existentialism': '人生意义',
  'isolation': '疏离', 'silence': '沉默', 'death': '人生意义',
  'fate': '宿命', 'obsession': '执念',
};

export function keywordNamesToTags(keywordNames) {
  const tags = new Set();
  for (const kw of keywordNames) {
    const lower = kw.toLowerCase().trim();
    if (KEYWORD_TO_TAG_MAP[lower]) {
      tags.add(KEYWORD_TO_TAG_MAP[lower]);
    }
    for (const [key, tag] of Object.entries(KEYWORD_TO_TAG_MAP)) {
      if (lower.includes(key) || key.includes(lower)) {
        tags.add(tag);
      }
    }
  }
  return [...tags];
}

// ── 获取单部 TMDB 电影的 keywords ─────────────────────────────
export async function fetchTMDBKeywords(tmdbId) {
  if (MISSING_KEY) return [];
  const cacheKey = `tmdb_kw_${tmdbId}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const entry = JSON.parse(cached);
      if (Date.now() - entry.ts < 10 * 60 * 1000) return entry.data;
    }
  } catch {}

  try {
    const res = await tmdbFetch(`/movie/${tmdbId}/keywords`, {
      action: 'keywords',
      id: tmdbId,
    });
    if (!res.ok) return [];
    const data = await res.json();
    const names = (data.keywords || []).map((k) => k.name);
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ data: names, ts: Date.now() }));
    } catch {}
    return names;
  } catch {
    return [];
  }
}

// ── 增强版外部电影对象 ──────────────────────────────────────
export async function enrichExternalMovie(movie) {
  const tmdbId = String(movie.id).replace('tmdb_', '');
  const keywordNames = await fetchTMDBKeywords(tmdbId);
  const keywordTags = keywordNamesToTags(keywordNames);
  const genreTags = movie.tags || [];
  const mergedTags = [...new Set([...genreTags, ...keywordTags])];
  return { ...movie, tags: mergedTags, _enriched: true };
}

// ── 批量增强外部电影 ─────────────────────────────────────────
export async function enrichExternalMoviesBatch(externalMovies) {
  const enriched = {};
  const ids = Object.keys(externalMovies);
  for (let i = 0; i < ids.length; i += 5) {
    const batch = ids.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map((id) => enrichExternalMovie(externalMovies[id]))
    );
    results.forEach((r, j) => {
      if (r.status === 'fulfilled') {
        enriched[batch[j]] = r.value;
      } else {
        enriched[batch[j]] = externalMovies[batch[j]];
      }
    });
    if (i + 5 < ids.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return enriched;
}

// ── TMDB 在线搜索（缓存 + 限流 + 错误兜底）───────────────────
export async function searchTMDBMulti(query) {
  if (!query.trim()) return [];
  if (MISSING_KEY) {
    console.warn('[FilmMirror] TMDB API Key 未配置，搜索不可用');
    return [];
  }

  const cached = getSearchCache(query);
  if (cached) return cached;

  const queryParams = {
    action: 'search',
    query: query.trim(),
    language: 'zh-CN',
    page: '1',
  };

  try {
    const res = await rateLimitedSearch(queryParams);

    if (res.status === 429) {
      console.warn('[FilmMirror] TMDB 请求过于频繁，请稍后再试');
      return [];
    }
    if (res.status === 401) {
      console.error('[FilmMirror] TMDB API Key 无效或已过期');
      return [];
    }
    if (!res.ok) {
      console.warn(`[FilmMirror] TMDB 搜索失败 (${res.status})`);
      return [];
    }

    const data = await res.json();
    const results = (data.results || []).slice(0, 10).map((r) => ({
      id: `tmdb_${r.id}`,
      title: r.title || r.original_title || '未知',
      titleEn: r.original_title || '',
      year: r.release_date ? parseInt(r.release_date.slice(0, 4), 10) : 0,
      director: '',
      tags: genreIdsToTags(r.genre_ids || []),
      posterPath: r.poster_path || '',
      description: r.overview || '',
      isTMDB: true,
    }));

    setSearchCache(query, results);
    return results;
  } catch (e) {
    console.warn('[FilmMirror] TMDB 网络请求失败，请检查网络连接', e.message);
    return [];
  }
}

// ── 同类电影推荐 ─────────────────────────────────────────────
export async function fetchSimilarTMDB(tmdbId, count = 5) {
  if (MISSING_KEY) return [];
  const realId = String(tmdbId).replace('tmdb_', '');

  try {
    const res = await tmdbFetch(`/movie/${realId}/recommendations`, {
      action: 'recommendations',
      id: realId,
      language: 'zh-CN',
      page: '1',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).slice(0, count).map((r) => ({
      id: `tmdb_${r.id}`,
      title: r.title || r.original_title || '未知',
      titleEn: r.original_title || '',
      year: r.release_date ? parseInt(r.release_date.slice(0, 4), 10) : 0,
      posterPath: r.poster_path || '',
      description: r.overview || '',
      tags: genreIdsToTags(r.genre_ids || []),
      isTMDB: true,
    }));
  } catch {
    return [];
  }
}