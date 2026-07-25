// 预取 TMDB 海报路径并写入 movies.json
// 用法: node scripts/prefetch-posters.mjs
// 如果 TMDB API 被墙，设置环境变量 TMDB_PROXY
// 例如: TMDB_PROXY=https://your-proxy.com node scripts/prefetch-posters.mjs

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOVIES_PATH = join(__dirname, '..', 'src', 'data', 'movies.json');
const API_KEY = '5f6f71341339e144303eb5658119beba';
const PROXY = process.env.TMDB_PROXY || '';
const BASE_URL = PROXY ? `${PROXY}/https://api.themoviedb.org/3` : 'https://api.themoviedb.org/3';

async function searchMovie(title, year) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    query: title,
    year: String(year),
    language: 'zh-CN',
  });
  const url = `${BASE_URL}/search/movie?${params}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.error(`  ❌ HTTP ${res.status} for "${title}" (${year})`);
      return null;
    }
    const data = await res.json();
    return data.results?.[0]?.poster_path || null;
  } catch (err) {
    console.error(`  ❌ Network error for "${title}": ${err.message}`);
    return null;
  }
}

async function main() {
  const movies = JSON.parse(readFileSync(MOVIES_PATH, 'utf-8'));
  console.log(`📽️  预取 ${movies.length} 部电影海报...\n`);

  let success = 0;
  let skip = 0;
  let fail = 0;

  for (let i = 0; i < movies.length; i++) {
    const m = movies[i];
    // 跳过已有 tmdbPosterPath 的
    if (m.tmdbPosterPath) {
      skip++;
      continue;
    }
    process.stdout.write(`[${i + 1}/${movies.length}] ${m.title} (${m.year})... `);
    const path = await searchMovie(m.title, m.year);
    if (path) {
      m.tmdbPosterPath = path;
      success++;
      console.log('✅');
    } else {
      m.tmdbPosterPath = '';
      fail++;
      console.log('⬜ (fallback)');
    }
    // 限速：260ms 间隔
    await new Promise(r => setTimeout(r, 260));
  }

  writeFileSync(MOVIES_PATH, JSON.stringify(movies, null, 2), 'utf-8');
  console.log(`\n✅ 完成！成功: ${success}, 失败(fallback): ${fail}, 跳过(已有): ${skip}`);
  console.log(`📁 已写入: ${MOVIES_PATH}`);
}

main().catch(console.error);