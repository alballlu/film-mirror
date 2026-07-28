# FilmMirror Bug Fix — Claude Code 执行指令

> 逐文件、逐行级别改动。每条标注了旧代码和新代码，直接替换即可。
> 不需要理解业务逻辑，纯机械替换。不要改动任何未列出的代码。

---

## Step 1：修复 CSS 变量（PersonalityProfile.jsx）

文件：`src/components/PersonalityProfile.jsx`

以下 5 处变量名不存在于 `:root` 定义中，导致雷达图网格线不可见、标签文字不显示、颜色 fallback 到浏览器默认值。

**1a. 第 78 行 — PolarGrid stroke**
```
旧：stroke="var(--border)"
新：stroke="var(--border-default)"
```

**1b. 第 80-81 行 — PolarAngleAxis tick（两处同时改）**
```
旧：tick={{ fill: 'var(--text_secondary)', fontSize: 13, fontFamily: 'var(--sans)' }}
新：tick={{ fill: 'var(--text-secondary)', fontSize: 13, fontFamily: 'var(--font-sans)' }}
```
注意：`text_secondary`（下划线）→ `text-secondary`（连字符）；`sans` → `font-sans`

**1c. 第 93 行 — Tooltip border**
```
旧：border: '1px solid var(--border)'
新：border: '1px solid var(--border-default)'
```

**1d. 第 102 行 — Radar stroke**
```
旧：stroke="var(--accent)"
新：stroke="var(--gold)"
```

**1e. 第 114 行 — 性格解读标题 color**
```
旧：color: 'var(--accent)'
新：color: 'var(--gold)'
```

---

## Step 2：修复 CSS 变量（DailyResult.jsx）

文件：`src/components/DailyResult.jsx`

**2a. 第 87 行 — 电影标题 fontFamily**
```
旧：fontFamily: 'var(--serif)'
新：fontFamily: 'var(--font-serif-zh)'
```

**2b. 第 88 行 — 年份 color**
```
旧：color: 'var(--accent)'
新：color: 'var(--gold)'
```

**2c. 第 111 行 — "✦ 今日解读" color**
```
旧：color: 'var(--accent)'
新：color: 'var(--gold)'
```

---

## Step 3：修复雷达图填充色与描边色不一致

文件：`src/components/PersonalityProfile.jsx`

第 103-104 行：`--gold` 是 `#c9a86c` = `rgb(201,168,108)`，但 fill 用了 `rgba(184,122,78)` — 两套颜色打架。

**替换第 104 行**
```
旧：fill="rgba(184, 122, 78, 0.2)"
新：fill="rgba(201, 168, 108, 0.15)"
```
注意：opacity 从 0.2 降到 0.15，因为金色调比棕色更亮，0.2 会显得过重。

---

## Step 4：添加确定性哈希函数

**4a. 文件：`src/utils/personalityEngine.js`**

在文件顶部 import 行之后（第 3 行之后），插入：
```javascript
function deterministicHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
```

**4b. 文件：`src/utils/dailyEngine.js`**

在文件顶部 import 行之后（第 3 行之后），同样插入相同的 `deterministicHash` 函数。

---

## Step 5：消除 Math.random()（personalityEngine.js）

文件：`src/utils/personalityEngine.js`

**5a. 第 64 行 — getPersonalitySummary 模板选择**
```
旧：const idx = Math.floor(Math.random() * templates.length);
新：const idx = deterministicHash(topDim + topTag1 + topTag2) % templates.length;
```

**5b. 第 116 行 — getCareerAdvice intro 选择**
```
旧：const intro = intros[Math.floor(Math.random() * intros.length)];
新：const intro = intros[deterministicHash(primaryDim + secondaryDim) % intros.length];
```

---

## Step 6：消除 Math.random()（dailyEngine.js）

文件：`src/utils/dailyEngine.js`

**6a. 第 182 行 — generateInterpretation 模板选择**
```
旧：return interpretations[Math.floor(Math.random() * interpretations.length)];
新：return interpretations[deterministicHash(context + movie.title) % interpretations.length];
```

---

## Step 7：修复每日推荐多样性（dailyEngine.js）

