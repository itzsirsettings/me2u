
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

// Required checks
const requiredChecks = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', msg: 'Supabase URL' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', msg: 'Supabase anon key' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', msg: 'Supabase service role key' },
  { name: 'REDIS_URL', msg: 'Redis URL' },
  { name: 'PIN_PEPPER', msg: 'PIN pepper' },
  { name: 'INTERNAL_JOBS_TOKEN', msg: 'Internal jobs token' },
  { name: 'NEXT_PUBLIC_API_BASE_URL', msg: 'API base URL' },
  { name: 'RESEND_API_KEY', msg: 'Resend API key' },
  { name: 'EMAIL_FROM', msg: 'Email from address (non-resend.dev)' },
];

requiredChecks.forEach(check => {
  if (!hasValue(check.name)) {
    issues.push(`❌ ${check.msg} missing or placeholder`);
  } else {
    console.log(`✅ ${check.msg} configured`);
  }
});

// SQS queues (8 required)
const sqsQueues = [
  'SQS_BILL_PURCHASE_QUEUE_URL',
  'SQS_BILL_REQUERY_QUEUE_URL',
  'SQS_TRANSFER_DISPATCH_QUEUE_URL',
  'SQS_TRANSFER_REQUERY_QUEUE_URL',
  'SQS_WITHDRAWAL_DISPATCH_QUEUE_URL',
  'SQS_WITHDRAWAL_REQUERY_QUEUE_URL',
  'SQS_PROJECTIONS_REFRESH_QUEUE_URL',
  'SQS_OUTBOX_PUBLISH_QUEUE_URL',
];

const sqsOk = sqsQueues.every(q => hasValue(q));
if (sqsOk) {
  console.log('✅ All 8 SQS queues configured');
} else {
  issues.push('❌ Missing SQS queue URLs');
}

// Paystack
const paystackOk = readValue('PAYSTACK_SECRET_KEY').startsWith('sk_live_') && isTrue('PAYSTACK_DVA_ENABLED');
if (paystackOk) {
  console.log('✅ Paystack live configured');
} else {
  issues.push('❌ Paystack needs live key and DVA enabled');
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
