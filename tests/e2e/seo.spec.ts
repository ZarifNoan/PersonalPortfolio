import { test, expect } from '@playwright/test';
for (const [path, title] of [['/', 'Muhammad Zarif Nurhan Bin Mohd Arifin | Portfolio'], ['/software', 'Software Development | Muhammad Zarif Nurhan Bin Mohd Arifin'], ['/3d', '3D Visualization | Muhammad Zarif Nurhan Bin Mohd Arifin']]) {
  test(`${path} meta`, async ({ page, request }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{40,}/);
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(og).toMatch(/\/og\.jpg$/);
    const img = await request.get('/og.jpg');
    expect(img.status()).toBe(200);
    expect((await img.body()).length).toBeLessThanOrEqual(300 * 1024);
  });
}
test('sitemap exists and lists the detail pages', async ({ request }) => {
  expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
  const body = await (await request.get('/sitemap-0.xml')).text();
  for (const p of ['software/stocksense', 'software/jomlah', 'software/fuzzy-logic', 'software/fixer', '3d/moltech-johor-warehouse', '3d/slice-2025', '3d/gobami']) {
    expect(body).toContain(`/${p}/</loc>`);
  }
  expect(body).not.toContain('johex');
});
for (const [path, title] of [['/software/stocksense', 'StockSense – AI Inventory Prediction System'], ['/3d/slice-2025', 'SLICE 2025 – School Leavers Inspiration & Success Initiatives']]) {
  test(`${path} has its own title, description, canonical and cover OG image`, async ({ page, request }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(`${title} | Muhammad Zarif Nurhan Bin Mohd Arifin`);
    const desc = (await page.locator('meta[name="description"]').getAttribute('content'))!;
    expect(desc.length).toBeGreaterThanOrEqual(40);
    expect(desc.length).toBeLessThanOrEqual(160);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`^https?://[^/]+${path}/?$`));
    const og = (await page.locator('meta[property="og:image"]').getAttribute('content'))!;
    expect(og).toMatch(/^https?:\/\/[^/]+\/_astro\/.+\.jpg$/);
    const res = await request.get(new URL(og).pathname);
    expect(res.status()).toBe(200);
    expect((await res.body()).length).toBeLessThanOrEqual(300 * 1024);
  });
}
test('robots.txt allows crawling and points at the sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain('User-agent: *');
  expect(body).toContain('Allow: /');
  expect(body).toMatch(/^Sitemap: https?:\/\/\S+\/sitemap-index\.xml$/m);
});
