import { test, expect, type Page } from '@playwright/test';

const gallery = async (page: Page) =>
  JSON.parse((await page.locator('[data-gallery]').getAttribute('data-gallery'))!) as { src: string; alt: string }[];

test('opens on click, wraps with arrows, closes with Esc and restores focus', async ({ page }) => {
  await page.goto('/software/stocksense');
  const count = (await gallery(page)).length;
  const opener = page.locator('.shots [data-open-lightbox]').first();
  await opener.focus();
  await page.keyboard.press('Enter');
  const dlg = page.getByRole('dialog', { name: 'Image viewer' });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByText(`2 / ${count}`)).toBeVisible(); // the first window is the second image
  const img = dlg.locator('img');
  const first = await img.getAttribute('src');
  for (let i = 0; i < count; i++) await page.keyboard.press('ArrowRight');
  await expect(img).toHaveAttribute('src', first!); // wrapped back
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
  await expect(opener).toBeFocused();
});

test('the hero mockup opens the cover in the lightbox', async ({ page }) => {
  await page.goto('/software/fixer');
  await page.locator('a.hero[data-open-lightbox]').click();
  const dlg = page.getByRole('dialog', { name: 'Image viewer' });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByText(`1 / ${(await gallery(page)).length}`)).toBeVisible();
});

test('every screenshot and render opens the lightbox on its own image', async ({ page }) => {
  for (const path of ['/software/jomlah', '/software/fixer', '/3d/slice-2025']) {
    await page.goto(path);
    const items = await gallery(page);
    const openers = page.locator('[data-open-lightbox]');
    const n = await openers.count();
    expect(n).toBe(items.length);
    const dlg = page.getByRole('dialog', { name: 'Image viewer' });
    for (let i = 0; i < n; i++) {
      const o = openers.nth(i);
      await o.scrollIntoViewIfNeeded();
      // Windows overlap lower down, so click near the top-left; phones never overlap, so click their centre.
      const isPhone = await o.evaluate((el) => el.classList.contains('phone'));
      await o.click(isPhone ? undefined : { position: { x: 30, y: 40 } });
      await expect(dlg).toBeVisible();
      const idx = Number(await o.getAttribute('data-index'));
      await expect(dlg.locator('img')).toHaveAttribute('src', items[idx]!.src);
      await page.keyboard.press('Escape');
      await expect(dlg).toBeHidden();
      // A hovered or keyboard-focused window rises above its neighbours; move away and blur first.
      await page.mouse.move(0, 0);
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    }
  }
});

test('backdrop click closes', async ({ page }) => {
  await page.goto('/3d/gobami');
  await page.locator('[data-open-lightbox]').first().click();
  const dlg = page.getByRole('dialog', { name: 'Image viewer' });
  await expect(dlg).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dlg).toBeHidden();
});

test('broken image falls back to alt text and recovers on next', async ({ page }) => {
  await page.goto('/software/stocksense');
  const items = await gallery(page);
  const broken = items[1]!;
  await page.route((url) => url.pathname === broken.src, (route) => route.fulfill({ status: 404, body: 'not found' }));
  await page.locator('.shots [data-open-lightbox]').first().click({ position: { x: 30, y: 40 } });
  const dlg = page.getByRole('dialog', { name: 'Image viewer' });
  await expect(dlg).toBeVisible();
  const img = dlg.locator('img');
  await expect(img).toBeHidden();
  await expect(dlg.getByText(broken.alt)).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(img).toBeVisible();
});
