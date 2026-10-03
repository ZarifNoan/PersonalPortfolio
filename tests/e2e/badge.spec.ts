import { test, expect, type Page, type CDPSession } from '@playwright/test';

/**
 * The 3D scene mounts only after a real interaction once the island has hydrated (client:idle). The island's
 * listeners attach in an effect slightly after the ssr attribute goes, so keep nudging the pointer until the gate
 * reports it opened.
 */
async function engage(page: Page) {
  await page.waitForSelector('astro-island:not([ssr]) [data-badge-mode]', { state: 'attached' });
  const gate = page.locator('[data-badge-mode][data-engaged]');
  for (let i = 0; i < 50 && !(await gate.count()); i++) {
    await page.mouse.move(8 + (i % 2) * 4, 8 + (i % 2) * 4);
    await page.waitForTimeout(100);
  }
  await expect(gate).toHaveCount(1);
}

test('before any interaction the static badge is shown and no canvas exists', async ({ page }, info) => {
  await page.goto('/');
  await page.waitForSelector('astro-island:not([ssr]) [data-badge-mode]', { state: 'attached' });
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-badge-mode="static"] .badge-static')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  if (info.project.name === 'desktop') {
    await engage(page);
    await expect(page.locator('[data-badge-mode="3d-travel"] canvas')).toBeAttached({ timeout: 15_000 });
  }
});

test('desktop uses travelling 3D badge, and the canvas does not block clicks', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await engage(page);
  await expect(page.locator('[data-badge-mode="3d-travel"] canvas')).toBeAttached({ timeout: 15_000 });
  // The canvas is hidden from assistive tech; the name stays as real text outside that subtree.
  await expect(page.locator('[data-badge-mode="3d-travel"] [aria-hidden="true"] canvas')).toBeAttached();
  await expect(page.locator('[data-badge-mode="3d-travel"] > .visually-hidden')).toHaveText(/Muhammad Zarif Nurhan.*Computer Science · 3D Visualization/);
  await page.locator('[data-split]').scrollIntoViewIfNeeded();
  await page.getByRole('link', { name: /3D Visualization/ }).last().click();
  await expect(page).toHaveURL(/\/3d$/);
  expect(errors).toEqual([]);
});

test('reduced motion shows the static badge with the name', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await engage(page);
  await page.waitForTimeout(1500);
  // The gate opened (engage asserts data-engaged) and the island still chose static.
  await expect(page.locator('[data-badge-mode="static"][data-engaged]')).toBeVisible();
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
  await engage(page);
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-badge-mode="static"][data-engaged]')).toBeVisible();
});

test('resizing across 900px switches mode without errors', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await engage(page);
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
  await engage(page);
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

test('scrolling the card away from a stationary pointer releases the canvas capture', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/');
  await engage(page);
  await expect(page.locator('[data-badge-mode="3d-travel"] canvas')).toBeAttached({ timeout: 15_000 });
  await expect(page.locator('[data-badge-mode="3d-travel"] .badge-static')).toHaveCount(0, { timeout: 15_000 });
  // Scroll to the bottom: the card has travelled onto the divider.
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(2500);
  const at = await page.evaluate(() => {
    const divider = document.querySelector('[data-badge-anchor="split"]')!.getBoundingClientRect();
    const split = document.querySelector('[data-split]')!.getBoundingClientRect();
    return { divX: divider.left, splitTop: split.top, splitH: split.height, vh: innerHeight };
  });
  const { badgeAnchor, hangPx } = await import('../../src/components/badge/anchor');
  const hang = hangPx(at.vh);
  const a = badgeAnchor({ heroX: at.divX, splitX: at.divX, splitTop: at.splitTop, splitHeight: at.splitH, viewportH: at.vh, hang });
  const pt = { x: at.divX + 40, y: a.y + hang };
  const canvasAt = () => page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, pt);

  await page.mouse.move(pt.x - 5, pt.y - 5);
  await page.mouse.move(pt.x, pt.y);
  await expect.poll(canvasAt).toBe('CANVAS'); // hovering the card: the canvas captures

  // Scroll up 150px without moving the mouse: the split section moves back into the travel window, so the card
  // slides ~190px right off the pointer, which is now over the /3d half.
  await page.evaluate(() => scrollBy({ top: -150, behavior: 'instant' }));
  await page.waitForTimeout(1500);
  expect(await canvasAt()).not.toBe('CANVAS');
  expect(await page.evaluate(() => document.body.style.cursor)).toBe('');
  await page.mouse.click(pt.x, pt.y);
  await expect(page).toHaveURL(/\/3d$/);
});

