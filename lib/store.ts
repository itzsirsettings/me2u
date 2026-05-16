import { create } from "zustand";
import {
  getActivePlatformLoanRetainedDeposit,
  registrationDepositAmount,
  repeatPlatformLoanMinimum,
} from "@/lib/loans";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { getRequiredWithdrawalBalance } from "@/lib/withdrawal";
import type {
  LoanRow,
  MarketplaceRow,
  ProfileRow,
  TransactionRow,
  WalletRow,
} from "@/lib/supabase/types";

export interface Transaction {
  id: string;
  type:
    | "deposit"
    | "withdrawal"
    | "loan_disbursed"
    | "loan_repayment"
    | "investment"
    | "repayment_received"
    | "affiliate_reward";
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
}

export interface ActiveLoan {
  id: string;
  amount: number;
  rate: number;
  days: number;
  role: "borrower" | "lender";
  source: "platform" | "peer";
  status: "active" | "completed";
  startDate: string;
  dueDate: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  bankName: string | null;
  accountNumber: string | null;
  balance: number;
  locked: number;
  kycVerified: boolean;
  trustScore: number;
  username: string | null;
  referralCode: string | null;
  registrationDepositPaid: boolean;
  registrationDepositAmount: number;
  registrationDepositReference: string | null;
  registrationDepositConfirmedAt: string | null;
  referredBy: string | null;
  affiliateEarnings: number;
}

type ActionResult = {
  ok: boolean;
  error?: string;
};

interface AppStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  transactions: Transaction[];
  marketplace: MarketplaceItem[];
  activeLoans: ActiveLoan[];
  initialize: () => Promise<void>;
  loadCurrentUser: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<ActionResult>;
  logout: () => Promise<void>;
  fundWallet: (amount: number, reference: string) => Promise<ActionResult>;
  confirmRegistrationDeposit: (reference: string) => Promise<ActionResult>;
  withdraw: (amount: number) => Promise<ActionResult>;
  createMarketplaceItem: (
    item: Omit<MarketplaceItem, "id" | "authorName" | "trustScore">,
  ) => Promise<ActionResult>;
  acceptMarketplaceItem: (itemId: string) => Promise<ActionResult>;
  requestPlatformLoan: (amount?: number) => Promise<ActionResult>;
  repayLoan: (loanId: string) => Promise<ActionResult>;
}

const missingSupabaseResult = {
  ok: false,
  error: "Supabase is not configured. Add the keys from .env.example.",
};

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

async function postAuthenticatedJson(path: string, body: Record<string, unknown>): Promise<ActionResult> {
  if (!hasSupabaseConfig()) return missingSupabaseResult;

  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) return { ok: false, error: sessionError.message };
  if (!session?.access_token) return { ok: false, error: "Please log in first." };

  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
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

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    date: row.created_at,
    description: row.description,
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
  };
}

function toLoan(row: LoanRow, userId: string): ActiveLoan {
  return {
    id: row.id,
    amount: Number(row.amount),
    rate: Number(row.rate),
    days: row.days,
    role: row.borrower_id === userId ? "borrower" : "lender",
    source: row.lender_id ? "peer" : "platform",
    status: row.status,
    startDate: row.start_date,
    dueDate: row.due_date,
  };
}

function toUser(profile: ProfileRow, wallet: WalletRow | null): User {
  return {
    id: profile.id,
    name: profile.first_name,
    email: profile.email,
    bankName: profile.bank_name,
    accountNumber: profile.account_number,
    balance: Number(wallet?.balance || 0),
    locked: Number(wallet?.locked || 0),
    kycVerified: profile.kyc_verified,
    trustScore: profile.trust_score,
    username: profile.username,
    referralCode: profile.referral_code,
    registrationDepositPaid: profile.registration_deposit_paid,
    registrationDepositAmount: Number(profile.registration_deposit_amount || 0),
    registrationDepositReference: profile.registration_payment_reference,
    registrationDepositConfirmedAt: profile.registration_deposit_confirmed_at,
    referredBy: profile.referred_by,
    affiliateEarnings: Number(profile.affiliate_earnings || 0),
  };
}

