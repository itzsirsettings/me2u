# Me2U Full Public Launch Checklist (Railway + Vercel)

## Phase 1: Railway Infrastructure Setup

### 1.1 Railway Project & Services
- [ ] Create a new Railway project
- [ ] Add a **Redis** service (Railway Marketplace → Redis)
- [ ] Add **AWS SQS** (or use Railway Queues if SQS-compatible) — create 8 queues:
  - `bill-purchase`
  - `bill-requery`
  - `transfer-dispatch`
  - `transfer-requery`
  - `withdrawal-dispatch`
  - `withdrawal-requery`
  - `projections-refresh`
  - `outbox-publish`
- [ ] Create two Railway services from the repo:
  - **Next.js App**: Deploy root directory (`/`) with start command `npm start`
  - **Me2U API/Worker**: Deploy `/server` directory with two services from same image:
    - Service 1: `ME2U_RUNTIME=api`
    - Service 2: `ME2U_RUNTIME=worker`

### 1.2 Railway Environment Variables
Copy all variables from your `.env` file to Railway, plus:
- `REDIS_URL` (from Railway Redis service)
- All 8 `SQS_*_QUEUE_URL` values
- `NEXT_PUBLIC_API_BASE_URL` (your Railway API service URL)
- `VERCEL_PROJECT_URL` once deployed

---

## Phase 2: Railway PostgreSQL Production Hardening

- [ ] Enable **Point-in-Time Recovery (PITR)** on the Postgres service
- [ ] Enforce **SSL** for all connections (`PGSSLMODE=require`)
- [ ] Restrict network access — do **not** expose a public TCP proxy in production; use private networking (`postgres.railway.internal`)
- [ ] Take a **manual backup** and confirm restore steps before launch
- [ ] Confirm the database password and `AUTH_TOKEN_SECRET` are strong and unique
- [ ] Enable **2FA** on your Railway account
- [ ] Review the Railway **observability/metrics** dashboard for slow queries
- [ ] Perform a **restore drill** and record the date as `DB_RESTORE_DRILL_AT`
- [ ] Set `DB_PITR_ENABLED_ACK=true`

---

## Phase 3: Payment & Banking Providers

### 3.1 Paystack
- [ ] Use **live secret key** (`sk_live_...`)
- [ ] Enable DVA (`PAYSTACK_DVA_ENABLED=true`)
- [ ] Complete sandbox & live certification → set `PAYSTACK_PROVIDER_CERTIFIED_AT=2026-06-09T...`
- [ ] Configure webhooks to point to your Railway API `/webhooks/paystack`

### 3.2 VTpass
- [ ] Switch from sandbox to live base URL (`https://vtpass.com/api`)
- [ ] Add all VTpass keys (`PUBLIC_KEY`, `SECRET_KEY`, `API_KEY`)
- [ ] Add `VTPASS_WEBHOOK_SECRET`
- [ ] Complete certification → set `VTPASS_PROVIDER_CERTIFIED_AT=2026-06-09T...`

### 3.3 Wema/ALAT
- [ ] Enable Wema (`WEMA_ENABLED=true`)
- [ ] Add live base URL, API key, webhook secret
- [ ] Enable transfers (`WEMA_TRANSFERS_ENABLED=true`)
- [ ] Complete certification → set `WEMA_PROVIDER_CERTIFIED_AT=2026-06-09T...`

---

## Phase 4: Compliance & Legal

- [ ] Set `FCCPC_DEON_REGISTRATION_STATUS=approved`
- [ ] Set `FCCPC_DEON_REGISTRATION_REFERENCE=` (your reference number)
- [ ] Set `CBN_PAYMENT_PARTNER_STATUS=verified`
- [ ] Set `CBN_PAYMENT_PARTNER_MEMO_ID=` (your memo ID)
- [ ] Set `NDPC_REGISTRATION_STATUS=registered`
- [ ] Set `NDPC_REGISTRATION_REFERENCE=` (your reference number)
- [ ] Set `NDPC_DPA_AUDIT_STATUS=current`
- [ ] Set `ME2U_LEGAL_APPROVAL_STATUS=approved`

---

## Phase 5: KYC Operations

Choose one:
- **Option A (Live NIN)**:
  - Set `NIN_VERIFICATION_API_URL`, `NIN_VERIFICATION_API_KEY`, `NIN_HASH_SECRET`
- **Option B (Manual KYC)**:
  - Set `KYC_MANUAL_REVIEW_SOP_ACK=true`
  - Set `KYC_REVIEW_OWNER=` (name/email)
  - Set `KYC_DISPUTE_CHANNEL=` (e.g., support@me2u.ng)
  - Set `KYC_DOCUMENT_RETENTION_POLICY_ID=` (your policy ID)

---

## Phase 6: Email Setup (Resend)

- [ ] Add `RESEND_API_KEY` (live key)
- [ ] Verify your sending domain in Resend
- [ ] Set `EMAIL_FROM=` to a non-resend.dev address (e.g., onboarding@me2u.ng)

---

## Phase 7: Testing Evidence

- [ ] Run financial E2E tests → set `FINANCIAL_E2E_PASSED_AT=2026-06-09T...`
- [ ] Complete provider sandbox certification → set `PROVIDER_SANDBOX_CERTIFIED_AT=2026-06-09T...`
- [ ] Verify reconciliation has zero duplicates → set `RECONCILIATION_ZERO_DUPLICATES_AT=2026-06-09T...`
- [ ] Run the repository load probe (`npm run load:probe -- --endpoint https://<app-host>/api/health/live --requests 10000 --concurrency 200`) → set `LOAD_TEST_CERTIFIED_AT=2026-06-09T...`

---

## Phase 8: Operations Setup

- [ ] Set `OPS_ALARMS_CONFIGURED_ACK=true`
- [ ] Set `WEBHOOK_MONITORING_ACK=true`
- [ ] Set `SECRET_ROTATION_SCHEDULE_ACK=true`
- [ ] Set `ECS_API_SERVICE_ARN=` (or Railway service ID if adapted)
- [ ] Set `ECS_WORKER_SERVICE_ARN=` (or Railway worker service ID)

## Phase 8.1: Capacity and Horizontal Scaling

- [ ] Run the load probe against the deployed liveness endpoint:
  - `npm run load:probe -- --endpoint https://<app-host>/api/health/live --requests 10000 --concurrency 200`
- [ ] Set the API service to at least 2 replicas during normal operation so a deploy or instance failure does not remove all API capacity.
- [ ] Configure Railway autoscaling or an equivalent external load balancer using CPU, memory, latency, and error-rate thresholds; verify the setting in the Railway service dashboard because replica policy is service-level configuration.
- [ ] Size the Postgres connection budget before adding replicas: `DB_POOL_MAX` multiplied by API replicas must remain below the database connection limit, with capacity reserved for migrations and admin access.
- [ ] Use a shared production Redis service for rate limits and queues; never use localhost Redis on a horizontally scaled deployment.
- [ ] Treat 100,000 registered users as a capacity target, not a concurrency guarantee. Record the tested requests per second, p95/p99 latency, error rate, database utilization, Redis utilization, and queue lag in the release record.
- [ ] Repeat the test for peak daily traffic and webhook bursts, including one rolling deployment while traffic is active.

---

## Phase 9: Final Launch Check

- [ ] Deploy Next.js app to Vercel
- [ ] Deploy API/worker services to Railway
- [ ] Call `GET /api/health/ready` with `x-me2u-internal-token` header
- [ ] Verify response shows `"status": "ready"` and `"blockers": []`
- [ ] Open to public! 🚀
