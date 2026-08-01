# FilmMirror 数据事件小白指南

## 先理解三个东西

### Cloudflare 是网站的“房子和后勤”

FilmMirror 的网页放在 Cloudflare Pages；访问 TMDB 的安全代理放在 Cloudflare Functions。以后如果增加 D1，它相当于同一栋房子里的数据库。目前网站运行离不开 Cloudflare，但你不需要每天操作它。

### Umami 是网站的“行为统计表”

用户访问、开始测试、看到结果、点击想看或分享时，网站向 Umami 记一条匿名记录。你登录 Umami 后可以按日期、页面、渠道和事件查看数量。

### 事件就是用户留下的“脚印”

例如一位用户从小红书进入并完成推荐，会依次留下：

`visit → flow_start → input_complete → result_view → recommendation_feedback`

如果 100 人访问，60 人开始，40 人看到结果，那么访问到结果的激活率是 40%。这就是漏斗。

## UTM 是什么

UTM 是加在链接后面的渠道标签，不会改变网页内容。例如：

`https://film-mirror.pages.dev/?utm_source=xhs&utm_medium=social&utm_campaign=coldstart_v1&utm_content=persona_a1`

- `utm_source=xhs`：来自小红书。
- `utm_campaign=coldstart_v1`：属于第一轮冷启动。
- `utm_content=persona_a1`：来自人格内容 A 的第 1 个版本。

FilmMirror 会把这些字段与事件一起交给 Umami，因此可以比较不同渠道带来的用户是否真正完成推荐。

## 当前核心事件

| 事件 | 什么时候记录 | 你能回答的问题 |
|---|---|---|
| `visit` | 每次浏览会话首次进入 | 有多少人访问、来自哪里 |
| `flow_start` | 点击深度画像或今日推荐 | 两条路径谁更受欢迎 |
| `input_complete` | 完成全部必要输入 | 问卷有多少人做完、耗时多久 |
| `result_view` | 结果稳定展示 | 有多少人真正获得结果 |
| `recommendation_feedback` | 点击想看/看过/不想看 | 推荐是否被接受、拒绝原因是什么 |
| `reroll` | 点击“两部都换掉” | 推荐不满意程度和重选轮次 |
| `share` | 复制文案或下载分享卡 | 用户是否愿意传播 |
| `api_error` | TMDB/健康接口失败 | 接口问题是否影响完成率 |
| `poster_error` | 海报搜索或加载失败 | 海报稳定性是否达标 |

## 登录 Umami 后先看什么

1. 选择 FilmMirror 网站和正确日期范围。
2. 在 Events 中确认上述事件开始出现。
3. 建立漏斗：`flow_start → input_complete → result_view`。
4. 用 `flow` 属性比较 `a` 和 `b`。
5. 用 UTM 报告比较 `utm_source` 和 `utm_content`。
6. 数据量少于 30 个有效结果时，只描述现象，不下确定结论。

## 为什么暂时不增加 D1

Umami 足以完成第一轮访问、渠道和漏斗验证。D1 更适合保存每一条推荐反馈明细并做 SQL。先确认核心事件稳定记录，再增加数据库，可以避免同时排查两个系统，也能让你真正理解每一层在做什么。

当前埋点不主动采集姓名、手机号等身份信息；事件只记录产品行为、渠道和必要的推荐上下文。
