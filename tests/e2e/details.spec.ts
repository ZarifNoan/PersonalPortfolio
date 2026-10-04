import { test, expect } from '@playwright/test';

const ZARIF = 'Muhammad Zarif Nurhan Bin Mohd Arifin';

test('software detail: name, team, stack, course, long description, screenshots without a heading', async ({ page }) => {
  await page.goto('/software/jomlah');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('JomLah – Centralized Event Management Platform');
  const team = main.getByRole('region', { name: 'Team' });
  const items = team.getByRole('listitem');
  await expect(items.locator('.name')).toHaveText([ZARIF, 'Jordan Septian', 'Hakim Bin Taufik']);
  // Jordan and Hakim have a LinkedIn URL; Zarif does not.
  await expect(team.getByRole('link')).toHaveCount(2);
  await expect(items.nth(0).getByRole('link')).toHaveCount(0);
  await expect(items.nth(1).getByRole('link', { name: 'Jordan Septian on LinkedIn (opens in a new tab)' })).toHaveCount(1);
  await expect(items.nth(2).getByRole('link', { name: 'Hakim Bin Taufik on LinkedIn (opens in a new tab)' })).toHaveCount(1);
  // Everyone on JomLah has a photo, so no initials placeholders show.
  await expect(items.locator('.avatar img')).toHaveCount(3);
  await expect(items.locator('.avatar-fallback')).toHaveCount(0);
  const facts = main.getByRole('complementary', { name: 'Project facts' });
  await expect(facts).toContainText('Web Programming');
  // The Team row was removed from the facts panel (it's redundant with the header eyebrow and the team list).
  expect(await facts.locator('dt').allTextContents()).not.toContain('Team');
  await expect(facts).not.toContainText('Team of');
  await expect(facts.getByRole('list', { name: 'Tech stack' }).getByRole('listitem')).toHaveText(['PHP 8', 'MySQL', 'JavaScript', 'jQuery/AJAX', 'HTML5', 'CSS3']);
  // The header eyebrow still shows course and team size.
  await expect(main.locator('.eyebrow')).toContainText('Team of 3');
  const paras = main.getByRole('region', { name: 'About the project' }).locator('p');
  expect(await paras.count()).toBeGreaterThanOrEqual(2);
  await expect(paras.first()).toContainText('team of three');
  // The team work-split paragraph was removed entirely.
  await expect(main.getByRole('region', { name: 'About the project' })).not.toContainText('We split the work by area');
  await expect(main.getByRole('region', { name: 'About the project' })).not.toContainText('payment gateway');
  // Screenshots: the four non-cover images as clean panels (no title bar, dots or window titles), and no "Gallery"
  // heading anywhere.
  await expect(main.locator('.shots .win')).toHaveCount(4);
  await expect(main.locator('.shots .chrome, .shots .dots, .shots .title')).toHaveCount(0);
  // The hero is the photographic mockup.
  await expect(main.locator('a.hero img')).toHaveAttribute('src', /00-mockup/);
  await expect(main.getByRole('heading', { name: /gallery/i })).toHaveCount(0);
  await expect(main.locator('.shots').getByRole('heading')).toHaveCount(0);
});

