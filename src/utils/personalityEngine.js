import movies from '../data/movies.json';
import tagMapping from '../data/tagMapping.json';
import personalityNames from '../data/personalityNames.json';

function deterministicHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const DIMENSIONS = ['逻辑分析', '自由探索', '情感共鸣', '美学感知', '权威质疑', '内省深度'];

const DIMENSION_COPY = {
  '逻辑分析': {
    high: [
      '你更在意故事怎样成立：线索是否闭合、设定是否自洽、人物选择有没有前因后果。',
      '复杂叙事不会劝退你。相反，你会主动整理信息、比较解释，再决定自己相信哪一种。',
      '你看电影时常在做一件隐形工作：把散落的细节拼成一个可以被验证的判断。',
    ],
    mid: [
      '你愿意分析结构，但不会为了破解谜底牺牲观看感受；逻辑是工具，不是唯一标准。',
      '你既会追问故事是否合理，也允许情绪和氛围保留一些不必解释的空间。',
    ],
    low: [
      '你通常先接收情绪、人物或氛围，再考虑故事是否严丝合缝。',
      '比起拆解机制，你更关心一段故事有没有留下真实的感受。',
    ],
  },
  '自由探索': {
    high: [
      '你对陌生世界、非常规选择和开放结局更有耐心，重复熟悉答案反而容易让你失去兴趣。',
      '你偏爱边界被推开的时刻：新地点、新规则，或人物终于不再照旧生活。',
    ],
    mid: [
      '你愿意尝试新鲜叙事，但仍需要一个能够落脚的结构，不会只为“不同”买单。',
      '你在新鲜感和确定性之间保持平衡：可以绕路，但希望这条路值得。',
    ],
    low: [
      '你更愿意在熟悉框架里看见细微变化，而不是频繁追逐陌生设定。',
      '你看重持续深入胜过不断换方向，稳定并不等于保守。',
    ],
  },
  '情感共鸣': {
    high: [
      '人物之间没有说出口的部分很容易被你捕捉；关系是否真实，比情节是否宏大更重要。',
      '你会记住人物的处境和选择，也愿意暂时站到与自己不同的人那一边。',
    ],
    mid: [
      '你能进入人物情绪，但会保留判断距离，不会因为煽情就自动认同。',
      '情感能打动你，但必须有足够具体的人物和处境作为支撑。',
    ],
    low: [
      '你通常先观察人物为何这样行动，再决定是否投入情绪。',
      '你不是缺少感受，而是不太接受没有铺垫的情绪表达。',
    ],
  },
  '美学感知': {
    high: [
      '色彩、构图、声音和节奏会直接影响你的判断；形式对你来说本身就在表达内容。',
      '你会注意镜头怎样组织信息，而不只是它讲了什么。',
    ],
    mid: [
      '你能识别有辨识度的影像风格，但仍会把人物和故事放在同等重要的位置。',
      '好看的画面会加分，不过只有形式与内容互相支撑时，你才真正买账。',
    ],
    low: [
      '你对形式炫技相对谨慎，更关心故事是否有效、人物是否站得住。',
      '画面可以朴素，但表达不能含糊；内容的完成度比视觉标签更重要。',
    ],
  },
  '权威质疑': {
    high: [
      '当电影把规则当成理所当然时，你会本能地追问：谁制定、谁受益、谁承担代价。',
      '你更容易被揭开系统缝隙的故事吸引，而不是接受一个现成的正确答案。',
    ],
    mid: [
      '你会质疑规则，但也会判断挑战它的成本和证据，不把反叛本身当成结论。',
      '你既不盲从，也不为了反对而反对，更看重理由是否成立。',
    ],
    low: [
      '你更关注人在现有条件下怎样解决问题，而不是先推翻整个框架。',
      '你倾向于从可执行的改进开始，对宏大的对抗叙事相对克制。',
    ],
  },
  '内省深度': {
    high: [
      '你会追踪人物表面行动背后的动机，也愿意和暂时没有答案的问题相处。',
      '身份、记忆、选择和自我解释一类主题会让你停留更久。',
      '你不急着把人物归类，更关心一个人如何形成今天的自己。',
    ],
    mid: [
      '你愿意思考人物动机，但也需要外部事件推动，不会只沉浸在抽象自省里。',
      '你能接受留白，只要影片仍提供足够的行动或关系作为抓手。',
    ],
    low: [
      '你更容易被明确行动和现实冲突吸引，对长时间的自我凝视耐心有限。',
      '比起反复解释内心，你更看重人物最终做了什么。',
    ],
  },
};

