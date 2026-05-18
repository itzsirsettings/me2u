export const onboardingCreditAmount = 2000;
export const registrationDepositAmount = 1000;
export const repeatPlatformLoanMinimum = 5000;
export const platformLoanRetainedDepositRate = 0.5;
export const affiliateRewardRate = 0.5;
export const affiliateRewardAmount = registrationDepositAmount * affiliateRewardRate;
export const loanDurationMinDays = 1;
export const loanDurationMaxDays = 14;
export const platformLoanDays = loanDurationMaxDays;
export const platformLoanRate = 0;

export function getPlatformLoanRetainedDeposit(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * platformLoanRetainedDepositRate * 100) / 100;
}

type LoanLike = {
  amount: number;
  role: "borrower" | "lender";
  source: "platform" | "peer";
  status: "active" | "completed";
};

export function getActivePlatformLoanRetainedDeposit(loans: LoanLike[]) {
  return loans.reduce((total, loan) => {
    if (
      loan.role !== "borrower" ||
      loan.source !== "platform" ||
      loan.status !== "active" ||
      loan.amount < repeatPlatformLoanMinimum
    ) {
      return total;
    }

    return total + getPlatformLoanRetainedDeposit(loan.amount);
  }, 0);
}