test('the badge name and role exist as real text in every mode', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('astro-island:not([ssr]) [data-badge-mode]', { state: 'attached' });
  const text = page.locator('[data-badge-mode] > .visually-hidden');
  await expect(text).toHaveText(/Muhammad Zarif Nurhan Bin Mohd Arifin.*Computer Science · 3D Visualization/);
  await expect(page.locator('[data-badge-mode] > [aria-hidden="true"] .visually-hidden')).toHaveCount(0);
});

test('swapping the static badge for the inline 3D badge does not shift the layout', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile');
  await page.goto('/');
  await page.waitForSelector('astro-island:not([ssr]) [data-badge-mode]', { state: 'attached' });
  const measure = () => page.evaluate(() => ({
    slot: document.querySelector('[data-badge-slot]')!.getBoundingClientRect().height,
    h1: document.querySelector('h1')!.getBoundingClientRect().top + scrollY,
  }));
  const before = await measure();
  await engage(page);
  await expect(page.locator('[data-badge-mode="3d-inline"] canvas')).toBeAttached({ timeout: 15_000 });
  await expect(page.locator('[data-badge-mode="3d-inline"] .badge-static')).toHaveCount(0, { timeout: 15_000 });
  const after = await measure();
  expect(Math.abs(after.slot - before.slot)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.h1 - before.h1)).toBeLessThanOrEqual(1);
});

type Pt = { x: number; y: number };
/** Real touch input through CDP (goes through the browser's gesture/scroll pipeline, unlike synthetic DOM events). */
async function touchStartMove(cdp: CDPSession, page: Page, from: Pt, to: Pt, steps = 12) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps, y = from.y + ((to.y - from.y) * i) / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    await page.waitForTimeout(20);
  }
}
const touchEnd = (cdp: CDPSession) => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const centre = async (page: Page) => {
  const b = (await page.locator('[data-badge-grab]').boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

async function expectTouchDragWorks(page: Page, mode: '3d-inline' | '3d-travel') {
  await engage(page);
  await expect(page.locator(`[data-badge-mode="${mode}"] canvas`)).toBeAttached({ timeout: 15_000 });
  await expect(page.locator(`[data-badge-mode="${mode}"] .badge-static`)).toHaveCount(0, { timeout: 15_000 });
  await page.waitForTimeout(2500); // let the swing settle
  const grab = page.locator('[data-badge-grab]');
  await expect(grab).toBeVisible();
  const start = await centre(page);
  const scrollBefore = await page.evaluate(() => scrollY);
  const cdp = await page.context().newCDPSession(page);
  // A mostly vertical drag: without touch-action: none on the card this would start a page scroll and cancel the drag.
  await touchStartMove(cdp, page, start, { x: start.x + 40, y: start.y + 90 });
  await expect(grab).toHaveAttribute('data-dragging', '');
  const mid = await centre(page);
  expect(mid.y - start.y).toBeGreaterThan(45); // the card follows the finger
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  await touchEnd(cdp);
  await expect(grab).not.toHaveAttribute('data-dragging', '');
  // It springs back towards its rest position after release.
  await expect.poll(async () => Math.abs((await centre(page)).y - start.y), { timeout: 5000 }).toBeLessThan(30);
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  return cdp;
}

test('touch: the inline card can be dragged, and swiping elsewhere still scrolls', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  const cdp = await expectTouchDragWorks(page, '3d-inline');
  // A swipe up over the About text (well clear of the card) scrolls the page.
  const about = (await page.getByRole('heading', { name: 'About me' }).boundingBox())!;
  const y0 = Math.min(about.y + 40, 780);
  await touchStartMove(cdp, page, { x: 60, y: y0 }, { x: 60, y: y0 - 300 });
  await touchEnd(cdp);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  expect(errors).toEqual([]);
});

test('touch: the travelling card can be dragged on a wide touch screen', async ({ browser }, info) => {
  test.skip(info.project.name !== 'desktop');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('/');
  await expectTouchDragWorks(page, '3d-travel');
  // Swiping over the headline (not the card) still scrolls.
  const cdp = await page.context().newCDPSession(page);
  const h = (await page.getByText('Computer Science student who builds software and 3D spaces.').boundingBox())!;
  await touchStartMove(cdp, page, { x: h.x + 20, y: h.y + 10 }, { x: h.x + 20, y: h.y - 290 });
  await touchEnd(cdp);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  await ctx.close();
});

test('mouse-only desktops get no touch grab area', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/');
  await engage(page);
  await expect(page.locator('[data-badge-mode="3d-travel"] .badge-static')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('[data-badge-grab]')).toBeHidden();
});
