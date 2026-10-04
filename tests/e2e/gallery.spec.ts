import { test, expect } from '@playwright/test';

test('software page lists four projects in order with descriptions visible', async ({ page }) => {
  await page.goto('/software');
  const titles = page.locator('section[data-filter-item] h2');
  await expect(titles).toHaveText([
    'StockSense – AI Inventory Prediction System',
    'JomLah – Centralized Event Management Platform',
    'Student Performance Prediction using Fuzzy Logic',
    'Fixer – On-Demand Home Repair Service App',
  ]);
  await expect(page.locator('section[data-filter-item]').first()).toContainText('LSTM model');
});

test('team wording on the listing eyebrows', async ({ page }) => {
  await page.goto('/software');
  await expect(page.locator('#stocksense .eyebrow')).toHaveText(/· Individual$/);
  await expect(page.locator('#jomlah .eyebrow')).toHaveText(/· Team of 3$/);
  await expect(page.locator('#fuzzy-logic .eyebrow')).toHaveText(/· Team of 5$/);
  await expect(page.locator('#fixer .eyebrow')).toHaveText(/· Team of 4$/);
});

for (const [listing, slugs] of [
  ['/software', ['stocksense', 'jomlah', 'fuzzy-logic', 'fixer']],
  ['/3d', ['moltech-johor-warehouse', 'slice-2025', 'gobami']],
] as const) {
  test(`${listing}: each project shows exactly one picture and no thumbnail strip`, async ({ page }) => {
    await page.goto(listing);
    const sections = page.locator('section[data-filter-item]');
    await expect(sections).toHaveCount(slugs.length);
    for (const s of await sections.all()) {
      await expect(s.locator('[data-cover]')).toHaveCount(1);
      await expect(s.locator('[data-cover] img')).toHaveCount(1); // one picture: no hidden slides or thumbnails
      await expect(s.locator('[data-thumbs], [data-thumb], [data-slide]')).toHaveCount(0);
    }
  });

  test(`${listing}: Learn More links open each detail page`, async ({ page }) => {
    for (const slug of slugs) {
      await page.goto(listing);
      const section = page.locator(`section#${slug}`);
      const title = (await section.locator('h2').textContent())!.trim();
      const more = section.getByRole('link', { name: /^Learn More/ });
      await expect(more).toHaveCount(1);
      await expect(more).toHaveAccessibleName(`Learn More about ${title}`);
      await expect(section.locator('[data-cover]')).toHaveAttribute('href', `${listing}/${slug}`);
      await more.click();
      await expect(page).toHaveURL(new RegExp(`${listing}/${slug}/?$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    }
  });
}

test('software listing pictures are device mockups (laptop or phone in hand)', async ({ page }) => {
  await page.goto('/software');
  for (const slug of ['stocksense', 'jomlah', 'fuzzy-logic']) await expect(page.locator(`#${slug} .laptop-scene`)).toHaveCount(1);
  await expect(page.locator('#fixer .phone-scene')).toHaveCount(1);
  // The cover screenshot is a crisp responsive image on the laptop screen.
  const img = page.locator('#stocksense .laptop-scene .screen img');
  await expect(img).toHaveAttribute('srcset', /\d+w/);
});
