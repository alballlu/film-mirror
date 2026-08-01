import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  checkProxyHealth,
  fetchPosterThrottled,
  getCachedPoster,
  getPosterSources,
  getPosterUrl,
  getStaticPosterPath,
} from '../services/tmdb';

const PosterContext = createContext({});

export function PosterProvider({ children }) {
  const [posters, setPosters] = useState({});
  const [posterSources, setPosterSources] = useState({});
  const [loading, setLoading] = useState(false);
  const requested = useRef(new Set());

  useEffect(() => {
    checkProxyHealth().then((result) => {
      if (!result.ok && window.umami) {
        window.umami.track('tmdb_proxy_unavailable', { reason: result.reason });
      }
    });
  }, []);

  const ensurePosters = useCallback(async (movieList) => {
    const readyPosters = {};
    const readySources = {};
    const missing = (movieList || []).filter((movie) => {
      if (!movie || movie.isTMDB || requested.current.has(movie.id)) return false;
      requested.current.add(movie.id);
      const path = getCachedPoster(movie.id) || getStaticPosterPath(movie);
      if (path) {
        readyPosters[movie.id] = getPosterUrl(path);
        readySources[movie.id] = getPosterSources(path);
        return false;
      }
      return true;
    });

    if (Object.keys(readyPosters).length > 0) {
      setPosters((current) => ({ ...current, ...readyPosters }));
      setPosterSources((current) => ({ ...current, ...readySources }));
    }

    if (missing.length === 0) return;
    setLoading(true);

    const results = await Promise.allSettled(
      missing.map(async (movie) => ({ movie, path: await fetchPosterThrottled(movie) }))
    );
    const nextPosters = {};
    const nextSources = {};

    results.forEach((result) => {
      if (result.status !== 'fulfilled' || !result.value.path) return;
      const { movie, path } = result.value;
      nextPosters[movie.id] = getPosterUrl(path);
      nextSources[movie.id] = getPosterSources(path);
    });

    if (Object.keys(nextPosters).length > 0) {
      setPosters((current) => ({ ...current, ...nextPosters }));
      setPosterSources((current) => ({ ...current, ...nextSources }));
    }
    setLoading(false);
  }, []);

  return (
    <PosterContext.Provider value={{ posters, posterSources, loading, ensurePosters }}>
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
