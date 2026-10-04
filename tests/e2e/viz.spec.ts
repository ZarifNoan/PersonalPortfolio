import { test, expect, type Page } from '@playwright/test';
const titles = (page: Page) => page.locator('section[data-filter-item]:visible h2');

test('3D page shows published projects in order, including JOHEX', async ({ page }) => {
  await page.goto('/3d');
  await expect(titles(page)).toHaveText([
    'Perfume Product Renders',
    'Gobami Product Visualization',
    'Exhibition Booth Designs',
    'Moltech Johor Warehouse',
    'JOHEX Halal Expo',
    'SLICE 2025 – School Leavers Inspiration & Success Initiatives',
  ]);
  await expect(page.locator('section[data-filter-item]').first()).toContainText('Personal Project');
  await expect(page.locator('section[data-filter-item]').nth(1)).toContainText('Personal Project');
  await expect(page.locator('section[data-filter-item]').nth(2)).toContainText('Personal Project');
  await expect(page.locator('section[data-filter-item]').nth(3)).toContainText('Client Project');
  await expect(page.locator('section[data-filter-item]').nth(4)).toContainText('Client Project');
  await expect(page.locator('section[data-filter-item]').nth(5)).toContainText('Client Project');
});

test('category filter', async ({ page }) => {
  await page.goto('/3d');
  const bar = page.getByRole('group', { name: 'Filter by type' });
  await expect(bar.getByRole('button')).toHaveText(['All', 'Architectural Visualization', 'Product Visualization']);
  await bar.getByRole('button', { name: 'Product Visualization' }).click();
  await expect(titles(page)).toHaveText(['Perfume Product Renders', 'Gobami Product Visualization']);
  await expect(page).toHaveURL(/\?type=product-visualization$/);
  await page.goto('/3d?type=nonsense');
  await expect(titles(page)).toHaveCount(6);
});
