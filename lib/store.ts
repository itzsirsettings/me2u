import { create } from "zustand";
import {
  getActivePlatformLoanRetainedDeposit,
  registrationDepositAmount,
  repeatPlatformLoanMinimum,
  getTrustTier,
  getSecurityDeposit,
} from "@/lib/loans";
import { isMarketplaceBoostActive, withdrawalFeeAmount } from "@/lib/revenue";
import { uploadPrivateImage } from "@/lib/uploads";
import { getRequiredWithdrawalBalance } from "@/lib/withdrawal";
import {
  saveToken,
  clearToken,
  saveCsrfHeaderValue,
} from "@/lib/railway/token";
import {
  authHeaders,
  authorizedFetch,
  isAbortError,
} from "@/lib/fetch";
import type {
  LoanRow,
  MarketplaceRow,
  TransactionRow,
  NotificationRow,
} from "@/lib/database/types";

// ─── Domain types ────────────────────────────────────────────────────────────

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

type ActionResult = { ok: boolean; error?: string };

let loadCurrentUserInflight: Promise<ActionResult> | null = null;
let loadCurrentUserAbort: (() => void) | null = null;

interface AppStore {
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
  payBill: (amount: number, serviceLabel: string, detail: string, pin?: string) => Promise<ActionResult>;
  setTransactionPin: (pin: string, password: string) => Promise<ActionResult>;
  toggleGroupLending: () => Promise<ActionResult>;
  deleteNotification: (id: string) => Promise<ActionResult>;
  clearAllNotifications: () => Promise<ActionResult>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function clearSessionState() {
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

/** All authenticated API calls go through here — attaches CSRF + httpOnly cookie auth. */
export async function getAuthToken(): Promise<string | null> {
  return null;
}

export async function postAuthenticatedJson(
  path: string,
  body: Record<string, unknown>,
): Promise<ActionResult> {
  const response = await authorizedFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      error: typeof data.error === "string" ? data.error : "Something went wrong.",
    };
  }

  return { ok: true };
}

// ─── Row → domain mappers ─────────────────────────────────────────────────────

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    date: row.created_at,
    description: row.description,
  };
}

function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    date: row.created_at,
  };
}

