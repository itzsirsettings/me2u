# iOS App Store release readiness

**Reviewed:** 28 September 2026  
**Scope:** iOS App Store release for Me2U in Nigeria. Android continues to use the PWA; a Google Play release is not planned.  
**Status:** Native implementation has started. This document is not legal advice or confirmation of regulatory or store eligibility.

## Implemented in this repository

- `mobile/` contains a bare React Native iOS project with native sign-in, wallet and loan overview, Paystack registration-transfer details, account deletion initiation/status, loading/error/offline recovery, and a JavaScript error boundary.
- Native sign-in uses `POST /api/auth/native/login`. The API returns the existing seven-day bearer session; the app stores it in iOS Keychain and uses the existing revocation-aware authentication boundary. Provider secrets stay on the server.
- `POST` and `GET /api/account/deletion` create and read deletion requests. Password re-verification is required. Pending requests block new authenticated writes while sign-out, support requests, repayment, and request-status reads remain available.
- `ACCOUNT_DELETION_TARGET_DAYS` is required before a request can be created. Requests remain in review; data erasure and completion operations are not implemented. Existing ledger/audit records must not be removed by this request-only flow.
- `railway/migrations/025_account_deletion_requests.sql` adds an additive request/audit table. Both configured migration runners include it.
- A public web page is available at `/account-deletion`, linked from the Profile screen.

## Release blockers and evidence

| Area                | Current state                                                                                                                   | Required before App Store submission                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| iOS build           | Project generated with React Native 0.87; not compiled on this Windows host                                                     | Successful macOS simulator build, supported device/OS matrix, archive/signing rehearsal, upgrade tests, and real-device acceptance                                                                     |
| Signing and account | Apple organization enrollment was reported; signing assets and team ID are not configured in the repository                     | Store certificates/profiles and team ID supplied through protected GitHub secrets; verify the enrolled legal entity and App Store Connect access                                                       |
| Lending eligibility | Product supports company lending and peer-to-peer facilitation; licenses/permissions were not verified                          | Counsel and relevant counterparties confirm legal roles, authorized lender identity, Nigeria permissions, customer agreements, disclosures, complaints, and collections posture                        |
| Privacy disclosures | Existing web policy describes data categories and broad retention purposes; native dependency/data inventory is incomplete      | Inventory app, API, Keychain, provider, and SDK data; reconcile public policy; complete App Privacy answers and privacy manifests for the built dependency set                                         |
| Deletion execution  | Request capture and status are implemented; exact retention periods and deletion operations are absent from repository evidence | Approve retention schedule and completion SLA, set `ACCOUNT_DELETION_TARGET_DAYS`, implement reviewed completion/erasure operations, preserve records that must remain, and notify users of completion |
| Store content       | Bundle ID is configured in the Xcode project; listing assets and App Store Connect declarations are absent                      | Prepare truthful description, screenshots, age rating, privacy URL, support contact, export-compliance answers, review notes, and a test account with safe review data                                 |
| Crash/operations    | Native error boundary and network recovery exist; crash analytics and production telemetry are not configured                   | Select privacy-reviewed crash reporting, define release health monitoring and support escalation, and rehearse staged rollout/rollback                                                                 |
| Payments            | Paystack registration transfer details are requested server-side; provider sandbox/live readiness is not proven                 | Verify the exact transfer flow, webhook signatures, amount/reference matching, duplicate delivery, timeout reconciliation, and settlement in provider test environment                                 |

Apple requires in-app account-deletion initiation for apps that create accounts; legally required data may be retained, but the process and timing must be transparent. The deletion screen therefore captures a request and communicates the configured estimate; completing erasure remains gated on the approved operational policy. See [Apple account-deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app).

Apple's review guidance requires financial-service apps to be submitted by the responsible service entity with necessary permissions in each offered location. MPT Technologies Africa Limited is the configured operator in current legal copy and the selected Apple account entity, but its regulated role and permissions have not been independently verified. See [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/uk/).

## Build and verification

- Install native dependencies from `mobile/package-lock.json`; install CocoaPods from the checked-in Gemfile/Podfile on macOS.
- Pull requests run the unsigned iOS simulator build on a GitHub-hosted macOS runner. A manually dispatched signed archive imports distribution credentials from GitHub Actions secrets, never from repository files.
- Required mobile secrets: `IOS_DISTRIBUTION_CERTIFICATE_BASE64`, `IOS_DISTRIBUTION_CERTIFICATE_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`, `IOS_TEAM_ID`, and `IOS_KEYCHAIN_PASSWORD`. Configure them only in the protected release environment after matching them to the registered bundle ID.
- API tests must cover native login throttling, generic bad-credential responses, token expiry/revocation, Keychain persistence, deletion request re-authentication and uniqueness, request-write blocking, repayment/support availability, and missing deletion estimate configuration.
- Device acceptance must cover VoiceOver, Dynamic Type, contrast, touch targets, keyboard, slow/offline/reconnected networks, expired sessions, interrupted requests, low storage, app upgrade, and safe display of financial account details.

The build workflow does not submit or publish the app. App Store approval and live provider behavior remain external release outcomes, not repository guarantees.

## Feature reliability contract

Every new feature and roadmap item must have clear ownership, API authorization, loading/empty/error/offline states, a recovery path, tests for dependency and permission failures, privacy-safe logs, and an independently reversible release control. Financial writes require idempotency and reconciliation; uncertain money-moving requests are not automatically replayed. These controls reduce failure impact but cannot guarantee zero crashes.

Recheck the [official Apple review](https://developer.apple.com/app-store/review/) and [account-deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app) policies before each submission because platform requirements can change.