问题根因：`findMatchingMovies` 只返回 top 5，加权随机永远从同一个 pool 选。导致"换一部"还是同一批电影。

**7a. 第 25 行 — 扩大候选池**
```
旧：export function findMatchingMovies(contextTags, topN = 5) {
新：export function findMatchingMovies(contextTags, topN = 20) {
```

**7b. 第 57-77 行 — 整段替换 getDailyRecommendation**

旧代码（第 57-77 行）：
```javascript
export function getDailyRecommendation(selections) {
  const contextTags = getAllContextTags(selections);
  const topMatches = findMatchingMovies(contextTags, 5);

  if (topMatches.length === 0) {
    return { movie: movies[Math.floor(Math.random() * movies.length)], text: '' };
  }

  // 带权重的随机选择：高分电影更大概率被选中
  const pool = topMatches.slice(0, Math.min(5, topMatches.length));
  const totalScore = pool.reduce((sum, m) => sum + m.matchScore + 1, 0);
  let rand = Math.random() * totalScore;
  let picked = pool[0];
  for (const m of pool) {
    rand -= (m.matchScore + 1);
    if (rand <= 0) { picked = m; break; }
  }

  const text = generateDailyText(selections, picked, contextTags);
  return { movie: picked, text, alternates: topMatches.filter((m) => m.id !== picked.id) };
}
```

新代码：
```javascript
export function getDailyRecommendation(selections, excludeIds = []) {
  const contextTags = getAllContextTags(selections);
  const topMatches = findMatchingMovies(contextTags, 20)
    .filter((m) => !excludeIds.includes(m.id));

  if (topMatches.length === 0) {
    return { movie: movies[0], text: '' };
  }

  // 确定性选择：用心情组合做 hash，从 top10 池中取一部
  const pool = topMatches.slice(0, Math.min(10, topMatches.length));
  const hashKey = `${selections.mood || ''}${selections.weather || ''}${selections.relationship || ''}${selections.travel || ''}${excludeIds.length}`;
  const idx = deterministicHash(hashKey) % pool.length;
  const picked = pool[idx];

  const text = generateDailyText(selections, picked, contextTags);
  return { movie: picked, text, alternates: topMatches.filter((m) => m.id !== picked.id) };
}
```

关键变化：
- `excludeIds` 参数让"换一部"跳过已推荐的
- 候选池从 5 扩到 20 → top10
- 确定性 hash 替代 Math.random 加权随机
- 空 fallback 用 `movies[0]` 替代 `Math.random()`

---

## Step 8：修复"换一部"按钮（DailyResult.jsx）

文件：`src/components/DailyResult.jsx`

当前 handleReroll 每次都从头计算，排除列表为空，所以永远从同一 pool 选。

**8a. 添加 excludeIds state — 在第 22 行 `const [rerollKey, setRerollKey]` 之后插入**
```javascript
const [excludedIds, setExcludedIds] = useState([]);
```

**8b. 第 31-37 行 — 替换 handleReroll**
```
旧：
  const handleReroll = () => {
    setFlipped(false);
    setTimeout(() => {
      setResult(getDailyRecommendation(data));
      setRerollKey((k) => k + 1);
    }, 400);
  };

新：
  const handleReroll = () => {
    setFlipped(false);
    setTimeout(() => {
      const newExcluded = [...excludedIds, result.movie.id];
      setExcludedIds(newExcluded);
      setResult(getDailyRecommendation(data, newExcluded));
      setRerollKey((k) => k + 1);
    }, 400);
  };
```

---

## Step 9：扩大 contextMapping tag 覆盖面

文件：`src/data/contextMapping.json`

当前部分分类只有 2-3 个 tag，导致匹配范围极窄。以下每个分类至少扩充到 6 个 tag。

