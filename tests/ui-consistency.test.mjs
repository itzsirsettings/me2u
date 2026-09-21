import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("app navigation consistently uses the dashboard navigation system", () => {
  const navigation = read("components/BottomNav.tsx");

  assert.match(navigation, /design-reference-nav/);
  assert.match(navigation, /ReferenceIcon/);
  assert.doesNotMatch(navigation, /Me2uIcon/);
  assert.match(navigation, /"\/bills"/);
  assert.match(navigation, /"\/account-unlock"/);
});

test("dashboard activity indicators are sourced from the current account", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const referrals = read("app/referrals/page.tsx");

  assert.match(dashboard, /user\.trustScore/);
  assert.match(dashboard, /user\.verifiedReferralCount/);
  assert.match(dashboard, /ReferenceNotifications className="design-balance-notifications"/);
  assert.match(referrals, /stats\?\.total_earned/);
  assert.doesNotMatch(referrals, /total_referrals \* 2500/);
});

test("private KYC and receipt images remain authorized and visible to the intended viewer", () => {
  const uploads = read("lib/private-images.ts");
  const kyc = read("app/kyc/page.tsx");
  const admin = read("app/admin/page.tsx");

  assert.match(uploads, /\/api\/uploads\/file\/\$\{fileId\}/);
  assert.match(uploads, /uuidPattern\.test\(fileId\)/);
  assert.match(kyc, /privateImageUrl\(user\.passportPhotoUrl\)/);
  assert.match(kyc, /Selected passport photo preview/);
  assert.match(admin, /src=\{proof\.receipt_signed_url\}/);
  assert.match(admin, /alt=\{`Payment receipt submitted by \$\{proof\.user_name\}`\}/);
});
