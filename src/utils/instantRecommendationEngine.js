import movies from '../data/movies.json';

function deterministicHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const EFFECT_TAGS = {
  relax: ['喜剧', '治愈', '温暖', '日常', '轻松', '动画'],
  cry: ['悲剧', '亲情', '爱情', '告别', '成长', '感动'],
  think: ['悬疑', '推理', '烧脑', '哲学', '反转', '科幻'],
  excite: ['动作', '冒险', '犯罪', '音乐', '喜剧', '节奏'],
  scare: ['恐怖', '惊悚', '心理', '悬疑', '黑暗'],
  strength: ['成长', '希望', '梦想', '女性', '生存', '救赎'],
  surprise: ['荒诞', '奇幻', '非线性叙事', '反转', '黑色幽默', '实验'],
};

const EFFECT_LABELS = {
  relax: '轻松一点', cry: '痛快哭一场', think: '动动脑子', excite: '提提精神',
  scare: '被吓到', strength: '找回力量', surprise: '获得惊喜',
};

const AVOID_TAGS = {
  '太沉重': ['悲剧', '苦难', '绝望', '压抑', '死亡', '创伤'],
  '太吓人': ['恐怖', '惊悚', '噩梦', '令人不适'],
  '血腥暴力': ['暴力', '暴力美学', '血腥', '战争'],
  '慢节奏': ['慢节奏', '极简美学', '沉默', '诗意'],
  '恋爱主线': ['爱情', '浪漫', '婚姻', '暗恋'],
  '开放结局': ['开放结局', '实验', '超现实'],
};

function movieHasTag(movie, wanted) {
  const tags = (movie.tags || []).map((tag) => String(tag).toLowerCase());
  const target = String(wanted).toLowerCase();
  return tags.some((tag) => tag === target || tag.includes(target) || target.includes(tag));
}

function evaluateMovie(movie, selections) {
  const genres = selections.genres || [];
  const effectTags = EFFECT_TAGS[selections.effect] || [];
  const blockedTags = (selections.avoidances || []).flatMap((item) => AVOID_TAGS[item] || []);
  const blockedHits = blockedTags.filter((tag) => movieHasTag(movie, tag));
  const genreHits = genres.filter((genre) => movieHasTag(movie, genre));
  const effectHits = effectTags.filter((tag) => movieHasTag(movie, tag));
  const quality = movie.voteAverage ? Math.min(10, movie.voteAverage) : 7.5;
  const matchScore = Math.max(0, Math.min(99, Math.round(
    38 + genreHits.length * 21 + effectHits.length * 7 + quality - blockedHits.length * 32
  )));
  return { ...movie, matchScore, genreHits, effectHits, blockedHits };
}

function rankDailyCandidates(selections, externalPool = [], excludeIds = []) {
  const unique = new Map([...movies, ...externalPool].map((movie) => [String(movie.id), movie]));
  return [...unique.values()]
    .filter((movie) => !excludeIds.map(String).includes(String(movie.id)))
    .map((movie) => evaluateMovie(movie, selections))
    .filter((movie) => movie.blockedHits.length === 0)
    .sort((a, b) => b.matchScore - a.matchScore || deterministicHash(a.title) - deterministicHash(b.title));
}

function explain(movie, selections, mode) {
  const genreEvidence = movie.genreHits.length ? movie.genreHits.join('、') : (movie.tags || []).slice(0, 1).join('、');
  const effectEvidence = movie.effectHits.slice(0, 2).join('、');
  const timeLabel = selections.session === 'short' ? '控制在短片长范围' : selections.session === 'long' ? '允许长片充分展开' : '适合标准观影时段';
  if (mode === 'window') {
    return `保留你想“${EFFECT_LABELS[selections.effect]}”的核心需求，但用${genreEvidence || '不同类型'}换一个入口；${timeLabel}，并已避开你标记的内容边界。`;
  }
  return `命中你选择的${genreEvidence || '故事方向'}${effectEvidence ? `，同时包含${effectEvidence}` : ''}；${timeLabel}，且没有触发你的避雷项。`;
}

export function getDailyRecommendations(selections, externalPool = [], excludeIds = []) {
  const ranked = rankDailyCandidates(selections, externalPool, excludeIds);
  if (!ranked.length) return null;
  const mirror = ranked[0];
  const selectedGenres = selections.genres || [];
  const windowPool = ranked.filter((movie) =>
    movie.id !== mirror.id
    && movie.effectHits.length > 0
    && selectedGenres.some((genre) => !movieHasTag(movie, genre))
  );
  const windowMovie = windowPool[0] || ranked.find((movie) => movie.id !== mirror.id) || mirror;
  const backup = ranked.find((movie) => movie.id !== mirror.id && movie.id !== windowMovie.id) || mirror;

  return {
    mirror: { movie: mirror, mode: 'mirror', label: '镜子', subtitle: '最大化匹配', text: explain(mirror, selections, 'mirror') },
    window: { movie: windowMovie, mode: 'window', label: '窗户', subtitle: '保留需求，跳出惯性', text: explain(windowMovie, selections, 'window') },
    backup,
    poolSize: ranked.length,
  };
}

export function generateInterpretation(selections, movie, mode = 'mirror') {
  const genres = (selections.genres || []).join(' / ');
  const effect = EFFECT_LABELS[selections.effect] || '获得合适的观影感受';
  const evidence = (movie.genreHits?.length ? movie.genreHits : movie.tags || []).slice(0, 3).join('、');
  const boundary = (selections.avoidances || []).length
    ? `已排除：${selections.avoidances.join('、')}`
    : '你没有设置内容避雷项';
  const modeText = mode === 'window'
    ? `它不是最像你勾选类型的那一部，而是在“${effect}”这一核心需求上成立，给今晚留一点意外。`
    : `它在“${genres}”与“${effect}”两个条件上同时得分最高，是更稳妥的第一选择。`;
  return `${modeText} 匹配依据：${evidence || '综合类型特征'}；${boundary}。推荐是一次可解释的筛选，不是对你情绪的诊断。`;
}
