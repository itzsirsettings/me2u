
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables manually without dotenv
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
} catch (e) {
  console.warn('⚠️ Could not read .env file');
}

// Copy getLaunchReadiness logic here for standalone check
const readValue = (name) => process.env[name]?.trim() || '';
const valueLooksPlaceholder = (name, value) => {
  const normalized = value.trim();
  if (!normalized) return true;
  if (/^(your-|xxxxx|re_xxxxx|sk-proj-your|sk_test_or_live|generate-a-|changeme|tbd|todo)/i.test(normalized)) return true;
  if (/(your-|xxxxx|example\.com|generate-a-)/i.test(normalized)) return true;
  // Don't flag localhost for Redis (it's fine locally)
  if (/(URL|BASE_URL|ORIGIN)$/i.test(name) && name !== 'REDIS_URL' && /(localhost|127\.0\.0\.1|example\.com)/i.test(normalized)) return true;
  return false;
};
const hasValue = (name) => Boolean(readValue(name)) && !valueLooksPlaceholder(name, readValue(name));
const isTrue = (name) => readValue(name).toLowerCase() === 'true';
const hasRecentEvidence = (name, maxAgeDays) => {
  const value = readValue(name);
  if (!value || valueLooksPlaceholder(name, value)) return false;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  const ageMs = Date.now() - parsed;
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return ageMs >= -24 * 60 * 60 * 1000 && ageMs <= maxAgeMs;
};

// Run checks
console.log('🔍 Me2U Launch Readiness Check\n');
const issues = [];

// Required checks (current architecture: Railway PostgreSQL + pg, SMTP email, Paystack, in-app OTP)
const requiredChecks = [
  { name: 'DATABASE_URL', alt: ['PGHOST', 'PGPASSWORD', 'PGDATABASE'], msg: 'PostgreSQL database URL' },
  { name: 'AUTH_TOKEN_SECRET', msg: 'Auth token secret (JWT signing)' },
  { name: 'REDIS_URL', msg: 'Redis URL (rate limiting)' },
  { name: 'SMTP_HOST', msg: 'SMTP host' },
  { name: 'SMTP_USER', msg: 'SMTP user' },
  { name: 'SMTP_PASSWORD', msg: 'SMTP password' },
  { name: 'EMAIL_FROM', msg: 'Email from address (non-placeholder)' },
  { name: 'PAYSTACK_SECRET_KEY', msg: 'Paystack secret key' },
];

requiredChecks.forEach(check => {
  const ok = hasValue(check.name) || (check.alt && check.alt.every(a => hasValue(a)));
  if (!ok) {
    issues.push(`❌ ${check.msg} missing or placeholder`);
  } else {
    console.log(`✅ ${check.msg} configured`);
  }
});

// Paystack production posture
const paystackKey = readValue('PAYSTACK_SECRET_KEY');
if (paystackKey.startsWith('sk_test_')) {
  console.log('⚠️  Paystack TEST key — fine for development, switch to sk_live_ before launch');
} else if (!paystackKey.startsWith('sk_live_')) {
  issues.push('❌ Paystack secret key must start with sk_live_ or sk_test_');
} else {
  console.log('✅ Paystack live key configured');
}

// Recommended (not blocking local dev, blocking for real-money launch)
const recommendedChecks = [
  { name: 'PAYSTACK_PUBLIC_KEY', msg: 'Paystack public key (frontend checkout)' },
  { name: 'PAYSTACK_WEBHOOK_SECRET', msg: 'Paystack webhook secret (payment verification)' },
  { name: 'NEXT_PUBLIC_APP_URL', msg: 'Public app URL' },
];
recommendedChecks.forEach(check => {
  if (!hasValue(check.name)) {
    issues.push(`⚠️  ${check.msg} missing (required before real-money launch)`);
  } else {
    console.log(`✅ ${check.msg} configured`);
  }
});

// Demo flags must be off in production
if (isTrue('ALLOW_DEMO_WALLET_FUNDING')) {
  console.log('⚠️  ALLOW_DEMO_WALLET_FUNDING=true — disable before real-money launch');
}
if (readValue('VTPASS_BASE_URL').includes('sandbox')) {
  console.log('⚠️  VTpass pointed at sandbox — bill payments are test-only');
}

// Summary
console.log('\n📊 Summary:');
if (issues.length === 0) {
  console.log('🎉 All required checks passed locally!');
} else {
  console.log(`⚠️ ${issues.length} issues to fix before launch:`);
  issues.forEach(issue => console.log(issue));
}
console.log('\nFull readiness check requires deployed services (check /api/health/ready with internal token)');
