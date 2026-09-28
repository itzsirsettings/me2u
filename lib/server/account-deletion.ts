export type AccountDeletionStatus = "requested" | "in_review" | "completed" | "cancelled";

export type AccountDeletionRequest = {
  id: string;
  status: AccountDeletionStatus;
  requested_at: string;
  estimated_completion_at: string;
};

export function getAccountDeletionTargetDays(value = process.env.ACCOUNT_DELETION_TARGET_DAYS) {
  if (!value || !/^\d+$/.test(value)) return null;
  const days = Number(value);
  return Number.isSafeInteger(days) && days > 0 && days <= 365 ? days : null;
}

export function deletionEstimateFrom(now: Date, targetDays: number): Date {
  return new Date(now.getTime() + targetDays * 24 * 60 * 60 * 1000);
}
