import { test, expect } from '@playwright/test';

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('reveal is disabled and off-screen sections are visible immediately', async ({ page }) => {
    await page.goto('/software');
    const hasRevealOn = await page.evaluate(() => document.documentElement.classList.contains('reveal-on'));
    expect(hasRevealOn).toBe(false);
    const target = page.locator('[data-reveal]').last();
    await expect(target).toHaveCSS('opacity', '1');
  });
});

test.describe('no-preference motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('reveal is enabled and off-screen sections fade in on scroll', async ({ page }) => {
    await page.goto('/software');
    const hasRevealOn = await page.evaluate(() => document.documentElement.classList.contains('reveal-on'));
    expect(hasRevealOn).toBe(true);
    const target = page.locator('[data-reveal]').last();
    await expect(target).toHaveCSS('opacity', '0');
    await target.scrollIntoViewIfNeeded();
    await expect(target).toHaveCSS('opacity', '1');
  });
});
