import { test, expect, type Page } from '@playwright/test';

/** Running text: justified with automatic hyphenation. */
const BODY: [string, string][] = [
  ['/', '[data-badge-release] .body p'],
  ['/software', '.page-title p'],
  ['/software', 'section[data-filter-item] .desc'],
  ['/3d', '.page-title p'],
  ['/3d', 'section[data-filter-item] .desc'],
  ['/software/fixer', '.about p'],
  ['/3d/moltech-johor-warehouse', '.about p'],
];
/** Not running text: never justified. */
const NOT_BODY: [string, string][] = [
  ['/software', 'section[data-filter-item] h2'],
  ['/software', 'section[data-filter-item] .eyebrow'],
  ['/software', 'section[data-filter-item] .tags li'],
  ['/software', 'section[data-filter-item] .more'],
  ['/software/fixer', '.facts dd'],
  ['/software/fixer', '.team .name'],
  ['/software/fixer', 'h1'],
  ['/3d/moltech-johor-warehouse', '.facts dd'],
  ['/3d/moltech-johor-warehouse', 'footer p'],
];

async function styles(page: Page, path: string, sel: string) {
  await page.goto(path);
  const els = page.locator(sel);
  expect(await els.count(), `${path} ${sel}`).toBeGreaterThan(0);
  return els.evaluateAll((list) => list.map((el) => { const s = getComputedStyle(el); return { align: s.textAlign, hyphens: s.hyphens }; }));
}

test('running text is justified with hyphenation on wide screens; headings, labels and chips are not', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [path, sel] of BODY) {
    for (const s of await styles(page, path, sel)) expect(s, `${path} ${sel}`).toEqual({ align: 'justify', hyphens: 'auto' });
  }
  for (const [path, sel] of NOT_BODY) {
    for (const s of await styles(page, path, sel)) expect(s.align, `${path} ${sel}`).not.toBe('justify');
  }
});
