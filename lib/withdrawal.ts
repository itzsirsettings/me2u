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

  return (
    Math.round((getWithdrawalDebitAmount(amount, fee) + requiredRemainingBalance) * 100) / 100
  );
}

export function getWithdrawalErrorMessage(value: unknown, fallback = "Withdrawal failed") {
  const message = typeof value === "string" ? value : "";
  if (/your balance is not enough to ful(?:fil|fill) this request/i.test(message)) {
    return "Withdrawals are temporarily unavailable. Your wallet balance was restored. Please try again later or contact support.";
  }
  return message || fallback;
}
