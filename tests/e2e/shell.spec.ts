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
