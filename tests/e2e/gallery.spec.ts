import { test, expect } from '@playwright/test';

test('software page lists four projects in order with descriptions visible', async ({ page }) => {
  await page.goto('/software');
  const titles = page.locator('section[data-filter-item] h2');
  await expect(titles).toHaveText([
    'StockSense – AI Inventory Prediction System',
    'JomLah – Centralized Event Management Platform',
    'Student Performance Prediction using Fuzzy Logic',
    'Fixer – On-Demand Home Repair Service App',
  ]);
  await expect(page.locator('section[data-filter-item]').first()).toContainText('LSTM model');
});

test('thumbnail swaps the main image without changing its box height', async ({ page }) => {
  await page.goto('/software');
  const section = page.locator('section[data-filter-item]').first();
  const thumbs = section.locator('a[data-thumb]');
  test.skip((await thumbs.count()) < 2, 'needs 2+ images');
  const box = section.locator('[data-main-image]');
  const before = (await box.boundingBox())!.height;
  await thumbs.nth(1).click();
  await expect(section.locator('[data-slide][data-index="1"]')).toBeVisible();
  await expect(section.locator('[data-slide][data-index="0"]')).toBeHidden();
  await expect(thumbs.nth(1)).toHaveAttribute('aria-current', 'true');
  expect((await box.boundingBox())!.height).toBeCloseTo(before, 0);
});

test('single-image projects render no thumbnail strip', async ({ page }) => {
  await page.goto('/software');
  for (const s of await page.locator('section[data-filter-item]').all()) {
    const n = JSON.parse((await s.locator('[data-gallery]').getAttribute('data-gallery'))!).length;
    if (n === 1) await expect(s.locator('[data-thumbs]')).toHaveCount(0);
  }
});
