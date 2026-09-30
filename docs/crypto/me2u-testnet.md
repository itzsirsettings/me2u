# Me2U Sepolia testnet runbook

## Scope

The authenticated `/wallet/me2u-testnet` page is an isolated Sepolia prototype. Its ERC-20 test token is not backed by money, cannot be redeemed, and has no promised dollar value or appreciation. The USD/NGN panel is a local calculation using a rate typed by the user; it does not publish quotes, create orders, move fiat, or touch the NGN wallet ledger.

The test-token faucet gives one claim of 1,000 ME2UT per address. It is permissionless and sybil-able for test coverage, not mining, referrals, or a production reward mechanism. The final network, mining decision, token supply, reward schedule, rate methodology, exchange venue, liquidity, and launch countries are still undecided. See [the feasibility review](./me2u-currency-feasibility.md).

## Application configuration

Set the optional public variables in `.env.local` (or the app deployment environment), then restart/redeploy the Next.js app:

```dotenv
NEXT_PUBLIC_ME2U_SEPOLIA_RPC_URL=https://<your-sepolia-rpc-endpoint>
NEXT_PUBLIC_ME2U_SEPOLIA_TOKEN_ADDRESS=0x<deployed-sepolia-token-address>
```

The RPC URL is included in browser JavaScript. If its provider URL contains an API key, treat that key as public: use origin restrictions, a usage budget, and monitoring. Do not put deployer keys, wallet phrases, private keys, or user secrets in `NEXT_PUBLIC_*` variables. The token address must be a deployment that has been independently checked on Sepolia Etherscan.

Without a token address, the page still provides the manual market-scenario calculator and wallet connection, but disables balance, faucet, and transfer actions. An external wallet can supply reads and transaction signing without the configured RPC. The in-app wallet needs the configured Sepolia RPC.

## Local checks

Use Node.js 22.13 or later for the isolated Hardhat project. Root application dependencies remain governed by the repository's root `package.json`.

```powershell
npm install
npm --prefix contracts install
npm run contracts:build
npm run contracts:test
npm run contracts:typecheck
npm test
npm run typecheck
npm run lint
npm run build
```

The contract tests cover the chain-ID deployment guard, one-time issuance, separate-address claims, and ERC-20 transfers. The app unit tests cover fixed-decimal simulation arithmetic, input rejection, chain selection, error formatting, encrypted-wallet recovery, and phrase-based recovery. The contract uses the locally installed, lockfile-pinned `solc` 0.8.37 compiler so compilation does not require downloading a compiler at runtime.

## Sepolia deployment

The deployment module can first be exercised on the local simulated Sepolia network. This creates no public transaction:

```powershell
npm --prefix contracts run deploy:local
```

Public Sepolia deployment is a separate operational action and has not been performed by the app build. It needs a Sepolia RPC endpoint and a dedicated test-only deployer funded with Sepolia ETH. Never use a production wallet or a private key holding funds on mainnet.

From the `contracts` directory, store credentials through Hardhat's encrypted keystore (do not paste secrets into shell history or commit them):

```powershell
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npm run deploy:sepolia
```

Then verify the transaction, chain ID, source, constructor guard, name/symbol/decimals, and faucet behavior on Sepolia Etherscan. Only after that should the deployed address be supplied to the app's public testnet configuration. This is not a mainnet launch approval.

## Self-custody boundary

- External wallet keys remain controlled by the connected wallet provider. The app uses EIP-1193 only for connection, network selection, reads, and user-approved transactions.
- The in-app wallet is generated/imported and decrypted in the browser. Only an ethers encrypted JSON keystore is written to `localStorage`; the phrase, private key, and encryption passphrase are not posted to Me2U APIs or persisted in plaintext by this feature.
- Browser storage encryption does not protect against compromised devices, malicious extensions, browser-profile theft, or an application XSS attack while the wallet is unlocked. Treat this as testnet-only and do not store valuable assets.
- Lost phrases/passphrases cannot be recovered by Me2U. A user should test recovery before using the wallet for Sepolia transactions.

## Release gates before any live value

Do not add mainnet, fiat exchange, or redemption until each enabled country has provider/legal clearance; the final chain, supply/emission and reward rules are documented; security reviews are completed; and reserves plus reconciled, idempotent payouts fully back all redemption obligations. The live payout date and market quote are product goals only until those gates are satisfied. The existing NGN wallet and ledger remain a separate product flow.
