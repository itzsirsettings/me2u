# Railway PostgreSQL and migrations

**Reviewed:** 28 September 2026. The repository contains Railway configuration for a Next.js service and a separate NestJS service. This file describes code and deployment configuration; it does not confirm which services are currently deployed.

## Application architecture

| Layer                                               | PostgreSQL / runtime                                                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js web app and route handlers (`app/`, `lib/`) | `pg` via `lib/railway/client.ts`                                                                                                                   |
| NestJS API and queued jobs (`server/`)              | `pg` via `server/src/common/railway-db.service.ts`; BullMQ workers use Redis                                                                       |
| Authentication                                      | App-managed PostgreSQL records, bcrypt, JWT/session cookies for web and bearer sessions for native clients; protected routes authorize server-side |
| User documents                                      | Private-file database storage and owner-scoped read routes                                                                                         |
| Migrations                                          | Ordered files in `railway/migrations/`                                                                                                             |

The checked-in root `railway.json` configures the web app to run `npm run db:migrate` before deployment. The `server/railway.json` configures the NestJS process. The active host, network policy, and service topology must be verified in the deployment account.

## Database configuration

- Set `DATABASE_URL` as a secret on each service that needs PostgreSQL. Use the host's private database connection and TLS settings where available; do not copy production credentials into the repository.
- For local development, use a separate development database and `.env.local`. Never run destructive or data-changing diagnostics against production.
- Set database connection limits in proportion to the number of web and server replicas; preserve capacity for migrations and operator access.
- Configure backups/PITR and perform a restore drill before production launch.

## Migration sources and runners

`railway/migrations/` contains the ordered schema track 001 through 025. It is the migration directory used by both checked-in runners:

- `npm run db:migrate` executes `run-migrations.js`, which sorts SQL filenames, records applied names in `schema_migrations`, and is configured as the root Railway pre-deploy command.
- `railway run python run-all-migrations.py` is the explicit Python runner. Its `MIGRATIONS` list must continue to include every numbered SQL file present in `railway/migrations/`.
- `migrations/migrations/` is a timestamped mirror/history for selected changes. It is not a second production migration sequence; do not run both trees.

Before adding a schema change:

1. Add a new sequentially numbered SQL file in `railway/migrations/`.
2. Make it safe for the deployed schema and data; prefer additive/expand changes before destructive contract changes.
3. Add the file to `run-all-migrations.py` and any documented mirror only when required by repository compatibility.
4. Review the SQL and rollback/forward-recovery plan; test it on a restorable staging copy.
5. Run the configured migration runner once per environment and verify the schema version and application compatibility before rollout.

Never manually edit `schema_migrations` to hide a failed or unapplied file. Do not apply a migration by pasting SQL into a live database console unless there is a reviewed recovery procedure and an operator records the exact result.

## Production release checks

- Web readiness checks are defined in `lib/server/launch-readiness.ts`; these only check required environment values, not provider uptime or successful customer transactions.
- `/api/health/live` is liveness, not full readiness. The separate NestJS service also has its own health controller.
- Test database transactions, migrations, authentication, wallet ledger invariants, payment webhooks, duplicates, provider timeouts, retries, and recovery in staging.
- Confirm provider credentials, merchant feature enablement, callback URLs, and support/reconciliation procedures outside this repository.
- Keep credentials, KYC documents, session tokens, and full financial account data out of source control, client responses, and logs.

See [the production deployment checklist](docs/railway-launch-checklist.md) and [architecture and roadmap](docs/architecture-and-roadmap.md) for related release controls.
