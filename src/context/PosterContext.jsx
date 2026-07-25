import { createContext, useContext, useState, useEffect } from 'react';
import movies from '../data/movies.json';
import {
  getCachedPoster, getPosterUrl, getPosterSources,
  getStaticPosterPath, fetchPosterThrottled,
} from '../services/tmdb';

const PosterContext = createContext({});

export function PosterProvider({ children }) {
  const [posters, setPosters] = useState({});
  const [posterSources, setPosterSources] = useState({}); // 多源 URLs
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 阶段1：同步加载 — 缓存 + movies.json 预填的 tmdbPosterPath
    const initialPosters = {};
    const initialSources = {};
    movies.forEach((m) => {
      // 优先：localStorage 缓存
      const cachedPath = getCachedPoster(m.id);
      // 其次：movies.json 预填的 tmdbPosterPath
      const staticPath = getStaticPosterPath(m.id);
      const path = cachedPath || staticPath;

      if (path) {
        initialPosters[m.id] = getPosterUrl(path);
        initialSources[m.id] = getPosterSources(path);
      }
    });

    if (!cancelled) {
      setPosters(initialPosters);
      setPosterSources(initialSources);
      // 仍然异步补齐缺失的海报（TMDB API）
      loadMissingPosters(cancelled);
    }

    return () => { cancelled = true; };
  }, []);

  async function loadMissingPosters(cancelled) {
    for (const movie of movies) {
      if (cancelled) break;
      // 已有就不再请求
      const cachedPath = getCachedPoster(movie.id);
      const staticPath = getStaticPosterPath(movie.id);
      if (cachedPath || staticPath) continue;

      const path = await fetchPosterThrottled(movie);
      if (path && !cancelled) {
        setPosters((prev) => ({ ...prev, [movie.id]: getPosterUrl(path) }));
        setPosterSources((prev) => ({ ...prev, [movie.id]: getPosterSources(path) }));
      }
    }
    if (!cancelled) setLoading(false);
  }

  return (
    <PosterContext.Provider value={{ posters, posterSources, loading }}>
      {children}
    </PosterContext.Provider>
  );
}

export function usePoster(movieId) {
  const { posters } = useContext(PosterContext);
  return posters[movieId] || '';
}

export function usePosterSources(movieId) {
  const { posterSources } = useContext(PosterContext);
  return posterSources[movieId] || [];
}

export function usePosterContext() {
  return useContext(PosterContext);
}