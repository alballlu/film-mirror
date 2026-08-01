import movies from '../data/movies.json';
import tagMapping from '../data/tagMapping.json';
import personalityTexts from '../data/personalityTexts.json';
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

export function getPersonalitySummary(scores, topTags) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topDim = sorted[0][0];
  const topTag1 = topTags[0]?.tag || '悬疑';
  const topTag2 = topTags[1]?.tag || '心理';

  const templates = personalityTexts.summaries;
  const idx = deterministicHash(topDim + topTag1 + topTag2) % templates.length;
  let text = templates[idx];
  text = text.replace(/\{topDim\}/g, topDim);
  text = text.replace(/\{topTag1\}/g, topTag1);
  text = text.replace(/\{topTag2\}/g, topTag2);

  return text;
}

export function getDimensionText(dimension, score) {
  const dimTexts = personalityTexts.dimensions[dimension];
  if (!dimTexts) return '';
  if (score >= 70) return dimTexts.high;
  if (score >= 45) return dimTexts.mid;
  return dimTexts.low;
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

export function getCareerAdvice(scores) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topDims = sorted.slice(0, 3).map(([dim]) => dim);

  const allCareers = new Set();
  topDims.forEach((dim) => {
    const careers = personalityTexts.careerMapping[dim] || [];
    careers.forEach((c) => allCareers.add(c));
  });

  const careerList = Array.from(allCareers).slice(0, 8);
  const primaryDim = topDims[0];
  const secondaryDim = topDims[1];

  const intros = [
    `从你喜欢的电影来看，你的性格中'${primaryDim}'倾向最为突出，同时'${secondaryDim}'也不甘示弱——这种组合挺有意思的。`,
    `你选电影的方式透露了你是一个'${primaryDim}型'的人，但别忘了还有'${secondaryDim}'在一旁悄悄发光。`,
    `${primaryDim}是你在电影里一直寻找的东西，但${secondaryDim}同样在你的精神世界里扮演着重要的角色。`,
  ];

  const intro = intros[deterministicHash(primaryDim + secondaryDim) % intros.length];

  return { topDims, careerList, intro };
}

export function getPersonalityName(scores) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topDim = sorted[0][0];
  const secondDim = sorted[1][0];

  const mainName = personalityNames.mainNames[topDim];
  const variantKey = `${topDim}_${secondDim}`;
  const hasExactVariant = variantKey in personalityNames.variants;
  const variantName = personalityNames.variants[variantKey] || mainName;

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
