import { test, expect } from '@playwright/test';

const ZARIF = 'Muhammad Zarif Nurhan Bin Mohd Arifin';

test('software detail: name, team, stack, course, long description, screenshots without a heading', async ({ page }) => {
  await page.goto('/software/jomlah');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('JomLah – Centralized Event Management Platform');
  const team = main.getByRole('region', { name: 'Team' });
  await expect(team.getByRole('listitem')).toHaveText([ZARIF, 'Jordan Septian', 'Hakim Bin Taufik']);
  // No LinkedIn URLs yet, so names only.
  await expect(team.getByRole('link')).toHaveCount(0);
  const facts = main.getByRole('complementary', { name: 'Project facts' });
  await expect(facts).toContainText('Web Programming');
  await expect(facts).toContainText('Team of 3');
  await expect(facts.getByRole('list', { name: 'Tech stack' }).getByRole('listitem')).toHaveText(['PHP 8', 'MySQL', 'JavaScript', 'jQuery/AJAX', 'HTML5', 'CSS3']);
  const paras = main.getByRole('region', { name: 'About the project' }).locator('p');
  expect(await paras.count()).toBeGreaterThanOrEqual(2);
  await expect(paras.first()).toContainText('team of three');
  // Screenshots: the four non-cover images, as windows with chrome, and no "Gallery" heading anywhere.
  await expect(main.locator('.shots .win')).toHaveCount(4);
  await expect(main.locator('.shots .win .dots')).toHaveCount(4);
  await expect(main.getByRole('heading', { name: /gallery/i })).toHaveCount(0);
  await expect(main.locator('.shots').getByRole('heading')).toHaveCount(0);
});

test('team block lists the right members, and is omitted for an individual project', async ({ page }) => {
  await page.goto('/software/fixer');
  await expect(page.getByRole('region', { name: 'Team' }).getByRole('listitem')).toHaveText([ZARIF, 'Yogesh Sandeep Jayavant', 'Hakim Bin Taufik', 'Jordan Septian']);
  await expect(page.locator('.phones .win.phone')).toHaveCount(4);
  await page.goto('/software/fuzzy-logic');
  await expect(page.getByRole('region', { name: 'Team' }).getByRole('listitem')).toHaveCount(5);
  await expect(page.getByRole('complementary', { name: 'Project facts' })).toContainText('Team of 5');
  await page.goto('/software/stocksense');
  await expect(page.getByRole('region', { name: 'Team' })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Project facts' })).toContainText('Individual');
  await expect(page.getByRole('complementary', { name: 'Project facts' })).toContainText('Final Year Project');
});

test('fuzzy logic images are described as system results', async ({ page }) => {
  await page.goto('/software/fuzzy-logic');
  const alts = await page.locator('.shots img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).alt));
  expect(alts.filter((a) => a.startsWith('Result chart')).length).toBeGreaterThanOrEqual(3);
  await expect(page.getByRole('region', { name: 'About the project' })).toContainText('outputs of the system, not its interface');
});

test('3D detail: name, category, client, description and a mosaic of every render', async ({ page }) => {
  const cases = [
    ['/3d/moltech-johor-warehouse', 'Moltech Johor Warehouse', 'Architectural Visualization', 'Moltech'],
    ['/3d/slice-2025', 'SLICE 2025 – School Leavers Inspiration & Success Initiatives', 'Architectural Visualization', 'DASEM'],
    ['/3d/gobami', 'Gobami Product Visualization', 'Product Visualization', "Personal project (for a friend's university assignment)"],
  ] as const;
  for (const [path, title, category, client] of cases) {
    await page.goto(path);
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(main.locator('dt', { hasText: 'Category' }).locator('+ dd')).toHaveText(category);
    await expect(main.locator('dt', { hasText: 'Client' }).locator('+ dd')).toHaveText(client);
    expect(await main.locator('.about p').count()).toBeGreaterThanOrEqual(2);
    await expect(main.locator('.mosaic img')).toHaveCount(5); // the cover is included
    await expect(main.getByRole('heading')).toHaveCount(1); // the h1 only: no gallery heading
  }
});

test('back links return to the listings', async ({ page }) => {
  await page.goto('/software/stocksense');
  await page.getByRole('link', { name: 'All software projects' }).click();
  await expect(page).toHaveURL(/\/software\/?$/);
  await page.goto('/3d/gobami');
  await page.getByRole('link', { name: 'All 3D work' }).click();
  await expect(page).toHaveURL(/\/3d\/?$/);
});

test('detail pages mark their section tab as current', async ({ page }) => {
  await page.goto('/3d/gobami');
  const nav = page.getByRole('navigation', { name: 'Main' });
  const toggle = page.getByRole('button', { name: 'Menu' });
  if (await toggle.isVisible()) await toggle.click();
  await expect(nav.getByRole('link', { name: '3D Visualization' })).toHaveAttribute('aria-current', 'true');
});

test('the JOHEX draft has no page', async ({ page }) => {
  const res = await page.goto('/3d/johex');
  expect(res!.status()).toBe(404);
});

for (const width of [390, 820, 1440]) {
  test(`no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/software', '/3d', '/software/stocksense', '/software/jomlah', '/software/fixer', '/software/fuzzy-logic', '/3d/moltech-johor-warehouse', '/3d/gobami']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(width);
    }
  });
}
