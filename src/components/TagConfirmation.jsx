import { useState, useMemo } from 'react';
import movies from '../data/movies.json';
import { extractTags } from '../utils/personalityEngine';
import { usePosterContext } from '../context/PosterContext';

export default function TagConfirmation({ selectedMovieIds, onNext, onBack }) {
  const { posters } = usePosterContext();
  const extracted = useMemo(() => extractTags(selectedMovieIds), [selectedMovieIds]);
  const [tags, setTags] = useState(extracted.map((t) => t.tag));
  const [input, setInput] = useState('');

  const selectedMovies = useMemo(
    () => selectedMovieIds.map((id) => movies.find((m) => m.id === id)).filter(Boolean),
    [selectedMovieIds]
  );

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

      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
        基于你选的 {selectedMovieIds.length} 部电影，我们提取了以下高频标签。
        你可以删掉不认同的，也可以补充自己的——这会让画像更准确。
      </p>

      {/* Selected Movies Strip */}
      <div className="selected-movies-strip">
        {selectedMovies.map((m) => (
          <div key={m.id} className="selected-movie-thumb">
            {posters[m.id] ? (
              <img
                src={posters[m.id]}
                alt={m.title}
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
        <button className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }} onClick={addTag}>添加</button>
      </div>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <button className="btn-primary" onClick={() => onNext(tags)}>
          确认标签，下一步 →
        </button>
      </div>
    </div>
  );
}