import { useState, useMemo, useEffect } from 'react';
import { getDailyRecommendations, generateInterpretation } from '../utils/dailyEngine';
import { usePosterContext } from '../context/PosterContext';
import { fetchDailyCandidatePool, getPosterUrl } from '../services/tmdb';
import ConfettiEffect from './ConfettiEffect';
import { trackEvent, trackEventOnce } from '../utils/analytics';

const FEEDBACK_ACTIONS = [
  { key: 'want', label: '＋ 想看' },
  { key: 'seen', label: '✓ 看过' },
  { key: 'dislike', label: '× 不想看' },
];

const REJECTION_REASONS = ['类型不对', '看过了', '太沉重', '节奏不合适', '单纯没眼缘'];

export default function DailyResult({ data, onBack, onRestart }) {
  const [excludedIds, setExcludedIds] = useState([]);
  const [externalPool, setExternalPool] = useState([]);
  const [isExpanding, setIsExpanding] = useState(true);
  const [isRerolling, setIsRerolling] = useState(false);
  const [rerollKey, setRerollKey] = useState(0);
  const [selectedMode, setSelectedMode] = useState('mirror');
  const [feedback, setFeedback] = useState({});
  const [pendingReasonFor, setPendingReasonFor] = useState(null);
  const [toast, setToast] = useState('');
  const result = useMemo(
    () => getDailyRecommendations(data, externalPool, excludedIds),
    [data, externalPool, excludedIds]
  );
  const { posters, ensurePosters } = usePosterContext();

  useEffect(() => {
    let active = true;
    fetchDailyCandidatePool(data).then((pool) => {
      if (!active) return;
      setExternalPool(pool);
      setIsExpanding(false);
      trackEvent('candidate_pool_expanded', { flow: 'b', candidate_count: pool.length });
    });
    return () => { active = false; };
  }, [data]);

  useEffect(() => {
    if (!result) return;
    ensurePosters([result.mirror.movie, result.window.movie]);
  }, [ensurePosters, result?.mirror?.movie?.id, result?.window?.movie?.id]);

  useEffect(() => {
    if (!result) return;
    trackEventOnce('result_view', {
      flow: 'b',
      result_type: 'daily_recommendation',
      candidate_count: result.poolSize,
      mirror_movie_id: result.mirror.movie.id,
      window_movie_id: result.window.movie.id,
    }, 'result_view:b');
  }, [result]);

  const handleReroll = () => {
    if (isRerolling || !result) return;
    trackEvent('reroll', { flow: 'b', reroll_number: rerollKey + 1 });
    setIsRerolling(true);
    window.setTimeout(() => {
      const newExcluded = [...excludedIds, result.mirror.movie.id, result.window.movie.id];
      setExcludedIds(newExcluded);
      setSelectedMode('mirror');
      setRerollKey((k) => k + 1);
      setIsRerolling(false);
    }, 360);
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeResult = result?.[selectedMode];

  const shareContent = useMemo(() => {
    if (!activeResult) return '';
    const { movie, label, text } = activeResult;
    return `🎬 FilmMirror 今天给我的“${label}”推荐是《${movie.title}》（${movie.year || '年份未知'}）\n\n${text}\n\n→ 生成你的镜子 / 窗户片单：https://film-mirror.pages.dev/\n\n#FilmMirror #今日电影`;
  }, [activeResult]);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareContent);
      setToast('分享文案已复制');
    } catch {
      setToast('复制失败，请稍后重试');
    }
    trackEvent('share', { flow: 'b', share_type: 'copy_text', result_mode: selectedMode });
  };

  const submitFeedback = (mode, action, reason = '') => {
    const movie = result?.[mode]?.movie;
    if (!movie) return;
    const payload = { action, reason, movieId: movie.id, title: movie.title, mode };
    setFeedback((current) => ({ ...current, [mode]: payload }));
    setPendingReasonFor(null);
    try {
      const history = JSON.parse(localStorage.getItem('filmmirror_daily_feedback') || '[]');
      localStorage.setItem('filmmirror_daily_feedback', JSON.stringify([...history.slice(-49), { ...payload, at: Date.now() }]));
    } catch {}
    setToast(action === 'want' ? '已加入“想看”记录' : action === 'seen' ? '已记录“看过”' : '收到，下一轮会避开');
    trackEvent('recommendation_feedback', {
      flow: 'b',
      result_mode: mode,
      action,
      reason,
      movie_id: movie.id,
    });
  };

  const posterFor = (movie) => movie.isTMDB && movie.posterPath
    ? getPosterUrl(movie.posterPath)
    : posters[movie.id];

  if (!result) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>正在为你挑选今天的电影...</p>
      </div>
    );
  }

  const renderTrack = (track) => {
    const { movie, mode, label, subtitle, text } = track;
    const poster = posterFor(movie);
    const currentFeedback = feedback[mode];
    return (
      <article className={`daily-track-card ${selectedMode === mode ? 'selected' : ''}`}>
        <div className="track-heading">
          <div><span className="track-label">{label}</span><h3>{subtitle}</h3></div>
          <strong>{movie.matchScore}%</strong>
        </div>
        <button type="button" className="track-select" onClick={() => setSelectedMode(mode)} aria-label={`选择${label}推荐《${movie.title}》`}>
          <div className="track-poster">
            {poster ? <img
              src={poster}
              alt={`${movie.title}海报`}
              decoding="async"
              onError={() => trackEvent('poster_error', {
                flow: 'b',
                movie_id: movie.id,
                poster_source: movie.isTMDB ? 'tmdb_dynamic' : 'tmdb_proxy',
              })}
            /> : <span>{movie.title.slice(0, 1)}</span>}
          </div>
          <div className="track-copy">
            <h4>{movie.title}</h4>
            <p className="movie-meta">{movie.titleEn || '中文片名'} · {movie.year || '年份未知'}</p>
            <p>{text}</p>
          </div>
        </button>
        <div className="track-evidence">
          <span>为什么是它</span>
          <p>{generateInterpretation(data, movie, mode)}</p>
        </div>
        <div className="feedback-actions" aria-label={`反馈${movie.title}的推荐结果`}>
          {FEEDBACK_ACTIONS.map((action) => (
            <button
              type="button"
              key={action.key}
              className={currentFeedback?.action === action.key ? 'active' : ''}
              onClick={() => action.key === 'dislike' ? setPendingReasonFor(mode) : submitFeedback(mode, action.key)}
            >{action.label}</button>
          ))}
        </div>
        {pendingReasonFor === mode && (
          <div className="rejection-reasons" role="group" aria-label="不想看的原因">
            <span>主要原因：</span>
            {REJECTION_REASONS.map((reason) => (
              <button type="button" key={reason} onClick={() => submitFeedback(mode, 'dislike', reason)}>{reason}</button>
            ))}
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="page daily-result-page animate-fade-in">
      <ConfettiEffect trigger={`daily-${rerollKey}`} />
      <div className="daily-header-row">
        <button className="btn-ghost" onClick={onBack}>← 返回修改</button>
        <h2 className="section-title"><span className="accent-line" />今晚的两条路</h2>
      </div>

      <div className="result-container">
        <div className="recommendation-legend animate-fade-up">
          <p><strong>镜子</strong>尽量贴近你的选择；<strong>窗户</strong>保留核心需求，但故意推开一扇新门。</p>
          <span>{isExpanding ? '正在扩充在线片源，本地精选结果已可用…' : `已从 ${result.poolSize} 部候选中完成筛选`}</span>
        </div>

        <div className={`daily-track-grid ${isRerolling ? 'is-loading' : ''}`}>
          {renderTrack(result.mirror)}
          {renderTrack(result.window)}
        </div>

        <div className="daily-actions animate-fade-up">
          <button className="btn btn-secondary" onClick={handleReroll} disabled={isRerolling}>
            {isRerolling ? '正在重选…' : '🎲 两部都换掉'}
          </button>
          <button className="btn btn-primary" onClick={copyShare}>
            📋 复制“{activeResult.label}”分享文案
          </button>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button className="btn btn-ghost" onClick={onRestart}>
            回到首页
          </button>
        </div>
      </div>
      {toast && <div className="app-toast" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}
