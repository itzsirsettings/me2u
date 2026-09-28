# Production deployment and operations checklist

**Repository review:** 28 September 2026.
This is a deployment evidence checklist, not proof that the project is deployed or approved for launch. Confirm all service-level settings in the actual Railway/Vercel account before release.

## Repository deployment configuration

- Root `railway.json` describes a Next.js service. It runs `npm run db:migrate` as a pre-deploy command and uses `/api/health/live` as its health path.
- `server/railway.json` describes the NestJS service. `server/src/main.ts` starts the API and `server/src/app.module.ts` includes BullMQ job processors; the repository does not define a separate worker start command.
- `vercel.json` also contains a Next.js deployment configuration and cron declarations. Its presence is not evidence that Vercel is the active production host.
- Do not create AWS SQS queues based on older versions of this checklist: the current NestJS code uses BullMQ with Redis. Queue names and enabled processors must be derived from `server/src/`.
- The root migration runner applies sorted files from `railway/migrations/` and records them in `schema_migrations`. Do not manually run both migration trees or mark unapplied files as applied.

## Before deployment

- [ ] Identify the active production host, domains, root and server service IDs, deployment regions, and traffic path. Record who can roll back each service.
- [ ] Review the exact source revision and CI run. Require successful formatting, lint, TypeScript, unit tests, and production build.
- [ ] Verify CI uses test-only placeholders and no production secrets are committed or printed in logs.
- [ ] Confirm compatibility of root app and NestJS service deployment versions, API base URL, CORS origins, health checks, and database connection budget.
- [ ] Review migration SQL before rollout. Plan backup/restore or forward-recovery for schema/data changes. Verify automated migration behavior in a staging copy first.
- [ ] Confirm PostgreSQL backup/PITR coverage and complete a restore drill. Limit DB network exposure and use TLS as supported by the chosen host.
- [ ] Configure shared production Redis when rate limiting or BullMQ is enabled. Verify queue persistence, retry/backoff, dead-letter/reconciliation behavior, and alerting.
- [ ] Configure secrets through the host secret manager, not committed `.env` files. Use separate least-privilege credentials per environment and integration.

## Environment and providers

Check names against `lib/server/launch-readiness.ts`, `server/README.md`, and code before changing the deployment. Required for the web readiness endpoint currently include:

- `DATABASE_URL`
- `AUTH_TOKEN_SECRET`
- `REDIS_URL`
- `PAYSTACK_SECRET_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `OPENAI_API_KEY`

`NEXT_PUBLIC_APP_URL` and `CRON_SECRET` are readiness warnings in current code, not required blockers. The separately deployed NestJS service uses Redis and provider credentials for the modules enabled in that release. Do not copy all values from a local `.env`; provision only the secrets needed by each service.

Account-deletion requests also require `ACCOUNT_DELETION_TARGET_DAYS`, configured only after legal/operations approve the user-facing completion estimate. This setting is not part of the web readiness endpoint; request submission returns `503` until it is configured.

- [ ] Verify credentials are for the intended environment and are not placeholders.
- [ ] Verify provider accounts are enabled for the exact integration features shipped. Complete provider certification and contracts where applicable.
- [ ] Verify Paystack/Wema webhook URLs, signatures, replay handling, and event reconciliation against non-production transactions before live traffic.
- [ ] Verify email sender/domain and delivery failure monitoring.
- [ ] Verify cron schedules belong to the selected host and have authentication/overlap protections. `vercel.json` schedules only run when Vercel is the deployed target.
- [ ] Confirm the app shows unavailable/recovery states for absent, rejected, timed-out, or degraded dependencies.

## Release and recovery

- [ ] Capture pre-release database backup/restore point and current service revision.
- [ ] Apply migrations using the configured deployment runner in staging first; inspect migration completion and schema version.
- [ ] Run auth, wallet, deposit, withdrawal, loan, bills, webhook, account recovery, and support journeys with provider sandbox/test accounts. Never treat mocked browser fixtures as payment evidence.
- [ ] Verify idempotency and concurrent requests for every financial write. Reconcile provider and ledger state after simulated timeout/unknown outcomes.
- [ ] Check `/api/health/live` and readiness endpoint semantics. Liveness means the web process answers; readiness reports required environment presence, not that every provider transaction succeeds.
- [ ] Monitor structured logs, error rates, database/Redis connections, queue age/failures, provider outcomes, webhook lag, and user support reports.
- [ ] Release gradually where the host permits; verify traffic and financial reconciliation before increasing exposure.
- [ ] Test rollback or forward-recovery while preserving backward-compatible schema expectations. Rollback the app alone only if it remains compatible with already-applied migrations.
- [ ] Record commit, migration version, test evidence, provider evidence, operator, release time, rollback point, and unresolved risks.

## Store and legal gate

Web deployment does not release the iOS app to Apple App Store. The iOS implementation, accurate privacy/data declarations, deletion processing, lending eligibility/disclosures, signing, and store review evidence are tracked in [mobile store readiness](mobile-store-readiness.md). Android currently remains the PWA and has no planned Google Play release.
