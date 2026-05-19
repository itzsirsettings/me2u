export const withdrawalFeeAmount = 100;
export const marketplaceBoostFeeAmount = 100;
export const marketplaceBoostDurationHours = 24;
export const partnerOfferConsentVersion = "2026-05-partner-offers-v1";

export type MarketplaceBoostLike = {
  boostedUntil?: string | null;
  boosted_until?: string | null;
};

export function getWithdrawalDebitAmount(amount: number, fee = withdrawalFeeAmount) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const safeFee = Number.isFinite(fee) ? Math.max(0, fee) : 0;
  return Math.round((amount + safeFee) * 100) / 100;
}

export function isMarketplaceBoostActive(item: MarketplaceBoostLike, now = Date.now()) {
  const boostedUntil = item.boostedUntil ?? item.boosted_until;
  if (!boostedUntil) return false;

  const boostedUntilTime = new Date(boostedUntil).getTime();
  return Number.isFinite(boostedUntilTime) && boostedUntilTime > now;
}
