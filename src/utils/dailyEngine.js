import movies from '../data/movies.json';
import contextMapping from '../data/contextMapping.json';
import dailyTexts from '../data/dailyTexts.json';

export function getAllContextTags(selections) {
  const tags = [];
  const { mood, weather, relationship, travel } = selections;

  if (mood && contextMapping.mood[mood]) {
    tags.push(...contextMapping.mood[mood]);
  }
  if (weather && contextMapping.weather[weather]) {
    tags.push(...contextMapping.weather[weather]);
  }
  if (relationship && contextMapping.relationship[relationship]) {
    tags.push(...contextMapping.relationship[relationship]);
  }
  if (travel && contextMapping.travel[travel]) {
    tags.push(...contextMapping.travel[travel]);
  }

  return tags;
}

export function findMatchingMovies(contextTags, topN = 5) {
  const scored = movies.map((movie) => {
    const movieTagsLower = movie.tags.map((t) => t.toLowerCase());
    const contextTagsLower = contextTags.map((t) => t.toLowerCase());

    let matches = 0;
    contextTagsLower.forEach((ct) => {
      if (movieTagsLower.some((mt) => mt.includes(ct) || ct.includes(mt))) {
        matches++;
      }
    });

    const matchScore = matches / Math.max(contextTags.length, 1);
    return { ...movie, matchScore };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, topN);
}

export function getDailyRecommendation(selections) {
  const contextTags = getAllContextTags(selections);
  const topMatches = findMatchingMovies(contextTags, 5);

  if (topMatches.length === 0) {
    return { movie: movies[Math.floor(Math.random() * movies.length)], text: '' };
  }

  const picked = topMatches[Math.floor(Math.random() * Math.min(3, topMatches.length))];

  const text = generateDailyText(selections, picked, contextTags);
  return { movie: picked, text, alternates: topMatches.filter((m) => m.id !== picked.id) };
}

export function generateDailyText(selections, movie, contextTags) {
  const { mood, weather, relationship, travel } = selections;
  const templates = dailyTexts.templates;
  const fallbacks = dailyTexts.fallbacks;

  const tag = contextTags[0] || movie.tags[0] || '电影';
  const director = movie.director || '导演';

  const replace = (str) =>
    str
      .replace(/\{movieName\}/g, `《${movie.title}》`)
      .replace(/\{director\}/g, director)
      .replace(/\{tag\}/g, tag);

  const combos = [
    `${mood}+${weather}+${relationship}+${travel}`,
    `${mood}+${weather}+${relationship}`,
    `${mood}+${weather}+${travel}`,
    `${mood}+${weather}`,
    `${mood}+${relationship}`,
    `${weather}+${relationship}`,
    `${weather}+${travel}`,
    `${relationship}+${travel}`,
    mood,
    weather,
    relationship,
    travel,
  ];

  for (const combo of combos) {
    if (templates[combo]) {
      return replace(templates[combo]);
    }
  }

  const fallbackKeys = ['mood', 'weather', 'relationship', 'travel'];
  for (const key of fallbackKeys) {
    const val = selections[key];
    if (val && fallbacks[key] && fallbacks[key][val]) {
      return replace(fallbacks[key][val]);
    }
  }

  return replace(fallbacks.generic);
}

export function generateInterpretation(selections, movie) {
  const { mood, weather, relationship, travel } = selections;
  const moodMap = {
    '低落': '今天的心情像被罩了一层薄雾',
    '焦虑': '今天的心跳有点快',
    '平静': '今天的你像一潭安静的湖水',
    '兴奋': '今天的能量满到溢出来',
    '思念': '今天有些人在记忆里格外清晰',
    '无聊': '今天的时间好像特别稠',
    '想哭': '今天需要一个出口',
    '释然': '今天的肩头终于轻了',
  };
  const weatherMap = {
    '下雨': '窗外的雨还在下',
    '晴天': '阳光把一切都照得清清楚楚',
    '阴天': '灰色的天空好像一张空白的画布',
    '大风': '风声呼啸',
    '下雪': '雪落的声音让世界都安静了',
    '闷热': '空气里有种南方的黏稠感',
    '月夜': '月光洒进来',
  };
  const relationshipMap = {
    '单身': '一个人也有一个人的完整',
    '热恋': '心里装着一个人，看什么都带着光',
    '暗恋': '有些话还没说出口',
    '吵架了': '刚吵完架的心还在嗡嗡响',
    '冷战期': '沉默比任何语言都响亮',
    '刚分手': '结束之后，还在适应一个人的节奏',
    '想念某人': '有个人在很远的地方',
    '在暧昧': '在不确定里漂浮着',
  };
  const travelMap = {
    '海边': '虽然身体不在海边，但心早飞过去了',
    '山里': '山在远处，安静在近处',
    '小镇': '想逃离城市的速度',
    '大城市': '在霓虹中寻找自己的角落',
    '公路上': '想一脚油门开到地平线',
    '外太空': '想从地球的尺度看自己',
    '咖啡馆': '想坐在窗边观察这个世界',
    '家里窝着': '沙发和毯子就是今天的宇宙',
  };

  const moodLine = moodMap[mood] || '今天有今天的感受';
  const weatherLine = weatherMap[weather] || '';
  const relLine = relationshipMap[relationship] || '';
  const travelLine = travelMap[travel] || '';

  const parts = [moodLine, weatherLine, relLine, travelLine].filter(Boolean);
  const context = parts.slice(0, 3).join('，');

  const interpretations = [
    `${context}。这样的日子，${movie.director || '导演'}的《${movie.title}》好像一直在等你——${movie.tags.slice(0, 2).join('和')}的叙事刚好匹配你今天的频率。一部好的电影不会改变天气，但会改变你看天气的方式。`,
    `${context}。而《${movie.title}》恰好是一部门槛很低的电影——不需要准备什么，带上一颗愿意被故事带走的心就够了。${movie.tags.slice(0, 2).join('与')}的碰撞，或许就是你今天需要的那种共鸣。`,
    `${context}。今天推荐的《${movie.title}》不是随便选的——它和你此刻的状态有一种奇妙的呼应。电影里${movie.tags.slice(0, 2).join('和')}的主题，会让今晚变得不一样。`,
    `${context}。把今晚交给《${movie.title}》吧。${movie.director || '导演'}的世界里，${movie.tags[0] || '电影'}不只是一种类型，更是一种情绪——恰好是你今天随身携带的那一种。`,
  ];

  return interpretations[Math.floor(Math.random() * interpretations.length)];
}