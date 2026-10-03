import { test, expect } from '@playwright/test';

test('desktop uses travelling 3D badge, and the canvas does not block clicks', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('[data-badge-mode="3d-travel"] canvas')).toBeAttached({ timeout: 15_000 });
  await page.locator('[data-split]').scrollIntoViewIfNeeded();
  await page.getByRole('link', { name: /3D Visualization/ }).last().click();
  await expect(page).toHaveURL(/\/3d$/);
  expect(errors).toEqual([]);
});

test('reduced motion shows the static badge with the name', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-badge-mode="static"]')).toBeVisible();
  await expect(page.locator('[data-badge-slot]')).toContainText('MUHAMMAD ZARIF NURHAN');
  await expect(page.locator('[data-badge-slot] canvas')).toHaveCount(0);
  await ctx.close();
});

test('no WebGL falls back to the static badge', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error test override
    HTMLCanvasElement.prototype.getContext = function (t: string, ...a: unknown[]) { return /webgl/.test(t) ? null : orig.call(this, t, ...a); };
  });
  await page.goto('/');
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-badge-mode="static"]')).toBeVisible();
});

test('resizing across 900px switches mode without errors', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('[data-badge-mode="3d-travel"]')).toBeAttached({ timeout: 15_000 });
  await page.setViewportSize({ width: 600, height: 900 });
  await expect(page.locator('[data-badge-mode="3d-inline"]')).toBeAttached();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('[data-badge-mode="3d-travel"]')).toBeAttached();
  expect(errors).toEqual([]);
});
