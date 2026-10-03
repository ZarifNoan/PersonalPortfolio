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
