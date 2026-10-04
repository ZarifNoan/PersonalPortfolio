import { test, expect } from '@playwright/test';
test.use({ javaScriptEnabled: false });

test('all content is visible without JavaScript', async ({ page }) => {
  await page.goto('/software?lang=python');
  await expect(page.locator('section[data-filter-item]:visible')).toHaveCount(4);
  await expect(page.locator('[data-filter-group]')).toBeHidden();
  await page.goto('/3d');
  await expect(page.locator('section[data-filter-item]:visible')).toHaveCount(3);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'About me' })).toBeVisible();
  await expect(page.locator('[data-badge-slot]')).toContainText('MZN');
});

test('detail pages are fully readable without JavaScript', async ({ page }) => {
  await page.goto('/software/jomlah');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Team' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'About the project' }).locator('p').first()).toBeVisible();
  for (const img of await page.locator('.shots img').all()) { await img.scrollIntoViewIfNeeded(); await expect(img).toBeVisible(); }
  // Without JS a screenshot link opens the full-size image.
  await expect(page.locator('.shots a').first()).toHaveAttribute('href', /\.webp$/);
  await page.goto('/3d/moltech-johor-warehouse');
  await expect(page.locator('.about p').first()).toBeVisible();
  await expect(page.locator('.mosaic img')).toHaveCount(5);
  for (const img of await page.locator('.mosaic img').all()) { await img.scrollIntoViewIfNeeded(); await expect(img).toBeVisible(); }
});

test('mobile nav links are visible without JavaScript', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const t of ['Home', 'Software Development', '3D Visualization']) await expect(nav.getByRole('link', { name: t })).toBeVisible();
});
