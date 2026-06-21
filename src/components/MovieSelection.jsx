import { useState, useMemo } from 'react';
import movies from '../data/movies.json';
import { usePosterContext } from '../context/PosterContext';

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

export default function MovieSelection({ selectedMovies: initial, onNext, onBack }) {
  const [selected, setSelected] = useState(new Set(initial));
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { posters } = usePosterContext();

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
          m.director.toLowerCase().includes(q)
      );
    }

    return result;
  }, [filter, search]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 12) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const selectedIds = Array.from(selected);

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="selection-header">
        <h1>选出你喜欢的电影</h1>
        <p>选择 8–12 部你真正喜欢的电影，让我们从中读懂你</p>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
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

      {/* Search */}
      <div className="search-wrapper">
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
          className="search-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索电影 / 导演..."
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch('')}>×</button>
        )}
      </div>

      {/* Movie Grid */}
      {filteredMovies.length === 0 ? (
        <div className="no-results">未找到匹配的电影</div>
      ) : (
        <div className="movie-grid">
          {filteredMovies.map((movie, i) => {
            const posterUrl = posters[movie.id];
            return (
              <div
                key={movie.id}
                className={`movie-card ${selected.has(movie.id) ? 'selected' : ''}`}
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => toggle(movie.id)}
              >
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={movie.title}
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
                <div className="movie-first-char" style={posterUrl ? { position: 'relative', zIndex: 1, textShadow: '0 2px 8px rgba(0,0,0,0.7)' } : {}}>
                  {movie.title.slice(0, 1)}
                </div>
                <div className="movie-card-title" style={posterUrl ? { position: 'relative', zIndex: 1, textShadow: '0 1px 4px rgba(0,0,0,0.7)' } : {}}>
                  {movie.title}
                </div>
                <div className="movie-card-director" style={posterUrl ? { position: 'relative', zIndex: 1, textShadow: '0 1px 4px rgba(0,0,0,0.7)' } : {}}>
                  {movie.director}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
          onClick={() => onNext(selectedIds)}
        >
          确认选择，下一步
        </button>
      </div>
    </div>
  );
}