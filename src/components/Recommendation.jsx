import { useMemo, useRef, useEffect, useState } from 'react';
import movies from '../data/movies.json';
import { buildPreferenceProfile, getRecommendations, getCareerAdvice } from '../utils/personalityEngine';
import { usePosterContext } from '../context/PosterContext';
import { fetchSimilarTMDB, getPosterUrl } from '../services/tmdb';
import {
  feedbackLengthBucket,
  trackEvent,
  trackEventOnce,
  trackFlowComplete,
  trackPosterError,
  trackRecommendationImpression,
} from '../utils/analytics';

const FEEDBACK_ACTIONS = [
  { key: 'want', label: '＋ 想看' },
  { key: 'seen', label: '✓ 看过' },
  { key: 'dislike', label: '× 不想看' },
];

export default function Recommendation({ selectedMovieIds, externalMovies, tags, scores, onBack, onRestart }) {
  const [animated, setAnimated] = useState(false);
  const { posters, ensurePosters } = usePosterContext();
  useEffect(() => { setTimeout(() => setAnimated(true), 200); }, []);
  const [feedback, setFeedback] = useState(() => localStorage.getItem('filmmirror_feedback') || '');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [movieFeedback, setMovieFeedback] = useState({});

  // 混合推荐：用户选了外部 TMDB 电影时，为其找到相似电影
  const [tmdbSimilar, setTmdbSimilar] = useState([]);
  const [tmdbSimilarLoading, setTmdbSimilarLoading] = useState(false);
  const hasExternal = useMemo(
    () => Object.keys(externalMovies || {}).length > 0,
    [externalMovies]
  );
  useEffect(() => {
    if (!hasExternal) return;
    setTmdbSimilarLoading(true);
    const tmdbIds = Object.keys(externalMovies || {}).slice(0, 2); // 最多 2 部触发推荐
    Promise.allSettled(
      tmdbIds.map((id) => fetchSimilarTMDB(id, 3))
    ).then((results) => {
      const allSimilar = [];
      const seen = new Set(selectedMovieIds);
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          r.value.forEach((m) => {
            if (!seen.has(m.id)) {
              allSimilar.push(m);
              seen.add(m.id);
            }
          });
        }
      });
      setTmdbSimilar(allSimilar.slice(0, 8));
      setTmdbSimilarLoading(false);
    }).catch(() => setTmdbSimilarLoading(false));
  }, [hasExternal]);

  const recs = useMemo(
    () => getRecommendations(selectedMovieIds, tags, scores, 5, externalMovies),
    [selectedMovieIds, tags, scores, externalMovies]
  );

  useEffect(() => {
    ensurePosters(recs);
    trackEventOnce('recommendation_view', {
      flow: 'a',
      result_type: 'ranked_recommendations',
      recommendation_count: recs.length,
      algorithm_version: 'profile_v2',
    }, 'recommendation_view:a');
    trackFlowComplete('a', {
      result_type: 'ranked_recommendations',
      recommendation_count: recs.length,
      algorithm_version: 'profile_v2',
    });
    recs.forEach((movie, index) => trackRecommendationImpression('a', movie, {
      rank: index + 1,
      track: 'ranked',
      algorithm_version: 'profile_v2',
    }));
  }, [ensurePosters, recs]);

  const submitMovieFeedback = (movie, action, rank) => {
    setMovieFeedback((current) => ({ ...current, [movie.id]: action }));
    trackEvent('recommendation_feedback', {
      flow: 'a',
      movie_id: movie.id,
      movie_title: movie.title,
      action,
      rank,
      match_score: movie.matchScore,
      track: 'ranked',
      algorithm_version: 'profile_v2',
    });
  };

  const preferenceTags = useMemo(
    () => buildPreferenceProfile(selectedMovieIds, tags, externalMovies),
    [selectedMovieIds, tags, externalMovies]
  );
  const career = useMemo(() => getCareerAdvice(scores, preferenceTags), [scores, preferenceTags]);
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
        trackEvent('feedback_submitted', {
          flow: 'a',
          surface: 'recommendation_page',
          length_bucket: feedbackLengthBucket(feedback),
          delivery: 'web3forms_success',
        });
      }
    } catch (e) {
      // 网络失败也没关系，localStorage 已经存了
      trackEvent('feedback_error', { flow: 'a', surface: 'recommendation_page' });
    }
    setFeedbackSending(false);
  };

  return (
    <div className={`page rec-page ${animated ? 'animate-fade-in' : ''}`}>
      <div className="step-progress" aria-label="深度体验进度：第 4 步，共 4 步">
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
          从观影偏好延伸出的工作方式
        </h3>

        <div className="career-card">
          <p className="career-note career-disclaimer">
            {career.intro}
          </p>

          <div className="career-paths">
            {career.paths.map((path) => (
              <article key={path.id} className="career-path-card">
                <div className="career-path-heading">
                  <span>{path.priority}</span>
                  <h4>{path.title}</h4>
                </div>
                <div className="career-list">
                  {path.roles.map((role) => <span key={role} className="career-tag">{role}</span>)}
                </div>
                <p><strong>为什么出现：</strong>{path.reason}</p>
                <p><strong>常见工作方式：</strong>{path.workStyle}</p>
                <p className="career-experiment"><strong>低成本验证：</strong>{path.experiment}</p>
              </article>
            ))}
          </div>
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
              loading="lazy"
              decoding="async"
              onError={(e) => {
                trackPosterError({ flow: 'a', movieId: movie.id, source: 'tmdb_proxy', surface: 'recommendation_list' });
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
              {movie.matchReasons?.length > 0 && (
                <p className="match-reasons">因为你反复选择了：{movie.matchReasons.join(' · ')}</p>
              )}
              <p className="rec-desc">{movie.description}</p>
              <div className="feedback-actions" aria-label={`反馈${movie.title}的推荐结果`}>
                {FEEDBACK_ACTIONS.map((action) => (
                  <button
                    type="button"
                    key={action.key}
                    className={movieFeedback[movie.id] === action.key ? 'active' : ''}
                    onClick={() => submitMovieFeedback(movie, action.key, i + 1)}
                  >{action.label}</button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TMDB 混合推荐 */}
      {tmdbSimilar.length > 0 && (
        <div className="animate-fade-up" style={{ marginTop: 32, animationDelay: '0.55s' }}>
          <h3 className="section-title">
            <span className="accent-line" />
            🌐 来自全球片库的延伸推荐
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
            基于你选的外部电影，TMDB 为你推荐了这些你可能喜欢的电影
          </p>
          {tmdbSimilar.map((movie, i) => (
            <div
              key={movie.id}
              className="rec-movie-item"
              style={{ animationDelay: `${0.55 + i * 0.08}s` }}
            >
              {movie.posterPath ? (
                <img
                  className="rec-movie-poster"
                  src={getPosterUrl(movie.posterPath)}
                  alt={movie.title}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    trackPosterError({ flow: 'a', movieId: movie.id, source: 'tmdb_dynamic', surface: 'tmdb_similar' });
                    e.target.style.display = 'none';
                    e.target.parentElement.querySelector('.rec-poster-fallback').style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="rec-poster-fallback" style={movie.posterPath ? { display: 'none' } : {}}>
                {movie.title.slice(0, 3)}
              </div>
              <div className="rec-movie-info">
                <h4>
                  {movie.title}{' '}
                  <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {movie.titleEn} {movie.year ? `(${movie.year})` : ''}
                  </span>
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  🏷️ {movie.tags.slice(0, 5).join(' · ') || '类型待定'}
                </p>
                {movie.description && (
                  <p className="rec-desc" style={{ fontSize: '0.8rem' }}>
                    {movie.description.slice(0, 120)}{movie.description.length > 120 ? '...' : ''}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {tmdbSimilarLoading && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: 16 }}>
          🔍 正在寻找更多你可能喜欢的电影...
        </p>
      )}

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
