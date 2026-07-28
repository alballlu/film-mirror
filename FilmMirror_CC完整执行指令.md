# FilmMirror 分享卡 + Umami 一站式执行指令（Claude Code 一次性执行版）

> **使用说明**：整段复制粘贴给 Claude Code（CC）。它会一次性执行所有 9 个 Step，CC 不应该问问题，直接执行。如果某步报错，先让它报告再继续。
>
> **项目路径**：`C:/Users/lllu/claude code file/film-mirror/`
>
> **当前状态**：`index.html` 已加入 Umami script，**不需要改**。本指令覆盖 8 个文件。

---

## 项目背景（给 Claude 的 context）

FilmMirror 是一个通过选电影测试性格的产品。基于 React + Vite。用户从 172 部电影里选 8-12 部后，根据 tag 共振算出 6 维度分（逻辑分析、自由探索、情感共鸣、美学感知、权威质疑、内省深度），展示雷达图和电影推荐。现在要加：①16 种人格类型的电影梗命名 ②撒花特效 ③分享结果卡（票根风格）④Umami Analytics 追踪 4 个事件。已有 `deterministicHash` 函数（文件第 5-12 行）。

---

## Step 0：安装依赖

```bash
cd "C:/Users/lllu/claude code file/film-mirror"
npm install canvas-confetti html2canvas qrcode.react
```

---

## Step 1：新建 `src/data/personalityNames.json`

完整内容（包含更好的人设宣言）：

```json
{
  "mainNames": {
    "逻辑分析": "烧脑选民",
    "自由探索": "公路片主角",
    "情感共鸣": "深夜场常客",
    "美学感知": "帧帧壁纸党",
    "权威质疑": "反派嘴替",
    "内省深度": "豆瓣标记狂"
  },
  "variants": {
    "逻辑分析_美学感知": "美学烧脑",
    "逻辑分析_自由探索": "浪人烧脑",
    "逻辑分析_情感共鸣": "文艺烧脑",
    "自由探索_美学感知": "公路诗人",
    "自由探索_权威质疑": "反骨游侠",
    "自由探索_情感共鸣": "治愈流浪",
    "情感共鸣_美学感知": "文艺片钉子户",
    "情感共鸣_内省深度": "旧灵魂",
    "情感共鸣_权威质疑": "反叛感性",
    "美学感知_逻辑分析": "结构美学",
    "美学感知_情感共鸣": "温柔构图",
    "美学感知_自由探索": "行吟美学",
    "权威质疑_逻辑分析": "冷峻批判",
    "权威质疑_情感共鸣": "侠义反派",
    "权威质疑_内省深度": "思想刺客",
    "内省深度_美学感知": "影像哲学家",
    "内省深度_权威质疑": "局外观察者",
    "内省深度_情感共鸣": "沉默陪伴者"
  },
  "declarations": {
    "烧脑选民": [
      "凶手还没出场，你已经在写推理",
      "你以为你看的是电影，其实是一个谜题",
      "你的脑子比剧情快三集"
    ],
    "公路片主角": [
      "GPS提示偏离路线，你根本没打算回去",
      "你的目的地永远叫'再说'",
      "行李收拾10分钟，路线规划一整晚"
    ],
    "深夜场常客": [
      "全场最清醒的灵魂，配最晚的夜宵",
      "全场灯黑得越彻底，你越清醒",
      "别人看片头，你哭到片尾的字幕"
    ],
    "帧帧壁纸党": [
      "看完电影截图120张，剧情记住3件事",
      "你看的是构图，不是故事",
      "你出门不是拍电影，是在拍预告片"
    ],
    "反派嘴替": [
      "主角发言你皱眉，反派发言你点头",
      "你替反派说的那句话，其实在梦里说过",
      "每次鼓掌你都在心里给反派鼓掌"
    ],
    "豆瓣标记狂": [
      "想看365部，看过28部，评论5000字",
      "你看电影两小时，写评论一整天",
      "你的标记页就是你的人生简历"
    ]
  },
  "keywords": {
    "逻辑分析": ["推理", "结构", "反转", "秩序"],
    "自由探索": ["公路", "边界", "出走", "自由"],
    "情感共鸣": ["共振", "温柔", "羁绊", "深夜"],
    "美学感知": ["色彩", "构图", "光影", "质感"],
    "权威质疑": ["反叛", "解构", "质疑", "独立"],
    "内省深度": ["独白", "隐喻", "沉默", "内观"]
  },
  "variantKeywords": {
    "美学烧脑": ["结构+光影", "美学推理"],
    "浪人烧脑": ["出走+逻辑", "流浪解谜"],
    "文艺烧脑": ["情感+推理", "心与脑"],
    "公路诗人": ["出走+构图", "路途美学"],
    "反骨游侠": ["出走+反叛", "浪子侠客"],
    "治愈流浪": ["出走+温柔", "温情漫游"],
    "文艺片钉子户": ["温柔+构图", "细腻影像"],
    "旧灵魂": ["共振+独白", "心事深沉"],
    "反叛感性": ["温柔+反叛", "温柔利刃"],
    "结构美学": ["构图+推理", "精密之美"],
    "温柔构图": ["构图+共振", "暖色镜头"],
    "行吟美学": ["构图+出走", "漫游取景"],
    "冷峻批判": ["反叛+推理", "冷眼拆解"],
    "侠义反派": ["反叛+共振", "温柔抗争"],
    "思想刺客": ["反叛+独白", "沉默革命"],
    "影像哲学家": ["独白+构图", "视觉冥想"],
    "局外观察者": ["独白+反叛", "旁观记录"],
    "沉默陪伴者": ["独白+共振", "安静在场"]
  }
}
```

