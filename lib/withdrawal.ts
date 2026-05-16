export function getRequiredWithdrawalBalance(amount: number, protectedWalletBalance = 0) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const requiredRemainingBalance = Number.isFinite(protectedWalletBalance)
    ? Math.max(0, protectedWalletBalance)
    : 0;

  return Math.round((amount + requiredRemainingBalance) * 100) / 100;
}
