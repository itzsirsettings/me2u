import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("production hosts separate marketing and application routes", () => {
  const proxy = read("proxy.ts");

  assert.match(proxy, /const APP_HOST = "app\.me2ulend\.online"/);
  assert.match(proxy, /const LANDING_HOST = "www\.me2ulend\.online"/);
  assert.match(proxy, /pathname === "\/" \? LANDING_HOST : APP_HOST/);
  assert.match(proxy, /hostname === LANDING_HOST && pathname !== "\/"/);
  assert.match(proxy, /url\.pathname = "\/login"/);
  assert.match(proxy, /url\.pathname = "\/register"/);
  assert.match(proxy, /X-Robots-Tag/);
  assert.match(proxy, /INDEXABLE_APP_PREFIXES/);
});

test("landing site sends sign up and login to the app domain", () => {
  const landingSurfaces = [
    "components/landing/AdvancedToolsSection.tsx",
    "components/landing/CommunityCirclesSection.tsx",
    "components/landing/FeaturesSection.tsx",
    "components/landing/HeroSection.tsx",
    "components/landing/HowItWorksSection.tsx",
    "components/landing/LandingHeader.tsx",
    "components/landing/PublicProofSection.tsx",
    "components/ui/aero-hero-3.tsx",
    "components/ui/motion-footer.tsx",
  ];

  for (const path of landingSurfaces) {
    const source = read(path);
    assert.doesNotMatch(source, /href="\/(login|register)"/);
    assert.doesNotMatch(source, /router\.push\("\/register"\)/);
  }

  const header = read("components/landing/LandingHeader.tsx");
  const footer = read("components/ui/motion-footer.tsx");
  const callToAction = read("components/ui/aero-hero-3.tsx");
  const appRegister = /https:\/\/app\.me2ulend\.online\/register/;
  const appLogin = /https:\/\/app\.me2ulend\.online\/login/;

  for (const surface of [header, footer, callToAction]) {
    assert.match(surface, appRegister);
  }
  for (const surface of [header, footer]) {
    assert.match(surface, appLogin);
  }

  assert.match(footer, /https:\/\/app\.me2ulend\.online\/support/);
  assert.match(footer, /https:\/\/app\.me2ulend\.online\/legal\/privacy-policy/);
});

test("public launch exposes only public pages to search engines", () => {
  const robots = read("app/robots.ts");
  const sitemap = read("app/sitemap.ts");
  const landing = read("app/page.tsx");

  assert.match(robots, /\/api\//);
  assert.match(robots, /\/admin/);
  assert.match(robots, /\/wallet/);
  assert.match(robots, /sitemap\.xml/);
  assert.match(sitemap, /https:\/\/www\.me2ulend\.online/);
  assert.match(sitemap, /legalDocuments/);
  assert.match(sitemap, /supportDocuments/);
  assert.match(landing, /canonical: "https:\/\/www\.me2ulend\.online"/);
  assert.match(landing, /"@type": "Organization"/);
  assert.match(landing, /"@type": "WebSite"/);
});

test("browser login keeps the JWT out of the JSON response", () => {
  const login = read("app/api/auth/login/route.ts");
  const authStore = read("lib/store/auth.ts");

  assert.doesNotMatch(login, /bodyPayload\s*=\s*\{[^}]*token/);
  assert.doesNotMatch(authStore, /data\.token/);
  assert.match(login, /withAuthCookiesForLogin\(response, token\)/);
});

test("launch readiness covers production dependencies", () => {
  const readiness = read("lib/server/launch-readiness.ts");
  const runner = read("run-migrations.js");

  for (const dependency of [
    "DATABASE_URL",
    "AUTH_TOKEN_SECRET",
    "REDIS_URL",
    "PAYSTACK_SECRET_KEY",
    "EMAIL_FROM",
    "NEXT_PUBLIC_APP_URL",
    "CRON_SECRET",
  ]) {
    assert.match(readiness, new RegExp(`"${dependency}"`));
  }
  assert.match(readiness, /RESEND_API_KEY/);
  assert.match(runner, /readdirSync\(migrationsDir\)/);
  assert.match(runner, /schema_migrations/);
});

test("Railway migration runner includes the complete authoritative track", () => {
  const runner = read("run-all-migrations.py");
  const migrationGuide = read("RAILWAY_MIGRATION.md");

  for (const migration of [
    "015_referral_reward_consolidation.sql",
    "016_badge_check_transactions_fix.sql",
    "017_registration_deposit_unlock_invariant.sql",
    "018_reclassify_legacy_registration_deposits.sql",
    "019_registration_identity_integrity.sql",
    "020_referral_challenge_integrity.sql",
  ]) {
    assert.match(runner, new RegExp(migration.replaceAll(".", "\\.")));
  }
  assert.match(migrationGuide, /railway\/migrations\/001.*020/);
  assert.match(migrationGuide, /run-all-migrations\.py/);
});

test("referral API failures include structured route context", () => {
  const routes = [
    ["app/api/referrals/route.ts", "/api/referrals"],
    ["app/api/referrals/share-tracking/route.ts", "/api/referrals/share-tracking"],
    ["app/api/referrals/challenges/route.ts", "/api/referrals/challenges"],
    ["app/api/referrals/milestones/route.ts", "/api/referrals/milestones"],
    ["app/api/referrals/leaderboard/route.ts", "/api/referrals/leaderboard"],
  ];

  for (const [path, route] of routes) {
    assert.match(
      read(path),
      new RegExp(`errorResponse\\([\\s\\S]*${route.replaceAll("/", "\\/")}`),
    );
  }
});

test("direct referral copy and native share actions use existing tracking", () => {
  const referrals = read("app/referrals/page.tsx");

  assert.match(referrals, /trackDirectShare\("copy"\)/);
  assert.match(referrals, /trackDirectShare\("native_share"\)/);
  assert.match(referrals, /\/api\/referrals\/share-tracking/);
});