const CAREER_PATHS = [
  {
    id: 'product',
    title: '产品与用户策略',
    roles: ['产品经理', '产品运营', '用户研究'],
    dimensions: { '逻辑分析': 0.3, '情感共鸣': 0.2, '内省深度': 0.2, '权威质疑': 0.15, '美学感知': 0.1, '自由探索': 0.05 },
    tags: ['人工智能', '科技', '高概念', '沟通', '伦理', '控制', '社会', '人性'],
    workStyle: '把模糊需求拆成用户、场景与优先级，再用反馈修正方案。',
    experiment: '选一个常用产品，写一页“用户问题—现有方案—改进假设”，找 3 个人验证。',
  },
  {
    id: 'insight',
    title: '数据、商业与行业研究',
    roles: ['数据分析', '商业分析', '行业研究'],
    dimensions: { '逻辑分析': 0.42, '内省深度': 0.23, '权威质疑': 0.18, '自由探索': 0.1, '美学感知': 0.04, '情感共鸣': 0.03 },
    tags: ['悬疑', '推理', '烧脑', '智性', '反转', '结构', '社会', '阶级'],
    workStyle: '从不完整信息中建立假设，区分事实、推断与仍需验证的部分。',
    experiment: '找一份公开数据或行业报告，做一页结论图，并写清数据不能证明什么。',
  },
  {
    id: 'strategy',
    title: '咨询、战略与公共议题',
    roles: ['战略分析', '管理咨询', '政策研究'],
    dimensions: { '权威质疑': 0.32, '逻辑分析': 0.3, '内省深度': 0.2, '情感共鸣': 0.1, '自由探索': 0.05, '美学感知': 0.03 },
    tags: ['体制', '社会', '阶级', '法律', '权威质疑', '贫富差距', '伦理', '人性'],
    workStyle: '同时看规则、利益相关者与执行约束，不只停在观点表达。',
    experiment: '挑一个公共议题，画出利益相关者地图，并为两种立场各写最强论据。',
  },
  {
    id: 'content',
    title: '内容策略与叙事表达',
    roles: ['内容运营', '编辑策划', '品牌内容'],
    dimensions: { '内省深度': 0.28, '情感共鸣': 0.25, '美学感知': 0.22, '逻辑分析': 0.12, '自由探索': 0.08, '权威质疑': 0.05 },
    tags: ['文学', '心理', '人性', '社会', '叙事', '记忆', '女性', '成长'],
    workStyle: '把复杂主题转成受众愿意读完、看完并记住的叙事。',
    experiment: '围绕同一主题分别写一条 50 字标题文案和一份 300 字内容提纲，比较信息损失。',
  },
  {
    id: 'design',
    title: '体验设计与品牌表达',
    roles: ['UX/UI 设计', '品牌策划', '视觉创意'],
    dimensions: { '美学感知': 0.4, '情感共鸣': 0.2, '自由探索': 0.16, '逻辑分析': 0.1, '内省深度': 0.09, '权威质疑': 0.05 },
    tags: ['视觉美学', '美学', '色彩', '摄影', '构图', '极简美学', '东方美学', '赛博朋克'],
    workStyle: '让信息结构、视觉语言和用户感受指向同一个目标。',
    experiment: '重做一个页面：先写信息层级，再做低保真图，最后解释每个视觉选择服务什么目标。',
  },
  {
    id: 'community',
    title: '用户运营与组织协作',
    roles: ['用户运营', '社区运营', '组织发展'],
    dimensions: { '情感共鸣': 0.36, '内省深度': 0.2, '逻辑分析': 0.15, '自由探索': 0.12, '权威质疑': 0.1, '美学感知': 0.07 },
    tags: ['沟通', '友谊', '家庭', '陪伴', '成长', '社会', '人性', '亲情'],
    workStyle: '识别不同人的真实诉求，设计沟通与参与机制，而不是只追求表面热闹。',
    experiment: '为一个 20 人社群设计首次参与、持续贡献和沉默召回三段机制，并设定观察指标。',
  },
  {
    id: 'creative',
    title: '影像与创意项目',
    roles: ['创意策划', '制片运营', '新媒体导演'],
    dimensions: { '自由探索': 0.28, '美学感知': 0.3, '情感共鸣': 0.15, '内省深度': 0.12, '权威质疑': 0.1, '逻辑分析': 0.05 },
    tags: ['电影', '摄影', '视觉美学', '冒险', '音乐', '动画', '超现实', '自由'],
    workStyle: '在主题、资源和表达形式之间做取舍，把想法推进成可交付作品。',
    experiment: '用手机完成一支 30 秒主题短片：限定 5 个镜头，并记录脚本到成片的三次取舍。',
  },
];

