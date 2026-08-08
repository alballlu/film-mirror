import { useEffect, useState, useMemo } from 'react';
import movies from '../data/movies.json';
import { extractTags } from '../utils/movieProfileEngine';
import { usePosterContext } from '../context/PosterContext';

export default function PreferenceTagReview({ selectedMovieIds, externalMovies, enriching, onNext, onBack }) {
  const { posters, ensurePosters } = usePosterContext();
  const extracted = useMemo(() => extractTags(selectedMovieIds, externalMovies), [selectedMovieIds, externalMovies]);
  const [tags, setTags] = useState(extracted.map((t) => t.tag));
  const [input, setInput] = useState('');

  const selectedMovies = useMemo(
    () =>
      selectedMovieIds
        .map((id) => {
          const local = movies.find((m) => m.id === id);
          if (local) return { ...local, isTMDB: false };
          return externalMovies[id] || null;
        })
        .filter(Boolean),
    [selectedMovieIds, externalMovies]
  );

  useEffect(() => {
    ensurePosters(selectedMovies);
  }, [ensurePosters, selectedMovies]);

  const removeTag = (tag) => setTags((prev) => prev.filter((t) => t !== tag));
  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addTag();
  };

  return (
    <div className="tag-confirm-page page-enter">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button className="btn-ghost" onClick={onBack}>← 返回</button>
        <h2 style={{ fontFamily: 'var(--font-serif-zh)', fontSize: 24, fontWeight: 600, color: 'var(--text-bright)' }}>
          你的品味标签
        </h2>
      </div>

      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>
        基于你选的 {selectedMovieIds.length} 部电影，我们提取了以下高频标签。
        你可以删掉不认同的，也可以补充自己的——这会让画像更准确。
      </p>
      {enriching && (
        <p style={{
          fontSize: 12, color: 'var(--gold)', marginBottom: 16,
          fontFamily: 'var(--font-sans)', fontStyle: 'italic',
        }}>
          🔍 正在联网丰富外部电影的标签信息…
        </p>
      )}

      {/* Selected Movies Strip */}
      <div className="selected-movies-strip">
        {selectedMovies.map((m) => (
          <div key={m.id} className="selected-movie-thumb">
            {posters[m.id] ? (
              <img
                src={posters[m.id]}
                alt={m.title}
                loading="lazy"
                decoding="async"
                style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
              />
            ) : (
              m.title.slice(0, 1)
            )}
          </div>
        ))}
      </div>

      {/* Tag Cloud */}
      <div className="tag-cloud">
        {tags.map((tag, i) => (
          <span key={tag + i} className="tag-item">
            {tag}
            <button className="tag-remove" onClick={() => removeTag(tag)}>×</button>
          </span>
        ))}
      </div>

      {/* Tag Input */}
      <div className="tag-input-wrapper">
        <input
          className="tag-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="添加你自己的标签，按回车确认..."
        />
        <button
          className="btn-primary"
          style={{ padding: '10px 20px', fontSize: 13 }}
          onClick={addTag}
          disabled={!input.trim() || tags.includes(input.trim())}
          aria-disabled={!input.trim() || tags.includes(input.trim())}
        >
          添加
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <button className="btn-primary" onClick={() => onNext(tags)}>
          确认标签，下一步 →
        </button>
      </div>
    </div>
  );
}
