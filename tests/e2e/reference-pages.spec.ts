import { expect as baseExpect, test, type Page } from "@playwright/test";

const expect = baseExpect.configure({ timeout: 30000 });

const account = {
  id: "reference-test-account",
  name: "Obia Ikpi",
  username: "obsfood",
  email: "obsfoodvendure@gmail.com",
  countryCode: "NG",
  preferredCurrency: "NGN",
  preferredLanguage: "en",
  phone: null,
  bankName: null as string | null,
  accountNumber: null as string | null,
  passportPhotoUrl: null as string | null,
  balance: 0,
  locked: 0,
  trustScore: 50,
  kycVerified: false,
  registrationDepositPaid: true,
  verifiedReferralCount: 0,
  weeklyVerifiedReferralCount: 0,
  affiliateEarnings: 0,
  accountUnlocked: false,
  role: "user",
  createdAt: "2026-09-01T12:00:00Z",
};
const unlockStatus = {
  isUnlocked: false,
  referralsNeeded: 10,
  paymentMade: false,
  daysUntilEligible: 0,
  canUnlockNow: false,
  hasActiveSubscription: false,
  unlockFee: 2000,
  status: "locked",
};

type MockOptions = {
  user?: Partial<typeof account>;
  unlock?: Partial<typeof unlockStatus>;
  fail?: string[];
  populated?: boolean;
  unauthenticated?: boolean;
};

async function mockAccount(page: Page, options: MockOptions = {}) {
  await page.addInitScript(() => localStorage.setItem("me2u-theme", "light"));
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (options.fail?.includes(path)) {
      await route.fulfill({ status: 503, json: { error: "Temporarily unavailable" } });
      return;
    }
    if (path === "/api/auth/me") {
      await route.fulfill({
        status: options.unauthenticated ? 401 : 200,
        json: { user: { ...account, ...options.user } },
      });
      return;
    }
    const responses: Record<string, unknown> = {
      "/api/auth/me/transactions": { transactions: [] },
      "/api/auth/me/loans": { loans: [] },
      "/api/auth/me/marketplace": { items: [] },
      "/api/auth/me/notifications": {
        notifications: [
          {
            id: "test-notice",
            title: "Welcome to Me2U",
            message: "Your account is ready.",
            is_read: false,
            created_at: "2026-09-20T10:00:00Z",
          },
        ],
      },
      "/api/referrals": {
        stats: {
          total_referrals: options.populated ? 2 : 0,
          total_earned: options.populated ? 3000 : 0,
          pending_withdrawal: 0,
          pending_repayment: 0,
          earned_withdrawal: 0,
          earned_repayment: 0,
        },
        referrals: options.populated
          ? [
              {
                referee_id: "ref-1",
                referee_name: "Ada Example",
                referee_kyc_verified: true,
                pending_rewards: "Awaiting first withdrawal",
                signup_rewarded: true,
              },
            ]
          : [],
      },
      "/api/referrals/challenges": {
        current: options.populated
          ? {
              active: true,
              current: 2,
              target: 5,
              reward: 5000,
              completed: false,
              week_end: "2026-09-27T23:59:59Z",
            }
          : null,
      },
      "/api/referrals/milestones": {
        milestones: options.populated
          ? [
              {
                type: "five",
                referralCount: 5,
                rewardAmount: 500,
                badgeAwarded: "Builder",
                achieved: false,
                progress: 40,
              },
            ]
          : [],
      },
      "/api/referrals/leaderboard": {
        leaderboard: options.populated
          ? [
              {
                user_id: "ref-1",
                username: "ada",
                verified_referral_count: 12,
                rank: 1,
                prizeAmount: 50000,
                is_current_user: false,
              },
            ]
          : [],
        userPosition: null,
      },
      "/api/account/unlock": { ...unlockStatus, ...options.unlock },
      "/api/notifications/clear": { success: true },
    };
    await route.fulfill({ json: responses[path] ?? {} });
  });
}

