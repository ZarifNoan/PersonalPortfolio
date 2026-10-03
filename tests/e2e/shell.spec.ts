import { test, expect } from '@playwright/test';

const pages = [
  { path: '/', tab: 'Home' },
  { path: '/software', tab: 'Software Development' },
  { path: '/3d', tab: '3D Visualization' },
];

for (const p of pages) {
  test(`${p.path} has nav, active tab and footer contacts`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(p.path);
    const nav = page.getByRole('navigation', { name: 'Main' });
    const toggle = page.getByRole('button', { name: 'Menu' });
    if (await toggle.isVisible()) await toggle.click();
    await expect(nav.getByRole('link', { name: p.tab })).toHaveAttribute('aria-current', 'page');
    for (const t of pages) await expect(nav.getByRole('link', { name: t.tab })).toBeVisible();
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: 'zrf.nurhan@gmail.com' })).toHaveAttribute('href', 'mailto:zrf.nurhan@gmail.com');
    await expect(footer.getByRole('link', { name: '+60 11-5878 5830' })).toHaveAttribute('href', 'tel:+601158785830');
    await expect(footer).toContainText('© 2026 Muhammad Zarif Nurhan Bin Mohd Arifin');
    expect(errors).toEqual([]);
  });
}

test('the skip link is the first Tab stop and is visible when focused', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  const box = (await skip.boundingBox())!;
  expect(box.width).toBeGreaterThan(40);
  expect(box.height).toBeGreaterThan(16);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x).toBeGreaterThanOrEqual(0);
});

test('Esc closes the open mobile menu', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile');
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Menu' });
  await toggle.click();
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav.getByRole('link', { name: 'Home' })).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('404 page renders with links home and to both sides', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist');
  expect(res!.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/not found/i);
  const main = page.getByRole('main');
  await expect(main.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  await expect(main.getByRole('link', { name: /Software Development/ })).toHaveAttribute('href', '/software');
  await expect(main.getByRole('link', { name: /3D Visualization/ })).toHaveAttribute('href', '/3d');
});
