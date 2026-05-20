import { test, expect } from '@playwright/test';

test('landing page loads and shows cooperative messaging', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Me2U/i);
  await expect(page.getByRole('heading', { name: /Freedom to borrow your way/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Create account/i }).first()).toBeVisible();
  await expect(page.getByText(/cooperatives/i)).toBeVisible();
});
