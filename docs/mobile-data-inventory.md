# Me2U iOS data and SDK inventory

**Reviewed:** 28 September 2026  
**Scope:** Repository-observed first-party data flows for the initial iOS client. This is an engineering inventory, not the completed Apple App Privacy declaration or legal retention schedule.

## First-party flows

| Data                                                | Source and purpose                                    | Transport/storage                                                                                | Current deletion or retention behavior                                                                                                           |
| --------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Email and password                                  | User enters credentials for sign-in                   | Sent over HTTPS to `POST /api/auth/native/login`; password is not persisted by the client        | Password is not stored on device; server retains its existing password hash under its current account policy                                     |
| Bearer session token                                | Issued by native login for authenticated API access   | Stored in iOS Keychain with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; sent in the `Authorization` header | Removed on logout, local session expiry response, or reauthentication failure; server session revocation is checked by the existing auth service |
| Profile, wallet balance, KYC status, loan summaries | Existing Me2U account APIs                            | Held in screen memory after HTTPS requests; not intentionally cached offline                     | No new local retention; source database policies remain authoritative                                                                            |
| Registration transfer details                       | Existing authenticated Paystack deposit route         | Received over HTTPS and shown on screen; never sent to telemetry by this client                  | Temporary account expires at the server-provided time; verified settlement remains in the server ledger/audit record                             |
| Account-deletion request and estimate               | Signed-in user, with current-password re-verification | Request row in PostgreSQL; app displays request status                                           | Request remains for operator/legal review. Erasure and final audit-record policy are not implemented by this change                              |
| Network/error status                                | API transport and response state                      | In memory and generic device warning log for contained render failures                           | No analytics or crash-reporting SDK is configured                                                                                                |

## Native dependencies observed

- React Native 0.87 and React 19.
- React Navigation native stack, React Native Screens, and Safe Area Context.
- React Native Keychain for iOS Keychain access.
- No contacts, location, photo-library, camera, tracking, push-notification, advertising, or analytics permission is requested by the initial app code.

The App Store privacy declaration must be based on the archived build, every transitive/native SDK, backend and provider processing, and current production configuration. The list above is not a completed App Privacy answer. Re-run the inventory when dependencies or features change.

## Security boundaries and open work

- The client calls only the Me2U HTTPS API; Paystack credentials remain in server configuration.
- No financial or KYC response is intentionally persisted in AsyncStorage or emitted to logs.
- The seven-day bearer token is scoped to the existing revocable server session. A timeout on a money-moving request is reconciled from server state; the app does not automatically retry it.
- Legal/operations must approve retention purposes, periods, deletion completion timing, and handling of open loans, balances, disputes, and mandatory financial records. Configure `ACCOUNT_DELETION_TARGET_DAYS` only from that approval.
- Choose and review any future crash-reporting service before adding its SDK; redact tokens, names, loan details, account numbers, KYC data, and provider responses.
