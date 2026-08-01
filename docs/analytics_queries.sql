-- FilmMirror D1 / SQLite 分析示例
-- 口径：正向反馈 = recommendation_feedback.action = 'want'

-- 1. 渠道访问、激活与分享转化
WITH sessions AS (
  SELECT
    session_id,
    COALESCE(NULLIF(utm_source, ''), 'direct') AS source,
    MAX(event_name = 'result_view') AS activated,
    MAX(event_name = 'share') AS shared,
    MAX(event_name = 'recommendation_feedback' AND json_extract(properties, '$.action') = 'want') AS positive
  FROM events
  GROUP BY session_id, source
)
SELECT
  source,
  COUNT(*) AS visits,
  SUM(activated) AS activations,
  ROUND(100.0 * SUM(activated) / COUNT(*), 1) AS activation_rate_pct,
  ROUND(100.0 * SUM(positive) / NULLIF(SUM(activated), 0), 1) AS positive_rate_pct,
  ROUND(100.0 * SUM(shared) / NULLIF(SUM(activated), 0), 1) AS share_rate_pct
FROM sessions
GROUP BY source
ORDER BY activations DESC;

-- 2. 两条路径漏斗
SELECT
  flow,
  COUNT(DISTINCT CASE WHEN event_name = 'flow_start' THEN session_id END) AS started,
  COUNT(DISTINCT CASE WHEN event_name = 'input_complete' THEN session_id END) AS input_completed,
  COUNT(DISTINCT CASE WHEN event_name = 'result_view' THEN session_id END) AS result_viewed,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN event_name = 'result_view' THEN session_id END)
    / NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'flow_start' THEN session_id END), 0),
    1
  ) AS completion_rate_pct
FROM events
WHERE event_name IN ('flow_start', 'input_complete', 'result_view')
GROUP BY flow;

-- 3. 镜子/窗户推荐正向率
SELECT
  result_mode,
  COUNT(*) AS feedback_count,
  SUM(json_extract(properties, '$.action') = 'want') AS want_count,
  ROUND(100.0 * SUM(json_extract(properties, '$.action') = 'want') / COUNT(*), 1) AS want_rate_pct
FROM events
WHERE event_name = 'recommendation_feedback'
GROUP BY result_mode;

-- 4. 不想看的原因分布
SELECT
  json_extract(properties, '$.reason') AS rejection_reason,
  COUNT(*) AS rejection_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS share_pct
FROM events
WHERE event_name = 'recommendation_feedback'
  AND json_extract(properties, '$.action') = 'dislike'
GROUP BY rejection_reason
ORDER BY rejection_count DESC;

-- 5. 重选次数与最终正向反馈的关系
WITH session_outcomes AS (
  SELECT
    session_id,
    SUM(event_name = 'reroll') AS reroll_count,
    MAX(event_name = 'recommendation_feedback' AND json_extract(properties, '$.action') = 'want') AS positive
  FROM events
  GROUP BY session_id
)
SELECT
  CASE WHEN reroll_count >= 3 THEN '3+' ELSE CAST(reroll_count AS TEXT) END AS reroll_bucket,
  COUNT(*) AS sessions,
  ROUND(100.0 * SUM(positive) / COUNT(*), 1) AS final_positive_rate_pct
FROM session_outcomes
GROUP BY reroll_bucket
ORDER BY reroll_count;

-- 6. 错误对激活的影响
WITH session_health AS (
  SELECT
    session_id,
    MAX(event_name IN ('poster_error', 'api_error')) AS had_error,
    MAX(event_name = 'result_view') AS activated
  FROM events
  GROUP BY session_id
)
SELECT
  had_error,
  COUNT(*) AS sessions,
  ROUND(100.0 * SUM(activated) / COUNT(*), 1) AS activation_rate_pct
FROM session_health
GROUP BY had_error;
