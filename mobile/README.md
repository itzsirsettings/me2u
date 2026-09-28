# Me2U iOS client

Bare React Native 0.87 client for the Me2U iOS App Store target. Android native distribution is not configured; Android users use the web PWA.

## Current screens

- Sign in through `POST /api/auth/native/login` and save the seven-day bearer token in iOS Keychain.
- Account overview reads `/api/auth/me` and `/api/auth/me/loans`.
- The registration-deposit screen requests Paystack transfer details from the Me2U server. The mobile client never receives a Paystack secret key and never retries a transfer creation automatically.
- Account deletion uses `/api/account/deletion`. The request requires password re-verification, records an estimated completion date, and remains pending operator/legal review. It does not erase ledger or KYC data.

## Requirements

- Node.js 22.11 or newer, matching the React Native 0.87 template.
- macOS with Xcode, iOS Simulator, Ruby, Bundler, and CocoaPods for iOS dependency installation and builds. Windows can edit the project but cannot build the native iOS target.
- A configured Me2U API at `https://app.me2ulend.online`. No provider or signing secrets belong in this client.

## Local commands (macOS)

```sh
npm ci
npm test
npm run typecheck
bundle install
bundle exec pod install --project-directory=ios
npm run ios
```

## Account deletion setup

Run the normal ordered database migration (`025_account_deletion_requests.sql`) before deploying the account-deletion API. Configure `ACCOUNT_DELETION_TARGET_DAYS` from the approved legal/operations completion estimate. If it is absent or invalid, the API does not accept a deletion request. The completion/erasure operator workflow is not implemented yet; do not describe this request-only build as full data deletion or submit until the workflow and retention schedule are approved and available.

## CI signing

`.github/workflows/ios.yml` compiles and tests the unsigned simulator app on macOS. A manual signed archive requires protected GitHub environment secrets for the App Store distribution certificate, provisioning profile, Apple team ID, and temporary keychain password. Configure the profile for bundle ID `com.mpttechnologies.me2u`. The workflow creates a signed archive but does not upload or publish it.
