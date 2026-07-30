import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import movies from '../data/movies.json';
import { usePosterContext } from '../context/PosterContext';
import { searchTMDBMulti, getPosterUrl } from '../services/tmdb';

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: '科幻', label: '科幻', keywords: ['科幻','太空','未来','人工智能'] },
  { key: '悬疑', label: '悬疑', keywords: ['悬疑','犯罪','惊悚','推理','黑色'] },
  { key: '爱情', label: '爱情', keywords: ['爱情','浪漫','暧昧','暗恋'] },
  { key: '公路', label: '公路', keywords: ['公路','冒险','旅行','旅途'] },
  { key: '青春', label: '青春', keywords: ['青春','成长','校园','少年'] },
  { key: '社会', label: '社会', keywords: ['社会','阶级','体制','权威质疑','现实'] },
  { key: '动画', label: '动画', keywords: ['动画','动漫','皮克斯','宫崎骏'] },
];

const BATCH_SIZE = 24;

function MovieCard({ movie, selected, posterUrl, animationDelay, onToggle }) {
  const [posterFailed, setPosterFailed] = useState(false);

  const handlePosterError = () => {
    setPosterFailed(true);
  };

  // 重置失败状态当 posterUrl 变化
  useEffect(() => {
    setPosterFailed(false);
  }, [posterUrl]);

  const showPoster = posterUrl && !posterFailed;
  const char = movie.title?.slice(0, 1) || '?';

  // 哈希生成稳定的渐变底色
  let hue = 0;
  for (let i = 0; i < (movie.title || '').length; i++) {
    hue = (hue * 31 + movie.title.charCodeAt(i)) % 360;
  }

  return (
    <div
      className={`movie-card ${selected ? 'selected' : ''}`}
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={() => onToggle(movie.id)}
    >
      {/* 无海报 / 海报加载失败时，显示渐变底色 */}
      {!showPoster && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, hsl(${hue}, 30%, 22%), hsl(${(hue + 30) % 360}, 25%, 14%))`,
        }} />
      )}
      {showPoster ? (
        <img
          src={posterUrl}
          alt={movie.title}
          onError={handlePosterError}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.85,
          }}
        />
      ) : null}
      <div
        className="movie-first-char"
        style={
          showPoster
            ? { position: 'relative', zIndex: 1, textShadow: '0 2px 8px rgba(0,0,0,0.7)' }
            : {}
        }
      >
        {char}
      </div>
      <div
        className="movie-card-title"
        style={
          showPoster
            ? { position: 'relative', zIndex: 1, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }
            : {}
        }
      >
        {movie.title}
      </div>
      <div
        className="movie-card-director"
        style={
          showPoster
            ? { position: 'relative', zIndex: 1, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }
            : {}
        }
      >
        {movie.director || (movie.isTMDB ? '来自 TMDB' : '')}
      </div>
    </div>
  );
}

export default function MovieSelection({ selectedMovies: initial, onNext, onBack }) {
  const [selected, setSelected] = useState(() => new Set(initial));
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const { posters } = usePosterContext();

  // TMDB 在线搜索
  const [tmdbResults, setTmdbResults] = useState([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbSearched, setTmdbSearched] = useState(false);
  const [extMoviesMap, setExtMoviesMap] = useState(() => {
    // 恢复之前选择的外部电影（从 initial 中保留含 tmdb_ 的 id）
    const map = {};
    return map;
  });

  // TMDB 搜索防抖
  const tmdbTimerRef = useRef(null);
  const lastTmdbQuery = useRef('');

  const filteredMovies = useMemo(() => {
    let result = movies;

    if (filter !== 'all') {
      const cat = CATEGORIES.find((c) => c.key === filter);
      if (cat) {
        result = result.filter((m) =>
          m.tags.some((t) => cat.keywords.some((kw) => t.includes(kw)))
        );
      }
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.titleEn.toLowerCase().includes(q) ||
          m.director.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [filter, search]);

  // 切换分类或搜索时重置分页 + 清除 TMDB 结果
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    setTmdbResults([]);
    setTmdbSearched(false);
  }, [filter, search]);

  // 本地无结果或结果很少时自动提示 TMDB 在线搜索
  useEffect(() => {
    if (search.trim() && filteredMovies.length < 5 && !tmdbSearched) {
      // 防抖 800ms
      if (tmdbTimerRef.current) clearTimeout(tmdbTimerRef.current);
      tmdbTimerRef.current = setTimeout(() => {
        if (search.trim() === lastTmdbQuery.current) return;
        setTmdbLoading(true);
        lastTmdbQuery.current = search.trim();
        searchTMDBMulti(search.trim()).then((results) => {
          setTmdbResults(results);
          setTmdbSearched(true);
          setTmdbLoading(false);
        });
      }, 800);
    }
    return () => {
      if (tmdbTimerRef.current) clearTimeout(tmdbTimerRef.current);
    };
  }, [search, filteredMovies.length, tmdbSearched]);

  const toggle = useCallback(
    (id, movieData) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          // 同时清理外部电影记录
          setExtMoviesMap((em) => {
            const n = { ...em };
            delete n[id];
            return n;
          });
        } else {
          if (next.size >= 12) return prev;
          next.add(id);
          // 外部电影存到 map 中
          if (movieData) {
            setExtMoviesMap((em) => ({ ...em, [id]: movieData }));
          }
        }
        return next;
      });
    },
    []
  );

  const selectedIds = Array.from(selected);

  const handleNext = () => {
    onNext(selectedIds, extMoviesMap);
  };

  const getPosterForMovie = (movie) => {
    // 本地电影从 context
    if (!movie.isTMDB && movie.id !== undefined) return posters[movie.id];
    // TMDB 外部电影直接用 posterPath
    if (movie.posterPath) return getPosterUrl(movie.posterPath);
    return '';
  };

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="selection-header">
        <h1>选出你喜欢的电影</h1>
        <p>选择 8–12 部你真正喜欢的电影，让我们从中读懂你</p>
      </div>

      {/* Sticky Search + Category Bar */}
      <div className="sticky-search-bar">
        <div className="search-wrapper-wide">
          <svg
            className="search-icon-svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input-wide"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索电影 / 导演 / 类型 / 关键词..."
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>
              ×
            </button>
          )}
        </div>
        {/* Category Tabs */}
        <div className="category-tabs-compact">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              className={`category-tab ${filter === cat.key ? 'active' : ''}`}
              onClick={() => setFilter(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Movie Grid */}
      {filteredMovies.length === 0 && tmdbResults.length === 0 ? (
        <div className="no-results-tmdb">
          <p className="no-results">未找到匹配的电影</p>
          {search.trim() && !tmdbSearched && !tmdbLoading && (
            <button
              className="load-more-btn"
              onClick={() => {
                setTmdbLoading(true);
                setTmdbSearched(true);
                lastTmdbQuery.current = search.trim();
                searchTMDBMulti(search.trim()).then((results) => {
                  setTmdbResults(results);
                  setTmdbLoading(false);
                });
              }}
            >
              🌐 在 TMDB 中在线搜索
            </button>
          )}
          {tmdbLoading && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 16 }}>
              正在搜索 TMDB...
            </p>
          )}
        </div>
      ) : (
        <>
          {/* 本地结果 */}
          {filteredMovies.length > 0 && (
            <div className="movie-grid">
              {filteredMovies.slice(0, visibleCount).map((movie, i) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  selected={selected.has(movie.id)}
                  posterUrl={posters[movie.id]}
                  animationDelay={(i % BATCH_SIZE) * 50}
                  onToggle={(id) => toggle(id, null)}
                />
              ))}
            </div>
          )}

          {/* 查看更多 */}
          {visibleCount < filteredMovies.length && (
            <div style={{ textAlign: 'center', padding: '12px 24px 20px' }}>
              <button
                className="load-more-btn"
                onClick={() => setVisibleCount((c) => c + BATCH_SIZE)}
              >
                查看更多 ({filteredMovies.length - visibleCount} 部)
              </button>
            </div>
          )}

          {/* TMDB 在线搜索结果 */}
          {tmdbResults.length > 0 && (
            <div className="tmdb-results-section">
              <div className="tmdb-results-header">
                <span>🌐 来自 TMDB 的搜索结果</span>
                <span className="tmdb-badge">在线数据</span>
              </div>
              <div className="movie-grid">
                {tmdbResults.slice(0, 12).map((movie, i) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    selected={selected.has(movie.id)}
                    posterUrl={getPosterForMovie(movie)}
                    animationDelay={(i % BATCH_SIZE) * 50}
                    onToggle={(id) => toggle(id, movie)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 底部手动触发 TMDB 按钮 */}
          {search.trim() && tmdbResults.length === 0 && !tmdbLoading && tmdbSearched && (
            <div style={{ textAlign: 'center', padding: '12px 24px 20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>
                TMDB 也未找到匹配结果
              </p>
            </div>
          )}
          {search.trim() && filteredMovies.length > 0 && !tmdbSearched && (
            <div style={{ textAlign: 'center', padding: '12px 24px 20px' }}>
              <button
                className="load-more-btn"
                onClick={() => {
                  setTmdbLoading(true);
                  setTmdbSearched(true);
                  lastTmdbQuery.current = search.trim();
                  searchTMDBMulti(search.trim()).then((results) => {
                    setTmdbResults(results);
                    setTmdbLoading(false);
                  });
                }}
              >
                🔍 还在找？在线搜索 TMDB →
              </button>
            </div>
          )}
          {tmdbLoading && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 16 }}>
              正在搜索 TMDB...
            </p>
          )}
        </>
      )}

      {/* 底部缓冲区 */}
      <div style={{ height: 100 }} />

      {/* Sticky Bottom */}
      <div className="sticky-bottom">
        <div>
          <span className="count-text">
            已选 <strong>{selectedIds.length}</strong> / 8–12 部
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, (selectedIds.length / 12) * 100)}%` }}
            />
          </div>
        </div>
        <button
          className="btn-primary"
          disabled={selectedIds.length < 8}
          onClick={handleNext}
        >
          确认选择，下一步
        </button>
      </div>
    </div>
  );
}