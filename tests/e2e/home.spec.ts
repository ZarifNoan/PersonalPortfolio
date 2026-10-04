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

test('desktop: the name starts 84-108px below the nav and About follows the headline with a comfortable gap', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/');
  const navBottom = (await page.locator('header.nav-wrap').boundingBox())!;
  const h1 = (await page.locator('h1').boundingBox())!;
  const gap = h1.y - (navBottom.y + navBottom.height);
  expect(gap).toBeGreaterThanOrEqual(84);
  expect(gap).toBeLessThanOrEqual(108);
  // The hanging badge is out of the hero's flow, so the headline, not the badge, sets where About starts.
  const headline = (await page.locator('.hero .headline').boundingBox())!;
  const aboutTop = await page.evaluate(() => {
    let y = 0; for (let el = document.querySelector<HTMLElement>('[data-badge-release]'); el; el = el.offsetParent as HTMLElement | null) y += el.offsetTop;
    return y - scrollY;
  });
  const headlineAboutGap = aboutTop - (headline.y + headline.height);
  expect(headlineAboutGap).toBeGreaterThanOrEqual(80);
  expect(headlineAboutGap).toBeLessThanOrEqual(128);
});

test('desktop: About Me text has a comfortable gap to pick-a-side', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/');
  const gap = await page.evaluate(() => {
    const topOf = (el: HTMLElement) => { let y = 0; for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop; return y; };
    const p = document.querySelector<HTMLElement>('[data-badge-avoid] p:last-child')!;
    const aboutBottom = topOf(p) + p.offsetHeight;
    const splitTop = topOf(document.querySelector<HTMLElement>('[data-split]')!);
    return splitTop - aboutBottom;
  });
  expect(gap).toBeGreaterThanOrEqual(80);
  expect(gap).toBeLessThanOrEqual(112);
});

for (const width of [900, 1024, 1280, 1440]) {
  test(`desktop ${width}px: the name renders on exactly 2 lines, clear of the badge`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop');
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const h1 = page.locator('h1');
    const { height, lineHeight, right } = await h1.evaluate((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { height: r.height, lineHeight: parseFloat(cs.lineHeight), right: r.right };
    });
    const lines = Math.round(height / lineHeight);
    expect(lines, `h1 should wrap to exactly 2 lines at ${width}px`).toBe(2);
    // Worst case over the whole CSS sway: pause the animation and seek it through one 6s cycle, as the per-width
    // About-clearance test above does, reading the rotated card's left edge at each step.
    const boxes = await page.locator('.badge-hang').evaluate((hang) => {
      const sway = hang.getAnimations().find((a) => (a as CSSAnimation).animationName === 'badge-sway');
      if (!sway) return null;
      sway.pause();
      const card = hang.querySelector('.badge-card')!;
      const out: number[] = [];
      for (let t = 0; t <= 6000; t += 250) { sway.currentTime = t; out.push(card.getBoundingClientRect().left); }
      return out;
    });
    expect(boxes, 'the sway animation runs').not.toBeNull();
    expect(Math.min(...boxes!)).toBeGreaterThanOrEqual(right + 24);
  });
}

for (const width of [900, 940, 980, 1024, 1280, 1440]) {
  test(`desktop ${width}px: the static badge hangs right of the About text without covering it`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop');
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const text = await page.locator('[data-badge-avoid]').evaluate((el) => el.getBoundingClientRect().right);
    // Worst case over the whole CSS sway: pause the animation and seek it through one 6s cycle (0% = -3deg,
    // 50% = +2.5deg, the lean towards the text), reading the rotated card's bounds at each step.
    const boxes = await page.locator('.badge-hang').evaluate((hang) => {
      const sway = hang.getAnimations().find((a) => (a as CSSAnimation).animationName === 'badge-sway');
      if (!sway) return null;
      sway.pause();
      const card = hang.querySelector('.badge-card')!;
      const out: { left: number; right: number }[] = [];
      for (let t = 0; t <= 6000; t += 250) { sway.currentTime = t; const r = card.getBoundingClientRect(); out.push({ left: r.left, right: r.right }); }
      return out;
    });
    expect(boxes, 'the sway animation runs').not.toBeNull();
    expect(Math.min(...boxes!.map((b) => b.left)) - text).toBeGreaterThanOrEqual(24);
    expect(Math.max(...boxes!.map((b) => b.right))).toBeLessThanOrEqual(width);
    // Decorative (aria-hidden): it must not block selecting or clicking what's under it.
    expect(await page.locator('.badge-static').evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
  });
}

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

test('each pick-a-side half has an optimised, lazy, decorative background photo', async ({ page }) => {
  await page.goto('/');
  for (const href of ['/software', '/3d']) {
    const img = page.locator(`[data-split] a[href="${href}"] img[data-side-photo]`);
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute('alt', '');
    await expect(img).toHaveAttribute('loading', 'lazy');
    expect(await img.getAttribute('srcset')).toMatch(/\.webp \d+w/);
    expect(await img.getAttribute('sizes')).toBeTruthy();
  }
  // The photo is decoration: the links keep their text names.
  await expect(page.locator('[data-split] a[href="/software"]')).toHaveAccessibleName(/Software Development/);
  await expect(page.locator('[data-split] a[href="/3d"]')).toHaveAccessibleName(/3D Visualization/);
});
