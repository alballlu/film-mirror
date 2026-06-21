import { useState, useMemo, useEffect, useRef } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  calculatePersonalityScore, getPersonalitySummary,
  getDimensionText, DIMENSIONS,
} from '../utils/personalityEngine';

const DIMENSION_LABELS = {
  '逻辑分析': '逻辑分析',
  '自由探索': '自由探索',
  '情感共鸣': '情感共鸣',
  '美学感知': '美学感知',
  '权威质疑': '权威质疑',
  '内省深度': '内省深度',
};

export default function PersonalityProfile({ tags, onNext, onBack }) {
  const [expanded, setExpanded] = useState(null);
  const [animateChart, setAnimateChart] = useState(false);
  const [shareText, setShareText] = useState('');

  const scores = useMemo(() => calculatePersonalityScore(tags), [tags]);
  const summary = useMemo(() => getPersonalitySummary(scores, tags.map((t) => ({ tag: t }))), [scores, tags]);
  const chartData = useMemo(
    () => DIMENSIONS.map((d) => ({ dimension: DIMENSION_LABELS[d], score: scores[d], full: 100 })),
    [scores]
  );

  useEffect(() => {
    const t = setTimeout(() => setAnimateChart(true), 300);
    return () => clearTimeout(t);
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

  return (
    <div className="page animate-fade-in">
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
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: 'var(--text-secondary)', fontSize: 13, fontFamily: 'var(--sans)' }}
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
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                }}
                formatter={(value) => [`${value}分`, '']}
              />
              <Radar
                name="性格维度"
                dataKey="score"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="rgba(184, 122, 78, 0.2)"
                fillOpacity={0.6}
                animationDuration={animateChart ? 1500 : 0}
                animationBegin={0}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="personality-summary">
          <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--accent)', marginBottom: 12 }}>
            ✦ 性格解读
          </p>
          {summary}
        </div>
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

      {/* Share */}
      <div className="share-actions animate-fade-up" style={{ animationDelay: '0.6s' }}>
        <button className="btn btn-primary" onClick={copyShareText}>
          📋 复制分享文案
        </button>
        <button className="btn btn-secondary" onClick={copyShareText}>
          🔗 复制链接
        </button>
      </div>

      {shareText && (
        <div style={{ marginTop: 16 }} className="animate-fade-up">
          <textarea
            className="share-textarea"
            readOnly
            value={shareText}
            onClick={(e) => e.target.select()}
            rows={4}
          />
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