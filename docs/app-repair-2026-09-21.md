# Application repair: 21 September 2026

## Scope and security design

Keep the existing home visual system and financial rules. Fix demonstrated interface,
upload, request/session, and database query defects. A passing build is not evidence
that real bank transfers, email delivery, or all historical account data are correct.

The browser is untrusted. Server authentication, signed CSRF validation, account
ownership, admin authorization, payment confirmation, and approved KYC remain the
boundaries for sensitive operations. KYC photos and receipts remain private; linkage
must prove both database ownership and the correct upload category. Client amounts
must be finite positive currency values, with no boolean/object coercion or sub-kobo
rounding into zero.

The session lasts longer than its CSRF token. Authenticated profile reads renew missing
or expired CSRF cookies; invalid state-changing requests still fail with HTTP 403.
CSRF failure does not invalidate an otherwise valid session. No automatic replay of
financial POST requests is introduced. Malformed cookies fail closed.

Database user context must be set and consumed in the same transaction. Public totals
must be derived from actual records; empty and unavailable are different states.
Profile refreshes must never apply a previous user's data to the current account.

## Delivery and recovery

Code changes are reversible by reverting their Git commit. This repair does not delete
accounts, reset balances, grant approvals, or automatically run historical reward or
trust-score backfills. Those can fire financial triggers and require an audited plan
and restorable backup. Existing user work in the modular store is preserved.

Validate with meaningful request/ownership tests, all existing unit checks, TypeScript,
lint, production build, and browser flows at mobile and desktop sizes. Browser API
fixtures exercise UI behavior without creating production financial records. Verify
Railway deployment status and public health after delivery.

## Decisions

- Reuse home icon shapes and navigation instead of introducing a third design system.
- Renew CSRF on authenticated reads rather than retrying failed payment submissions.
- Use authoritative aggregates instead of totals calculated from truncated admin lists.
- Keep upload previews behind existing owner/admin endpoints, with explicit failure UI.

## Operational evidence and remaining work

- Read-only production checks found one profile, no missing wallets/auth identities,
  duplicate normalized emails, negative wallets, invalid score ranges, deposit-unlock
  mismatches, or verified-referral-count drift. The full admin summary SQL also ran
  successfully against production in a read-only transaction.
- Production initially had no administrator. At the owner's explicit instruction,
  `scripts/restore-admin.cjs` restored only the exact chosen existing account's role.
  It recorded the previous role in `admin_audit_logs`; no password, KYC, deposit,
  wallet, or referral data was changed. Recovery is a targeted role update to the
  recorded previous role, not a database-wide restore. The script defaults to dry-run.
- Next.js updated to 16.3.5 and PostCSS to 8.5.28; unused Nodemailer removed (mail is
  delivered through Resend). npm reported zero vulnerabilities after installation.
- The original browser attempt against the development server did not hydrate
  reliably. The production build subsequently passed all 25 browser checks. These
  use mocked account APIs, not real financial transactions or inbox delivery.
- Full-repository strict lint still has pre-existing violations; focused strict lint
  of the newly introduced core utilities and behavioral tests passes. Do not treat
  this release as completion of repository-wide type/lint debt or a full security audit.
- Trust scores are read from the database, and the fabricated empty-community
  average is removed. Historical score recalculation is NOT performed: the legacy
  score function reads `affiliate_rewards`, whereas current reward activity uses
  newer tables. A separate reviewed migration must reconcile this, initialization,
  KYC-change triggers and badge-payout side effects with a restorable backup.
- Existing store/savings work is deliberately excluded from the repair commit.

## Verified external behavior

- [PostgreSQL configuration functions](https://www.postgresql.org/docs/current/functions-admin.html):
  `set_config` with `is_local=true` lasts only for its transaction.
- [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html):
  validate tokens server-side on state-changing requests; retain protection while repairing
  token lifecycle and failure recovery.
