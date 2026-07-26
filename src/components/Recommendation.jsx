import { useMemo, useRef, useEffect, useState } from 'react';
import movies from '../data/movies.json';
import { getRecommendations, getCareerAdvice } from '../utils/personalityEngine';
import { usePosterContext } from '../context/PosterContext';

export default function Recommendation({ selectedMovieIds, tags, scores, onBack, onRestart }) {
  const [animated, setAnimated] = useState(false);
  const { posters } = usePosterContext();
  useEffect(() => { setTimeout(() => setAnimated(true), 200); }, []);
  const [feedback, setFeedback] = useState(() => localStorage.getItem('filmmirror_feedback') || '');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackSending, setFeedbackSending] = useState(false);

  const recs = useMemo(
    () => getRecommendations(selectedMovieIds, tags.map((t) => ({ tag: t })), scores),
    [selectedMovieIds, tags, scores]
  );

  const career = useMemo(() => getCareerAdvice(scores), [scores]);
  const selectedMovies = useMemo(
    () => selectedMovieIds.map((id) => movies.find((m) => m.id === id)).filter(Boolean),
    [selectedMovieIds]
  );

  const handleFeedback = async () => {
    if (!feedback.trim()) return;
    localStorage.setItem('filmmirror_feedback', feedback);
    setFeedbackSending(true);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: 'ad278a33-257d-44b9-b62c-abdcce50f952',
          subject: 'FilmMirror 反馈',
          from_name: 'FilmMirror User',
          message: feedback,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setFeedbackSent(true);
        if (window.umami) umami.track('feedback_submitted');
      }
    } catch (e) {
      // 网络失败也没关系，localStorage 已经存了
    }
    setFeedbackSending(false);
  };

  return (
    <div className={`page ${animated ? 'animate-fade-in' : ''}`}>
      <div className="progress-bar">
        <div className="progress-step done">✓</div>
        <div className="progress-line done" />
        <div className="progress-step done">✓</div>
        <div className="progress-line done" />
        <div className="progress-step done">✓</div>
        <div className="progress-line done" />
        <div className="progress-step active">4</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button className="btn-ghost" onClick={onBack}>← 返回</button>
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          <span className="accent-line" />
          推荐与延伸
        </h2>
      </div>

      {/* Career Section */}
      <div className="career-section animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <h3 className="section-title">
          <span className="accent-line" />
          你的性格在职场中
        </h3>

        <div className="career-card">
          <p className="career-note" style={{ marginBottom: 16 }}>
            {career.intro}
          </p>

          <div className="career-list">
            {career.careerList.map((c, i) => (
              <span key={i} className="career-tag">{c}</span>
            ))}
          </div>

          <p className="career-note">
            当然，电影品味不能决定你该做什么工作——这更像是一个轻松的参考。真正的职业选择还要看你的技能、兴趣和当下的机会。但不妨想一想：上面这些方向里，有没有一个让你心跳快了一拍？那就是值得探索的线索。
          </p>
        </div>
      </div>

      {/* Recommended Movies */}
      <div className="animate-fade-up" style={{ animationDelay: '0.5s' }}>
        <h3 className="section-title">
          <span className="accent-line" />
          基于你的品味，还推荐这些
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
          基于你的品味标签，从电影库里为你发掘了 {recs.length} 部命中注定的电影
        </p>

        {recs.map((movie, i) => (
          <div
            key={movie.id}
            className="rec-movie-item"
            style={{ animationDelay: `${0.5 + i * 0.08}s` }}
          >
            <img
              className="rec-movie-poster"
              src={posters[movie.id] || ''}
              alt={movie.title}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.querySelector('.rec-poster-fallback').style.display = 'flex';
              }}
            />
            <div className="rec-poster-fallback" style={{ display: 'none' }}>
              {movie.title.slice(0, 3)}
            </div>
            <div className="rec-movie-info">
              <h4>
                {movie.title}{' '}
                <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {movie.titleEn} ({movie.year})
                </span>
              </h4>
              <p className="match">匹配度 {movie.matchScore}%</p>
              <p className="rec-desc">{movie.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Movies Recap */}
      <div style={{ marginTop: 32, animationDelay: '0.6s' }} className="animate-fade-up">
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: 16 }}>
          你的片单：{selectedMovies.map((m) => m.title).join('、')}
        </p>
      </div>

      {/* 反馈评论区 */}
      <div style={{ marginTop: 32, padding: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border-default)', animationDelay: '0.7s' }} className="animate-fade-up">
        <h4 style={{ marginBottom: 8, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
          💬 有想法？随便说
        </h4>
        {feedbackSent ? (
          <p style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>收到你的反馈了，感谢 ❤️</p>
        ) : (
          <>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="测试体验、建议、吐槽……都行"
              rows={3}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-sans)', resize: 'vertical' }}
            />
            <button
              onClick={handleFeedback}
              disabled={feedbackSending || !feedback.trim()}
              style={{ marginTop: 8, padding: '6px 16px', background: feedbackSending ? 'var(--border-default)' : 'var(--gold)', color: feedbackSending ? 'var(--text-muted)' : '#fff', border: 'none', borderRadius: 6, cursor: feedbackSending ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-sans)' }}
            >
              {feedbackSending ? '发送中…' : '提交'}
            </button>
          </>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button className="btn btn-primary" onClick={onRestart}>
          回到首页，再玩一次
        </button>
      </div>
    </div>
  );
}