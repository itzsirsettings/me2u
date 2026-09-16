# Me2U Bills API

Separate NestJS backend for wallet-safe bills fulfilment.

## Local Development

```bash
cd server
npm install
npm run dev
```

The API loads `server/.env` first, then the repository root `.env.local` as the final local override for shared secrets such as Supabase, Paystack, and VTpass.

The Next.js PWA should point to this service with:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Required Services

- Supabase/PostgreSQL for profiles, wallets, ledger, and bills records.
- Redis for BullMQ queues.
- Paystack Dedicated Virtual Accounts for wallet funding.
- VTpass for airtime/data fulfilment.

Flutterwave Bills is scaffolded as a disabled backup adapter until KYC, source balance, and static outbound IP whitelisting are complete.