export const useStore = create<AppStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  transactions: [],
  marketplace: [],
  activeLoans: [],

  initialize: async () => {
    if (!hasSupabaseConfig()) {
      set({ isLoading: false });
      return;
    }

    await get().loadCurrentUser();
  },

  loadCurrentUser: async () => {
    if (!hasSupabaseConfig()) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    set({ isLoading: true });

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          transactions: [],
          activeLoans: [],
          marketplace: [],
        });
        return;
      }

      const [
        profileResponse,
        walletResponse,
        transactionsResponse,
        loansResponse,
        marketplaceResponse,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle(),
        supabase.from("wallets").select("*").eq("user_id", authUser.id).maybeSingle(),
        supabase
          .from("transactions")
          .select("*")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("loans")
          .select("*")
          .or(`borrower_id.eq.${authUser.id},lender_id.eq.${authUser.id}`)
          .order("created_at", { ascending: false }),
        supabase
          .from("marketplace_items")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false }),
      ]);

      if (profileResponse.error) throw profileResponse.error;
      if (walletResponse.error) throw walletResponse.error;
      if (transactionsResponse.error) throw transactionsResponse.error;
      if (loansResponse.error) throw loansResponse.error;
      if (marketplaceResponse.error) throw marketplaceResponse.error;

      const profile = profileResponse.data;
      if (!profile) {
        throw new Error("Profile not found. Please complete registration again.");
      }

      set({
        user: toUser(profile, walletResponse.data),
        isAuthenticated: true,
        isLoading: false,
        transactions: (transactionsResponse.data || []).map(toTransaction),
        activeLoans: (loansResponse.data || []).map((loan) => toLoan(loan, authUser.id)),
        marketplace: (marketplaceResponse.data || []).map(toMarketplaceItem),
      });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  signInWithPassword: async (email, password) => {
    if (!hasSupabaseConfig()) return missingSupabaseResult;

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;
      await get().loadCurrentUser();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error) };
    }
  },

  logout: async () => {
    if (hasSupabaseConfig()) {
      await getSupabaseBrowserClient().auth.signOut();
    }

    set({
      user: null,
      isAuthenticated: false,
      transactions: [],
      activeLoans: [],
      marketplace: [],
    });
  },

  fundWallet: async (amount, reference) => {
    if (!hasSupabaseConfig()) return missingSupabaseResult;

    const normalizedReference = reference.trim();
    if (normalizedReference.length < 4 || normalizedReference.length > 120) {
      return { ok: false, error: "Enter a valid payment reference." };
    }

    const result = await postAuthenticatedJson("/api/wallet/fund", {
      amount,
      reference: normalizedReference,
    });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  confirmRegistrationDeposit: async (reference) => {
    if (!hasSupabaseConfig()) return missingSupabaseResult;

    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };

    if (user.registrationDepositPaid) {
      return { ok: false, error: "Registration deposit is already confirmed." };
    }

    const normalizedReference = reference.trim();
    if (normalizedReference.length < 4 || normalizedReference.length > 120) {
      return { ok: false, error: "Enter a valid payment reference." };
    }

    const result = await postAuthenticatedJson("/api/onboarding/registration-deposit", {
      reference: normalizedReference,
    });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  withdraw: async (amount) => {
    if (!hasSupabaseConfig()) return missingSupabaseResult;

    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };
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
            ? `Fund ₦${shortfall.toLocaleString()} first. ₦${platformLoanDeposit.toLocaleString()} must remain in your wallet after withdrawal.`
            : "Insufficient balance.",
      };
    }

    const result = await postAuthenticatedJson("/api/wallet/withdraw", { amount });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  createMarketplaceItem: async (item) => {
    if (!hasSupabaseConfig()) return missingSupabaseResult;

    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };

    const result = await postAuthenticatedJson("/api/marketplace/create", item);
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  acceptMarketplaceItem: async (itemId) => {
    if (!hasSupabaseConfig()) return missingSupabaseResult;

    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };

    const result = await postAuthenticatedJson("/api/marketplace/accept", { itemId });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  requestPlatformLoan: async (amount) => {
    if (!hasSupabaseConfig()) return missingSupabaseResult;

    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };

    const platformLoans = get().activeLoans.filter(
      (loan) => loan.role === "borrower" && loan.source === "platform",
    );
    const hasPlatformLoanHistory = platformLoans.length > 0;

    if (!hasPlatformLoanHistory && !user.registrationDepositPaid) {
      return {
        ok: false,
        error: `Confirm your ₦${registrationDepositAmount.toLocaleString()} registration deposit before the first ₦2,000 loan.`,
      };
    }

    if (platformLoans.some((loan) => loan.status === "active")) {
      return {
        ok: false,
        error: "Repay your active platform loan before requesting another one.",
      };
    }

    if (hasPlatformLoanHistory) {
      if (!Number.isFinite(amount) || Number(amount) < repeatPlatformLoanMinimum) {
        return {
          ok: false,
          error: "Second and later platform loans start from ₦10,000.",
        };
      }
    }

    const result = await postAuthenticatedJson("/api/loans/request", {
      amount: hasPlatformLoanHistory ? amount : null,
    });
    if (result.ok) await get().loadCurrentUser();
    return result;
  },

  repayLoan: async (loanId) => {
    if (!hasSupabaseConfig()) return missingSupabaseResult;

    const user = get().user;
    if (!user) return { ok: false, error: "Please log in first." };

    const loan = get().activeLoans.find((item) => item.id === loanId);
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
}));
