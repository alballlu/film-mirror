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

export function calculatePersonalityScore(tags) {
  const scores = {};
  DIMENSIONS.forEach((d) => {
    scores[d] = 0;
  });

  let totalContrib = 0;

  tags.forEach((tag) => {
    const mapping = tagMapping[tag];
    if (!mapping) return;
    totalContrib++;
    Object.entries(mapping).forEach(([dim, weight]) => {
      if (scores[dim] !== undefined) {
        scores[dim] += weight;
      }
    });
  });

  if (totalContrib === 0) {
    DIMENSIONS.forEach((d) => (scores[d] = 50));
  } else {
    DIMENSIONS.forEach((d) => {
      const raw = scores[d];
      const normalized = Math.round((raw / Math.max(totalContrib * 0.6, 1)) * 100);
      scores[d] = Math.min(100, Math.max(10, normalized + 15));
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

export function getRecommendations(selectedMovieIds, tags, scores, count = 5) {
  const selectedSet = new Set(selectedMovieIds);
  const candidates = movies.filter((m) => !selectedSet.has(m.id));

  const tagSet = new Set(tags.map((t) => t.tag));
  const scored = candidates.map((movie) => {
    const matchCount = movie.tags.filter((t) => tagSet.has(t)).length;
    const matchScore = matchCount / Math.max(movie.tags.length, 1);
    return { ...movie, matchScore: Math.min(99, Math.round(matchScore * 100)) };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
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

export { DIMENSIONS };