import { useState } from 'react';

const MOODS = [
  { key: '低落', emoji: '😔', label: '低落' },
  { key: '焦虑', emoji: '😰', label: '焦虑' },
  { key: '平静', emoji: '🧘', label: '平静' },
  { key: '兴奋', emoji: '🤩', label: '兴奋' },
  { key: '思念', emoji: '🥺', label: '思念' },
  { key: '无聊', emoji: '😑', label: '无聊' },
  { key: '想哭', emoji: '😭', label: '想哭' },
  { key: '释然', emoji: '😌', label: '释然' },
];

const WEATHERS = [
  { key: '下雨', emoji: '🌧️', label: '下雨' },
  { key: '晴天', emoji: '☀️', label: '晴天' },
  { key: '阴天', emoji: '☁️', label: '阴天' },
  { key: '大风', emoji: '💨', label: '大风' },
  { key: '下雪', emoji: '❄️', label: '下雪' },
  { key: '闷热', emoji: '🫠', label: '闷热' },
  { key: '月夜', emoji: '🌙', label: '月夜' },
];

const RELATIONSHIPS = [
  { key: '单身', emoji: '🌿', label: '单身' },
  { key: '热恋', emoji: '💕', label: '热恋' },
  { key: '暗恋', emoji: '🫣', label: '暗恋' },
  { key: '吵架了', emoji: '💔', label: '吵架了' },
  { key: '冷战期', emoji: '🧊', label: '冷战期' },
  { key: '刚分手', emoji: '🩹', label: '刚分手' },
  { key: '想念某人', emoji: '🕯️', label: '想念某人' },
  { key: '在暧昧', emoji: '🎭', label: '在暧昧' },
];

const TRAVELS = [
  { key: '海边', emoji: '🏖️', label: '海边' },
  { key: '山里', emoji: '🏔️', label: '山里' },
  { key: '小镇', emoji: '🏘️', label: '小镇' },
  { key: '大城市', emoji: '🏙️', label: '大城市' },
  { key: '公路上', emoji: '🛣️', label: '公路上' },
  { key: '外太空', emoji: '🚀', label: '外太空' },
  { key: '咖啡馆', emoji: '☕', label: '咖啡馆' },
  { key: '家里窝着', emoji: '🛋️', label: '家里窝着' },
];

export default function DailyContext({ onNext, onBack }) {
  const [mood, setMood] = useState(null);
  const [weather, setWeather] = useState(null);
  const [relationship, setRelationship] = useState(null);
  const [travel, setTravel] = useState(null);

  const allSelected = mood && weather && relationship && travel;

  const handleSubmit = () => {
    if (!allSelected) return;
    onNext({ mood, weather, relationship, travel });
  };

  const renderGroup = (title, items, selected, setter) => (
    <div className="context-group animate-fade-up">
      <h3>{title}</h3>
      <div className="context-options">
        {items.map((item) => (
          <div
            key={item.key}
            className={`context-option ${selected === item.key ? 'selected' : ''}`}
            onClick={() => setter(item.key)}
          >
            <span className="emoji">{item.emoji}</span>
            <span className="label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="page animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn-ghost" onClick={onBack}>← 首页</button>
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          <span className="accent-line" />
          今天，你是什么状态？
        </h2>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }} className="animate-fade-up">
        回答 4 个简单的问题，为你安排一部属于今天的电影
      </p>

      {renderGroup('1. 今天心情怎么样？', MOODS, mood, setMood)}
      {renderGroup('2. 外面什么天气？', WEATHERS, weather, setWeather)}
      {renderGroup('3. 你现在的感情状态？', RELATIONSHIPS, relationship, setRelationship)}
      {renderGroup('4. 此刻最想去哪？', TRAVELS, travel, setTravel)}

      <div className="daily-action animate-fade-up" style={{ animationDelay: '0.4s' }}>
        <button
          className="btn btn-primary daily-card-btn"
          disabled={!allSelected}
          onClick={handleSubmit}
        >
          🎴 看看今天该看什么
        </button>
        {!allSelected && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8 }}>
            请完成以上 4 个选择
          </p>
        )}
      </div>
    </div>
  );
}