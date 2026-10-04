import { test, expect, type Page } from '@playwright/test';

const titles = (page: Page) => page.locator('section[data-filter-item]:visible h2');

test('Python shows StockSense and Fuzzy Logic and updates the URL', async ({ page }) => {
  await page.goto('/software');
  const bar = page.getByRole('group', { name: 'Filter by language' });
  await expect(bar.getByRole('button')).toHaveText(['All', 'Python', 'JavaScript', 'TypeScript', 'PHP', 'Java', 'SQL']);
  await bar.getByRole('button', { name: 'Python' }).click();
  await expect(bar.getByRole('button', { name: 'Python' })).toHaveAttribute('aria-pressed', 'true');
  await expect(titles(page)).toHaveText([/^StockSense/, /^Student Performance/]);
  await expect(page).toHaveURL(/\?lang=python$/);
  await bar.getByRole('button', { name: 'All' }).click();
  await expect(titles(page)).toHaveCount(5);
  await expect(page).toHaveURL(/\/software$/);
});

test('TypeScript shows only the Primo Pinnacle website', async ({ page }) => {
  await page.goto('/software?lang=typescript');
  await expect(titles(page)).toHaveText([/^Primo Pinnacle/]);
});

test('Java shows only Fixer', async ({ page }) => {
  await page.goto('/software?lang=java');
  await expect(titles(page)).toHaveText([/^Fixer/]);
});

for (const q of ['?lang=COBOL', '?lang=', '?lang=%20', '?type=python']) {
  test(`bad param ${q} falls back to All`, async ({ page }) => {
    await page.goto(`/software${q}`);
    await expect(titles(page)).toHaveCount(5);
    await expect(page.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });
}

test('param is case-insensitive', async ({ page }) => {
  await page.goto('/software?lang=PyThOn');
  await expect(titles(page)).toHaveCount(2);
});

test('non-matching projects fade out before they are hidden', async ({ page }) => {
  await page.goto('/software');
  const stocksense = page.locator('section#stocksense');
  await expect(page.getByRole('group', { name: 'Filter by language' }).getByRole('button', { name: 'Java', exact: true })).toBeVisible();
  // Straight after the click it is still laid out, running an opacity animation... (The click and the check run in
  // one task, so a busy test machine can't let the 220ms fade finish in between.)
  const fading = await stocksense.evaluate((el: HTMLElement) => {
    document.querySelector<HTMLButtonElement>('[data-filter-option="java"]')!.click();
    return !el.hidden && el.getAnimations().some((a) => a.playState === 'running');
  });
  expect(fading).toBe(true);
  // ...and then it is hidden.
  await expect(stocksense).toBeHidden();
  await expect(titles(page)).toHaveText([/^Fixer/]);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('filtering hides non-matching projects instantly', async ({ page }) => {
    await page.goto('/software');
    await page.getByRole('group', { name: 'Filter by language' }).getByRole('button', { name: 'Java', exact: true }).click();
    expect(await page.locator('section#stocksense').evaluate((el: HTMLElement) => el.hidden && el.getAnimations().length === 0)).toBe(true);
  });
});
