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
