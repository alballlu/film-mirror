import { useMemo, useRef, useState } from 'react';
import { trackEvent } from '../utils/analytics';

const EFFECTS = [
  { key: 'relax', emoji: '🌿', label: '轻松一点' },
  { key: 'cry', emoji: '💧', label: '痛快哭一场' },
  { key: 'think', emoji: '🧩', label: '动动脑子' },
  { key: 'excite', emoji: '⚡', label: '提提精神' },
  { key: 'scare', emoji: '🕯️', label: '想被吓到' },
  { key: 'strength', emoji: '🔥', label: '找回力量' },
  { key: 'surprise', emoji: '🎲', label: '给我惊喜' },
];

const GENRES = ['悬疑', '科幻', '喜剧', '爱情', '恐怖', '动作', '动画', '现实', '犯罪', '惊悚'];

const SESSIONS = [
  { key: 'short', emoji: '⏱️', label: '100 分钟内', hint: '今晚时间有限' },
  { key: 'standard', emoji: '🍿', label: '标准片长', hint: '两小时左右刚好' },
  { key: 'long', emoji: '🎞️', label: '长片也可以', hint: '愿意完整沉进去' },
];

const AVOIDANCES = ['太沉重', '太吓人', '血腥暴力', '慢节奏', '恋爱主线', '开放结局'];

export default function WatchContextForm({ onNext, onBack }) {
  const [effect, setEffect] = useState(null);
  const [genres, setGenres] = useState([]);
  const [session, setSession] = useState(null);
  const [avoidances, setAvoidances] = useState([]);
  const groupRefs = useRef([]);

  const missing = useMemo(() => [
    !effect ? '今晚想获得的感受' : null,
    genres.length === 0 ? '想看的故事类型' : null,
    !session ? '可投入的时间' : null,
  ].filter(Boolean), [effect, genres, session]);

  const toggleGenre = (genre) => {
    setGenres((current) => {
      if (current.includes(genre)) return current.filter((item) => item !== genre);
      return current.length < 2 ? [...current, genre] : current;
    });
  };

  const toggleAvoidance = (item) => {
    setAvoidances((current) => current.includes(item)
      ? current.filter((value) => value !== item)
      : [...current, item]);
  };

  const handleSubmit = () => {
    if (missing.length) {
      trackEvent('validation_error', {
        flow: 'b',
        step: 'context',
        missing_fields: missing,
      });
      const index = !effect ? 0 : genres.length === 0 ? 1 : 2;
      groupRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      groupRefs.current[index]?.focus({ preventScroll: true });
      return;
    }
    onNext({ effect, genres, session, avoidances });
  };

  const renderSingleGroup = (index, title, hint, items, selected, setter) => (
    <section className="context-group animate-fade-up" ref={(node) => { groupRefs.current[index] = node; }} tabIndex={-1}>
      <div className="context-heading"><h3>{title}</h3>{hint && <span>{hint}</span>}</div>
      <div className="context-options" role="radiogroup" aria-label={title}>
        {items.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`context-option ${selected === item.key ? 'selected' : ''}`}
            onClick={() => setter(item.key)}
            role="radio"
            aria-checked={selected === item.key}
          >
            <span className="emoji">{item.emoji}</span>
            <span className="label">{item.label}</span>
            {item.hint && <span className="option-hint">{item.hint}</span>}
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <div className="page daily-context-page animate-fade-in">
      <div className="daily-header-row">
        <button className="btn-ghost" onClick={onBack}>← 首页</button>
        <h2 className="section-title"><span className="accent-line" />今天想看什么？</h2>
      </div>

      <p className="daily-intro animate-fade-up">
        不猜天气，也不问感情状态。用 3 个必答选择和 1 个可选边界，缩小到真正适合今晚的电影。
      </p>

      {renderSingleGroup(0, '1. 今晚想被电影怎样对待？', '选一个最需要的结果', EFFECTS, effect, setEffect)}

      <section className="context-group animate-fade-up" ref={(node) => { groupRefs.current[1] = node; }} tabIndex={-1}>
        <div className="context-heading"><h3>2. 想进入哪类故事？</h3><span>最多选 2 个 · 已选 {genres.length}/2</span></div>
        <div className="context-options compact" role="group" aria-label="想看的故事类型">
          {GENRES.map((genre) => (
            <button
              type="button"
              key={genre}
              className={`context-option text-only ${genres.includes(genre) ? 'selected' : ''}`}
              onClick={() => toggleGenre(genre)}
              aria-pressed={genres.includes(genre)}
              disabled={genres.length >= 2 && !genres.includes(genre)}
            >{genre}</button>
          ))}
        </div>
      </section>

      {renderSingleGroup(2, '3. 今晚能投入多少？', '用时间约束减少“看起来不错但点不开”', SESSIONS, session, setSession)}

      <section className="context-group animate-fade-up">
        <div className="context-heading"><h3>4. 有什么不想碰？</h3><span>可跳过 · 可多选</span></div>
        <div className="context-options compact" role="group" aria-label="不想看的内容">
          {AVOIDANCES.map((item) => (
            <button
              type="button"
              key={item}
              className={`context-option text-only ${avoidances.includes(item) ? 'selected avoid' : ''}`}
              onClick={() => toggleAvoidance(item)}
              aria-pressed={avoidances.includes(item)}
            >{avoidances.includes(item) ? '× ' : ''}{item}</button>
          ))}
        </div>
      </section>

      <div className="daily-action animate-fade-up">
        <button className="btn btn-primary daily-card-btn" onClick={handleSubmit}>
          生成“镜子 / 窗户”片单 →
        </button>
        <p className={`daily-progress-copy ${missing.length ? '' : 'ready'}`} role="status">
          {missing.length ? `还差：${missing.join('、')}` : '信息够了，可以开始推荐'}
        </p>
      </div>
    </div>
  );
}