function toMarketplaceItem(row: MarketplaceRow): MarketplaceItem {
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

function sortMarketplaceItems(items: MarketplaceItem[]) {
  const now = Date.now();
  return [...items].sort((l, r) => {
    const rb = isMarketplaceBoostActive(r, now) ? 1 : 0;
    const lb = isMarketplaceBoostActive(l, now) ? 1 : 0;
    if (rb !== lb) return rb - lb;
    return new Date(r.createdAt).getTime() - new Date(l.createdAt).getTime();
  });
}

function toLoan(row: any, userId: string): ActiveLoan {
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
    peerBankDetails: peer?.bank_name
      ? `${peer.bank_name} - ${peer.account_number}`
      : undefined,
    securityDeposit: Number(
      row.security_deposit ?? getSecurityDeposit(Number(row.amount), trustScore),
    ),
    tierLabel: tier.label,
    maxDuration: tier.maxDays,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  transactions: [],
  marketplace: [],
  activeLoans: [],
  notifications: [],

  // ── bootstrap ────────────────────────────────────────────────────────────

  initialize: async () => {
    // Authentication is persisted in the HTTP-only `me2u_token` cookie.
    // Do not gate this on the legacy localStorage token: `saveToken` is a
    // deliberate no-op, so doing so makes a newly logged-in user look signed
    // out before the cookie-backed session can be loaded.
    await get().loadCurrentUser();
  },

  // ── load session ─────────────────────────────────────────────────────────

  loadCurrentUser: async () => {
    if (loadCurrentUserInflight) {
      return loadCurrentUserInflight;
    }

    if (loadCurrentUserAbort) {
      try { loadCurrentUserAbort(); } catch {}
    }

    const abortCtrl =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    loadCurrentUserAbort = () => {
      try { abortCtrl?.abort(new DOMException("Superseded", "AbortError")); } catch {}
    };

    const promise = (async (): Promise<ActionResult> => {
      set({ isLoading: true });

      try {
        const signal = abortCtrl?.signal ?? undefined;

        const [meRes, txRes, loansRes, mktRes, notifRes] = await Promise.all([
          authorizedFetch("/api/auth/me", { signal }),
          authorizedFetch("/api/auth/me/transactions", { signal }),
          authorizedFetch("/api/auth/me/loans", { signal }),
          authorizedFetch("/api/auth/me/marketplace", { signal }),
          authorizedFetch("/api/auth/me/notifications", { signal }),
        ]);

        if (meRes.status === 401) {
          clearToken();
          set(clearSessionState());
          return { ok: false, error: "Session expired. Please log in again." };
        }

        if (!meRes.ok) {
          const err = await meRes.json().catch(() => ({}));
          throw new Error(err.error || "Failed to load user.");
        }

        const meData = await meRes.json();
        const user: User = meData.user;

        const txData = txRes.ok ? await txRes.json().catch(() => ({})) : {};
        const loansData = loansRes.ok ? await loansRes.json().catch(() => ({})) : {};
        const mktData = mktRes.ok ? await mktRes.json().catch(() => ({})) : {};
        const notifData = notifRes.ok ? await notifRes.json().catch(() => ({})) : {};

        const rawLoans: any[] = loansData.loans || [];

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          transactions: (txData.transactions || []).map(toTransaction),
          activeLoans: rawLoans.map((l) => toLoan(l, user.id)),
          marketplace: sortMarketplaceItems(
            (mktData.items || []).map(toMarketplaceItem),
          ),
          notifications: (notifData.notifications || []).map(toNotification),
        });

        return { ok: true };
      } catch (error) {
        if (isAbortError(error)) {
          return { ok: false, error: "Request cancelled." };
        }
        set(clearSessionState());
        return { ok: false, error: toErrorMessage(error) };
      }
    })();

    loadCurrentUserInflight = promise;
    promise
      .catch(() => {})
      .finally(() => {
        loadCurrentUserInflight = null;
      });

    return promise;
  },

  // ── sign in ───────────────────────────────────────────────────────────────

  signInWithPassword: async (identifier, password) => {
    try {
      const normalizedIdentifier = identifier.trim().toLowerCase();
      let loginEmail = normalizedIdentifier;

      if (!normalizedIdentifier.includes("@")) {
        const res = await fetch("/api/auth/resolve-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: normalizedIdentifier }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || typeof data.email !== "string") {
          throw new Error(
            typeof data.error === "string" ? data.error : "Username was not found.",
          );
        }
        loginEmail = data.email.trim().toLowerCase();
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Invalid email or password.",
        );
      }

      if (!data.token) throw new Error("No token returned from server.");
      saveToken(data.token);
      const csrf = res.headers.get("x-csrf-token");
      if (csrf) saveCsrfHeaderValue(csrf);

      return await get().loadCurrentUser();
    } catch (error) {
      return { ok: false, error: toErrorMessage(error) };
    }
  },

  // ── logout ────────────────────────────────────────────────────────────────

  logout: async () => {
    clearToken();
    set(clearSessionState());
  },

  // ── wallet actions ────────────────────────────────────────────────────────

  fundWallet: async (amount, reference, receiptFile) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };

    const normalizedReference = reference.trim();
    if (normalizedReference.length < 4 || normalizedReference.length > 120) {
      return { ok: false, error: "Enter a valid payment reference." };
    }

    let receiptImageUrl = "";
    if (receiptFile) {
      try {
        receiptImageUrl = await uploadPrivateImage("receipts", user.id, receiptFile);
      } catch (error) {
        return { ok: false, error: toErrorMessage(error) };
      }
    }

    const result = await postAuthenticatedJson("/api/wallet/fund", {
      amount,
      reference: normalizedReference,
      receiptImageUrl,
    });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  confirmRegistrationDeposit: async (reference, receiptFile) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };

    if (user.registrationDepositPaid) {
      return { ok: false, error: "Registration deposit is already confirmed." };
    }

    const normalizedReference = reference.trim();
    if (normalizedReference.length < 4 || normalizedReference.length > 120) {
      return { ok: false, error: "Enter a valid payment reference." };
    }

    let receiptImageUrl = "";
    if (receiptFile) {
      try {
        receiptImageUrl = await uploadPrivateImage("receipts", user.id, receiptFile);
      } catch (error) {
        return { ok: false, error: toErrorMessage(error) };
      }
    }

    const result = await postAuthenticatedJson("/api/onboarding/registration-deposit", {
      reference: normalizedReference,
      receiptImageUrl,
    });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  withdraw: async (amount, pin) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };
    if (!user.kycVerified) return { ok: false, error: "Complete your KYC before transacting." };

    if (!user.registrationDepositPaid) {
      return {
        ok: false,
        error: `Confirm your ₦${registrationDepositAmount.toLocaleString()} registration deposit before withdrawal.`,
      };
    }

    const platformLoanDeposit = getActivePlatformLoanRetainedDeposit(get().activeLoans);
    const requiredBalance = getRequiredWithdrawalBalance(amount, platformLoanDeposit);
    if (user.balance < requiredBalance) {
      const shortfall = Math.max(0, requiredBalance - user.balance);
      return {
        ok: false,
        error:
          platformLoanDeposit > 0
            ? `Fund ₦${shortfall.toLocaleString()} first. ₦${platformLoanDeposit.toLocaleString()} must remain while a loan is active, plus the ₦${withdrawalFeeAmount.toLocaleString()} fee.`
            : `Insufficient balance for the withdrawal and ₦${withdrawalFeeAmount.toLocaleString()} processing fee.`,
      };
    }

    const result = await postAuthenticatedJson("/api/wallet/withdraw", { amount, pin });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  // ── marketplace ───────────────────────────────────────────────────────────

  createMarketplaceItem: async (item) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };
    if (!user.kycVerified) return { ok: false, error: "Complete your KYC before transacting." };

    const result = await postAuthenticatedJson("/api/marketplace/create", item);
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  acceptMarketplaceItem: async (itemId) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };
    if (!user.kycVerified) return { ok: false, error: "Complete your KYC before transacting." };

    const result = await postAuthenticatedJson("/api/marketplace/accept", { itemId });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },


  // ── loans ─────────────────────────────────────────────────────────────────

  requestPlatformLoan: async (amount, days) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };
    if (!user.kycVerified) return { ok: false, error: "Complete your KYC before taking a loan." };

    if (!user.registrationDepositPaid) {
      return { ok: false, error: "Confirm your registration deposit before requesting a loan." };
    }

    const platformLoans = get().activeLoans.filter(
      (l) => l.role === "borrower" && l.source === "platform",
    );
    if (platformLoans.some((l) => l.status === "active")) {
      return { ok: false, error: "Repay your active loan before requesting another one." };
    }

    if (!Number.isFinite(amount) || Number(amount) < repeatPlatformLoanMinimum) {
      return {
        ok: false,
        error: `Loans start from ₦${repeatPlatformLoanMinimum.toLocaleString()}.`,
      };
    }

    const result = await postAuthenticatedJson("/api/loans/request", { amount, days });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  repayLoan: async (loanId) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };

    const loan = get().activeLoans.find((l) => l.id === loanId);
    if (!loan || loan.status === "completed" || loan.role !== "borrower") {
      return { ok: false, error: "This loan cannot be repaid from this account." };
    }

    const repaymentAmount = loan.amount + (loan.amount * loan.rate) / 100;
    if (user.balance < repaymentAmount) {
      return { ok: false, error: "Insufficient balance to repay this loan." };
    }

    const result = await postAuthenticatedJson("/api/loans/repay", { loanId });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  payBill: async (amount, serviceLabel, detail, pin) => {
    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };
    if (!user.kycVerified) return { ok: false, error: "Complete your KYC before transacting." };

    const result = await postAuthenticatedJson("/api/wallet/pay-bill", {
      amount,
      serviceLabel,
      detail,
      pin,
    });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  // ── security ──────────────────────────────────────────────────────────────

  setTransactionPin: async (pin, password) => {
    const result = await postAuthenticatedJson("/api/security/pin", { pin, password });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  toggleGroupLending: async () => {
    const result = await postAuthenticatedJson("/api/security/group-lending", {});
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  // ── notifications ─────────────────────────────────────────────────────────

  deleteNotification: async (id) => {
    const result = await postAuthenticatedJson("/api/notifications/clear", { id });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  clearAllNotifications: async () => {
    const result = await postAuthenticatedJson("/api/notifications/clear", { clearAll: true });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },
}));
