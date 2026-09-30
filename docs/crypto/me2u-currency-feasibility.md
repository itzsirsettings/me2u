# Me2U Currency: testnet feasibility review

**Reviewed:** 30 September 2026
**Status:** Testnet prototype recommendation only. This is not a production token design, legal opinion, investment offer, or promise of redemption or value.

## Recommendation

Use an ERC-20-compatible token on Ethereum Sepolia for the first public testnet prototype. Sepolia is Ethereum's recommended default testnet for application development, while a separate proof-of-work chain would require a consensus implementation, peer network, miner distribution, and enough sustained hash power to resist attacks. A new low-hash-power chain would not inherit Bitcoin's security merely by using proof of work. Keep the independent-chain decision open until a dedicated security, cost, energy, liquidity, and operating-capacity review is funded and completed. [Ethereum networks](https://ethereum.org/developers/docs/networks/), [Bitcoin mining](https://developer.bitcoin.org/devguide/mining.html), [Bitcoin proof of work](https://developer.bitcoin.org/devguide/block_chain.html)

This recommendation selects a familiar EVM test environment for wallet and transfer experiments; it does not select the final Me2U currency architecture or authorize mainnet deployment.

## Options compared

| Option                                     | What it means                                                                                                                       | Feasibility for the current test phase                                                                                                         | Decision                                         |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Independent proof-of-work chain            | Native Me2U coin, peer-to-peer node software, consensus rules, mining clients/pools, and block rewards                              | Highest security and operations burden; a new chain starts with little hash power and requires independent review and long-term infrastructure | Do not launch in this phase; review remains open |
| Token on an existing public chain          | A standard token contract that inherits the host network's consensus; supply/rewards are handled by token rules, not Bitcoin mining | Supports self-custody, common EVM wallet connections, and Sepolia testing without creating new consensus software                              | Recommended for the Sepolia prototype only       |
| Participation rewards on an existing chain | Application rules distribute tokens for eligible community activity; this is not proof-of-work mining                               | Technically separate from consensus and still requires abuse, issuance, and legal design                                                       | Defer until tokenomics and compliance review     |

## Prototype boundary

- The test contract is restricted to chain ID `11155111` (Sepolia), uses OpenZeppelin's ERC-20 implementation, and provides a one-time test-token claim per address. The faucet is intentionally sybil-able and does not establish a hard supply cap or final issuance schedule.
- Wallet signing happens in the browser through an injected EIP-1193 provider or an in-app wallet. The in-app key is created locally, encrypted with a user passphrase, stored only as encrypted JSON on that device, and recoverable through the user's phrase. Me2U servers do not receive keys or phrases. This browser-wallet prototype is for valueless testnet use; it has not been reviewed for production custody.
- The USD and NGN panel is a manual scenario calculator. It has no price oracle, order book, liquidity, fiat settlement, or redemption. Test orders are not persisted and do not change token, USD, NGN, or the existing Me2U wallet balance.
- There is no production chain configuration, real token mint, fiat on/off-ramp, redemption API, reserve account, or mainnet deployment in this prototype.

## Mainnet gates still required

Before any real-money issuance, exchange, or redemption, determine the final network and supply/emission model; choose licensed market and payment partners; define independent price calculation and liquidity; establish segregated, fully sufficient reserves and reconciliation; complete contract and application security reviews; and approve country-by-country legal, AML, sanctions, privacy, and consumer-protection controls. Nigeria's CBN identifies token issuance, wallets, exchanges, and fiat on/off-ramps under the VASP sandbox track and says sandbox admission is not a permanent license. SEC's posted capital schedule includes separate categories for token issuers and exchanges; counsel must confirm which categories apply to Me2U. [CBN Regulatory Sandbox](https://sandbox.cbn.gov.ng/), [SEC minimum capital schedule](https://sec.gov.ng/for-investors/keep-track-of-circulars/revised-minimum-capital-mc-for-regulated-capital-market-entities/)

## Operational decision

**Decision:** Use Sepolia plus an ERC-20 test contract only for the global testnet.
**Alternatives:** Build a new proof-of-work network now, or simulate every operation only in the browser.
**Rationale:** Sepolia lets the team test real on-chain key ownership and transfers while avoiding a new consensus network; the clearly labelled manual market calculator validates UX without implying real prices or liquidity.
**Revisit when:** A separately approved feasibility review can show that a native PoW network or a different public chain has adequate security, operational, regulatory, and economic support.
