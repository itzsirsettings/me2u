import type {
  ActiveLoan,
  AppNotification,
  LoanApiRow,
  MarketplaceItem,
  Transaction,
  User,
} from "./types";

import type { MarketplaceRow, NotificationRow, TransactionRow } from "@/lib/database/types";
import { getSecurityDeposit, getTrustTier } from "@/lib/loans";
import { isMarketplaceBoostActive } from "@/lib/revenue";


export function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function clearSessionState() {
  return {
    user: null as User | null,
    isAuthenticated: false,
    isLoading: false,
    transactions: [] as Transaction[],
    activeLoans: [] as ActiveLoan[],
    marketplace: [] as MarketplaceItem[],
    notifications: [] as AppNotification[],
  };
}

export function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    date: row.created_at,
    description: row.description,
  };
}

export function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    date: row.created_at,
  };
}

export function toMarketplaceItem(row: MarketplaceRow): MarketplaceItem {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    rate: Number(row.rate),
    days: row.days,
    authorName: row.author_name,
    trustScore: row.trust_score,
    boostedAt: row.boosted_at,
    boostedUntil: row.boosted_until,
    boostFeeAmount: Number(row.boost_fee_amount || 0),
    createdAt: row.created_at,
  };
}

export function sortMarketplaceItems(items: MarketplaceItem[]) {
  const now = Date.now();
  return [...items].sort((left, right) => {
    const rightBoosted = isMarketplaceBoostActive(right, now) ? 1 : 0;
    const leftBoosted = isMarketplaceBoostActive(left, now) ? 1 : 0;
    if (rightBoosted !== leftBoosted) return rightBoosted - leftBoosted;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function toLoan(row: LoanApiRow, userId: string): ActiveLoan {
  const isBorrower = row.borrower_id === userId;
  const peer = isBorrower ? row.lender : row.borrower;
  const trustScore = isBorrower
    ? (row.borrower?.trust_score ?? 50)
    : (row.lender?.trust_score ?? 50);
  const tier = getTrustTier(trustScore);
  return {
    id: row.id,
    amount: Number(row.amount),
    rate: Number(row.rate),
    days: row.days,
    role: isBorrower ? "borrower" : "lender",
    source: row.lender_id ? "peer" : "platform",
    fundingSource: row.funding_source,
    status: row.status,
    startDate: row.start_date,
    dueDate: row.due_date,
    peerPhone: peer?.phone,
    peerBankDetails: peer?.bank_name ? `${peer.bank_name} - ${peer.account_number}` : undefined,
    securityDeposit: Number(
      row.security_deposit ?? getSecurityDeposit(Number(row.amount), trustScore),
    ),
    tierLabel: tier.label,
    maxDuration: tier.maxDays,
  };
}
