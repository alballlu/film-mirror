# FilmMirror 代码结构与命名约定

## 产品术语

| 业务路径 | 推荐名称 | 历史兼容值 |
| --- | --- | --- |
| 电影人格画像 | Profile Journey | `flow=a`、`/flow-a/*` |
| 即时观影推荐 | Instant Pick | `flow=b`、`/flow-b/*` |

历史兼容值只用于路由、会话恢复和 Umami 数据连续性，不用于新组件或新变量命名。

## 主要组件

| 文件 | 职责 |
| --- | --- |
| `PreferenceMoviePicker.jsx` | 选择喜欢的电影 |
| `PreferenceTagReview.jsx` | 查看并确认偏好标签 |
| `MoviePersonalityProfile.jsx` | 生成并解释六维电影人格画像 |
| `ProfileRecommendationResult.jsx` | 展示画像路径的电影推荐 |
| `WatchContextForm.jsx` | 收集即时观影情境 |
| `InstantRecommendationResult.jsx` | 展示即时推荐及反馈操作 |

## 核心逻辑

- `movieProfileEngine.js`：标签提取、六维画像、画像文案和匹配推荐。
- `instantRecommendationEngine.js`：即时推荐候选排序和结果解释。
- `analytics.js`：Umami 事件、去重、队列和版本兼容。
- `tmdb.js`：TMDB 搜索、候选池、海报和接口降级。

## 不可随意修改的兼容项

- Umami 已上线的事件名和属性名。
- `flow` 属性中的 `a`、`b`。
- `/flow-a/*`、`/flow-b/*` 路由。
- `filmmirror_flow_a`、`filmmirror_flow_b` 会话缓存键。

如需调整以上内容，应先保留旧值或增加跳转与数据映射，再观察至少一个发布周期。
