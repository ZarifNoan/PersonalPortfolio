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
test('sitemap exists', async ({ request }) => {
  expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
});
test('robots.txt allows crawling and points at the sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain('User-agent: *');
  expect(body).toContain('Allow: /');
  expect(body).toMatch(/^Sitemap: https?:\/\/\S+\/sitemap-index\.xml$/m);
});
