import { test, expect } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3000';

test.use({
  channel: 'msedge',
  viewport: { width: 1440, height: 900 },
  locale: 'zh-CN',
});

function collectRuntimeSignals(page) {
  const pageErrors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'unknown' });
  });
  return { pageErrors, failedRequests };
}

test('Flow A completes and survives refresh', async ({ page }) => {
  const signals = collectRuntimeSignals(page);
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.getByText('探索你的电影性格').click();
  await expect(page.getByRole('heading', { name: '选出你喜欢的电影' })).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'audit/screenshots/local-flow-a-step1.png', fullPage: true });

  const cards = page.locator('.movie-card');
  await expect(cards).toHaveCount(24);
  for (let index = 0; index < 8; index += 1) await cards.nth(index).click();
  await page.getByRole('button', { name: /确认选择/ }).click();

  await expect(page.getByRole('heading', { name: '你的品味标签' })).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'audit/screenshots/local-flow-a-step2.png', fullPage: true });
  await page.getByRole('button', { name: /确认标签/ }).click();

  await expect(page.getByRole('heading', { name: '你的电影性格画像' })).toBeVisible();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: 'audit/screenshots/local-flow-a-step3.png', fullPage: true });
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: '你的电影性格画像' })).toBeVisible();
  await page.getByRole('button', { name: /查看推荐/ }).click();

  await expect(page.getByRole('heading', { name: '推荐与延伸' })).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'audit/screenshots/local-flow-a-step4.png', fullPage: true });

  const navigation = await page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0];
    return entry ? {
      domContentLoaded: Math.round(entry.domContentLoadedEventEnd),
      load: Math.round(entry.loadEventEnd),
      transferred: entry.transferSize,
    } : null;
  });
  console.log('FLOW_A_AUDIT', JSON.stringify({ ...signals, navigation }));
});

test('Flow B completes and refresh guard works', async ({ page }) => {
  const signals = collectRuntimeSignals(page);
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.getByText('今天该看什么？').click();
  await expect(page.getByRole('heading', { name: '今天，你是什么状态？' })).toBeVisible();

  for (const option of ['平静', '晴天', '单身', '家里窝着']) {
    await page.getByText(option, { exact: true }).click();
  }
  await page.getByRole('button', { name: /看看今天该看什么/ }).click();
  await expect(page.getByRole('heading', { name: '今天的电影' })).toBeVisible();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'audit/screenshots/local-flow-b-result.png', fullPage: true });

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: '今天的电影' })).toBeVisible();
  console.log('FLOW_B_AUDIT', JSON.stringify(signals));
});

test('Mobile home and movie selection fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'audit/screenshots/local-home-mobile.png', fullPage: true });
  await page.getByText('探索你的电影性格').click();
  await expect(page.getByRole('heading', { name: '选出你喜欢的电影' })).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'audit/screenshots/local-flow-a-step1-mobile.png', fullPage: true });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
