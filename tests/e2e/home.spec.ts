import { test, expect } from '@playwright/test';

test('home shows name, headline, about, both sides and the badge', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Muhammad Zarif Nurhan Bin Mohd Arifin');
  await expect(page.getByText('Computer Science student who builds software and 3D spaces.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'About me' })).toBeVisible();
  await expect(page.getByText("Hi, I'm Zarif, a final-year Computer Science (Honours) student at UCSI University.")).toBeVisible();
  const sw = page.getByRole('link', { name: /Software Development/ }).last();
  const viz = page.getByRole('link', { name: /3D Visualization/ }).last();
  await expect(sw).toHaveAttribute('href', '/software');
  await expect(viz).toHaveAttribute('href', '/3d');
  await expect(page.locator('[data-badge-slot]')).toContainText(/muhammad zarif nurhan/i);
});

test('pick-a-side stacks below 900px', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto('/');
  const halves = page.locator('[data-split] a');
  const [a, b] = [await halves.nth(0).boundingBox(), await halves.nth(1).boundingBox()];
  expect(b!.y).toBeGreaterThan(a!.y + a!.height - 1);
});

test('the 3D half points its arrow the way the layout goes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const go = page.locator('[data-split] a[href="/3d"] .go');
  expect((await go.innerText()).trim()).toBe('← View renders');
  await page.setViewportSize({ width: 800, height: 900 });
  expect((await go.innerText()).trim()).toBe('View renders →');
});

test('project media lifts on hover', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/software');
  const main = page.locator('section#stocksense [data-main-image]');
  await main.hover();
  await expect.poll(() => main.evaluate((el) => getComputedStyle(el).translate)).not.toMatch(/^(none|0px)$/);
});

test('desktop: the name starts 48-64px below the nav and the hero clears the hanging badge', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/');
  const navBottom = (await page.locator('header.nav-wrap').boundingBox())!;
  const h1 = (await page.locator('h1').boundingBox())!;
  const gap = h1.y - (navBottom.y + navBottom.height);
  expect(gap).toBeGreaterThanOrEqual(44);
  expect(gap).toBeLessThanOrEqual(68);
  // The static badge (shown until the first interaction) sits inside the hero, above About Me.
  const card = (await page.locator('.badge-card').boundingBox())!;
  const hero = (await page.locator('section.hero').boundingBox())!;
  const about = (await page.locator('[data-badge-release]').boundingBox())!;
  expect(card.y + card.height).toBeLessThanOrEqual(hero.y + hero.height + 1);
  expect(card.y + card.height).toBeLessThanOrEqual(about.y);
});

test('mobile: compact space between the nav and the hero', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile');
  await page.goto('/');
  const nav = (await page.locator('header.nav-wrap').boundingBox())!;
  const slot = (await page.locator('[data-badge-slot]').boundingBox())!;
  expect(slot.y - (nav.y + nav.height)).toBeLessThanOrEqual(16);
});

test('About Me has a compact top and justified paragraphs on wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const about = page.locator('[data-badge-release]');
  expect(parseFloat(await about.evaluate((el) => getComputedStyle(el).paddingTop))).toBeLessThanOrEqual(28);
  const p = about.locator('p').first();
  expect(await p.evaluate((el) => getComputedStyle(el).textAlign)).toBe('justify');
  expect(await p.evaluate((el) => getComputedStyle(el).hyphens)).toBe('auto');
});
