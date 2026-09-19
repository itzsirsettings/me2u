/**
 * Me2U fee model (decision matrix — single source of truth).
 *
 * Withdrawals: the user pays BOTH the Me2U flat processing fee
 * (`withdrawalFeeAmount` = ₦100) AND the Paystack processor fee
 * (`withdrawalProcessorFeeRate` = 1.5%), already the enforced behavior —
 * now explicit in the withdraw UI and booked as two revenue events:
 *   - 'withdrawal_fee'            → Me2U flat ₦100 (platform revenue)
 *   - 'withdrawal_processor_cost' → Paystack 1.5% (processor cost booked for reconciliation)
 * Paystack transfer failures reverse the full debit (amount + fees) via
 * ledger reversal moves; webhook `transfer.failed`/`transfer.reversed` also reverse.
 *
 * Deposits (funding): the Paystack processing fee is ABSORBED by the Me2U
 * platform as a cost of business — users are credited the exact amount sent.
 *
 * Marketplace Boost: ₦100 user-debited and booked as a 'marketplace_boost'
 * revenue event.
 *
 * Bills (airtime/data/utilities): VTPass products are sold at `selling_price`
 * (already contains the Me2U margin). Successful purchases book a
 * 'bills_convenience_fee' revenue event for margin visibility; no extra
 * wallet debit is taken.
 *
 * Platform loans: 0% interest, 0% origination fee — explicit product
 * decision. There are intentionally NO loan fee revenue events; the
 * trust-tier security deposit is retained capital, not a fee.
 */
export const withdrawalFeeAmount = 100;
export const withdrawalProcessorFeeRate = 0.015;
export const marketplaceBoostFeeAmount = 100;
export const marketplaceBoostDurationHours = 24;
export const partnerOfferConsentVersion = "2026-05-partner-offers-v1";

export type MarketplaceBoostLike = {
  boostedUntil?: string | null;
  boosted_until?: string | null;
};

export function getWithdrawalProcessorFee(amount: number, rate = withdrawalProcessorFeeRate) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const safeRate = Number.isFinite(rate) ? Math.max(0, rate) : 0;
  return Math.round(amount * safeRate * 100) / 100;
}

export function getWithdrawalDebitAmount(amount: number, fee = withdrawalFeeAmount) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const safeFee = Number.isFinite(fee) ? Math.max(0, fee) : 0;
  return Math.round((amount + safeFee + getWithdrawalProcessorFee(amount)) * 100) / 100;
}

export function isMarketplaceBoostActive(item: MarketplaceBoostLike, now = Date.now()) {
  const boostedUntil = item.boostedUntil ?? item.boosted_until;
  if (!boostedUntil) return false;

  const boostedUntilTime = new Date(boostedUntil).getTime();
  return Number.isFinite(boostedUntilTime) && boostedUntilTime > now;
}