**替换整个文件内容为：**
```json
{
  "mood": {
    "低落": ["治愈", "温情", "温暖", "陪伴", "希望", "励志", "成长", "自我发现"],
    "焦虑": ["烧脑", "紧张", "悬疑", "反转", "心理", "压抑", "犯罪", "惊悚"],
    "平静": ["慢节奏", "内省", "诗意", "留白", "极简", "慢生活", "自然", "日常"],
    "兴奋": ["冒险", "视觉震撼", "动作", "探索", "刺激", "科幻", "热血", "冒险"],
    "思念": ["回忆", "书信", "怀旧", "暗恋", "错过", "爱情", "远方", "离别"],
    "无聊": ["反转", "冒险", "悬疑", "荒诞", "黑色幽默", "烧脑", "奇幻", "创意"],
    "想哭": ["催泪", "告别", "温情", "忧伤", "悲剧", "失去", "亲情", "牺牲"],
    "释然": ["治愈", "成长", "自由", "希望", "旅程", "释怀", "内省", "温暖"]
  },
  "weather": {
    "下雨": ["雨天", "内省", "水", "诗意", "忧郁", "孤独", "回忆", "温暖"],
    "晴天": ["青春", "温暖", "夏天", "成长", "希望", "冒险", "自由", "活力"],
    "阴天": ["内省", "忧郁", "沉默", "孤独", "心理", "压抑", "悬疑", "留白"],
    "大风": ["自由", "冒险", "压抑", "逃亡", "冒险", "反叛", "公路", "流浪"],
    "下雪": ["冬天", "孤独", "极简", "自然", "诗意", "温暖", "童年", "纯真"],
    "闷热": ["压抑", "欲望", "暧昧", "情绪", "犯罪", "悬疑", "心理", "纠缠"],
    "月夜": ["夜晚", "孤独", "夜景", "梦境", "深夜", "诗意", "内省", "神秘"]
  },
  "relationship": {
    "单身": ["自我发现", "内省", "成长", "自由", "孤独", "独立", "冒险", "日常"],
    "热恋": ["爱情", "浪漫", "青春", "陪伴", "温暖", "甜蜜", "喜剧", "成长"],
    "暗恋": ["暗恋", "暧昧", "克制", "暗流", "错过", "青春", "校园", "书信"],
    "吵架了": ["沟通", "争吵", "情绪", "成长", "和解", "爱情", "现实", "家庭"],
    "冷战期": ["沉默", "距离", "克制", "疏离", "心理", "内省", "孤独", "压抑"],
    "刚分手": ["分手", "成长", "告别", "自我发现", "治愈", "独立", "内省", "自由"],
    "想念某人": ["回忆", "怀旧", "思念", "爱情", "书信", "远方", "温暖", "离别"],
    "在暧昧": ["暧昧", "欲望", "青春", "试探", "暗流", "浪漫", "克制", "心动"]
  },
  "travel": {
    "海边": ["海洋", "自由", "孤独", "治愈", "诗意", "夏天", "青春", "冒险"],
    "山里": ["自然", "村庄", "逃避", "内省", "极简", "禅意", "孤独", "治愈"],
    "小镇": ["小镇", "怀旧", "慢生活", "日常", "温暖", "诗意", "青春", "成长"],
    "大城市": ["都市", "霓虹", "欲望", "孤独", "野心", "现实", "犯罪", "夜晚"],
    "公路上": ["公路", "自由", "逃离", "流浪", "冒险", "成长", "旅途", "反叛"],
    "外太空": ["太空", "孤独", "宏大叙事", "科幻", "探索", "哲学", "未来", "视觉震撼"],
    "咖啡馆": ["对话", "日常", "城市", "慢节奏", "诗意", "内省", "爱情", "温暖"],
    "家里窝着": ["治愈", "温暖", "日常", "成长", "内省", "亲情", "童年", "留白"]
  }
}
```

---

## 执行确认

改完后跑 `npm run dev` 看效果，重点检查：

1. **雷达图**：网格线应该可见（浅金色），维度标签文字应该显示，描边和填充都是金色系
2. **结果页**：电影标题用衬线体，年份和解读标题用金色
3. **性格解读稳定性**：选同一组电影，两次结果应该完全一样
4. **每日推荐多样性**：同一个心情组合连续点"换一部" 3 次，应该出现 3 部不同的电影
5. **推荐理由稳定性**：同一个心情组合，两次解读文案应该一样

如果以上全部正常，这些 Bug 就修完了。
