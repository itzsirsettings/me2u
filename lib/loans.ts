export const registrationDepositAmount = 1000;
export const repeatPlatformLoanMinimum = 5000;
export const platformLoanRetainedDepositRate = 0.5;
export const affiliateRewardRate = 0.5;
export const affiliateRewardAmount = registrationDepositAmount * affiliateRewardRate;
export const loanDurationMinDays = 1;
export const loanDurationMaxDays = 14;
export const platformLoanDays = loanDurationMaxDays;
export const platformLoanRate = 0;

export interface TrustTier {
  label: string;
  min: number;
  max: number;
  rate: number;
  maxDays: number;
}

export const defaultTrustTiers: TrustTier[] = [
  { label: 'Standard', min: 0, max: 50, rate: 0.50, maxDays: 14 },
  { label: 'Building', min: 51, max: 65, rate: 0.40, maxDays: 14 },
  { label: 'Trusted', min: 66, max: 80, rate: 0.25, maxDays: 14 },
  { label: 'Gold', min: 81, max: 95, rate: 0.10, maxDays: 30 },
  { label: 'Premium', min: 96, max: 100, rate: 0.00, maxDays: 60 },
];

export function getTrustTier(trustScore: number): TrustTier {
  for (let i = defaultTrustTiers.length - 1; i >= 0; i--) {
    const tier = defaultTrustTiers[i];
    if (trustScore >= tier.min && trustScore <= tier.max) {
      return tier;
    }
  }
  return defaultTrustTiers[0];
}

export function getRetentionRate(trustScore: number): number {
  return getTrustTier(trustScore).rate;
}

export function getMaxLoanDuration(trustScore: number): number {
  return getTrustTier(trustScore).maxDays;
}

export function getTierLabel(trustScore: number): string {
  return getTrustTier(trustScore).label;
}

export function getSecurityDeposit(amount: number, trustScore: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const rate = getRetentionRate(trustScore);
  return Math.round(amount * rate * 100) / 100;
}

export function getNextTierInfo(trustScore: number): { label: string; minScore: number; rate: number; maxDays: number } | null {
  for (const tier of defaultTrustTiers) {
    if (trustScore < tier.min) {
      return { label: tier.label, minScore: tier.min, rate: tier.rate, maxDays: tier.maxDays };
    }
  }
  return null;
}

export function getPlatformLoanRetainedDeposit(amount: number, trustScore: number = 50) {
  return getSecurityDeposit(amount, trustScore);
}

type LoanLike = {
  amount: number;
  role: "borrower" | "lender";
  source: "platform" | "peer";
  status: "active" | "completed";
  securityDeposit?: number;
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

    return total + (loan.securityDeposit || getPlatformLoanRetainedDeposit(loan.amount));
  }, 0);
}
