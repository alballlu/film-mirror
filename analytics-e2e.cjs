const { chromium } = require('playwright');

(async () => {
  const baseUrl = process.env.FILMMIRROR_BASE_URL || 'http://127.0.0.1:4176';
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.addInitScript(() => {
    window.__filmMirrorEvents = [];
    window.umami = {
      track(name, properties) {
        window.__filmMirrorEvents.push({ name, properties });
      },
    };
  });
  await page.route('https://cloud.umami.is/script.js', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: '',
  }));
  await page.route('**/api/**', (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: '{"error":"test fallback"}',
  }));

  await page.goto(`${baseUrl}/?utm_source=qa&utm_medium=test&utm_campaign=analytics_v1`, {
    waitUntil: 'domcontentloaded',
  });
  await page.getByText('今天该看什么？').click();
  await page.getByRole('radio', { name: '想被吓到' }).click();
  await page.getByRole('button', { name: '恐怖' }).click();
  await page.getByRole('button', { name: '悬疑' }).click();
  await page.getByRole('radio', { name: /标准片长/ }).click();
  await page.getByRole('button', { name: /生成“镜子 \/ 窗户”片单/ }).click();
  await page.waitForSelector('.daily-track-card');
  await page.locator('.daily-track-card').nth(0).getByRole('button', { name: '＋ 想看', exact: true }).click();
  await page.getByRole('button', { name: /复制“镜子”分享文案/ }).click();
  await page.getByRole('button', { name: /两部都换掉/ }).click();
  await page.waitForTimeout(900);

  const events = await page.evaluate(() => window.__filmMirrorEvents);
  const eventNames = [...new Set(events.map((event) => event.name))];
  const required = [
    'visit',
    'flow_start',
    'input_complete',
    'step_complete',
    'recommendation_view',
    'flow_complete',
    'recommendation_impression',
    'recommendation_feedback',
    'reroll',
    'share',
    'api_error',
    'poster_error',
  ];
  const missing = required.filter((name) => !eventNames.includes(name));
  if (missing.length) throw new Error(`Missing analytics events: ${missing.join(', ')}`);

  const everyEventHasContext = events.every((event) =>
    event.properties?.app_version === 'p4.0' &&
    event.properties?.analytics_schema === 2 &&
    event.properties?.session_id &&
    event.properties?.utm_source === 'qa'
  );
  if (!everyEventHasContext) throw new Error('Some events are missing analytics v2 context properties');

  const feedbackEvent = events.find((event) => event.name === 'recommendation_feedback');
  if (!feedbackEvent?.properties?.movie_id || !feedbackEvent?.properties?.track) {
    throw new Error('Recommendation feedback is missing movie_id or track');
  }

  console.log(JSON.stringify({ eventNames, events }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
