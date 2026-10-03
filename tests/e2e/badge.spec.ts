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
  // The wrapper is zero-height on desktop (the badge hangs out of flow), so check the badge itself.
  await expect(page.locator('[data-badge-mode="static"][data-engaged] .badge-static')).toBeVisible();
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
  // The wrapper is zero-height on desktop (the badge hangs out of flow), so check the badge itself.
  await expect(page.locator('[data-badge-mode="static"][data-engaged] .badge-static')).toBeVisible();
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

/** The card's on-screen bounds: Lanyard keeps the (touch-only, hidden on mouse desktops) grab box over it every frame. */
const cardBox = (page: Page) => page.evaluate(() => {
  const s = (document.querySelector('[data-badge-grab]') as HTMLElement).style;
  const [x, y, w, h] = [s.left, s.top, s.width, s.height].map(parseFloat) as [number, number, number, number];
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
});

/** Waits until the card has stopped swinging (two reads 300ms apart within 1px), then returns its bounds. */
async function settledCard(page: Page) {
  let prev = await cardBox(page);
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(300);
    const next = await cardBox(page);
    if (Math.abs(next.cx - prev.cx) < 1 && Math.abs(next.cy - prev.cy) < 1) return next;
    prev = next;
  }
  return prev;
}

async function readyTravel(page: Page) {
  await page.goto('/');
  await engage(page);
  await expect(page.locator('[data-badge-mode="3d-travel"] canvas')).toBeAttached({ timeout: 15_000 });
  // Static badge is replaced once the physics scene is ready.
  await expect(page.locator('[data-badge-mode="3d-travel"] .badge-static')).toHaveCount(0, { timeout: 15_000 });
}

test('the badge hangs beside About Me and scrolls away with it, never travelling to the divider', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await readyTravel(page);
  await page.mouse.move(5, 500);
  const rest = await settledCard(page);
  // Scroll About Me up beside the card: the card stays put and sits right of the About text.
  await page.evaluate(() => scrollTo({ top: document.querySelector('[data-badge-release]')!.getBoundingClientRect().top + scrollY - 200, behavior: 'instant' }));
  const beside = await settledCard(page);
  const text = await page.evaluate(() => document.querySelector('[data-badge-avoid]')!.getBoundingClientRect().toJSON());
  expect(Math.abs(beside.cx - rest.cx)).toBeLessThan(4);
  expect(Math.abs(beside.cy - rest.cy)).toBeLessThan(4);
  expect(beside.x).toBeGreaterThan(text.right);
  // With the pick-a-side section centred, the card has left with About: it is above About's bottom edge, not on the
  // divider and not over the halves.
  await page.evaluate(() => document.querySelector('[data-split]')!.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const gone = await settledCard(page);
  const split = await page.evaluate(() => document.querySelector('[data-split]')!.getBoundingClientRect().toJSON());
  const aboutBottom = await page.evaluate(() => document.querySelector('[data-badge-release]')!.getBoundingClientRect().bottom);
  expect(Math.abs(gone.cx - rest.cx)).toBeLessThan(4);
  expect(gone.y + gone.h).toBeLessThan(aboutBottom + 20); // grab pad (6px) + rope stretch under gravity
  expect(gone.y + gone.h).toBeLessThan(split.top);
});

/** The static card's rest centre: the sway paused at both keyframe extremes (-3deg, +2.5deg), averaged. */
const staticCentre = (page: Page) => page.locator('.badge-hang').evaluate((hang) => {
  const sway = hang.getAnimations().find((a) => (a as CSSAnimation).animationName === 'badge-sway')!;
  sway.pause();
  const card = hang.querySelector('.badge-card')!;
  const at = (t: number) => { sway.currentTime = t; const r = card.getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; };
  const [a, b] = [at(0), at(3000)];
  sway.play();
  return { cx: (a.cx + b.cx) / 2, cy: (a.cy + b.cy) / 2 };
});

const swapSizes: [number, number][] = [[900, 900], [1024, 900], [1100, 900], [1180, 900], [1280, 900], [1440, 900], [1440, 800], [1440, 1080], [1280, 720]];
for (const [width, height] of swapSizes) {
  test(`desktop ${width}×${height}: the 3D card comes to rest where the static badge hung`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop');
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const before = await staticCentre(page);
    await engage(page);
    await expect(page.locator('[data-badge-mode="3d-travel"] canvas')).toBeAttached({ timeout: 15_000 });
    await expect(page.locator('[data-badge-mode="3d-travel"] .badge-static')).toHaveCount(0, { timeout: 15_000 });
    await page.mouse.move(5, 500);
    const rest = await settledCard(page);
    console.log(`swap delta ${width}x${height}: dx=${(rest.cx - before.cx).toFixed(1)} dy=${(rest.cy - before.cy).toFixed(1)}`);
    expect(Math.abs(rest.cx - before.cx)).toBeLessThanOrEqual(6);
    expect(Math.abs(rest.cy - before.cy)).toBeLessThanOrEqual(6);
  });
}

