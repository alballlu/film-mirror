import { useState, useMemo, useEffect, useRef } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  calculatePersonalityScore, getPersonalitySummary,
  getDimensionText, getPersonalityName, DIMENSIONS,
} from '../utils/personalityEngine';
import ShareCard from './ShareCard';
import ConfettiEffect from './ConfettiEffect';

const DIMENSION_LABELS = {
  '逻辑分析': '逻辑分析',
  '自由探索': '自由探索',
  '情感共鸣': '情感共鸣',
  '美学感知': '美学感知',
  '权威质疑': '权威质疑',
  '内省深度': '内省深度',
};

export default function PersonalityProfile({ tags, selectedMovieIds, onNext, onBack }) {
  const [expanded, setExpanded] = useState(null);
  const [animateChart, setAnimateChart] = useState(false);
  const [shareText, setShareText] = useState('');
  const [showCard, setShowCard] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [liked, setLiked] = useState(() => localStorage.getItem('filmmirror_liked') === 'true');

  const scores = useMemo(() => calculatePersonalityScore(tags), [tags]);
  const personalityName = useMemo(() => getPersonalityName(scores), [scores]);
  const summary = useMemo(() => getPersonalitySummary(scores, tags.map((t) => ({ tag: t }))), [scores, tags]);
  const chartData = useMemo(
    () => DIMENSIONS.map((d) => ({ dimension: DIMENSION_LABELS[d], score: scores[d], full: 100 })),
    [scores]
  );

  useEffect(() => {
    const t = setTimeout(() => setAnimateChart(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (window.umami) umami.track('flow_a_complete');
    setConfettiTrigger(true);
  }, []);

  const sortedDims = useMemo(
    () => Object.entries(scores).sort((a, b) => b[1] - a[1]),
    [scores]
  );

  const generateShareContent = () => {
    const topDims = sortedDims.slice(0, 2).map(([d, s]) => `${d}(${s}%)`).join(' · ');
    return `🎬 我在 FilmMirror 做了电影性格测试！\n\n我的性格画像关键词：${topDims}\n\n${summary}\n\n→ 来测测你的：film-mirror.vercel.app\n\n#FilmMirror #电影镜像 #电影性格测试`;
  };

  const copyShareText = () => {
    const content = generateShareContent();
    setShareText(content);
    navigator.clipboard.writeText(content).catch(() => {});
  };

  const handleLike = () => {
    const newLiked = !liked;
    setLiked(newLiked);
    localStorage.setItem('filmmirror_liked', String(newLiked));
    if (newLiked && window.umami) umami.track('like_result');
  };

  return (
    <div className="page animate-fade-in">
      <ConfettiEffect trigger={confettiTrigger} />
      <div className="progress-bar animate-fade-up">
        <div className="progress-step done">✓</div>
        <div className="progress-line done" />
        <div className="progress-step done">✓</div>
        <div className="progress-line done" />
        <div className="progress-step active">3</div>
        <div className="progress-line" />
        <div className="progress-step">4</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button className="btn-ghost" onClick={onBack}>← 返回修改</button>
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          <span className="accent-line" />
          你的电影性格画像
        </h2>
      </div>

      {/* Radar Chart + Summary */}
      <div className="personality-section animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="radar-container">
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="var(--border-default)" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: 'var(--text-secondary)', fontSize: 13, fontFamily: 'var(--font-sans)' }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={false}
                tickCount={5}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                }}
                formatter={(value) => [`${value}分`, '']}
              />
              <Radar
                name="性格维度"
                dataKey="score"
                stroke="var(--gold)"
                strokeWidth={2}
                fill="rgba(201, 168, 108, 0.15)"
                fillOpacity={0.6}
                animationDuration={animateChart ? 1500 : 0}
                animationBegin={0}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="personality-summary">
          <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--gold)', marginBottom: 12 }}>
            ✦ 性格解读
          </p>
          {summary}
        </div>
      </div>

      {/* 点赞区域 */}
      <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 16 }}>
        <button
          onClick={handleLike}
          style={{
            background: liked ? 'var(--gold)' : 'transparent',
            border: `1px solid ${liked ? 'var(--gold)' : 'var(--border-default)'}`,
            borderRadius: 20,
            padding: '6px 16px',
            cursor: 'pointer',
            color: liked ? '#fff' : 'var(--text-secondary)',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {liked ? '❤️ 已赞' : '🤍 点赞'}
        </button>
      </div>

      {/* Dimension Breakdown */}
      <div className="dimension-breakdown animate-fade-up" style={{ animationDelay: '0.25s' }}>
        <h3 className="section-title" style={{ marginBottom: 16 }}>
          <span className="accent-line" />
          各维度详细解读
        </h3>

        {sortedDims.map(([dim, score], i) => (
          <div
            key={dim}
            className="dimension-card"
            onClick={() => setExpanded(expanded === dim ? null : dim)}
            style={{ animationDelay: `${0.3 + i * 0.08}s` }}
          >
            <div className="dim-header">
              <span className="dim-name">{dim}</span>
              <span className="dim-score">{score}%</span>
            </div>
            <div className="dim-bar">
              <div
                className="dim-bar-fill"
                style={{ width: animateChart ? `${score}%` : '0%' }}
              />
            </div>
            {expanded === dim && (
              <p className="dim-desc" style={{ animation: 'fadeIn 0.3s ease' }}>
                {getDimensionText(dim, score)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* 分享结果卡入口 */}
      <div className="share-actions animate-fade-up" style={{ animationDelay: '0.6s' }}>
        <button className="btn btn-primary" onClick={() => setShowCard(true)}>
          🎫 生成分享卡
        </button>
        <button className="btn btn-secondary" onClick={copyShareText}>
          📋 复制分享文案
        </button>
      </div>

      {/* 分享卡弹窗 */}
      {showCard && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          overflow: 'auto',
        }}>
          <div style={{ maxHeight: '90vh', overflow: 'auto', padding: 20 }}>
            <ShareCard scores={scores} selectedMovieIds={selectedMovieIds} />
            <button onClick={() => setShowCard(false)} style={{ marginTop: 12, padding: '8px 24px', background: 'transparent', color: '#F5F1EA', border: '1px solid #F5F1EA', borderRadius: 6, cursor: 'pointer', fontFamily: "'Noto Sans SC', sans-serif" }}>
              关闭
            </button>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 40, animationDelay: '0.7s' }} className="animate-fade-up">
        <button className="btn btn-primary" onClick={() => onNext(scores)}>
          查看推荐与职场关联 →
        </button>
      </div>
    </div>
  );
}