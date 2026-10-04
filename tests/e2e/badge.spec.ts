import { test, expect, type Page, type CDPSession } from '@playwright/test';
import { STATIC_CARD_H, STATIC_CARD_W } from '../../src/components/badge/anchor';
import { BADGE, FACE } from '../../src/components/badge/face';

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

test('reduced motion shows the static badge with the photo and role', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await engage(page);
  await page.waitForTimeout(1500);
  // The gate opened (engage asserts data-engaged) and the island still chose static.
  // The wrapper is zero-height on desktop (the badge hangs out of flow), so check the badge itself.
  await expect(page.locator('[data-badge-mode="static"][data-engaged] .badge-static')).toBeVisible();
  await expect(page.locator('[data-badge-slot] .badge-role')).toHaveText('Computer Science3D Visualization');
  await expect(page.locator('[data-badge-slot] img.badge-photo')).toBeVisible();
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

test('the static card face: full-bleed photo between the bands, the role over a white fade, no name', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.badge-static .badge-card');
  const face = card.locator('.badge-face');
  await expect.poll(() => face.locator('img.badge-photo').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  const g = await card.evaluate((c: HTMLElement) => {
    // Held upright (the sway paused at 0°) so the boxes are the card's own.
    const hang = c.closest<HTMLElement>('.badge-hang')!; hang.style.animation = 'none'; hang.style.transform = 'none';
    const face = c.querySelector('.badge-face')!.getBoundingClientRect(), img = c.querySelector('img.badge-photo')!;
    const r = img.getBoundingClientRect(), cs = getComputedStyle(img);
    const fade = c.querySelector('.badge-fade')!.getBoundingClientRect(), role = c.querySelector('.badge-role')!.getBoundingClientRect();
    return { card: { w: c.offsetWidth, h: c.offsetHeight }, face: { w: face.width, h: face.height },
      img: { x: r.left - face.left, y: r.top - face.top, w: r.width, h: r.height, radius: cs.borderRadius, fit: cs.objectFit },
      fadeBottom: fade.bottom - face.top, role: { top: role.top - face.top, bottom: role.bottom - face.top } };
  });
  expect(g.card).toEqual({ w: STATIC_CARD_W, h: STATIC_CARD_H });
  expect(g.face).toEqual({ w: FACE.w, h: FACE.h });
  // Full-bleed: the whole width, from the header stripe to the footer stripe, square corners, cropped to cover.
  expect(g.img).toEqual({ x: 0, y: FACE.photo.top, w: FACE.w, h: FACE.photo.bottom - FACE.photo.top, radius: '0px', fit: 'cover' });
  // The role sits on the fade, over the lower photo.
  expect(g.fadeBottom).toBe(FACE.photo.bottom);
  expect(g.role.top).toBeGreaterThan(FACE.photo.bottom - FACE.fade.h);
  expect(g.role.bottom).toBeLessThanOrEqual(FACE.photo.bottom);
  await expect(face.locator('.badge-role span')).toHaveText(['Computer Science', '3D Visualization']);
  await expect(face).not.toContainText(/MUHAMMAD|BIN MOHD/);
  await expect(face.locator('.badge-mono')).toHaveCount(0);
  await expect(face.locator('.badge-foot')).toHaveText('NURHAN ARIFIN');
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

/**
 * Compares two equally sized crops centred on the static and the resting 3D card (decoded in the page). Rows are CSS px
 * from the crop's centre (the card's centre); only the face's middle 160px are read. Returns, per crop:
 * - role: ink (summed darkness of pixels darker than 200) and the darkest luminance in the role lines' band;
 * - label: summed brightness of the light "NURHAN ARIFIN" letters on the footer's ink band;
 * - photo: the mean luminance of the photo band, and the mean absolute luminance difference between the two crops
 *   there, at the best whole-device-pixel alignment within ±2px (the 3D card rests up to a few px off).
 */
const compareFaces = (page: Page, a: Buffer, b: Buffer, scale: number) => page.evaluate(async ({ a, b, scale, F }) => {
  const read = async (b64: string) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d')!; g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, L = new Float32Array(c.width * c.height);
    for (let i = 0; i < L.length; i++) L[i] = 0.2126 * d[i * 4]! + 0.7152 * d[i * 4 + 1]! + 0.0722 * d[i * 4 + 2]!;
    return { w: c.width, h: c.height, L };
  };
  const [A, B] = [await read(a), await read(b)];
  const cx = A.w / 2, cy = A.h / 2, x0 = Math.round(cx - 80 * scale), x1 = Math.round(cx + 80 * scale);
  const rows = (y0: number, y1: number) => [Math.round(cy + y0 * scale), Math.round(cy + y1 * scale)] as const;
  const band = (I: typeof A, [r0, r1]: readonly [number, number], f: (l: number) => number) => {
    let sum = 0, darkest = 255;
    for (let y = r0; y < r1; y++) for (let x = x0; x < x1; x++) { const l = I.L[y * I.w + x]!; darkest = Math.min(darkest, l); sum += f(l); }
    return { sum: sum / scale / scale, darkest };
  };
  // Card-centre-relative bands: the face's top is at −h/2 + inset.
  const top = -F.h / 2 + F.inset;
  const roleRows = rows(top + F.role.top - 3, top + F.role.top + 2 * F.role.lh + 3);
  const labelRows = rows(top + F.label.top - 2, top + F.label.top + F.label.size + 2);
  const photoRows = rows(top + F.photo.top + 4, top + F.role.top - 4);
  const ink = (l: number) => (l < 200 ? 240 - l : 0), light = (l: number) => (l > 100 ? l - 60 : 0);
  let best = Infinity;
  for (let dy = -2 * scale; dy <= 2 * scale; dy++) for (let dx = -2 * scale; dx <= 2 * scale; dx++) {
    let s = 0, n = 0;
    for (let y = photoRows[0]; y < photoRows[1]; y++) for (let x = x0; x < x1; x++) { s += Math.abs(A.L[y * A.w + x]! - B.L[(y + dy) * B.w + x + dx]!); n++; }
    best = Math.min(best, s / n);
  }
  const mean = (I: typeof A) => { let s = 0, n = 0; for (let y = photoRows[0]; y < photoRows[1]; y++) for (let x = x0; x < x1; x++) { s += I.L[y * I.w + x]!; n++; } return s / n; };
  return {
    role: [band(A, roleRows, ink), band(B, roleRows, ink)],
    label: [band(A, labelRows, light).sum, band(B, labelRows, light).sum],
    photo: { mean: [mean(A), mean(B)], diff: best },
  };
}, { a: a.toString('base64'), b: b.toString('base64'), scale, F: { h: BADGE.h, inset: BADGE.inset, role: FACE.role, label: FACE.label, photo: FACE.photo } });

/** Mean luminance of a screenshot (decoded in the page). */
const meanLum = (page: Page, png: Buffer) => page.evaluate(async (b64) => {
  const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d')!; g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
  let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!;
  return s / (d.length / 4);
}, png.toString('base64'));

for (const dpr of [1, 2]) {
  test(`desktop 1440×900 @${dpr}x: the 3D card looks like the static badge (size, photo, role and label)`, async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: dpr });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForSelector('astro-island:not([ssr]) [data-badge-mode]', { state: 'attached' });
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.locator('.badge-static img.badge-photo').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
    // The static card, held upright (the sway paused at 0°) for a like-for-like crop around its centre.
    const st = await page.locator('.badge-hang').evaluate((hang) => {
      (hang as HTMLElement).style.animation = 'none'; (hang as HTMLElement).style.transform = 'none';
      const r = hang.querySelector('.badge-card')!.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    });
    const crop = (c: { cx: number; cy: number }) => ({ x: Math.round(c.cx - 100), y: Math.round(c.cy - 140), width: 200, height: 280 });
    const before = await page.screenshot({ clip: crop(st) });
    // A patch of his dark suit (right lapel, 35px right of and 10px below the card's centre).
    const suit = (c: { cx: number; cy: number }) => ({ x: Math.round(c.cx + 35 - 6), y: Math.round(c.cy + 10 - 6), width: 12, height: 12 });
    expect(await meanLum(page, await page.screenshot({ clip: suit(st) })), 'static suit patch').toBeLessThan(100);
    await engage(page);
    await expect(page.locator('[data-badge-mode="3d-travel"] .badge-static')).toHaveCount(0, { timeout: 15_000 });
    // Revealed with the photo already on the face (the face texture waits for the photo to decode): his suit is dark
    // from the first visible frame, not blank paper (~250).
    expect(await meanLum(page, await page.screenshot({ clip: suit(await cardBox(page)) })), 'photo on the first visible frame').toBeLessThan(150);
    await page.mouse.move(5, 500);
    const rest = await settledCard(page);
    // Same size as the static card (the grab box adds 6px each side).
    expect(Math.abs(rest.w - 12 - STATIC_CARD_W)).toBeLessThanOrEqual(3);
    expect(Math.abs(rest.h - 12 - STATIC_CARD_H)).toBeLessThanOrEqual(3);
    await page.waitForTimeout(4500); // asleep: the last frame is the resting one
    const after = await page.screenshot({ clip: crop(await cardBox(page)) });
    const m = await compareFaces(page, before, after, dpr);
    console.log(`face @${dpr}x ${JSON.stringify(m)}`);
    // The role lines: as heavy (within 10%) and as dark as the static badge's DOM text. Blurred, mipmapped or
    // washed-out face text (the CR 4 regression) loses ink and lifts the darkest pixel.
    expect(m.role[1]!.sum / m.role[0]!.sum, 'role ink').toBeGreaterThan(0.9);
    expect(m.role[1]!.sum / m.role[0]!.sum, 'role ink').toBeLessThan(1.15);
    expect(m.role[1]!.darkest - m.role[0]!.darkest, 'role darkest').toBeLessThanOrEqual(4);
    expect(m.label[1]! / m.label[0]!, 'label').toBeGreaterThan(0.85);
    expect(m.label[1]! / m.label[0]!, 'label').toBeLessThan(1.18);
    // The same photo, crop and sharpness: same brightness, and pixel for pixel close (a blurred, shifted or
    // differently cropped photo differs by far more).
    expect(Math.abs(m.photo.mean[1]! - m.photo.mean[0]!), 'photo brightness').toBeLessThanOrEqual(4);
    expect(m.photo.diff, 'photo per-pixel difference').toBeLessThanOrEqual(6);
    await ctx.close();
  });
}

test('if the photo fails to load, the 3D card still appears (with the monogram)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/zarif-badge.*\.(webp|jpe?g)$/, (r) => r.abort());
  await page.goto('/');
  await engage(page);
  await expect(page.locator('[data-badge-mode="3d-travel"] canvas')).toBeAttached({ timeout: 15_000 });
  await expect(page.locator('[data-badge-mode="3d-travel"] .badge-static')).toHaveCount(0, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

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