test('team block lists the right members, and is omitted for an individual project', async ({ page }) => {
  await page.goto('/software/fixer');
  const fixerTeam = page.getByRole('region', { name: 'Team' });
  await expect(fixerTeam.getByRole('listitem').locator('.name')).toHaveText([ZARIF, 'Yogesh Sandeep Jayavant', 'Hakim Bin Taufik', 'Jordan Septian']);
  // Hakim and Jordan have a LinkedIn URL here too (and Mior on Fuzzy Logic); Zarif, Yogesh and Yeap do not.
  await expect(fixerTeam.getByRole('link')).toHaveCount(2);
  await expect(page.locator('.phones .win.phone')).toHaveCount(4);
  await page.goto('/software/fuzzy-logic');
  const fuzzyTeam = page.getByRole('region', { name: 'Team' });
  await expect(fuzzyTeam.getByRole('listitem')).toHaveCount(5);
  await expect(fuzzyTeam.locator('.avatar img')).toHaveCount(3);
  await expect(fuzzyTeam.locator('.avatar-fallback')).toHaveText(['MD', 'YH']);
  await expect(fuzzyTeam.getByRole('link')).toHaveCount(3);
  await expect(fuzzyTeam.getByRole('link', { name: 'Mior Ahmad Danial on LinkedIn (opens in a new tab)' })).toHaveAttribute('href', 'https://www.linkedin.com/in/miorahmaddanial/');
  await expect(page.getByRole('complementary', { name: 'Project facts' })).not.toContainText('Team of');
  await expect(page.locator('.eyebrow')).toContainText('Team of 5');
  await page.goto('/software/stocksense');
  await expect(page.getByRole('region', { name: 'Team' })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Project facts' })).not.toContainText('Individual');
  await expect(page.locator('.eyebrow')).toContainText('Individual');
  await expect(page.getByRole('complementary', { name: 'Project facts' })).toContainText('Final Year Project');
});

test('fuzzy logic images are described as system results, and the removed paragraphs are gone', async ({ page }) => {
  await page.goto('/software/fuzzy-logic');
  const alts = await page.locator('.shots img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).alt));
  expect(alts.filter((a) => a.startsWith('Result chart')).length).toBeGreaterThanOrEqual(3);
  const about = page.getByRole('region', { name: 'About the project' });
  await expect(about).not.toContainText('outputs of the system, not its interface');
  await expect(about).not.toContainText('simulated cohort of 800 students');
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

test('JOHEX detail: published with Client "RAZOVA", every render in the mosaic and a working lightbox', async ({ page }) => {
  await page.goto('/3d/johex');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('JOHEX Halal Expo');
  await expect(main.locator('dt', { hasText: 'Category' }).locator('+ dd')).toHaveText('Architectural Visualization');
  await expect(main.locator('dt', { hasText: 'Client' }).locator('+ dd')).toHaveText('RAZOVA');
  expect(await main.locator('.about p').count()).toBeGreaterThanOrEqual(2);
  await expect(main.locator('.mosaic img')).toHaveCount(6);
  const dlg = page.getByRole('dialog', { name: 'Image viewer' });
  await main.locator('[data-open-lightbox]').first().click({ position: { x: 30, y: 40 } });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByText('1 / 6')).toBeVisible();
});

test('exhibition booths detail: two personal projects grouped into their own captioned mosaic sections', async ({ page }) => {
  await page.goto('/3d/exhibition-booths');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Exhibition Booth Designs');
  await expect(main.locator('dt', { hasText: 'Category' }).locator('+ dd')).toHaveText('Architectural Visualization');
  await expect(main.locator('dt', { hasText: 'Client' }).locator('+ dd')).toHaveText('Personal project');
  expect(await main.locator('.about p').count()).toBeGreaterThanOrEqual(2);
  await expect(main.locator('.mosaic img')).toHaveCount(10);
  // Two booths, each its own mosaic section with a caption (not a heading).
  await expect(main.locator('.mosaic-section')).toHaveCount(2);
  await expect(main.getByText('Razova booth')).toBeVisible();
  await expect(main.getByText('Example booth')).toBeVisible();
  await expect(main.getByRole('heading')).toHaveCount(1); // the h1 only: captions are not headings
  // Every render opens the lightbox on its own image.
  const gallery = JSON.parse((await page.locator('[data-gallery]').getAttribute('data-gallery'))!) as { src: string; alt: string }[];
  expect(gallery).toHaveLength(10);
  const openers = main.locator('[data-open-lightbox]');
  await expect(openers).toHaveCount(10);
  await openers.first().click({ position: { x: 30, y: 40 } });
  const dlg = page.getByRole('dialog', { name: 'Image viewer' });
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('img')).toHaveAttribute('src', gallery[0]!.src);
});

test('perfume renders detail: a personal product visualization project with all three renders', async ({ page }) => {
  await page.goto('/3d/perfume-renders');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Perfume Product Renders');
  await expect(main.locator('dt', { hasText: 'Category' }).locator('+ dd')).toHaveText('Product Visualization');
  await expect(main.locator('dt', { hasText: 'Client' }).locator('+ dd')).toHaveText('Personal project');
  expect(await main.locator('.about p').count()).toBeGreaterThanOrEqual(2);
  await expect(main.locator('.mosaic img')).toHaveCount(3);
  await expect(main.getByRole('heading')).toHaveCount(1); // the h1 only: no gallery heading
  const dlg = page.getByRole('dialog', { name: 'Image viewer' });
  await main.locator('[data-open-lightbox]').first().click({ position: { x: 30, y: 40 } });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByText('1 / 3')).toBeVisible();
});

for (const width of [390, 820, 1440]) {
  test(`no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/software', '/3d', '/software/primo-pinnacle', '/software/stocksense', '/software/jomlah', '/software/fixer', '/software/fuzzy-logic', '/3d/moltech-johor-warehouse', '/3d/johex', '/3d/gobami', '/3d/exhibition-booths', '/3d/perfume-renders']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(width);
    }
  });
}

test('each software gallery sits on a backdrop in the colours of its own app', async ({ page }) => {
  // [slug, theme.from as rgb] - sampled from each app's UI (see the project YAML).
  const cases = [
    ['primo-pinnacle', 'rgb(27, 61, 130)'],
    ['stocksense', 'rgb(19, 37, 74)'],
    ['jomlah', 'rgb(91, 52, 214)'],
    ['fuzzy-logic', 'rgb(242, 207, 182)'],
    ['fixer', 'rgb(29, 79, 122)'],
  ] as const;
  const seen = new Set<string>();
  for (const [slug, from] of cases) {
    await page.goto(`/software/${slug}`);
    const bg = await page.locator('.shots .panel').first().evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bg).toContain('gradient');
    expect(bg).toContain(from);
    seen.add(bg);
    // No shared blue left over.
    expect(bg).not.toContain('rgb(36, 73, 216)');
  }
  expect(seen.size).toBe(5);
});

test("the Moltech client name links to the client's website; clients without a website stay plain text", async ({ page }) => {
  await page.goto('/3d/moltech-johor-warehouse');
  const dd = page.getByRole('main').locator('dt', { hasText: 'Client' }).locator('+ dd');
  const link = dd.getByRole('link', { name: 'Moltech (opens in a new tab)' });
  await expect(link).toHaveAttribute('href', 'https://moltechglobal.com');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  // A visible external-link affordance next to the name.
  await expect(link.locator('svg')).toBeVisible();
  await expect(page.getByRole('main').locator('.about')).toContainText('headquartered in Singapore');
  for (const path of ['/3d/slice-2025', '/3d/gobami']) {
    await page.goto(path);
    await expect(page.getByRole('main').locator('dt', { hasText: 'Client' }).locator('+ dd').getByRole('link')).toHaveCount(0);
  }
});

test('a client website project: no course, the type in the eyebrow and facts, and a prominent "Visit website" link', async ({ page }) => {
  await page.goto('/software/primo-pinnacle');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Primo Pinnacle – Company Website');
  await expect(main.locator('.eyebrow')).toHaveText(/Freelance client project · Individual$/);
  const facts = main.getByRole('complementary', { name: 'Project facts' });
  expect(await facts.locator('dt').allTextContents()).toEqual(['Type', 'Client', 'Platform', 'Year']);
  await expect(facts).toContainText('Freelance client project');
  await expect(facts.locator('dt', { hasText: 'Client' }).locator('+ dd')).toHaveText('Primo Pinnacle');
  await expect(facts.locator('dt', { hasText: 'Platform' }).locator('+ dd')).toHaveText('Website');
  await expect(facts).toContainText('2026');
  await expect(facts.getByRole('list', { name: 'Tech stack' }).getByRole('listitem')).toHaveText(['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Vitest', 'Playwright', 'Netlify']);
  await expect(main.getByRole('region', { name: 'Team' })).toHaveCount(0);
  // The link sits with the title, visible without scrolling past the header.
  const visit = main.locator('.head').getByRole('link', { name: 'Visit the Primo Pinnacle website (opens in a new tab)' });
  await expect(visit).toHaveAttribute('href', 'https://primopinnacle.co');
  await expect(visit).toHaveAttribute('target', '_blank');
  await expect(visit).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(visit).toContainText('Visit website');
  await expect(main.getByRole('link', { name: /Visit the .* website/ })).toHaveCount(1);
  await expect(main.locator('.shots .win')).toHaveCount(5);
  await expect(main.locator('a.hero img')).toHaveAttribute('src', /00-mockup/);
  for (const slug of ['stocksense', 'jomlah', 'fuzzy-logic', 'fixer']) {
    await page.goto(`/software/${slug}`);
    await expect(page.getByRole('main').getByRole('link', { name: /Visit the .* website/ })).toHaveCount(0);
    expect(await page.getByRole('complementary', { name: 'Project facts' }).locator('dt').allTextContents()).toContain('Course');
  }
});