for (const width of [900, 940, 980, 1024, 1280, 1440]) {
  test(`desktop ${width}px: the 3D card at rest clears the About text`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop');
    await page.setViewportSize({ width, height: 900 });
    await readyTravel(page);
    await page.mouse.move(5, 500);
    const rest = await settledCard(page);
    const text = await page.evaluate(() => document.querySelector('[data-badge-avoid]')!.getBoundingClientRect().right);
    expect(rest.x - text).toBeGreaterThanOrEqual(16);
    expect(rest.x + rest.w).toBeLessThanOrEqual(width);
  });
}

test('the card captures pointer events beside About Me and the pick-a-side halves stay clickable', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await readyTravel(page);
  await page.evaluate(() => scrollTo({ top: document.querySelector('[data-badge-release]')!.getBoundingClientRect().top + scrollY - 200, behavior: 'instant' }));
  const card = await settledCard(page);
  const canvasAt = (x: number, y: number) => page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, { x, y });

  await page.mouse.move(card.cx - 10, card.cy - 10);
  await page.mouse.move(card.cx, card.cy);
  await expect.poll(() => canvasAt(card.cx, card.cy)).toBe('CANVAS'); // hovering the card: the canvas captures
  await page.mouse.click(card.cx, card.cy);
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(/\/$/);

  // A drag from the card must not leave it stuck in the grabbing state.
  await page.mouse.move(card.cx, card.cy);
  await page.mouse.down();
  await page.mouse.move(card.cx + 60, card.cy + 40, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => document.body.style.cursor)).not.toBe('grabbing');

  // Away from the card, the About text is not covered by the canvas.
  await page.mouse.move(40, 40);
  const text = await page.evaluate(() => document.querySelector('[data-badge-avoid]')!.getBoundingClientRect().toJSON());
  expect(await canvasAt(text.left + 20, text.top + 10)).not.toBe('CANVAS');

  // Directly below where the card hung, the /3d half navigates.
  await page.evaluate(() => document.querySelector('[data-split]')!.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(1500);
  const split = await page.evaluate(() => document.querySelector('[data-split]')!.getBoundingClientRect().toJSON());
  await page.mouse.click(card.cx, split.top + split.height / 2);
  await expect(page).toHaveURL(/\/3d$/);
});

test('scrolling the card away from a stationary pointer releases the canvas capture', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await readyTravel(page);
  await page.mouse.move(5, 500);
  await page.waitForTimeout(1000);
  const pt = await settledCard(page).then((c) => ({ x: c.cx, y: c.cy }));
  const canvasAt = () => page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, pt);

  await page.mouse.move(pt.x - 5, pt.y - 5);
  await page.mouse.move(pt.x, pt.y);
  await expect.poll(canvasAt).toBe('CANVAS'); // hovering the card: the canvas captures

  // Scroll without moving the mouse until the /3d half is under the pointer: the card has left upward with About Me.
  await page.evaluate((y) => {
    const split = document.querySelector('[data-split]')!.getBoundingClientRect();
    scrollBy({ top: split.top - (y - 120), behavior: 'instant' });
  }, pt.y);
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

test('desktop: swapping the static badge for the travelling 3D badge does not shift the layout', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/');
  await page.waitForSelector('astro-island:not([ssr]) [data-badge-mode]', { state: 'attached' });
  const measure = () => page.evaluate(() => ({
    // Layout position (offsetTop chain), not getBoundingClientRect: About's scroll-reveal translate animates.
    about: (() => { let y = 0; for (let el = document.querySelector<HTMLElement>('[data-badge-release]'); el; el = el.offsetParent as HTMLElement | null) y += el.offsetTop; return y; })(),
  }));
  const before = await measure();
  await engage(page);
  await expect(page.locator('[data-badge-mode="3d-travel"] canvas')).toBeAttached({ timeout: 15_000 });
  await expect(page.locator('[data-badge-mode="3d-travel"] .badge-static')).toHaveCount(0, { timeout: 15_000 });
  const after = await measure();
  expect(Math.abs(after.about - before.about)).toBeLessThanOrEqual(1);
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

test('after scroll jumps the card still hangs at full length, its bottom riding on About Me', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await readyTravel(page);
  // Regression: a jump of the anchor while the chain slept left the card wedged on a rope bead, ~150px too high.
  for (const y of [300, 500, 700]) {
    await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), y);
    await page.waitForTimeout(2500);
  }
  const card = await settledCard(page);
  const aboutBottom = await page.evaluate(() => document.querySelector('[data-badge-release]')!.getBoundingClientRect().bottom);
  expect(Math.abs(card.y + card.h - aboutBottom)).toBeLessThan(24);
});
