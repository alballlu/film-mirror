const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript(() => {
    window.__filmMirrorEvents = [];
    window.umami = { track(name, properties) { window.__filmMirrorEvents.push({ name, properties }); } };
  });
  await page.route('https://cloud.umami.is/script.js', route => route.fulfill({ status: 200, body: '' }));
  await page.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"test"}' }));
  await page.goto('http://127.0.0.1:4176/?utm_source=qa_a&utm_medium=test&utm_campaign=analytics_v2', { waitUntil: 'domcontentloaded' });
  await page.getByText('探索你的电影性格').click();
  const cards = page.locator('.movie-card');
  for (let i = 0; i < 8; i += 1) await cards.nth(i).click();
  await page.getByRole('button', { name: '确认选择，下一步' }).click();
  await page.getByRole('button', { name: /确认标签，下一步/ }).click();
  await page.getByRole('button', { name: /查看推荐与职场关联/ }).click();
  await page.waitForSelector('.rec-movie-item');
  await page.locator('.rec-movie-item').first().getByRole('button', { name: '＋ 想看', exact: true }).click();
  const events = await page.evaluate(() => window.__filmMirrorEvents);
  const required = ['flow_start','step_complete','input_complete','profile_view','recommendation_view','flow_complete','recommendation_impression','recommendation_feedback'];
  const names = [...new Set(events.map(event => event.name))];
  const missing = required.filter(name => !names.includes(name));
  if (missing.length) throw new Error(`Missing flow A events: ${missing.join(', ')}`);
  const feedback = events.find(event => event.name === 'recommendation_feedback');
  if (feedback.properties.flow !== 'a' || !feedback.properties.movie_id || !feedback.properties.rank) throw new Error('Flow A feedback properties incomplete');
  console.log(JSON.stringify({ names, feedback: feedback.properties }, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
