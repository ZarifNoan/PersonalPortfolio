import { test, expect } from '@playwright/test';

test('software page lists five projects in order, client work first, with descriptions visible', async ({ page }) => {
  await page.goto('/software');
  const titles = page.locator('section[data-filter-item] h2');
  await expect(titles).toHaveText([
    'Primo Pinnacle – Government Relations Company Website',
    'StockSense – AI Inventory Prediction System',
    'JomLah – Centralized Event Management Platform',
    'Student Performance Prediction using Fuzzy Logic',
    'Fixer – On-Demand Home Repair Service App',
  ]);
  await expect(page.locator('section#stocksense')).toContainText('LSTM model');
  await expect(page.locator('section[data-filter-item]').first()).toContainText('government relations');
});

test('team wording on the listing eyebrows', async ({ page }) => {
  await page.goto('/software');
  // Not coursework: the type replaces the course.
  await expect(page.locator('#primo-pinnacle .eyebrow')).toHaveText('Freelance client project · Individual');
  await expect(page.locator('#stocksense .eyebrow')).toHaveText(/· Individual$/);
  await expect(page.locator('#jomlah .eyebrow')).toHaveText(/· Team of 3$/);
  await expect(page.locator('#fuzzy-logic .eyebrow')).toHaveText(/· Team of 5$/);
  await expect(page.locator('#fixer .eyebrow')).toHaveText(/· Team of 4$/);
});

