import { useState, useMemo, useEffect } from 'react';
import { getDailyRecommendation, generateInterpretation } from '../utils/dailyEngine';
import { usePosterContext } from '../context/PosterContext';

const MOOD_EMOJI = {
  '低落': '🌧', '焦虑': '⚡', '平静': '🌿', '兴奋': '🎸',
  '思念': '📮', '无聊': '🫥', '想哭': '💧', '释然': '🌅',
  '下雨': '🌧', '晴天': '☀', '阴天': '☁', '大风': '🌀',
  '下雪': '❄', '闷热': '🫠', '月夜': '🌙',
  '单身': '🚶', '热恋': '💞', '暗恋': '💭', '吵架了': '💔',
  '冷战期': '🧱', '刚分手': '🚪', '想念某人': '📝', '在暧昧': '🫧',
  '海边': '🌊', '山里': '⛰', '小镇': '🏘', '大城市': '🌃',
  '公路上': '🛣', '外太空': '🚀', '咖啡馆': '☕', '家里窝着': '🛋',
};

function getMoodEmoji(data) {
  return MOOD_EMOJI[data.mood] || MOOD_EMOJI[data.weather] || '🎬';
}

export default function DailyResult({ data, onBack, onRestart }) {
  const [flipped, setFlipped] = useState(false);
  const [rerollKey, setRerollKey] = useState(0);
  const [result, setResult] = useState(() => getDailyRecommendation(data));
  const { posters } = usePosterContext();

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 150);
    return () => clearTimeout(t);
  }, [rerollKey]);

  const handleReroll = () => {
    setFlipped(false);
    setTimeout(() => {
      setResult(getDailyRecommendation(data));
      setRerollKey((k) => k + 1);
    }, 400);
  };

  const interpretation = useMemo(() => {
    if (!result) return '';
    return generateInterpretation(data, result.movie);
  }, [result, data]);

  const shareContent = useMemo(() => {
    if (!result) return '';
    const { movie } = result;
    return `🎬 今天的 FilmMirror 给我推荐了《${movie.title}》（${movie.year}）\n\n${result.text}\n\n${interpretation}\n\n→ 来查收你的今日电影：film-mirror.vercel.app\n\n#FilmMirror #今日电影`;
  }, [result, interpretation]);

  const copyShare = () => {
    navigator.clipboard.writeText(shareContent).catch(() => {});
  };

  const gradientColors = ['#3a2a1a', '#2a3a2a', '#2a2a3a', '#3a3a2a', '#4a3a2a', '#2a4a2a', '#3a2a4a', '#2a4a3a'];

  if (!result) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>正在为你挑选今天的电影...</p>
      </div>
    );
  }

  const { movie } = result;
  const bgColor = gradientColors[movie.id % gradientColors.length];

  return (
    <div className="page animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button className="btn-ghost" onClick={onBack}>← 返回修改</button>
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          <span className="accent-line" />
          今天的电影
        </h2>
      </div>

      <div className="result-container">
        {/* Flip Card */}
        <div className="flip-card animate-fade-up">
          <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
            <div className="flip-card-front">
              <div className="card-back-pattern">🎬</div>
            </div>
            <div className="flip-card-back">
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem', marginBottom: 12 }}>🎬</span>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem' }}>{movie.title}</h3>
                <p style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>{movie.year}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card Display */}
        <div className="daily-movie-card animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <div className="poster-area" style={{ background: `linear-gradient(135deg, ${bgColor}, #1c1b19)` }}>
            {posters[movie.id] ? (
              <img src={posters[movie.id]} alt={movie.title} className="poster-img" />
            ) : (
              <div className="poster-mood-fallback">
                <span className="mood-emoji">{getMoodEmoji(data)}</span>
                <span className="mood-label">{data.mood || data.weather}</span>
              </div>
            )}
          </div>
          <div className="card-body">
            <h3 className="movie-title">{movie.title}</h3>
            <p className="movie-year">{movie.titleEn} · {movie.year} · {movie.director}</p>
            <p className="recommend-line">{result.text}</p>
            <div className="interpretation">
              <p style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 8, fontSize: '0.8rem' }}>
                ✦ 今日解读
              </p>
              {interpretation}
            </div>
          </div>
        </div>

        <div className="daily-actions animate-fade-up" style={{ animationDelay: '0.45s' }}>
          <button className="btn btn-secondary" onClick={handleReroll}>
            🎲 换一部
          </button>
          <button className="btn btn-primary" onClick={copyShare}>
            📤 分享今天
          </button>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button className="btn btn-ghost" onClick={onRestart}>
            回到首页
          </button>
        </div>
      </div>
    </div>
  );
}