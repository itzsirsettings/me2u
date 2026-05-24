import { test, expect } from '@playwright/test';

test('landing page loads and shows cooperative messaging', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Me2U/i);
  await expect(page.getByRole('heading', { name: /Zero-interest lending/i })).toBeVisible();

  const hero = page.locator('#hero');
  const heroImages = hero.locator('img[src*="Hero_final.png"]');
  await expect(heroImages).toHaveCount(1);
  await expect(heroImages.first()).toBeVisible();

  await expect(hero.getByRole('link', { name: 'Open account' })).toBeVisible();
  await expect(hero.getByRole('link', { name: 'Learn more' })).toBeVisible();
  await expect(hero.getByRole('link', { name: 'No Interest' })).toBeVisible();
});