for (const [listing, slugs] of [
  ['/software', ['primo-pinnacle', 'stocksense', 'jomlah', 'fuzzy-logic', 'fixer']],
  ['/3d', ['perfume-renders', 'gobami', 'exhibition-booths', 'moltech-johor-warehouse', 'johex', 'slice-2025']],
] as const) {
  test(`${listing}: each project shows exactly one picture and no thumbnail strip`, async ({ page }) => {
    await page.goto(listing);
    const sections = page.locator('section[data-filter-item]');
    await expect(sections).toHaveCount(slugs.length);
    for (const s of await sections.all()) {
      await expect(s.locator('[data-cover]')).toHaveCount(1);
      await expect(s.locator('[data-cover] img')).toHaveCount(1); // one picture: no hidden slides or thumbnails
      await expect(s.locator('[data-thumbs], [data-thumb], [data-slide]')).toHaveCount(0);
    }
  });

  test(`${listing}: Learn More links open each detail page`, async ({ page }) => {
    for (const slug of slugs) {
      await page.goto(listing);
      const section = page.locator(`section#${slug}`);
      const title = (await section.locator('h2').textContent())!.trim();
      const more = section.getByRole('link', { name: /^Learn More/ });
      await expect(more).toHaveCount(1);
      await expect(more).toHaveAccessibleName(`Learn More about ${title}`);
      await expect(section.locator('[data-cover]')).toHaveAttribute('href', `${listing}/${slug}`);
      await more.click();
      await expect(page).toHaveURL(new RegExp(`${listing}/${slug}/?$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    }
  });
}

test('software listing pictures are photographs of real devices showing each app, each in its own scene', async ({ page }) => {
  await page.goto('/software');
  const srcs: string[] = [];
  for (const slug of ['primo-pinnacle', 'stocksense', 'jomlah', 'fuzzy-logic', 'fixer']) {
    const img = page.locator(`#${slug} [data-cover] img`);
    await expect(img).toHaveCount(1);
    // One pre-rendered composite per project, served responsively.
    await expect(img).toHaveAttribute('srcset', /\d+w/);
    srcs.push((await img.getAttribute('src'))!);
    expect((await img.getAttribute('alt'))!.length).toBeGreaterThan(30);
  }
  expect(new Set(srcs).size).toBe(5);
  expect(srcs.every((s) => /00-mockup/.test(s))).toBe(true);
  // The CSS-drawn laptop and the SVG phone overlay are gone.
  await expect(page.locator('.laptop-scene, .phone-scene, .laptop, svg.overlay')).toHaveCount(0);
});

for (const width of [1440, 390]) {
  test(`Fixer gallery at ${width}px: pre-rendered realistic phones, spaced apart, alternating up and down`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/software/fixer');
    const phones = page.locator('.shots .win.phone');
    await expect(phones).toHaveCount(4);
    // Each phone is one pre-rendered device image (scripts/make-phone-frames.py), not a CSS-drawn frame.
    await expect(page.locator('.shots .scr, .shots .island')).toHaveCount(0);
    for (const img of await phones.locator('img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveAttribute('src', /\.phone/);
      await expect(img).toHaveAttribute('srcset', /\d+w/);
      expect((await img.getAttribute('alt'))!.length).toBeGreaterThan(20);
      await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
    const boxes = await phones.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height })));
    // No two phones overlap.
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!, b = boxes[j]!;
      const apart = a.x + a.w <= b.x + 0.5 || b.x + b.w <= a.x + 0.5 || a.y + a.h <= b.y + 0.5 || b.y + b.h <= a.y + 0.5;
      expect(apart, `phones ${i} and ${j} overlap`).toBe(true);
    }
    const mid = (b: { y: number; h: number }) => b.y + b.h / 2;
    if (width >= 900) {
      // One row, smaller than before (230px), with the 2nd and 4th phones lower than the 1st and 3rd.
      for (let i = 1; i < 4; i++) expect(boxes[i]!.x).toBeGreaterThan(boxes[i - 1]!.x + boxes[i - 1]!.w);
      for (const b of boxes) expect(b.w).toBeLessThanOrEqual(215);
      expect(mid(boxes[1]!)).toBeGreaterThan(mid(boxes[0]!) + 16);
      expect(mid(boxes[1]!)).toBeGreaterThan(mid(boxes[2]!) + 16);
      expect(mid(boxes[3]!)).toBeGreaterThan(mid(boxes[2]!) + 16);
    } else {
      // A 2 x 2 grid with a subtle offset: the right phone of each row sits a little lower.
      expect(boxes[1]!.x).toBeGreaterThan(boxes[0]!.x + boxes[0]!.w);
      expect(boxes[3]!.x).toBeGreaterThan(boxes[2]!.x + boxes[2]!.w);
      expect(Math.abs(boxes[2]!.x - boxes[0]!.x)).toBeLessThan(2);
      expect(boxes[2]!.y).toBeGreaterThan(boxes[0]!.y + boxes[0]!.h - 40);
      for (const [a, b] of [[0, 1], [2, 3]] as const) {
        const d = mid(boxes[b]!) - mid(boxes[a]!);
        expect(d).toBeGreaterThan(4);
        expect(d).toBeLessThan(40);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  });
}

test('a live client website gets a "Visit website" link next to Learn More; other projects do not', async ({ page }) => {
  await page.goto('/software');
  const primo = page.locator('section#primo-pinnacle');
  const visit = primo.getByRole('link', { name: 'Visit the Primo Pinnacle website (opens in a new tab)' });
  await expect(visit).toHaveCount(1);
  await expect(visit).toHaveAttribute('href', 'https://primopinnacle.co');
  await expect(visit).toHaveAttribute('target', '_blank');
  await expect(visit).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(visit).toContainText('Visit website');
  await expect(visit).toBeVisible();
  // It sits beside Learn More, on the same row.
  const more = primo.getByRole('link', { name: /^Learn More/ });
  const [a, b] = [(await more.boundingBox())!, (await visit.boundingBox())!];
  expect(Math.abs(a.y + a.height / 2 - (b.y + b.height / 2))).toBeLessThan(a.height / 2);
  for (const slug of ['stocksense', 'jomlah', 'fuzzy-logic', 'fixer']) {
    await expect(page.locator(`section#${slug}`).getByRole('link', { name: /Visit/ })).toHaveCount(0);
  }
});
