import { test, expect } from "@playwright/test";

const mobileViewport = { width: 390, height: 844 };

test.use({ viewport: mobileViewport });

const paths = ["/", "/login", "/register", "/learn"];

for (const path of paths) {
  test(`no horizontal overflow on mobile: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
    });

    expect(
      overflow.scrollWidth,
      `scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
}

test("login password input is masked on mobile login", async ({ page }) => {
  await page.goto("/login");
  const password = page.locator("#login-password");
  await expect(password).toBeVisible();
  await expect(password).toHaveAttribute("type", "password");
});
