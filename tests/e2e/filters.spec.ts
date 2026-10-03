import { test, expect, type Page } from '@playwright/test';

const titles = (page: Page) => page.locator('section[data-filter-item]:visible h2');

test('Python shows StockSense and Fuzzy Logic and updates the URL', async ({ page }) => {
  await page.goto('/software');
  const bar = page.getByRole('group', { name: 'Filter by language' });
  await expect(bar.getByRole('button')).toHaveText(['All', 'Python', 'JavaScript', 'PHP', 'Java', 'SQL']);
  await bar.getByRole('button', { name: 'Python' }).click();
  await expect(bar.getByRole('button', { name: 'Python' })).toHaveAttribute('aria-pressed', 'true');
  await expect(titles(page)).toHaveText([/^StockSense/, /^Student Performance/]);
  await expect(page).toHaveURL(/\?lang=python$/);
  await bar.getByRole('button', { name: 'All' }).click();
  await expect(titles(page)).toHaveCount(4);
  await expect(page).toHaveURL(/\/software$/);
});

test('Java shows only Fixer', async ({ page }) => {
  await page.goto('/software?lang=java');
  await expect(titles(page)).toHaveText([/^Fixer/]);
});

for (const q of ['?lang=COBOL', '?lang=', '?lang=%20', '?type=python']) {
  test(`bad param ${q} falls back to All`, async ({ page }) => {
    await page.goto(`/software${q}`);
    await expect(titles(page)).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });
}

test('param is case-insensitive', async ({ page }) => {
  await page.goto('/software?lang=PyThOn');
  await expect(titles(page)).toHaveCount(2);
});
