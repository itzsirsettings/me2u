import { test, expect } from "@playwright/test";

test("landing page loads and shows cooperative messaging", async ({ page }) => {
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));

  await page.goto("/");

  await expect(page).toHaveTitle(/Me2U.*Trust/i);
  await expect(page.getByRole("heading", { name: /Borrow with clarity/i })).toBeVisible();

  const hero = page.locator("#hero");
  const heroImages = hero.locator('img[src*="hero-final.webp"]');
  await expect(heroImages).toHaveCount(1);
  await expect(heroImages.first()).toBeVisible();
  await expect(hero.locator("canvas")).toHaveCount(1);
  expect(requestedUrls.some((url) => url.includes("/api/auth/me"))).toBe(false);

  await expect(hero.getByRole("link", { name: "Start Building Trust" })).toBeVisible();
  await expect(hero.getByRole("link", { name: "See the Me2U journey" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Free Account" }).last()).toBeVisible();
});
