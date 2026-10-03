import { test, expect } from '@playwright/test';

test('opens on click, wraps with arrows, closes with Esc and restores focus', async ({ page }) => {
  await page.goto('/software');
  const section = page.locator('section[data-filter-item]').first();
  const count = JSON.parse((await section.locator('[data-gallery]').getAttribute('data-gallery'))!).length;
  const opener = section.locator('[data-slide]:visible');
  await opener.focus();
  await page.keyboard.press('Enter');
  const dlg = page.getByRole('dialog', { name: 'Image viewer' });
  await expect(dlg).toBeVisible();
  const img = dlg.locator('img');
  const first = await img.getAttribute('src');
  if (count > 1) {
    for (let i = 0; i < count; i++) await page.keyboard.press('ArrowRight');
    await expect(img).toHaveAttribute('src', first!); // wrapped back to the first image
    await expect(dlg.getByText(`1 / ${count}`)).toBeVisible();
  } else {
    await expect(dlg.getByRole('button', { name: 'Next image' })).toBeHidden();
  }
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
  await expect(opener).toBeFocused();
});

test('backdrop click closes', async ({ page }) => {
  await page.goto('/software');
  await page.locator('section[data-filter-item] [data-slide]:visible').first().click();
  const dlg = page.getByRole('dialog', { name: 'Image viewer' });
  await expect(dlg).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dlg).toBeHidden();
});
