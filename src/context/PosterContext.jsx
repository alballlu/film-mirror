import React, { createContext, useContext, useState, useEffect } from 'react';
import movies from '../data/movies.json';
import { getCachedPoster, getPosterUrl, fetchPosterThrottled } from '../services/tmdb';

const PosterContext = createContext({});

export function PosterProvider({ children }) {
  const [posters, setPosters] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      const initial = {};
      movies.forEach((m) => {
        const cached = getCachedPoster(m.id);
        if (cached) initial[m.id] = getPosterUrl(cached);
      });
      if (!cancelled) {
        setPosters(initial);
        setLoading(false);
      }

      for (const movie of movies) {
        if (cancelled) break;
        if (initial[movie.id]) continue;
        const path = await fetchPosterThrottled(movie);
        if (path && !cancelled) {
          setPosters((prev) => ({ ...prev, [movie.id]: getPosterUrl(path) }));
        } else if (!cancelled) {
          setPosters((prev) => ({ ...prev, [movie.id]: '' }));
        }
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, []);

  return (
    <PosterContext.Provider value={{ posters, loading }}>
      {children}
    </PosterContext.Provider>
  );
}

export function usePoster(movieId) {
  const { posters } = useContext(PosterContext);
  return posters[movieId] || '';
}

export function usePosterContext() {
  return useContext(PosterContext);
}