test.describe("reference account surfaces", () => {
  test.setTimeout(180000);

  test("portrait layouts render without overflow at phone, reference, and desktop widths", async ({
    page,
  }, testInfo) => {
    await mockAccount(page);
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    for (const width of [360, 390, 470, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["dashboard", "profile", "referrals"]) {
        await page.goto(`/${route}`);
        await expect(page.locator(".design-screen")).toBeVisible();
        await expect(page.locator(".design-toolbar")).toBeVisible();
        await expect(
          page.getByRole("navigation", { name: "Primary navigation" }),
        ).toBeVisible();
        if (route === "referrals")
          await expect(page.locator(".design-stat").first()).toContainText("0");
        await page.evaluate(() => document.fonts.ready);
        const screen = page.locator(".design-screen");
        const layout = await screen.evaluate((element) => ({
          scroll: document.documentElement.scrollWidth,
          width: document.documentElement.clientWidth,
          main: element.getBoundingClientRect().width,
        }));
        expect(layout.scroll).toBeLessThanOrEqual(layout.width + 1);
        expect(layout.main).toBeLessThanOrEqual(route === "referrals" ? 420 : 470);
        await expect(page.locator('main img[alt="Me2U"]')).toHaveCount(0);
        await page.screenshot({
          path: testInfo.outputPath(`${route}-${width}.png`),
          fullPage: true,
          animations: "disabled",
        });
      }
    }
    expect(browserErrors).toEqual([]);
  });

  test("balance visibility, trust ring, notifications, and destinations work", async ({
    page,
  }) => {
    await mockAccount(page, { user: { balance: 1234567.89 } });
    await page.goto("/dashboard");
    await expect(page.getByTestId("main-balance")).toHaveText("₦1,234,567.89");
    await page.getByRole("button", { name: "Hide balance" }).click();
    await expect(page.getByTestId("main-balance")).toHaveText("₦••••••");
    await page.getByRole("button", { name: "Show balance" }).click();
    await expect(page.locator(".design-score-progress")).toHaveAttribute(
      "stroke-dasharray",
      "50 100",
    );
    await page.getByRole("button", { name: "Open notifications" }).click();
    await expect(page.getByRole("dialog", { name: "Notifications" })).toContainText(
      "Welcome to Me2U",
    );
    await page.getByRole("button", { name: "Close Notifications" }).click();
    for (const [label, path] of [
      ["Receive", "/wallet"],
      ["Withdraw", "/withdraw"],
      ["Complete KYC", "/kyc"],
      ["Refer a friend", "/referrals"],
    ]) {
      await expect(page.getByRole("link", { name: new RegExp(label) }).first()).toHaveAttribute(
        "href",
        path,
      );
    }
  });

  test("admin accounts can reach the review dashboard from their profile", async ({ page }) => {
    await mockAccount(page, { user: { role: "admin" } });
    await page.goto("/profile");
    await expect(page.getByRole("link", { name: "Open Admin Dashboard" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  test("profile state and theme preferences persist", async ({ page }) => {
    await mockAccount(page, {
      user: { kycVerified: true, bankName: "Example Bank", accountNumber: "1234567890" },
    });
    await page.goto("/profile");
    await expect(page.locator(".design-status")).toHaveText("Approved");
    await expect(page.locator(".design-account-rows")).toContainText(
      "Example Bank • 1234567890",
    );
    await expect(page.getByRole("link", { name: "Edit Profile" })).toHaveAttribute(
      "href",
      "/security",
    );
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("button", { name: "Dark", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await page.evaluate(() => localStorage.getItem("me2u-theme"))).toBe("dark");
    await page.getByRole("navigation").getByRole("link", { name: "Home", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Profile", exact: true })
      .click();
    await page.emulateMedia({ colorScheme: "dark" });
    await page.getByRole("button", { name: "System", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "Logout", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("eye stays beside the amount while bell stays right aligned", async ({
    page,
  }) => {
    await mockAccount(page, { user: { balance: 1234567.89 } });
    await page.goto("/dashboard");
    for (const width of [320, 390, 470, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const amount = await page.getByTestId("main-balance").boundingBox();
      const eye = await page.getByRole("button", { name: "Hide balance" }).boundingBox();
      const bell = await page.getByRole("button", { name: "Open notifications" }).boundingBox();
      const balance = await page.locator(".design-balance").boundingBox();
      expect(amount).not.toBeNull();
      expect(eye).not.toBeNull();
      expect(bell).not.toBeNull();
      expect(balance).not.toBeNull();
      expect(
        Math.abs(amount!.y + amount!.height / 2 - eye!.y - eye!.height / 2),
      ).toBeLessThanOrEqual(1);
      expect(
        eye!.x - amount!.x - amount!.width,
      ).toBeGreaterThanOrEqual(0);
      expect(Math.abs(balance!.x + balance!.width - bell!.x - bell!.width - 18)).toBeLessThanOrEqual(2);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBe(true);
    }
  });

  test("large balances remain contained beside the controls", async ({ page }) => {
    await mockAccount(page, { user: { balance: 1_000_000_000 } });
    await page.goto("/dashboard");
    for (const width of [320, 360, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(page.getByTestId("main-balance")).toHaveText("₦1,000,000,000.00");
      const layout = await page.evaluate(() => {
        const amount = document.querySelector<HTMLElement>('[data-testid="main-balance"]');
        const eye = document.querySelector<HTMLElement>('button[aria-label="Hide balance"]');
        const bell = document.querySelector<HTMLElement>(".design-balance-notifications");
        const card = document.querySelector<HTMLElement>(".design-balance");
        if (!amount || !eye || !bell || !card) return null;
        const amountBox = amount.getBoundingClientRect();
        const eyeBox = eye.getBoundingClientRect();
        const bellBox = bell.getBoundingClientRect();
        const cardBox = card.getBoundingClientRect();
        return {
          amountRight: amountBox.right,
          eyeLeft: eyeBox.left,
          bellLeft: bellBox.left,
          cardRight: cardBox.right,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      expect(layout).not.toBeNull();
      expect(layout!.amountRight).toBeLessThanOrEqual(layout!.eyeLeft);
      expect(layout!.bellLeft + 44).toBeLessThanOrEqual(layout!.cardRight);
      expect(layout!.scrollWidth).toBeLessThanOrEqual(width);
    }
  });

  test("pending KYC shows the stored photo and can update bank details without reuploading it", async ({
    page,
  }) => {
    const user = {
      id: "e2f7e540-6d8a-4ec1-b026-6eece1904c83",
      bankName: "Example Bank",
      accountNumber: "1234567890",
      passportPhotoUrl:
        "e2f7e540-6d8a-4ec1-b026-6eece1904c83/7b3bff9c-85fc-4d4f-a180-aa8893587804-passport.png",
    };
    await mockAccount(page, { user });
    await page.route("**/api/uploads/file/*", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
          "base64",
        ),
      }),
    );
    let submitted: Record<string, string> | null = null;
    let uploads = 0;
    await page.route("**/api/uploads/private-image", (route) => {
      uploads += 1;
      return route.fulfill({ status: 500, json: {} });
    });
    await page.route("**/api/onboarding/kyc", async (route) => {
      submitted = route.request().postDataJSON() as Record<string, string>;
      user.bankName = submitted.bankName;
      await route.fulfill({ json: { success: true, status: "pending_review" } });
    });
    await page.goto("/kyc");
    const photo = page.getByRole("img", { name: "Submitted passport photo" });
    await expect(photo).toBeVisible();
    await expect
      .poll(() => photo.evaluate((image) => (image as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: "Update submission" }).click();
    await expect(page.getByLabel("Bank Name", { exact: true })).toHaveValue("Example Bank");
    await page.getByLabel("Bank Name", { exact: true }).fill("Updated Bank");
    await page.getByRole("button", { name: "Save updated submission" }).click();
    await expect(page.getByRole("heading", { name: "KYC Under Review" })).toBeVisible();
    await expect(page.getByText("Updated Bank", { exact: true })).toBeVisible();
    expect(submitted).toEqual({
      bankName: "Updated Bank",
      accountNumber: user.accountNumber,
      passportPhotoUrl: user.passportPhotoUrl,
    });
    expect(uploads).toBe(0);
  });

  test("referral QR, details, leaderboard, and share fallback remain accessible", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await mockAccount(page, { populated: true });
    await page.goto("/referrals");
    await expect(page.locator(".design-stat").nth(2)).toContainText("₦3,000");
    await expect(page.locator(".design-stat").nth(3)).toContainText("Pending milestones");
    await expect(page.locator(".design-stat").nth(3)).toContainText("0");
    await page.getByRole("button", { name: "Copy referral link", exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/r\/obsfood$/);
    await page.evaluate(() =>
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined }),
    );
    await page.getByRole("button", { name: "Share", exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/r\/obsfood$/);
    await page.getByRole("link", { name: "Open Refer & Earn" }).click();
    await expect(page).toHaveURL(/panel=qr/);
    await expect(page.getByRole("dialog", { name: "Your referral QR code" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Referral invite QR code" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("link", { name: "View Details" }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "You earn ₦1,500 referral bonus and they earn ₦500.",
    );
    await expect(page.getByRole("dialog")).toContainText("Ada Example");
    await expect(page.getByRole("dialog")).toContainText("40% complete");
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "View Leaderboard" }).click();
    await expect(page.getByRole("dialog")).toContainText("ada");
    await expect(page.getByRole("dialog")).toContainText("₦50,000");
  });

  test("partial failure is not represented as zero and can be retried", async ({ page }) => {
    const failures = ["/api/referrals"];
    await mockAccount(page, { fail: failures, populated: true });
    await page.goto("/referrals");
    await expect(page.locator(".design-data-error")).toContainText("unavailable");
    await expect(page.locator(".design-stat").first()).toContainText("—");
    await expect(page.locator(".design-stat").nth(2)).toContainText("—");
    await page.getByRole("link", { name: "View Leaderboard" }).click();
    await expect(page.getByRole("dialog")).toContainText("ada");
    await page.keyboard.press("Escape");
    failures.length = 0;
    await page.locator(".design-data-error").getByRole("button", { name: "Retry" }).click();
    await expect(page.locator(".design-stat").first()).toContainText("2");
    await expect(page.locator(".design-data-error")).toHaveCount(0);
  });

  for (const state of [
    {
      name: "waiting",
      unlock: { paymentMade: true, daysUntilEligible: 9, status: "waiting_period" },
      text: "9 days until withdrawal eligibility",
    },
    {
      name: "unlocked",
      unlock: { isUnlocked: true, status: "unlocked" },
      text: "Withdrawals unlocked",
    },
    {
      name: "eligible",
      unlock: { referralsNeeded: 0, status: "eligible_via_referrals" },
      text: "You’re eligible to unlock withdrawals",
    },
  ]) {
    test(`unlock state is accurate: ${state.name}`, async ({ page }) => {
      await mockAccount(page, { unlock: state.unlock });
      await page.goto("/referrals");
      await expect(page.locator(".design-unlock-notice")).toContainText(state.text);
      await expect(page.locator(".design-unlock-notice")).not.toContainText("instantly");
    });
  }

  test("long account data and large balances remain readable without overflow", async ({
    page,
  }) => {
    await mockAccount(page, {
      user: {
        name: "An exceptionally long account holder name with several surnames",
        username: "averylongreferralusername1234567890",
        email: "averylongemailaddresswithmanycharacters@example-financial-services.com",
        balance: 999999999999.99,
        verifiedReferralCount: 12345,
      },
    });
    await page.setViewportSize({ width: 360, height: 800 });
    for (const path of ["/dashboard", "/profile", "/referrals"]) {
      await page.goto(path);
      await expect(page.locator(".design-toolbar")).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBe(true);
    }
  });

  test("all three routes preserve authentication redirects", async ({ page }) => {
    await mockAccount(page, { unauthenticated: true });
    for (const path of ["/dashboard", "/profile", "/referrals"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
