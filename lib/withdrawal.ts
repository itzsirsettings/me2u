import { getWithdrawalDebitAmount, withdrawalFeeAmount } from "@/lib/revenue";

export function getRequiredWithdrawalBalance(
  amount: number,
  protectedWalletBalance = 0,
  fee = withdrawalFeeAmount,
) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const requiredRemainingBalance = Number.isFinite(protectedWalletBalance)
    ? Math.max(0, protectedWalletBalance)
    : 0;

  return Math.round((getWithdrawalDebitAmount(amount, fee) + requiredRemainingBalance) * 100) / 100;
}
