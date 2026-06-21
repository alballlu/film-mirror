const API_KEY = '5f6f71341339e144303eb5658119beba';
const BASE_URL = 'https://api.themoviedb.org/3';

const CACHE_KEY = 'film_mirror_posters';
const CACHE_VERSION = 1;

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

const pending = new Map();

const BASE_IMG = 'https://image.tmdb.org/t/p/w342';

export function getPosterUrl(path) {
  if (!path) return '';
  return `${BASE_IMG}${path}`;
}

export function getCachedPoster(movieId) {
  return cache[movieId] || '';
}

async function searchMovie(title, year) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    query: title,
    year: String(year),
    language: 'zh-CN',
  });
  const res = await fetch(`${BASE_URL}/search/movie?${params}`);
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

  if (pending.has(movie.id)) return pending.get(movie.id);

  const promise = fetchPoster(movie);
  pending.set(movie.id, promise);
  const result = await promise;
  pending.delete(movie.id);
  return result;
}

const RATE_QUEUE = [];
let processing = false;

async function processQueue() {
  if (processing) return;
  processing = true;
  while (RATE_QUEUE.length > 0) {
    const { movie, resolve } = RATE_QUEUE.shift();
    const path = cache[movie.id];
    if (path !== undefined) {
      resolve(path);
      continue;
    }
    const result = await fetchPoster(movie);
    resolve(result);
    await new Promise((r) => setTimeout(r, 260));
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