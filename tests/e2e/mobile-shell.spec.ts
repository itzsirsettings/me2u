import { test, expect } from "@playwright/test";

const mobileViewport = { width: 390, height: 844 };

test.use({ viewport: mobileViewport });

const paths = ["/", "/login", "/register", "/learn"];

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  // Wait until fonts that shift layout are ready, then retry the measurement until
  // the document reaches a stable, non-overflowing state. `networkidle` is avoided:
  // background auth/profile calls keep the connection busy long after rendering.
  await page.evaluate(() => document.fonts.ready);
  let scrollWidth = Infinity;
  let clientWidth = 0;
  const deadline = Date.now() + 20000;
  do {
    const measured = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    scrollWidth = measured.scrollWidth;
    clientWidth = measured.clientWidth;
    if (scrollWidth <= clientWidth + 1) return;
    await page.waitForTimeout(500);
  } while (Date.now() < deadline);
  expect(
    scrollWidth,
    `scrollWidth=${scrollWidth} clientWidth=${clientWidth}`,
  ).toBeLessThanOrEqual(clientWidth + 1);
}

for (const path of paths) {
  test(`no horizontal overflow on mobile: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "load" });
    await expectNoHorizontalOverflow(page);
  });
}

test("login password input is masked on mobile login", async ({ page }) => {
  await page.goto("/login");
  const password = page.locator("#login-password");
  await expect(password).toBeVisible();
  await expect(password).toHaveAttribute("type", "password");
});