const DECLARATION_COPY = {
  '逻辑分析': [
    (first, second) => `你反复选择“${first}”和“${second}”：先找线索，再决定相信什么。`,
    (first) => `“${first}”吸引你的不是谜底，而是答案如何一步步成立。`,
    (first, second) => `面对“${first}”，你会把“${second}”也放进同一张证据表。`,
  ],
  '自由探索': [
    (first, second) => `从“${first}”到“${second}”，你更愿意走一条还没有标准答案的路。`,
    (first) => `你保留“${first}”，因为熟悉的地图之外还有东西值得看。`,
    (first) => `“${first}”对你不是逃离，而是换一个角度重新判断。`,
  ],
  '情感共鸣': [
    (first, second) => `你在“${first}”和“${second}”里记住的，往往是人物没有说出口的部分。`,
    (first) => `“${first}”能留下来，是因为具体的人比漂亮的结论更重要。`,
    (first, second) => `你接受“${first}”的复杂，也愿意为“${second}”多停留一会儿。`,
  ],
  '美学感知': [
    (first, second) => `“${first}”决定你看见什么，“${second}”决定你怎样记住它。`,
    (first) => `对你来说，“${first}”不是装饰，而是故事说话的方式。`,
    (first, second) => `你会记住“${first}”的画面，也会追问“${second}”为何这样呈现。`,
  ],
  '权威质疑': [
    (first, second) => `看到“${first}”和“${second}”，你首先想问的是：规则由谁制定？`,
    (first) => `“${first}”让你警惕那些被包装成理所当然的答案。`,
    (first, second) => `你不会因为“${first}”声量更大，就忽略“${second}”背后的代价。`,
  ],
  '内省深度': [
    (first, second) => `“${first}”和“${second}”让你停留，因为行动背后的动机同样重要。`,
    (first) => `你保留“${first}”，不是为了给人物贴标签，而是想知道他如何走到这里。`,
    (first, second) => `从“${first}”看到“${second}”，你在追踪一个人怎样解释自己。`,
  ],
};

