import { test, expect } from '@playwright/test';

test('desktop uses travelling 3D badge, and the canvas does not block clicks', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('[data-badge-mode="3d-travel"] canvas')).toBeAttached({ timeout: 15_000 });
  // The canvas is hidden from assistive tech; the name stays as real text outside that subtree.
  await expect(page.locator('[data-badge-mode="3d-travel"] [aria-hidden="true"] canvas')).toBeAttached();
  await expect(page.locator('[data-badge-mode="3d-travel"] > .visually-hidden')).toHaveText(/Muhammad Zarif Nurhan/);
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

test('the card captures pointer events but the pick-a-side halves around it stay clickable', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/');
  await expect(page.locator('[data-badge-mode="3d-travel"] canvas')).toBeAttached({ timeout: 15_000 });
  // Static badge is replaced once the physics scene is ready.
  await expect(page.locator('[data-badge-mode="3d-travel"] .badge-static')).toHaveCount(0, { timeout: 15_000 });
  await page.evaluate(() => document.querySelector('[data-split]')!.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(2500); // let the travel finish and the swing settle
  const at = await page.evaluate(() => {
    const divider = document.querySelector('[data-badge-anchor="split"]')!.getBoundingClientRect();
    const split = document.querySelector('[data-split]')!.getBoundingClientRect();
    return { divX: divider.left, splitTop: split.top, splitH: split.height, vh: innerHeight };
  });
  const { badgeAnchor, hangPx } = await import('../../src/components/badge/anchor');
  const hang = hangPx(at.vh);
  const a = badgeAnchor({ heroX: at.divX, splitX: at.divX, splitTop: at.splitTop, splitHeight: at.splitH, viewportH: at.vh, hang });
  // Resting card centre is on the divider line; aim 40px right of it so the point is over the /3d link, not the 1px divider.
  const card = { x: at.divX + 40, y: a.y + hang };
  expect(card.y).toBeGreaterThan(at.splitTop); // the card is over the split section, i.e. over the links

  await page.mouse.move(card.x - 10, card.y - 10);
  await page.mouse.click(card.x, card.y);
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(/\/$/);

  // A drag from the card must not leave it stuck in the grabbing state.
  await page.mouse.move(card.x, card.y);
  await page.mouse.down();
  await page.mouse.move(card.x + 60, card.y + 40, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => document.body.style.cursor)).not.toBe('grabbing');

  // Well away from the card, inside the left half: navigates.
  await page.mouse.click(Math.max(40, at.divX - 500), at.splitTop + at.splitH / 2);
  await expect(page).toHaveURL(/\/software$/);
});
