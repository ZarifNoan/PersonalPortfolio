import { test, expect } from '@playwright/test';
for (const [path, title] of [['/', 'Muhammad Zarif Nurhan Bin Mohd Arifin | Portfolio'], ['/software', 'Software Development | Muhammad Zarif Nurhan Bin Mohd Arifin'], ['/3d', '3D Visualization | Muhammad Zarif Nurhan Bin Mohd Arifin']]) {
  test(`${path} meta`, async ({ page, request }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{40,}/);
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(og).toMatch(/\/og\.png$/);
    expect((await request.get('/og.png')).status()).toBe(200);
  });
}
test('sitemap exists', async ({ request }) => {
  expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
});