export function extractTags(selectedMovieIds, externalMovies = {}) {
  const tagCount = {};
  selectedMovieIds.forEach((id) => {
    // 本地 movies.json 优先
    const movie = movies.find((m) => m.id === id);
    if (movie) {
      movie.tags.forEach((tag) => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
      return;
    }
    // 外部电影（TMDB）fallback
    const extMovie = externalMovies[id];
    if (extMovie && extMovie.tags) {
      extMovie.tags.forEach((tag) => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    }
  });

  const sorted = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([tag, count]) => ({ tag, count }));

  return sorted;
}

function normalizeActiveTags(tags = []) {
  return tags.map((item) => (typeof item === 'string' ? item : item?.tag)).filter(Boolean);
}

function findSelectedMovie(id, externalMovies = {}) {
  return movies.find((movie) => movie.id === id) || externalMovies[id] || externalMovies[String(id)] || null;
}

/**
 * Build one shared preference profile for radar, naming, recommendations and share cards.
 * Repeated tags matter more than one-off tags, while user-removed tags are excluded.
 */
export function buildPreferenceProfile(selectedMovieIds = [], activeTags = [], externalMovies = {}) {
  const active = normalizeActiveTags(activeTags);
  const activeSet = new Set(active);
  const counts = {};

  selectedMovieIds.forEach((id) => {
    const movie = findSelectedMovie(id, externalMovies);
    movie?.tags?.forEach((tag) => {
      if (activeSet.size === 0 || activeSet.has(tag)) counts[tag] = (counts[tag] || 0) + 1;
    });
  });

  // User-added tags have explicit intent even when they are absent from movie metadata.
  active.forEach((tag) => {
    if (!counts[tag]) counts[tag] = 1;
  });

  return Object.entries(counts)
    .map(([tag, count]) => ({
      tag,
      count,
      // Recurrence boost: core taste signals beat dozens of incidental one-off tags.
      weight: Math.pow(count, 1.45),
      mapped: Boolean(tagMapping[tag]),
    }))
    .sort((a, b) => b.weight - a.weight || b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}

export function calculatePersonalityScore(tags, selectedMovieIds = [], externalMovies = {}) {
  const scores = {};
  DIMENSIONS.forEach((d) => {
    scores[d] = 0;
  });

  const profile = buildPreferenceProfile(selectedMovieIds, tags, externalMovies);
  profile.forEach(({ tag, weight: tagWeight }) => {
    const mapping = tagMapping[tag];
    if (!mapping) return;
    Object.entries(mapping).forEach(([dim, weight]) => {
      if (scores[dim] !== undefined) {
        scores[dim] += weight * tagWeight;
      }
    });
  });

  const topRaw = Math.max(...Object.values(scores));
  if (topRaw === 0) {
    DIMENSIONS.forEach((d) => (scores[d] = 50));
  } else {
    DIMENSIONS.forEach((d) => {
      const relativeStrength = scores[d] / topRaw;
      scores[d] = Math.min(95, Math.max(12, Math.round(18 + 77 * Math.pow(relativeStrength, 1.2))));
    });
  }

  return scores;
}

function getDimensionEvidence(dimension, preferenceTags = []) {
  return preferenceTags
    .map((item) => ({
      ...item,
      contribution: (item.weight || item.count || 1) * (tagMapping[item.tag]?.[dimension] || 0),
    }))
    .filter((item) => item.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3);
}

export function getPersonalityNarrative(scores, preferenceTags = [], selectedCount = 0) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topDim = sorted[0][0];
  const secondDim = sorted[1][0];
  const lowDim = sorted[sorted.length - 1][0];
  const topTags = preferenceTags.slice(0, 3);
  const topTag1 = topTags[0]?.tag || '叙事';
  const topTag2 = topTags[1]?.tag || '人物';
  const evidence = topTags
    .map(({ tag, count }) => `${tag}${count > 1 ? `出现 ${count} 次` : '被你保留'}`)
    .join('，');
  const copyPool = DIMENSION_COPY[topDim]?.high || [];
  const copyIndex = deterministicHash(`${topDim}-${secondDim}-${topTag1}-${topTag2}`) % Math.max(copyPool.length, 1);
  const mainObservation = copyPool[copyIndex] || '';
  const contrastTemplates = [
    `同时，${secondDim}的得分也很突出：你并不是只用一种方式看故事，而是会在两种判断标准之间来回校准。`,
    `${topDim}决定你先注意什么，${secondDim}则影响你最后怎样理解它；两者共同出现，比单独看最高分更有意义。`,
    `你的第二信号是${secondDim}。它让这份结果不只是“${topDim}高”，而是呈现出更具体的观看方式。`,
  ];
  const contrast = contrastTemplates[deterministicHash(`${topTag2}-${secondDim}`) % contrastTemplates.length];
  const boundary = `${lowDim}相对较低，只表示这批选片没有持续强化这一信号，不等于你缺少这种能力。`;
  const countText = selectedCount > 0 ? `在你选择的 ${selectedCount} 部电影里，` : '在这次选择里，';
  const paragraphs = [
    `${countText}${evidence || `${topTag1}和${topTag2}反复出现`}。这是本次画像最直接的依据。`,
    mainObservation,
    `${contrast}${boundary}`,
  ];

  return {
    headline: `${topTag1}不是偶然：你首先在意的是${topDim}`,
    paragraphs,
    shareText: paragraphs.slice(0, 2).join(' '),
  };
}

export function getPersonalitySummary(scores, topTags) {
  return getPersonalityNarrative(scores, topTags).shareText;
}

export function getDimensionText(dimension, score, preferenceTags = []) {
  const level = score >= 70 ? 'high' : score >= 45 ? 'mid' : 'low';
  const pool = DIMENSION_COPY[dimension]?.[level] || [];
  const evidence = getDimensionEvidence(dimension, preferenceTags);
  const evidenceKey = evidence.map((item) => item.tag).join('-');
  const copy = pool[deterministicHash(`${dimension}-${score}-${evidenceKey}`) % Math.max(pool.length, 1)] || '';
  if (evidence.length === 0) return copy;
  return `${copy} 这次主要由${evidence.map((item) => `“${item.tag}”`).join('、')}等选片信号推动。`;
}

function dimensionVector(movieTags) {
  const vector = {};
  DIMENSIONS.forEach((dimension) => { vector[dimension] = 0; });
  movieTags.forEach((tag) => {
    const mapping = tagMapping[tag] || {};
    Object.entries(mapping).forEach(([dimension, weight]) => {
      if (vector[dimension] !== undefined) vector[dimension] += weight;
    });
  });
  return vector;
}

function cosineSimilarity(left, right) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  DIMENSIONS.forEach((dimension) => {
    const a = left[dimension] || 0;
    const b = right[dimension] || 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  });
  if (!leftNorm || !rightNorm) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function getRecommendations(selectedMovieIds, tags, scores, count = 5, externalMovies = {}) {
  const selectedSet = new Set(selectedMovieIds);
  const candidates = movies.filter((m) => !selectedSet.has(m.id));
  const profile = buildPreferenceProfile(selectedMovieIds, tags, externalMovies);
  const tagWeights = new Map(profile.map((item) => [item.tag, item.weight]));
  const anchorTags = new Set(profile.slice(0, 8).map((item) => item.tag));
  const rawUserDimensions = {};
  DIMENSIONS.forEach((dimension) => {
    rawUserDimensions[dimension] = Math.max(0, (scores?.[dimension] || 0) - 12);
  });

  const prelim = candidates.map((movie) => {
    const matchedTags = movie.tags
      .filter((tag) => tagWeights.has(tag))
      .sort((a, b) => tagWeights.get(b) - tagWeights.get(a));
    const tagSignal = matchedTags.reduce((sum, tag) => sum + tagWeights.get(tag), 0);
    const anchorMatches = matchedTags.filter((tag) => anchorTags.has(tag)).length;
    const dimensionSimilarity = cosineSimilarity(rawUserDimensions, dimensionVector(movie.tags));
    return { ...movie, matchedTags, tagSignal, anchorMatches, dimensionSimilarity };
  });

  const maxTagSignal = Math.max(...prelim.map((movie) => movie.tagSignal), 1);
  const scored = prelim.map((movie) => {
    const tagFit = movie.tagSignal / maxTagSignal;
    const anchorFit = Math.min(1, movie.anchorMatches / 2);
    const finalScore = tagFit * 0.68 + movie.dimensionSimilarity * 0.22 + anchorFit * 0.1;
    return {
      ...movie,
      finalScore,
      matchScore: Math.min(96, Math.max(45, Math.round(45 + finalScore * 51))),
      matchReasons: movie.matchedTags.slice(0, 3),
    };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore || b.tagSignal - a.tagSignal || a.id - b.id);
  return scored.slice(0, count);
}

export function getCareerAdvice(scores, preferenceTags = []) {
  const totalPreferenceWeight = preferenceTags.slice(0, 12).reduce((sum, item) => sum + (item.weight || item.count || 1), 0) || 1;
  const ranked = CAREER_PATHS.map((path) => {
    const dimensionFit = Object.entries(path.dimensions).reduce(
      (sum, [dimension, weight]) => sum + ((scores[dimension] || 0) / 100) * weight,
      0
    );
    const tagMatches = preferenceTags
      .filter((item) => path.tags.includes(item.tag))
      .slice(0, 3);
    const tagFit = tagMatches.reduce((sum, item) => sum + (item.weight || item.count || 1), 0) / totalPreferenceWeight;
    return {
      ...path,
      fit: dimensionFit * 0.82 + Math.min(1, tagFit * 2.5) * 0.18,
      tagMatches,
      supportingDimensions: Object.entries(path.dimensions)
        .map(([dimension, weight]) => ({ dimension, contribution: (scores[dimension] || 0) * weight }))
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 2)
        .map((item) => item.dimension),
    };
  }).sort((a, b) => b.fit - a.fit);

  const paths = ranked.slice(0, 3).map((path, index) => ({
    ...path,
    priority: ['优先探索', '值得验证', '保留选项'][index],
    reason: path.tagMatches.length > 0
      ? `${path.supportingDimensions.join('＋')}与“${path.tagMatches.map((item) => item.tag).join('、')}”共同抬高了这一方向。`
      : `${path.supportingDimensions.join('＋')}是这一方向的主要支持信号。`,
  }));

  return {
    intro: `这不是职业判定，而是把观影偏好翻译成工作方式。建议先验证前两条路径，不要因为一个结果立刻排除其他选择。`,
    paths,
  };
}

export function getPersonalityName(scores, preferenceTags = []) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topDim = sorted[0][0];
  const secondDim = sorted[1][0];

  const mainName = personalityNames.mainNames[topDim];
  const variantKey = `${topDim}_${secondDim}`;
  const hasExactVariant = variantKey in personalityNames.variants;
  const variantName = personalityNames.variants[variantKey] || mainName;

  const code = `${topDim.charAt(0)}${secondDim.charAt(0)}-${Math.round(sorted[0][1])}`;

  const seedVal = deterministicHash(`${Object.values(scores).join('')}-${preferenceTags.map((item) => item.tag).join('-')}`);
  const declarationPool = DECLARATION_COPY[topDim] || [];
  const firstTag = preferenceTags[0]?.tag || personalityNames.keywords[topDim]?.[0] || topDim;
  const secondTag = preferenceTags[1]?.tag || personalityNames.keywords[secondDim]?.[0] || secondDim;
  const declarationBuilder = declarationPool[seedVal % Math.max(declarationPool.length, 1)];
  const declaration = declarationBuilder
    ? declarationBuilder(firstTag, secondTag)
    : `${firstTag}和${secondTag}构成了这次结果的主要线索。`;

  const mainKws = personalityNames.keywords[topDim] || [];
  const variantKws = personalityNames.variantKeywords[variantName] || [];
  const evidenceKws = preferenceTags.slice(0, 2).map((item) => item.tag);
  const kws = [...new Set([...evidenceKws, ...mainKws.slice(0, 2), ...variantKws.slice(0, 1)])];

  return {
    primary: mainName,
    variant: variantName,
    isFallback: !hasExactVariant,
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

/**
 * 计算一部电影在特定维度上的强度（score 贡献占比）
 * 返回值越高，说明这部电影在该维度上越"纯粹"/突出
 */
function movieDimensionStrength(movieTags, dimension) {
  let total = 0;
  let dimContrib = 0;
  for (const tag of movieTags) {
    const mapping = tagMapping[tag] || {};
    let tagTotal = 0;
    for (const [_, w] of Object.entries(mapping)) tagTotal += w;
    total += tagTotal;
    dimContrib += mapping[dimension] || 0;
  }
  if (total === 0) return 0;
  return dimContrib / total; // 该维度占电影 tag 权重的比例
}

export function pickSharePosters(userScores, excludeIds, count = 5, activeTags = [], externalMovies = {}) {
  return getRecommendations(excludeIds, activeTags, userScores, count, externalMovies);
}

export { DIMENSIONS };
