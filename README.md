# Me2U

Me2U is a mobile-first financial services web application for users in Nigeria. The repository contains a Next.js progressive web app, PostgreSQL-backed API routes, and a separate NestJS service for bills, wallet, banking, provider, and queued-work modules.

The PWA can be installed from supported browsers. A bare React Native iOS client now lives in `mobile/`; it is under development and is not yet signed or ready for App Store submission. Android continues to use the PWA, and no Google Play release is planned. See the [architecture and roadmap](docs/architecture-and-roadmap.md) and [iOS App Store release gates](docs/mobile-store-readiness.md).

## Current product surfaces

The app includes routes for registration and login, wallet and registration deposit, loans, peer marketplace, circles, savings, referrals, learning, KYC, account security, bills, merchant deals, and administration. A route or screen in source does not prove that its external provider, legal approval, production configuration, or full customer workflow is ready. See the architecture document for status and release boundaries.

## Architecture

- **Web and PWA:** Next.js App Router, React, TypeScript, Tailwind CSS, Framer Motion, and Zustand.
- **Web API:** Next.js Route Handlers for authentication, profiles, wallet and loan operations, referrals, savings, uploads, webhooks, and related app workflows.
- **Bills service:** `server/` contains a separate NestJS API with BullMQ modules and PostgreSQL/Redis integrations. Its app module registers API and job-processing modules in the same application process; deployment and provider configuration are environment-dependent.
- **iOS client:** `mobile/` is a bare React Native app. It calls the existing server APIs over HTTPS and stores its bearer session in iOS Keychain. The native project does not contain payment-provider secrets.
- **Data:** PostgreSQL is accessed through the Railway client. Apply the ordered `railway/migrations/` set using `npm run db:migrate`; do not apply parallel migration folders manually.
- **Providers and operations:** Paystack, Wema, VTpass, email, and other integrations require environment credentials, provider-side enablement, verified webhooks, and operational evidence. Source code alone is not production verification.

## Local development

Requirements: Node.js `>=20.11.0`; PostgreSQL and configured secrets are needed for integration workflows.

```powershell
npm ci
npm run dev
```

The standalone bills API has its own package and setup in [server/README.md](server/README.md).

## Quality checks

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

The repository CI runs formatting, lint, typecheck, unit tests, and production build. Passing these checks does not prove live financial-provider behavior, regulatory eligibility, production configuration, accessibility, store approval, or recovery from all operational failures. See the [release gates](docs/mobile-store-readiness.md).

## Documentation

- [Architecture, product scope, roadmap, and feature safety rules](docs/architecture-and-roadmap.md)
- [iOS App Store release readiness](docs/mobile-store-readiness.md)
- [iOS data and native SDK inventory](docs/mobile-data-inventory.md)
- [Production deployment and operations checklist](docs/railway-launch-checklist.md)
- [Railway PostgreSQL and migrations](RAILWAY_MIGRATION.md)
- [Product design context](PRODUCT.md)
- [Bills API setup](server/README.md)

## Release rule

Do not advertise a feature as available, store-ready, or production-ready solely because a page or endpoint exists. Release each capability only after its end-to-end path, provider and policy requirements, failure handling, monitoring, and recovery steps have been verified for the target environment.