**注意**：declarations 改成数组（每个类型 3 条），CC 在 Step 2 会改成从数组里用 hash 取一条。

---

## Step 2：修改 `src/utils/personalityEngine.js`

### 2.1 在文件顶部（第 3 行后）加 import：

```javascript
import personalityNames from '../data/personalityNames.json';
```

### 2.2 在文件末尾、`export { DIMENSIONS };` 之前加以下函数：

```javascript
export function getPersonalityName(scores) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topDim = sorted[0][0];
  const secondDim = sorted[1][0];

  const mainName = personalityNames.mainNames[topDim];
  const variantKey = `${topDim}_${secondDim}`;
  const variantName = personalityNames.variants[variantKey] || '标准';

  const code = `${topDim.charAt(0)}${secondDim.charAt(0)}-${Math.round(sorted[0][1])}`;

  const declArr = personalityNames.declarations[mainName] || [''];
  const seedVal = deterministicHash(Object.values(scores).join(''));
  const declaration = declArr[seedVal % declArr.length];

  const mainKws = personalityNames.keywords[topDim] || [];
  const variantKws = personalityNames.variantKeywords[variantName] || [];
  const kws = [...mainKws.slice(0, 3), ...variantKws.slice(0, 2)];

  return {
    primary: mainName,
    variant: variantName,
    full: `${mainName}·${variantName}`,
    code,
    declaration,
    keywords: kws,
  };
}

export function resonanceScore(movieTags, userScores) {
  const movieDims = {};
  for (const tag of movieTags) {
    const mapping = tagMapping[tag] || {};
    for (const [dim, weight] of Object.entries(mapping)) {
      movieDims[dim] = (movieDims[dim] || 0) + weight;
    }
  }
  const totalWeight = Object.values(movieDims).reduce((s, w) => s + w, 0) || 1;
  let score = 0;
  for (const [dim, weight] of Object.entries(movieDims)) {
    score += (weight / totalWeight) * (userScores[dim] || 0);
  }
  return score;
}

export function pickSharePosters(userScores, excludeIds, count = 5) {
  const seed = deterministicHash(Object.values(userScores).join(''));
  const candidates = movies
    .filter((m) => !excludeIds.includes(m.id))
    .map((m) => ({ ...m, resonance: resonanceScore(m.tags, userScores) }))
    .sort((a, b) => b.resonance - a.resonance);
  const top30 = candidates.slice(0, 30);
  const result = [];
  const pool = [...top30];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = (seed + i * 7) % pool.length;
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}
```

