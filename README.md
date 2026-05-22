# Me2U - Modern Cooperative Peer Lending

Me2U is a premium, interest-free peer-to-peer lending platform designed for modern cooperatives in Nigeria. It enables users to pool funds, borrow instantly, and build trust through a transparent, secure, and interest-free ecosystem.

## Key Features

- **0% Interest Loans:** Borrow from the platform or peers with zero interest.
- **Trust Tiers:** Dynamic security deposits and loan durations based on your trust score.
- **Me2U Circles:** Create or join group lending pools (modern cooperatives).
- **Marketplace:** Post borrow requests or lending offers to the community.
- **Automated Withdrawals:** Instant withdrawals to Nigerian bank accounts via Paystack.
- **Secure Onboarding:** Registration deposit and KYC verification to prevent fraud.
- **Affiliate Program:** Earn rewards for referring verified users.

## Tech Stack

- **Frontend:** Next.js (App Router), React 19, Tailwind CSS 4, Framer Motion.
- **Backend:** Supabase (Auth, Postgres, Storage, Edge Functions).
- **Payments:** Paystack integration for automated transfers and webhooks.
- **Design System:** Custom premium UI with mobile-first responsiveness.

## Getting Started

### 1. Prerequisites

- Node.js 18+
- Supabase Account
- Paystack Account (Secret Key)

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
```

### 3. Setup Database

Follow the instructions in `SUPABASE_SETUP.md` to run migrations and setup RLS.

### 4. Install and Run

```bash
npm install
npm run dev
```

## Testing

Me2U follows a rigorous testing standard.

```bash
# Run unit tests
npm run test

# Run E2E tests (Playwright)
npm run test:e2e
```

## Architecture

- **Auth:** Supabase Auth with custom `AuthBootstrap` for state management.
- **Storage:** Zustand for client-side state, Supabase for persistent data.
- **Security:** RLS, secure RPCs, transaction PINs, and encrypted NIN hashes.
- **Design:** Mobile-first, responsive grid systems, and kinetic UI elements.

## License

Private and confidential. © 2026 Me2U.
