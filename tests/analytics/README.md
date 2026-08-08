# Analytics tests

- `event-queue.test.mjs`：不依赖浏览器的埋点队列与版本隔离测试，可运行 `npm run test:analytics`。
- `profile-flow.e2e.cjs`：电影人格画像流程的浏览器验收脚本，运行 `npm run test:e2e:profile`。
- `instant-pick-flow.e2e.cjs`：即时观影推荐流程的浏览器验收脚本，运行 `npm run test:e2e:instant`。

运行 E2E 前先在另一个终端启动 `npm run preview -- --host 127.0.0.1 --port 4176`。测试使用电脑已有的 Microsoft Edge，不下载额外浏览器，也不进入生产构建。