---

## Step 3：新建 `src/components/ConfettiEffect.jsx`

```jsx
import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function ConfettiEffect({ trigger }) {
  useEffect(() => {
    if (!trigger) return;

    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ['#c9a86c', '#8B6F47', '#D4AF37', '#F5CC7F'];

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors,
    });

    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }
      confetti({
        particleCount: 25,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 25,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
    }, 400);

    return () => clearInterval(interval);
  }, [trigger]);

  return null;
}
```

---

## Step 4：新建 `src/components/ShareCard.jsx`

票根风格 9:16 分享卡，米白纸张底。

```jsx
import { useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import { getPersonalityName, pickSharePosters } from '../utils/personalityEngine';

const SITE_URL = 'https://ualbal0528-stack.github.io/film-mirror/';

export default function ShareCard({ scores, selectedMovieIds, posters }) {
  const cardRef = useRef(null);
  const [saving, setSaving] = useState(false);

  const personality = useMemo(() => getPersonalityName(scores), [scores]);
  const sharePosters = useMemo(
    () => pickSharePosters(scores, selectedMovieIds || [], 5),
    [scores, selectedMovieIds]
  );

  const displayPosters = posters || sharePosters;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    if (window.umami) umami.track('share_card_download');
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#F5F1EA',
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `FilmMirror_${personality.code}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Share card generation failed', e);
    }
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: '#F5F1EA',
          padding: 0,
          overflow: 'hidden',
          fontFamily: "'Noto Serif SC', 'Cormorant Garamond', serif",
          position: 'relative',
        }}
      >
        <div style={{
          background: 'rgba(139,111,71,0.08)',
          padding: '12px 20px',
          borderBottom: '1px solid #D5CFC2',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: '#8B6F47', letterSpacing: 2, fontWeight: 600 }}>
            FilmMirror
          </span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: '#8B6F47', letterSpacing: 3 }}>
            FILM · PERSONALITY
          </span>
        </div>

        <div style={{ padding: '24px 24px 16px 24px' }}>
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#2D2D2D', fontFamily: "'Noto Serif SC', serif" }}>
              {personality.primary}
            </span>
            <span style={{ fontSize: 13, color: '#8B6F47', marginLeft: 6, fontFamily: "'Noto Sans SC', sans-serif" }}>
              ·{personality.variant}
            </span>
          </div>

          <div style={{
            display: 'inline-block',
            fontSize: 12,
            fontFamily: "'SF Mono', 'Menlo', monospace",
            color: '#8B6F47',
            border: '1px solid #D5CFC2',
            borderRadius: 3,
            padding: '2px 8px',
            marginBottom: 16,
          }}>
            {personality.code}
          </div>

          <div style={{
            fontSize: 16,
            color: '#2D2D2D',
            lineHeight: 1.6,
            marginBottom: 16,
            fontStyle: 'italic',
            fontFamily: "'Noto Serif SC', serif",
          }}>
            "{personality.declaration}"
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {personality.keywords.map((kw) => (
              <span key={kw} style={{
                fontSize: 10,
                padding: '3px 8px',
                background: '#FFFFFF',
                color: '#2D2D2D',
                border: '1px solid #D5CFC2',
                borderRadius: 2,
                fontFamily: "'Noto Sans SC', sans-serif",
              }}>
                {kw}
              </span>
            ))}
          </div>

          <div style={{ position: 'absolute', right: 24, top: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ border: '1px solid #2D2D2D', padding: 3, borderRadius: 2 }}>
              <QRCodeSVG value={SITE_URL} size={56} bgColor="#F5F1EA" fgColor="#2D2D2D" level="M" />
            </div>
            <span style={{ fontSize: 8, color: '#8B6F47', marginTop: 2, fontFamily: "'Noto Sans SC', sans-serif" }}>
              扫码测你的
            </span>
          </div>
        </div>

        <div style={{
          margin: '0 24px',
          borderTop: '1px dashed #D5CFC2',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            left: -24,
            top: -5,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#F5F1EA',
            border: '1px dashed #D5CFC2',
          }} />
          <div style={{
            position: 'absolute',
            right: -24,
            top: -5,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#F5F1EA',
            border: '1px dashed #D5CFC2',
          }} />
        </div>

        <div style={{
          padding: '12px 20px 16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          height: 250,
        }}>
          <div style={{ display: 'flex', gap: 4, flex: 1.4 }}>
            {displayPosters[0] && (
              <div style={{ flex: 1.6, overflow: 'hidden', borderRadius: 2, position: 'relative' }}>
                <img src={displayPosters[0].poster || `https://image.tmdb.org/t/p/w300${displayPosters[0].tmdbPosterPath || ''}`} alt={displayPosters[0].title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                <div style={{ position: 'absolute', bottom: 2, left: 4, fontSize: 8, color: '#F5F1EA', fontFamily: "'Noto Sans SC'" }}>{displayPosters[0].title}</div>
              </div>
            )}
            {displayPosters[1] && (
              <div style={{ flex: 1, overflow: 'hidden', borderRadius: 2, position: 'relative' }}>
                <img src={displayPosters[1].poster || `https://image.tmdb.org/t/p/w300${displayPosters[1].tmdbPosterPath || ''}`} alt={displayPosters[1].title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {displayPosters[2] && (
              <div style={{ flex: 0.9, overflow: 'hidden', borderRadius: 2 }}>
                <img src={displayPosters[2].poster || `https://image.tmdb.org/t/p/w300${displayPosters[2].tmdbPosterPath || ''}`} alt={displayPosters[2].title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
              </div>
            )}
            {displayPosters[3] && (
              <div style={{ flex: 1.1, overflow: 'hidden', borderRadius: 2, position: 'relative' }}>
                <img src={displayPosters[3].poster || `https://image.tmdb.org/t/p/w300${displayPosters[3].tmdbPosterPath || ''}`} alt={displayPosters[3].title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
              </div>
            )}
          </div>
          {displayPosters[4] && (
            <div style={{ flex: 0.7, overflow: 'hidden', borderRadius: 2, position: 'relative' }}>
              <img src={displayPosters[4].poster || `https://image.tmdb.org/t/p/w300${displayPosters[4].tmdbPosterPath || ''}`} alt={displayPosters[4].title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
              <div style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 7, color: '#F5F1EA', fontFamily: "'Noto Sans SC'" }}>适合你的电影</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={handleDownload} disabled={saving} style={{ padding: '10px 24px', background: '#2D2D2D', color: '#F5F1EA', borderRadius: 6, fontSize: 14, fontFamily: "'Noto Sans SC', sans-serif", cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? '正在生成...' : '保存分享卡'}
        </button>
      </div>
    </div>
  );
}
```

---

## Step 5：修改 `src/components/PersonalityProfile.jsx`

### 5.1 在文件顶部、import 之后加：

```javascript
import ShareCard from './ShareCard';
import ConfettiEffect from './ConfettiEffect';
import { getPersonalityName } from '../utils/personalityEngine';
```

### 5.2 把 PersonalityProfile 函数签名从：

```javascript
export default function PersonalityProfile({ tags, onNext, onBack }) {
```

改成：

```javascript
export default function PersonalityProfile({ tags, selectedMovieIds, onNext, onBack }) {
```

### 5.3 在组件内、现有 state 声明后加：

```javascript
const [showCard, setShowCard] = useState(false);
const [confettiTrigger, setConfettiTrigger] = useState(false);
const personalityName = useMemo(() => getPersonalityName(scores), [scores]);
```

### 5.4 在 `useEffect(() => { const t = setTimeout(...) ... })` 的那个 useEffect 之后，加一个新的 useEffect：

```javascript
useEffect(() => {
  if (window.umami) umami.track('flow_a_complete');
  setConfettiTrigger(true);
}, []);
```

### 5.5 在 PersonalityProfile 的 return JSX 里，紧挨着关闭 container 之前、底部 navigation 按钮之后，**整个**插入以下一段（替换原来的"分享"区域，原分享 textarea 已经废弃）：

找到包含 `{/* Share */}` 注释或者包含 `shareText` textarea 那段，整个 JSX 块。删除它，在原位置替换为：

```jsx
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
    <ConfettiEffect trigger={confettiTrigger} />
    <div style={{ maxHeight: '90vh', overflow: 'auto', padding: 20 }}>
      <ShareCard scores={scores} selectedMovieIds={selectedMovieIds} />
      <button onClick={() => setShowCard(false)} style={{ marginTop: 12, padding: '8px 24px', background: 'transparent', color: '#F5F1EA', border: '1px solid #F5F1EA', borderRadius: 6, cursor: 'pointer', fontFamily: "'Noto Sans SC', sans-serif" }}>
        关闭
      </button>
    </div>
  </div>
)}
```

⚠️ 注意：`copyShareText` 是组件里原有的函数（之前用来复制分享文案到剪贴板）。如果原本就有，保留。如果原本没有就不传 onClick（按钮就不响应）。

---

## Step 6：修改 `src/App.jsx`

找到 `<PersonalityProfile` 那一行 Route，把：

```jsx
<PersonalityProfile tags={flowAData.tags} onNext={...} onBack={...} />
```

改成：

```jsx
<PersonalityProfile tags={flowAData.tags} selectedMovieIds={flowAData.selectedMovies} onNext={...} onBack={...} />
```

只增加 `selectedMovieIds={flowAData.selectedMovies}` 这一个 prop，其他保留。

---

## Step 7：修改 `src/components/HomePage.jsx`

找到用户点击"探索你的电影性格"的按钮（标题包含「探索」或「性格」文字的 button 或 Link）。

在它的 `onClick` 回调函数（或者外层 onClick）的最开头加一行：

```javascript
if (window.umami) umami.track('flow_a_start');
```

⚠️ 不要写在 useEffect 里，要写在点击事件处理函数里（用户主动点击触发）。

---

## Step 8（已跳过）：`index.html`

✅ **已完成**，不需要再改。

---

## 验证步骤（执行完所有 Step 后必跑）

1. `npm run dev` 启动
2. 进入 `http://localhost:5173/`
3. 走完测试 → 验证：
   - [ ] 完成测试瞬间有撒花特效（持续 3 秒）
   - [ ] 性格解读的宣言不是"你不是在看电影"那种，而是"凶手还没出场..."这种新文案（说明 personalityNames.json 替换成功了）
   - [ ] "🎫 生成分享卡"按钮出现
   - [ ] 点 "🎫 生成分享卡" 弹出 9:16 米白票根风格卡片
   - [ ] 卡片上有 type name、CODE、宣言、关键词、QR code、5 张海报
   - [ ] "保存分享卡"按钮能下载 PNG
4. 部署到 GitHub Pages 后等 5 分钟，检查 Umami 后台 → Websites → FilmMirror → 是否出现 1 个 Visitor / 1 个 View → 说明事件追踪成功

---

## 面试叙事模板（执行完成后给你用）

> **FilmMirror 电影性格投射** | 产品从0到1
> - 定义北极星指标为「分享转化率」，Phase 1 目标完成率≥40%，Phase 2 目标分享率≥15%
> - 设计电影票根风格 9:16 分享结果卡（html2canvas 生成 PNG + QR code 传播闭环），隐私优先设计：分享卡只展示类型名+宣言+关键词，不暴露维度分值
> - 搭建 16 类型电影梗命名体系（烧脑选民/公路片主角/反派嘴替等），基于 6 维度+变体组合自动生成，每类型 3 条宣言基于用户分值 hash 选出，确保独特性
> - 接入 Umami Analytics 追踪完成率与分享率，优先选择 GDPR 合规方案而非 Google Analytics
> - 用 canvas-confetti 实现完成测试撒花特效，提升分享情感驱动力

**完成了告诉我，我帮你更新简历里 FilmMirror 部分的措辞。**
