import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const moviesPath = join(scriptDir, '..', 'src', 'data', 'movies.json');
const apiKey = process.env.TMDB_API_KEY;

if (!apiKey) {
  console.error('Missing TMDB_API_KEY. Set it only for this local command; never commit it.');
  process.exit(1);
}

async function searchMovie(title, year) {
  const params = new URLSearchParams({
    api_key: apiKey,
    query: title,
    year: String(year),
    language: 'zh-CN',
  });
  const response = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`TMDB ${response.status}`);
  const data = await response.json();
  return data.results?.[0]?.poster_path || '';
}

const movies = JSON.parse(readFileSync(moviesPath, 'utf8'));
let success = 0;
let failed = 0;

for (const [index, movie] of movies.entries()) {
  if (movie.tmdbPosterPath) continue;
  try {
    movie.tmdbPosterPath = await searchMovie(movie.title, movie.year);
    if (movie.tmdbPosterPath) success += 1;
    else failed += 1;
  } catch {
    failed += 1;
  }
  process.stdout.write(`\r${index + 1}/${movies.length}`);
  await new Promise((resolve) => setTimeout(resolve, 300));
}

writeFileSync(moviesPath, `${JSON.stringify(movies, null, 2)}\n`, 'utf8');
console.log(`\nPoster paths saved. success=${success} failed=${failed}`);
