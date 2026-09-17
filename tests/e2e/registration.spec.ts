import { test, expect } from "@playwright/test";

for (const outcome of ["success", "invalid", "network"] as const) {
  test(`verification button submits and handles ${outcome}`, async ({ page }) => {
    let verificationRequests = 0;
    await page.route("**/api/auth/register", async (route) => {
      const body = route.request().postDataJSON();
      if (body.step === "send_code") {
        await route.fulfill({ json: { success: true, token: "test-challenge" } });
        return;
      }
      expect(body.step).toBe("verify_code");
      expect(body.email).toBe("member@example.test");
      expect(body.code).toBe("123456");
      expect(body.token).toBe("test-challenge");
      verificationRequests++;
      if (outcome === "network") {
        await route.abort();
      } else {
        await route.fulfill({
          status: outcome === "success" ? 200 : 400,
          json:
            outcome === "success"
              ? { success: true, registrationToken: "test-registration" }
              : { error: "Invalid verification code." },
        });
      }
    });
    await page.goto("/register");
    await page.getByLabel("Email Address", { exact: true }).fill("member@example.test");
    await page.getByRole("button", { name: "Send Verification Code", exact: true }).click();
    await page.getByLabel("Enter 6-Digit Code").fill("123456");
    await page.getByRole("button", { name: "Verify Email", exact: true }).click();
    await expect.poll(() => verificationRequests).toBe(1);
    if (outcome === "success") {
      await expect(page.getByRole("heading", { name: "Complete Registration" })).toBeVisible();
      await expect(page.getByLabel("First Name", { exact: true })).toBeVisible();
    } else {
      await expect(
        page.getByText(
          outcome === "network" ? "Failed to verify code." : "Invalid verification code.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Verify Email", exact: true }),
      ).toBeEnabled();
      await expect(page.getByRole("heading", { name: "Complete Registration" })).toHaveCount(0);
    }
  });
}
