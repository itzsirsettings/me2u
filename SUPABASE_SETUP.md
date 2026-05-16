# Supabase Setup

me2u now uses Supabase Auth and Postgres for real user accounts and app data.

## 1. Create Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ALLOW_DEMO_WALLET_FUNDING=false
NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK=
NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME=
NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER=

# Optional future KYC/NIN verification. Not required for MVP Supabase Auth signup.
NIN_HASH_SECRET=
NIN_VERIFICATION_API_URL=
NIN_VERIFICATION_API_KEY=
NIN_VERIFICATION_AUTH_HEADER=Authorization
NIN_VERIFICATION_AUTH_SCHEME=Bearer
NIN_VERIFICATION_REQUEST_FIELD=nin
NIN_VERIFICATION_TIMEOUT_MS=15000
NIN_VERIFICATION_EXTRA_HEADERS=
NIN_DEMO_NIN=
NEXT_PUBLIC_NIN_DEMO_NIN=
NIN_DEMO_FIRST_NAME=
NIN_DEMO_OTHER_NAMES=
NIN_DEMO_LAST_NAME=
NIN_DEMO_PHONE=
```

`SUPABASE_SERVICE_ROLE_KEY` must remain server-only. Never prefix it with `NEXT_PUBLIC_`.

## 2. Apply The Database Schema

Run the SQL files in `supabase/migrations` in timestamp order:

```text
supabase/migrations/20260514000000_initial_me2u_schema.sql
supabase/migrations/20260515000000_secure_financial_operations.sql
supabase/migrations/20260516000000_enforce_withdrawal_retained_deposit.sql
supabase/migrations/20260516001000_defer_nin_use_supabase_auth.sql
supabase/migrations/20260516002000_registration_reference_flow.sql
supabase/migrations/20260516003000_platform_loan_rules.sql
supabase/migrations/20260516004000_onboarding_affiliate_zero_interest.sql
supabase/migrations/20260516005000_platform_account_wallet_funding.sql
```

You can paste them into the Supabase SQL editor in that order or apply them through the Supabase CLI after linking the project.

The migration creates:

- `profiles`
- `wallets`
- `transactions`
- `marketplace_items`
- `loans`
- RLS policies for authenticated users

## 3. MVP Authentication

The MVP registration flow uses Supabase Auth for account creation. Users enter:

- First name
- Last name
- Username
- Email
- Password
- Phone
- Optional referral code

New profiles are created with `kyc_verified=false` and nullable NIN fields. This keeps the platform usable now while leaving the KYC/NIN layer ready for a later growth phase.

## 4. Future NIN Verification

Production NIN verification can be enabled later with a licensed KYC/NIN provider. The existing `/api/nin/verify` route and `lib/nin.ts` normalizer are kept for that future phase.

When enabled, the app will call:

```text
POST NIN_VERIFICATION_API_URL
NIN_VERIFICATION_AUTH_HEADER: NIN_VERIFICATION_AUTH_SCHEME NIN_VERIFICATION_API_KEY
Body: { [NIN_VERIFICATION_REQUEST_FIELD]: "12345678901" }
```

Default values send:

```http
Authorization: Bearer <NIN_VERIFICATION_API_KEY>
Content-Type: application/json
```

```json
{ "nin": "12345678901" }
```

If your provider uses a different auth header, set `NIN_VERIFICATION_AUTH_HEADER`.
If it expects a raw API key without a scheme, set `NIN_VERIFICATION_AUTH_SCHEME=` to an empty value.
If it expects a different request field such as `idNumber` or `virtualNin`, set `NIN_VERIFICATION_REQUEST_FIELD`.
If extra fixed headers are required, set `NIN_VERIFICATION_EXTRA_HEADERS` to JSON, for example `{"x-client-id":"abc"}`.

The provider response is normalized in `lib/nin.ts`. It recursively looks for common name fields such as `firstName`, `first_name`, `surname`, and `lastName`. The app stores only:

- Verified first name
- Verified last name
- NIN last four digits
- HMAC hash of the NIN

The raw NIN is not stored in Supabase.

In local development only, if no provider is configured, `/api/nin/verify` returns a demo identity so future KYC UI can be tested.
The demo identity is only returned for `NIN_DEMO_NIN` (`00000000000` by default). Any other NIN will fail until a real provider is configured, so the app does not display an invented name as a verified record.

## 5. Configure Wallet Funding

Wallet funding uses the same platform account details shown in the wallet screen. Users transfer to the platform account, then submit the funded amount and transfer reference in the app.

```env
NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK=
NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME=
NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER=
```

For a strict live-money launch, verify the submitted reference operationally or replace the manual reference flow with provider-backed webhooks.

## 6. Registration Deposit And First Withdrawal

Users complete registration with Supabase Auth, then pay a ₦1,000 registration deposit to the platform account details.
The app records their payment reference and then credits the first ₦2,000 platform loan to their wallet.
That first ₦2,000 can be withdrawn without a 50% retained wallet condition.

The platform account details are public operational values:

```env
NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK=
NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME=
NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER=
```

## 7. Withdrawal Rule

After the first ₦2,000 stage, second and later platform loans require a retained wallet condition. When a user has an active second or later platform loan, the wallet must contain:

```text
withdrawal amount + 50% of the active platform loan amount
```

Only the withdrawal amount is deducted. The 50% platform loan condition remains in the user's wallet balance after the withdrawal. The first ₦2,000 platform loan has no 50% withdrawal condition.

## 8. Platform Loan Rules

The MVP platform loan flow is enforced in Postgres through `lendpeer_request_platform_loan`:

- First platform loan: fixed at ₦2,000 after the ₦1,000 registration deposit, with no 50% wallet condition.
- Second and later platform loans: start from ₦10,000.
- For second and later platform loans, the user's wallet must already contain 50% of the requested loan amount.
- The 50% amount remains protected in the wallet while that platform loan is active. It is not deducted as a fee.
- A user must repay an active platform loan before requesting the next one.
- All platform and peer loans are interest-free at 0%.

Platform loans are separate from peer marketplace loans. Peer loans still use a lender account and locked balance, while platform loans are issued directly to the borrower's wallet.

## 9. Affiliate Program

Users can share their username as a referral code. When a direct referral completes the ₦1,000 registration deposit onboarding, the referrer earns 50% of that deposit:

```text
₦1,000 registration deposit x 50% = ₦500 affiliate reward
```

The reward is credited automatically to the referrer's wallet once per direct referral.

## 10. Production Readiness Check

The app exposes a no-store health endpoint:

```text
GET /api/health
```

It reports missing launch configuration without revealing secret values.

Statuses:

- `blocked` - required configuration is missing or an MVP flow cannot complete.
- `mvp_with_warnings` - the app can run for a controlled MVP, but optional future KYC or demo/manual money flows need operational attention.
- `ready` - no required blockers or warnings were found.

## 11. Registration Flow

Users now register by:

1. Entering name, email, password, and phone
2. Choosing a username
3. Optionally entering a referral code
4. Creating a Supabase Auth user and database profile
5. Paying the ₦1,000 registration deposit
6. Receiving the first ₦2,000 platform loan in their wallet

The dashboard greeting uses the first name stored in the Supabase-backed profile. NIN verification can be added later without changing the basic auth flow.
