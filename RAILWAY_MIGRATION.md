# Railway PostgreSQL

Me2U runs entirely on Railway PostgreSQL. No external backend service is required.

## Architecture

| Layer | Runtime dependency |
| --- | --- |
| Next.js app (`app/`, `lib/`) | `pg` via `lib/railway/client.ts` |
| NestJS API (`server/`) | `pg` via `server/src/common/railway-db.service.ts` |
| Auth | Native PostgreSQL tables (`auth_users`, `auth_sessions`) + bcrypt + JWT |
| Realtime | Polling (no realtime publications) |
| File storage | `private_files` table (no external object storage) |
| Migrations | `railway/migrations/` |

## Database connection

- **On Railway:** `DATABASE_URL` is injected from the Postgres service over
  private networking (`postgres.railway.internal`). Do not override it.
- **Local development:** create a public TCP proxy once and point `.env` at it:

  ```bash
  railway tcp-proxy create --port 5432 --service Postgres
  ```

  Then set `DATABASE_URL` and `PGSSLMODE=require` in `.env`.

## Migration files

- `railway/migrations/001` … `019` is the authoritative, Railway-native schema set.
- `migrations/` holds the same migrations in timestamped form for newer entries.
- Apply them with:

  ```bash
  railway run python run-all-migrations.py
  ```

The legacy hosted-backend CLI project (`backend/`, `config.toml`,
`functions/`, `timestamped-migrations/`) and the obsolete full-schema
dumps (`COMPLETE_MIGRATION.sql`, `RAILWAY_MIGRATION.sql`) have been removed.
Those dumps created a hosted compatibility layer (an `auth` schema shim and
realtime publications) that Railway does not need.

## Environment variables

Set on Railway:

```
DATABASE_URL=postgresql://...   # injected automatically; do not override
AUTH_TOKEN_SECRET=<generate-a-random-32-char-secret>
PAYSTACK_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_...
REDIS_URL=redis://...
```

Only Railway PostgreSQL variables are read:

- `DATABASE_URL`, `AUTH_TOKEN_SECRET`, `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `REDIS_URL`

## Verification

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}'
```

A `401` with `{"error":"Invalid email or password."}` confirms the database is
reachable and the credentials were rejected on their merits. A `200` returns the
session JWT.

