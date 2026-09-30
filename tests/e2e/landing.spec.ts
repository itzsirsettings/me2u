import { test, expect } from "@playwright/test";

test("landing page loads and shows cooperative messaging", async ({ page }) => {
  const requestedUrls: string[] = [];
  page.on("request", (request) => requestedUrls.push(request.url()));

  await page.goto("/");

  await expect(page).toHaveTitle(/Me2U.*Trust/i);
  await expect(page.getByRole("heading", { name: /Borrow with clarity/i })).toBeVisible();

  const hero = page.locator("#hero");
  await expect(hero.locator(".hero-blackhole-fallback")).toBeVisible();
  await expect(hero.locator("canvas")).toHaveCount(1);
  expect(requestedUrls.some((url) => url.includes("/api/auth/me"))).toBe(false);

  await expect(hero.getByRole("link", { name: "Start Building Trust" })).toBeVisible();
  await expect(hero.getByRole("link", { name: "See the Me2U journey" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Free Account" }).last()).toBeVisible();

  const hiddenNavItems = ["How it works", "Features", "Trust Score", "Circles", "FAQs"];
  const primaryNav = page.getByRole("navigation", { name: "Primary" });
  for (const label of hiddenNavItems) {
    await expect(primaryNav.getByRole("link", { name: label, exact: true })).toHaveCount(0);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open menu" }).click();
  const mobileNav = page.getByRole("navigation", { name: "Mobile" });
  for (const label of hiddenNavItems) {
    await expect(mobileNav.getByRole("link", { name: label, exact: true })).toHaveCount(0);
  }
});
