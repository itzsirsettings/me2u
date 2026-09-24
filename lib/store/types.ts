import type { StateCreator } from "zustand";

import type { LoanRow } from "@/lib/database/types";

export interface Transaction {
  id: string;
  type:
    | "deposit"
    | "withdrawal"
    | "loan_disbursed"
    | "loan_repayment"
    | "investment"
    | "repayment_received"
    | "affiliate_reward"
    | "bill_payment"
    | "bill_refund";
  amount: number;
  date: string;
  description: string;
}

export interface MarketplaceItem {
  id: string;
  type: "borrow_request" | "lending_offer";
  amount: number;
  rate: number;
  days: number;
  authorName: string;
  trustScore: number;
  boostedAt: string | null;
  boostedUntil: string | null;
  boostFeeAmount: number;
  createdAt: string;
}

export type MarketplaceDraft = {
  type: "borrow_request" | "lending_offer";
  amount: number;
  rate: number;
  days: number;
  boost?: boolean;
};

export interface ActiveLoan {
  id: string;
  amount: number;
  rate: number;
  days: number;
  role: "borrower" | "lender";
  source: "platform" | "peer";
  fundingSource?: LoanRow["funding_source"];
  status: "active" | "completed";
  startDate: string;
  dueDate: string;
  peerPhone?: string;
  peerBankDetails?: string;
  securityDeposit: number;
  tierLabel: string;
  maxDuration: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  countryCode: string;
  preferredCurrency: string;
  preferredLanguage: string;
  bankName: string | null;
  accountNumber: string | null;
  balance: number;
  locked: number;
  kycVerified: boolean;
  trustScore: number;
  username: string | null;
  referralCode: string | null;
  referenceCode: string | null;
  registrationDepositPaid: boolean;
  registrationDepositAmount: number;
  registrationDepositReference: string | null;
  registrationDepositConfirmedAt: string | null;
  referredBy: string | null;
  affiliateEarnings: number;
  verifiedReferralCount: number;
  weeklyVerifiedReferralCount: number;
  accountUnlocked?: boolean;
  accountUnlockPaidAt?: string | null;
  partnerOfferConsentAt: string | null;
  partnerOfferConsentVersion: string | null;
  passportPhotoUrl: string | null;
  role: "user" | "admin";
  transactionPin: string | null;
  groupLendingEnabled: boolean;
  createdAt: string;
  referralStats: ReferralStats | null;
  referrals: ReferralDetail[] | null;
}

export interface ReferralStats {
  total_referrals: number;
  pending_withdrawal: number;
  pending_repayment: number;
  earned_withdrawal: number;
  earned_repayment: number;
  total_earned: number;
}

export interface ReferralDetail {
  referee_id: string;
  referee_name: string;
  referee_email: string;
  referee_trust_score: number;
  referee_kyc_verified: boolean;
  signed_up_at: string;
  first_withdrawal_rewarded: boolean;
  first_repayment_rewarded: boolean;
  pending_rewards: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  date: string;
}

export type ActionResult = { ok: boolean; error?: string };

export interface LoanApiRow {
  id: string;
  borrower_id: string;
  lender_id: string | null;
  amount: number | string;
  rate: number | string;
  days: number;
  funding_source?: LoanRow["funding_source"];
  status: "active" | "completed";
  start_date: string;
  due_date: string;
  security_deposit?: number | string | null;
  borrower?: {
    trust_score?: number;
    phone?: string;
    bank_name?: string;
    account_number?: string;
  };
  lender?: {
    trust_score?: number;
    phone?: string;
    bank_name?: string;
    account_number?: string;
  };
}

export interface AppStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  transactions: Transaction[];
  marketplace: MarketplaceItem[];
  activeLoans: ActiveLoan[];
  notifications: AppNotification[];
  initialize: () => Promise<void>;
  loadCurrentUser: () => Promise<ActionResult>;
  signInWithPassword: (identifier: string, password: string) => Promise<ActionResult>;
  logout: () => Promise<void>;
  fundWallet: (amount: number, reference: string, receiptFile?: File) => Promise<ActionResult>;
  confirmRegistrationDeposit: (reference: string, receiptFile?: File) => Promise<ActionResult>;
  withdraw: (amount: number, pin?: string) => Promise<ActionResult>;
  createMarketplaceItem: (item: MarketplaceDraft) => Promise<ActionResult>;
  acceptMarketplaceItem: (itemId: string) => Promise<ActionResult>;
  requestPlatformLoan: (amount?: number, days?: number) => Promise<ActionResult>;
  repayLoan: (loanId: string) => Promise<ActionResult>;
  payBill: (
    amount: number,
    serviceLabel: string,
    detail: string,
    pin?: string,
  ) => Promise<ActionResult>;
  setTransactionPin: (pin: string, password: string) => Promise<ActionResult>;
  toggleGroupLending: () => Promise<ActionResult>;
  deleteNotification: (id: string) => Promise<ActionResult>;
  clearAllNotifications: () => Promise<ActionResult>;
}

export type StoreSlice<T> = StateCreator<AppStore, [], [], T>;
