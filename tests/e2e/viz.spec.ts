import { test, expect, type Page } from '@playwright/test';
const titles = (page: Page) => page.locator('section[data-filter-item]:visible h2');

test('3D page shows published projects in order, including JOHEX', async ({ page }) => {
  await page.goto('/3d');
  await expect(titles(page)).toHaveText([
    'Moltech Johor Warehouse',
    'SLICE 2025 – School Leavers Inspiration & Success Initiatives',
    'JOHEX Halal Expo',
    'Gobami Product Visualization',
    'Exhibition Booth Designs',
    'Perfume Product Renders',
  ]);
  await expect(page.locator('section[data-filter-item]').first()).toContainText('Client Project');
  await expect(page.locator('section[data-filter-item]').nth(1)).toContainText('Client Project');
  await expect(page.locator('section[data-filter-item]').nth(2)).toContainText('Client Project');
  await expect(page.locator('section[data-filter-item]').nth(3)).toContainText('Personal Project');
  await expect(page.locator('section[data-filter-item]').nth(4)).toContainText('Personal Project');
  await expect(page.locator('section[data-filter-item]').nth(5)).toContainText('Personal Project');
});

test('category filter', async ({ page }) => {
  await page.goto('/3d');
  const bar = page.getByRole('group', { name: 'Filter by type' });
  await expect(bar.getByRole('button')).toHaveText(['All', 'Architectural Visualization', 'Product Visualization']);
  await bar.getByRole('button', { name: 'Product Visualization' }).click();
  await expect(titles(page)).toHaveText(['Gobami Product Visualization', 'Perfume Product Renders']);
  await expect(page).toHaveURL(/\?type=product-visualization$/);
  await page.goto('/3d?type=nonsense');
  await expect(titles(page)).toHaveCount(6);
});
