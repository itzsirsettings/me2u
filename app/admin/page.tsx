"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Icons8Icon from "@/components/Icons8Icon";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import type {
  AffiliateRewardRow,
  LoanRow,
  MarketplaceRow,
  PaymentProofRow,
  ProfileRow,
  TransactionRow,
  WalletRow,
  WithdrawalRequestRow,
} from "@/lib/supabase/types";

type OverviewUser = ProfileRow & {
  full_name: string;
  wallet: WalletRow | null;
  wallet_balance: number;
  wallet_locked: number;
  passport_signed_url: string | null;
  transaction_count: number;
  loan_count: number;
  pending_payment_proofs: number;
  pending_withdrawals: number;
};

type EnrichedPaymentProof = PaymentProofRow & {
  user_name: string;
  user_email: string;
  receipt_signed_url: string | null;
};

type EnrichedWithdrawalRequest = WithdrawalRequestRow & {
  user_name: string;
  user_email: string;
  user_phone: string;
  wallet_balance: number;
};

type AdminOverview = {
  generated_at: string;
  summary: {
    users: number;
    verified_users: number;
    admins: number;
    wallet_liability: number;
    revenue: number;
    income: number;
    expenses: number;
    affiliate_funding: number;
    pending_funding_amount: number;
    pending_registration_amount: number;
    pending_withdrawal_amount: number;
    active_loan_exposure: number;
    platform_loan_exposure: number;
    marketplace_active: number;
    month_revenue: number;
    month_income: number;
    month_expenses: number;
  };
  users: OverviewUser[];
  payment_proofs: EnrichedPaymentProof[];
  withdrawal_requests: EnrichedWithdrawalRequest[];
  transactions: TransactionRow[];
  loans: LoanRow[];
  marketplace_items: MarketplaceRow[];
  affiliate_rewards: AffiliateRewardRow[];
};

type AdminAction =
  | "approve_payment_proof"
  | "reject_payment_proof"
  | "approve_withdrawal"
  | "reject_withdrawal";

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-NG");

function money(value: number) {
  return moneyFormatter.format(Number(value || 0));
}

function compactMoney(value: number) {
  return new Intl.NumberFormat("en-NG", {
    notation: "compact",
    compactDisplay: "short",
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function proofTypeLabel(type: PaymentProofRow["type"]) {
  return type === "wallet_funding" ? "Wallet funding" : "Registration deposit";
}

function transactionLabel(type: TransactionRow["type"]) {
  return type.replaceAll("_", " ");
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function statusClass(status: "pending" | "approved" | "rejected" | "active" | "completed" | "funded" | "cancelled") {
  if (status === "approved" || status === "completed" || status === "funded") {
    return "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]";
  }

  if (status === "pending" || status === "active") {
    return "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]";
  }

  return "bg-[var(--color-negative-bg)] text-[var(--color-negative-text)]";
}

function StatusBadge({
  children,
  status,
}: {
  children: ReactNode;
  status: "pending" | "approved" | "rejected" | "active" | "completed" | "funded" | "cancelled";
}) {
  return (
    <span className={`inline-flex max-w-full shrink-0 items-center justify-center rounded-[5px] px-2.5 py-1 text-center text-[11px] font-bold uppercase leading-tight tracking-normal sm:tracking-[0.08em] ${statusClass(status)}`}>
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: "wallet" | "moneyBag" | "cash" | "requestMoney" | "market" | "profile" | "referral" | "loans";
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[3px_3px_0px_var(--color-shadow)]">
      <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 text-xs font-bold uppercase tracking-normal text-[var(--color-text-secondary)] sm:tracking-[0.12em]">
          {label}
        </p>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
          <Icons8Icon name={icon} size={20} />
        </span>
      </div>
      <p className="overflow-anywhere font-display text-[1.45rem] font-bold leading-none text-[var(--color-text-primary)] md:text-3xl">
        {value}
      </p>
      <p className="overflow-anywhere mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">{detail}</p>
    </div>
  );
}

function QueueActionButton({
  label,
  busy,
  variant = "primary",
  onClick,
}: {
  label: string;
  busy: boolean;
  variant?: "primary" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={
        variant === "danger"
          ? "min-h-10 max-w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-negative-bg)] px-3 text-xs font-bold uppercase leading-tight tracking-normal text-[var(--color-negative-text)] transition disabled:opacity-50 sm:tracking-[0.08em]"
          : "min-h-10 max-w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-accent-primary)] px-3 text-xs font-bold uppercase leading-tight tracking-normal text-[var(--color-on-accent)] shadow-[2px_2px_0px_var(--color-shadow)] transition disabled:opacity-50 sm:tracking-[0.08em]"
      }
    >
      {busy ? "Working..." : label}
    </button>
  );
}

export default function AdminDashboard() {
  const user = useStore((state) => state.user);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"operations" | "users" | "ledger">("operations");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchOverview = useCallback(async () => {
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session?.access_token) throw new Error("Please log in again.");

      const response = await fetch("/api/admin/overview", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Unable to load admin overview.");
      }

      setOverview(data as AdminOverview);
      setSelectedUserId((current) => current || (data as AdminOverview).users[0]?.id || null);
    } catch (error) {
      toast.error("Admin dashboard failed: " + toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    if (user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    fetchOverview();
  }, [fetchOverview, isAuthenticated, isLoading, mounted, router, user]);

  const runAdminAction = async (action: AdminAction, id: string) => {
    const key = `${action}:${id}`;
    setBusyAction(key);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session?.access_token) throw new Error("Please log in again.");

      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, id }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Unable to complete admin action.");
      }

      toast.success("Admin action completed.");
      await fetchOverview();
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!overview) return [];
    const query = search.trim().toLowerCase();
    if (!query) return overview.users;

    return overview.users.filter((item) =>
      [
        item.full_name,
        item.email,
        item.phone || "",
        item.username || "",
        item.bank_name || "",
        item.account_number || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [overview, search]);

  const selectedUser = useMemo(() => {
    if (!overview) return null;
    return overview.users.find((item) => item.id === selectedUserId) || filteredUsers[0] || null;
  }, [filteredUsers, overview, selectedUserId]);

  const selectedUserActivity = useMemo(() => {
    if (!overview || !selectedUser) {
      return {
        transactions: [],
        loans: [],
        proofs: [],
        withdrawals: [],
        affiliateRewards: [],
      };
    }

    return {
      transactions: overview.transactions.filter((transaction) => transaction.user_id === selectedUser.id).slice(0, 8),
      loans: overview.loans
        .filter((loan) => loan.borrower_id === selectedUser.id || loan.lender_id === selectedUser.id)
        .slice(0, 8),
      proofs: overview.payment_proofs.filter((proof) => proof.user_id === selectedUser.id).slice(0, 8),
      withdrawals: overview.withdrawal_requests
        .filter((withdrawal) => withdrawal.user_id === selectedUser.id)
        .slice(0, 8),
      affiliateRewards: overview.affiliate_rewards
        .filter(
          (reward) =>
            reward.referrer_id === selectedUser.id || reward.referred_user_id === selectedUser.id,
        )
        .slice(0, 8),
    };
  }, [overview, selectedUser]);

  const pendingFundingProofs = (overview?.payment_proofs || []).filter(
    (proof) => proof.status === "pending" && proof.type === "wallet_funding",
  );
  const pendingRegistrationProofs = (overview?.payment_proofs || []).filter(
    (proof) => proof.status === "pending" && proof.type === "registration_deposit",
  );
  const pendingWithdrawals = (overview?.withdrawal_requests || []).filter(
    (withdrawal) => withdrawal.status === "pending",
  );
  const activeLoans = (overview?.loans || []).filter((loan) => loan.status === "active").slice(0, 8);
  const activeMarketplace = (overview?.marketplace_items || [])
    .filter((item) => item.status === "active")
    .slice(0, 8);

  if (!mounted || isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-3.5 pt-[4.85rem] md:px-4 md:pt-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent-primary)] border-t-transparent" />
      </div>
    );
  }

  if (!overview) {
    return (
      <main className="mx-auto max-w-3xl px-3.5 pb-24 pt-[4.85rem] md:px-4 md:pt-24">
        <div className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-[4px_4px_0px_var(--color-shadow)]">
          <h1 className="font-display text-3xl font-bold">Admin dashboard unavailable</h1>
          <p className="mt-3 text-[var(--color-text-secondary)]">
            The admin overview could not be loaded. Check Supabase credentials and try again.
          </p>
          <button className="btn-primary mt-6" onClick={fetchOverview}>
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[100vw] overflow-x-hidden px-3.5 pb-28 pt-[4.85rem] md:max-w-7xl md:px-6 md:pt-24">
      <div className="mb-6 flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-[var(--color-text-secondary)] sm:tracking-[0.14em]">
            Operations
          </p>
          <h1 className="mt-2 font-display text-[2.4rem] font-bold leading-[0.9] tracking-tight text-[var(--color-text-primary)] sm:text-[2.75rem] md:text-6xl">
            Admin Command Center
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)] md:text-base">
            Monitor users, wallets, revenue, approvals, loans, marketplace activity, and risk signals from one control surface.
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {(["operations", "users", "ledger"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`min-h-11 min-w-0 rounded-[5px] border border-[var(--color-border)] px-3 text-sm font-bold capitalize transition sm:px-4 ${
                activeView === view
                  ? "bg-[var(--color-accent-primary)] text-[var(--color-on-accent)] shadow-[2px_2px_0px_var(--color-shadow)]"
                  : "bg-[var(--color-bg-card)] text-[var(--color-text-primary)]"
              }`}
            >
              {view}
            </button>
          ))}
          <button className="btn-ghost min-h-11" onClick={fetchOverview}>
            Refresh
          </button>
        </div>
      </div>

      <section className="mb-6 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={money(overview.summary.revenue)}
          detail={`${money(overview.summary.month_revenue)} registration revenue this month`}
          icon="moneyBag"
        />
        <MetricCard
          label="Income"
          value={money(overview.summary.income)}
          detail={`${money(overview.summary.month_income)} approved inflow this month`}
          icon="cash"
        />
        <MetricCard
          label="Expenses"
          value={money(overview.summary.expenses)}
          detail={`${money(overview.summary.month_expenses)} withdrawals, rewards, and credits this month`}
          icon="requestMoney"
        />
        <MetricCard
          label="Affiliate Funding"
          value={money(overview.summary.affiliate_funding)}
          detail={`${numberFormatter.format(overview.affiliate_rewards.length)} referral payouts recorded`}
          icon="referral"
        />
      </section>

      <section className="mb-6 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Wallet Liability"
          value={money(overview.summary.wallet_liability)}
          detail="Total customer balances and locked wallet funds"
          icon="wallet"
        />
        <MetricCard
          label="Pending Fundings"
          value={money(overview.summary.pending_funding_amount)}
          detail={`${pendingFundingProofs.length} wallet funding proofs need review`}
          icon="cash"
        />
        <MetricCard
          label="Pending Withdrawals"
          value={money(overview.summary.pending_withdrawal_amount)}
          detail={`${pendingWithdrawals.length} withdrawal requests await decision`}
          icon="requestMoney"
        />
        <MetricCard
          label="Loan Exposure"
          value={money(overview.summary.active_loan_exposure)}
          detail={`${compactMoney(overview.summary.platform_loan_exposure)} active direct exposure`}
          icon="loans"
        />
      </section>

      {activeView === "operations" && (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section className="min-w-0 space-y-4">
            <div className="min-w-0 overflow-hidden rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[4px_4px_0px_var(--color-shadow)]">
              <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-bold">Funding Approvals</h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Confirm wallet funding and registration deposits after checking receipts.
                  </p>
                </div>
                <StatusBadge status="pending">{pendingFundingProofs.length + pendingRegistrationProofs.length} pending</StatusBadge>
              </div>

              {[...pendingRegistrationProofs, ...pendingFundingProofs].length === 0 ? (
                <p className="rounded-[5px] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-secondary)]">
                  No pending funding proofs.
                </p>
              ) : (
                <div className="grid gap-3">
                  {[...pendingRegistrationProofs, ...pendingFundingProofs].map((proof) => (
                    <article
                      key={proof.id}
                      className="grid min-w-0 gap-3 overflow-hidden rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 md:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="min-w-0 font-bold text-[var(--color-text-primary)]">{proof.user_name}</p>
                          <StatusBadge status={proof.status}>{proofTypeLabel(proof.type)}</StatusBadge>
                        </div>
                        <p className="overflow-anywhere mt-1 text-sm text-[var(--color-text-secondary)]">{proof.user_email}</p>
                        <div className="mt-3 grid min-w-0 gap-2 text-sm sm:grid-cols-3">
                          <span className="min-w-0">
                            <b className="block text-xs uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Amount</b>
                            {money(Number(proof.amount))}
                          </span>
                          <span className="min-w-0">
                            <b className="block text-xs uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Reference</b>
                            <span className="break-all font-mono">{proof.reference}</span>
                          </span>
                          <span className="min-w-0">
                            <b className="block text-xs uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Submitted</b>
                            {formatDate(proof.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
                        {proof.receipt_signed_url ? (
                          <a
                            href={proof.receipt_signed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-10 max-w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs font-bold uppercase leading-tight tracking-normal sm:tracking-[0.08em]"
                          >
                            View receipt
                          </a>
                        ) : null}
                        <QueueActionButton
                          label="Approve"
                          busy={busyAction === `approve_payment_proof:${proof.id}`}
                          onClick={() => runAdminAction("approve_payment_proof", proof.id)}
                        />
                        <QueueActionButton
                          label="Reject"
                          variant="danger"
                          busy={busyAction === `reject_payment_proof:${proof.id}`}
                          onClick={() => runAdminAction("reject_payment_proof", proof.id)}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="min-w-0 overflow-hidden rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[4px_4px_0px_var(--color-shadow)]">
              <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-bold">Withdrawal Control</h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Approvals debit wallets only after the admin decision passes balance and loan-retention checks.
                  </p>
                </div>
                <StatusBadge status="pending">{pendingWithdrawals.length} pending</StatusBadge>
              </div>

              {pendingWithdrawals.length === 0 ? (
                <p className="rounded-[5px] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-secondary)]">
                  No pending withdrawal requests.
                </p>
              ) : (
                <div className="grid gap-3">
                  {pendingWithdrawals.map((withdrawal) => (
                    <article
                      key={withdrawal.id}
                      className="grid min-w-0 gap-3 overflow-hidden rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 md:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="min-w-0 font-bold text-[var(--color-text-primary)]">{withdrawal.user_name}</p>
                          <StatusBadge status={withdrawal.status}>Withdrawal</StatusBadge>
                        </div>
                        <p className="overflow-anywhere mt-1 text-sm text-[var(--color-text-secondary)]">
                          {withdrawal.user_email} {withdrawal.user_phone ? `• ${withdrawal.user_phone}` : ""}
                        </p>
                        <div className="mt-3 grid min-w-0 gap-2 text-sm sm:grid-cols-4">
                          <span className="min-w-0">
                            <b className="block text-xs uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Amount</b>
                            {money(Number(withdrawal.amount))}
                          </span>
                          <span className="min-w-0">
                            <b className="block text-xs uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Wallet</b>
                            {money(withdrawal.wallet_balance)}
                          </span>
                          <span className="min-w-0">
                            <b className="block text-xs uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Bank</b>
                            {withdrawal.bank_name || "Not set"}
                          </span>
                          <span className="min-w-0">
                            <b className="block text-xs uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Account</b>
                            <span className="overflow-anywhere font-mono">{withdrawal.account_number || "Not set"}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
                        <QueueActionButton
                          label="Approve"
                          busy={busyAction === `approve_withdrawal:${withdrawal.id}`}
                          onClick={() => runAdminAction("approve_withdrawal", withdrawal.id)}
                        />
                        <QueueActionButton
                          label="Reject"
                          variant="danger"
                          busy={busyAction === `reject_withdrawal:${withdrawal.id}`}
                          onClick={() => runAdminAction("reject_withdrawal", withdrawal.id)}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="min-w-0 space-y-4">
            <div className="min-w-0 overflow-hidden rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[4px_4px_0px_var(--color-shadow)]">
              <h2 className="font-display text-2xl font-bold">Live Health</h2>
              <div className="mt-4 grid gap-3">
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-[5px] bg-[var(--color-bg-secondary)] p-3">
                  <span className="min-w-0 text-sm text-[var(--color-text-secondary)]">Verified users</span>
                  <b className="shrink-0">{overview.summary.verified_users}/{overview.summary.users}</b>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-[5px] bg-[var(--color-bg-secondary)] p-3">
                  <span className="min-w-0 text-sm text-[var(--color-text-secondary)]">Active marketplace</span>
                  <b className="shrink-0">{overview.summary.marketplace_active}</b>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-[5px] bg-[var(--color-bg-secondary)] p-3">
                  <span className="min-w-0 text-sm text-[var(--color-text-secondary)]">Admins</span>
                  <b className="shrink-0">{overview.summary.admins}</b>
                </div>
                <div className="rounded-[5px] bg-[var(--color-bg-secondary)] p-3">
                  <span className="text-sm text-[var(--color-text-secondary)]">Snapshot</span>
                  <p className="overflow-anywhere mt-1 font-mono text-xs">{formatDate(overview.generated_at)}</p>
                </div>
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[4px_4px_0px_var(--color-shadow)]">
              <h2 className="font-display text-2xl font-bold">Active Loans</h2>
              <div className="mt-4 grid gap-2">
                {activeLoans.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">No active loans.</p>
                ) : (
                  activeLoans.map((loan) => (
                    <div key={loan.id} className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <b className="min-w-0 truncate">{money(Number(loan.amount))}</b>
                        <StatusBadge status={loan.status}>{loan.lender_id ? "Peer" : "Direct"}</StatusBadge>
                      </div>
                      <p className="overflow-anywhere mt-2 text-xs text-[var(--color-text-secondary)]">
                        Due {formatDate(loan.due_date)} • {loan.days} days • {Number(loan.rate)}%
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {activeView === "users" && (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="min-w-0 overflow-hidden rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[4px_4px_0px_var(--color-shadow)]">
            <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-bold">User Profiles</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Search names, emails, phones, banks, and account numbers.
                </p>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users"
                className="min-h-11 w-full min-w-0 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] sm:w-56"
              />
            </div>

            <div className="grid max-h-[680px] min-w-0 gap-2 overflow-y-auto pr-1">
              {filteredUsers.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setSelectedUserId(profile.id)}
                  className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-[5px] border p-3 text-left transition sm:grid-cols-[auto_minmax(0,1fr)_auto] ${
                    selectedUser?.id === profile.id
                      ? "border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-[2px_2px_0px_var(--color-shadow)]"
                      : "border-[var(--color-glass-border)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-secondary)]"
                  }`}
                >
                  {profile.passport_signed_url ? (
                    <img
                      src={profile.passport_signed_url}
                      alt={`${profile.full_name} passport`}
                      className="h-12 w-12 rounded-[5px] border border-[var(--color-border)] object-cover"
                    />
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] font-bold">
                      {initials(profile.full_name)}
                    </span>
                  )}
                  <span className="min-w-0">
                    <b className="block truncate">{profile.full_name}</b>
                    <span className="block truncate text-xs text-[var(--color-text-secondary)]">{profile.email}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      <StatusBadge status={profile.kyc_verified ? "approved" : "pending"}>
                        {profile.kyc_verified ? "KYC" : "KYC pending"}
                      </StatusBadge>
                      {profile.role === "admin" ? <StatusBadge status="approved">Admin</StatusBadge> : null}
                    </span>
                  </span>
                  <span className="col-span-2 min-w-0 text-left sm:col-span-1 sm:text-right">
                    <b className="block truncate text-sm">{money(profile.wallet_balance)}</b>
                    <span className="text-[11px] text-[var(--color-text-secondary)]">wallet</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[4px_4px_0px_var(--color-shadow)]">
            {selectedUser ? (
              <>
                <div className="grid min-w-0 gap-4 border-b border-[var(--color-border)] pb-4 md:grid-cols-[auto_minmax(0,1fr)]">
                  {selectedUser.passport_signed_url ? (
                    <img
                      src={selectedUser.passport_signed_url}
                      alt={`${selectedUser.full_name} passport`}
                      className="h-28 w-28 rounded-[6px] border border-[var(--color-border)] object-cover"
                    />
                  ) : (
                    <span className="grid h-28 w-28 place-items-center rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] font-display text-3xl font-bold">
                      {initials(selectedUser.full_name)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h2 className="min-w-0 font-display text-2xl font-bold md:text-3xl">{selectedUser.full_name}</h2>
                      <StatusBadge status={selectedUser.kyc_verified ? "approved" : "pending"}>
                        {selectedUser.kyc_verified ? "Verified" : "Needs KYC"}
                      </StatusBadge>
                      {selectedUser.registration_deposit_paid ? (
                        <StatusBadge status="approved">Deposit confirmed</StatusBadge>
                      ) : (
                        <StatusBadge status="pending">Deposit pending</StatusBadge>
                      )}
                    </div>
                    <p className="mt-2 break-all text-sm text-[var(--color-text-secondary)]">{selectedUser.email}</p>
                    <div className="mt-4 grid min-w-0 gap-2 text-sm sm:grid-cols-3">
                      <span className="min-w-0">
                        <b className="block text-xs uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Wallet</b>
                        {money(selectedUser.wallet_balance)}
                      </span>
                      <span className="min-w-0">
                        <b className="block text-xs uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Locked</b>
                        {money(selectedUser.wallet_locked)}
                      </span>
                      <span className="min-w-0">
                        <b className="block text-xs uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Trust</b>
                        {selectedUser.trust_score}/100
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
                  <div className="min-w-0 overflow-hidden rounded-[5px] bg-[var(--color-bg-secondary)] p-3">
                    <h3 className="font-bold">Identity</h3>
                    <dl className="mt-3 grid gap-2 text-sm">
                      <div className="flex min-w-0 justify-between gap-3">
                        <dt className="shrink-0 text-[var(--color-text-secondary)]">Username</dt>
                        <dd className="overflow-anywhere min-w-0 text-right font-mono">{selectedUser.username || "Not set"}</dd>
                      </div>
                      <div className="flex min-w-0 justify-between gap-3">
                        <dt className="shrink-0 text-[var(--color-text-secondary)]">Phone</dt>
                        <dd className="overflow-anywhere min-w-0 text-right">{selectedUser.phone || "Not set"}</dd>
                      </div>
                      <div className="flex min-w-0 justify-between gap-3">
                        <dt className="shrink-0 text-[var(--color-text-secondary)]">NIN last 4</dt>
                        <dd className="overflow-anywhere min-w-0 text-right font-mono">{selectedUser.nin_last4 || "Not set"}</dd>
                      </div>
                      <div className="flex min-w-0 justify-between gap-3">
                        <dt className="shrink-0 text-[var(--color-text-secondary)]">Joined</dt>
                        <dd className="overflow-anywhere min-w-0 text-right">{formatDate(selectedUser.created_at)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="min-w-0 overflow-hidden rounded-[5px] bg-[var(--color-bg-secondary)] p-3">
                    <h3 className="font-bold">Bank & Referral</h3>
                    <dl className="mt-3 grid gap-2 text-sm">
                      <div className="flex min-w-0 justify-between gap-3">
                        <dt className="shrink-0 text-[var(--color-text-secondary)]">Bank</dt>
                        <dd className="overflow-anywhere min-w-0 text-right">{selectedUser.bank_name || "Not set"}</dd>
                      </div>
                      <div className="flex min-w-0 justify-between gap-3">
                        <dt className="shrink-0 text-[var(--color-text-secondary)]">Account</dt>
                        <dd className="overflow-anywhere min-w-0 text-right font-mono">{selectedUser.account_number || "Not set"}</dd>
                      </div>
                      <div className="flex min-w-0 justify-between gap-3">
                        <dt className="shrink-0 text-[var(--color-text-secondary)]">Affiliate earnings</dt>
                        <dd className="overflow-anywhere min-w-0 text-right">{money(Number(selectedUser.affiliate_earnings))}</dd>
                      </div>
                      <div className="flex min-w-0 justify-between gap-3">
                        <dt className="shrink-0 text-[var(--color-text-secondary)]">Referral code</dt>
                        <dd className="overflow-anywhere min-w-0 text-right font-mono">{selectedUser.referral_code || selectedUser.username || "Not set"}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="mt-4 grid min-w-0 gap-3 xl:grid-cols-2">
                  <div className="min-w-0 overflow-hidden rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                    <h3 className="font-bold">Recent Transactions</h3>
                    <div className="mt-3 grid gap-2">
                      {selectedUserActivity.transactions.length === 0 ? (
                        <p className="text-sm text-[var(--color-text-secondary)]">No transactions.</p>
                      ) : (
                        selectedUserActivity.transactions.map((transaction) => (
                          <div key={transaction.id} className="flex min-w-0 items-center justify-between gap-2 overflow-hidden rounded-[5px] bg-[var(--color-bg-card)] p-2 text-sm">
                            <span className="min-w-0 flex-1 overflow-hidden">
                              <b className="block truncate capitalize">{transactionLabel(transaction.type)}</b>
                              <span className="block truncate text-xs text-[var(--color-text-secondary)]">
                                {transaction.description}
                              </span>
                            </span>
                            <b className="max-w-[42%] shrink-0 truncate text-right">{money(Number(transaction.amount))}</b>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 overflow-hidden rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                    <h3 className="font-bold">Proofs & Withdrawals</h3>
                    <div className="mt-3 grid gap-2">
                      {[...selectedUserActivity.proofs, ...selectedUserActivity.withdrawals].length === 0 ? (
                        <p className="text-sm text-[var(--color-text-secondary)]">No proofs or withdrawal requests.</p>
                      ) : (
                        <>
                          {selectedUserActivity.proofs.map((proof) => (
                            <div key={proof.id} className="flex min-w-0 items-center justify-between gap-2 overflow-hidden rounded-[5px] bg-[var(--color-bg-card)] p-2 text-sm">
                              <span className="min-w-0 flex-1 overflow-hidden">
                                <b className="block">{proofTypeLabel(proof.type)}</b>
                                <span className="block truncate text-xs text-[var(--color-text-secondary)]">{formatDate(proof.created_at)}</span>
                              </span>
                              <StatusBadge status={proof.status}>{money(Number(proof.amount))}</StatusBadge>
                            </div>
                          ))}
                          {selectedUserActivity.withdrawals.map((withdrawal) => (
                            <div key={withdrawal.id} className="flex min-w-0 items-center justify-between gap-2 overflow-hidden rounded-[5px] bg-[var(--color-bg-card)] p-2 text-sm">
                              <span className="min-w-0 flex-1 overflow-hidden">
                                <b className="block">Withdrawal</b>
                                <span className="block truncate text-xs text-[var(--color-text-secondary)]">{formatDate(withdrawal.created_at)}</span>
                              </span>
                              <StatusBadge status={withdrawal.status}>{money(Number(withdrawal.amount))}</StatusBadge>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">No user selected.</p>
            )}
          </section>
        </div>
      )}

      {activeView === "ledger" && (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <section className="min-w-0 overflow-hidden rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[4px_4px_0px_var(--color-shadow)]">
            <h2 className="font-display text-2xl font-bold">Recent Ledger</h2>
            <div className="scroll-x-contained mt-4">
              <table className="w-full min-w-[620px] text-left text-sm sm:min-w-[760px]">
                <thead className="border-b border-[var(--color-border)] text-xs uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">User</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.transactions.slice(0, 60).map((transaction) => {
                    const owner = overview.users.find((item) => item.id === transaction.user_id);
                    return (
                      <tr key={transaction.id} className="border-b border-[var(--color-glass-border)]">
                        <td className="px-3 py-3 capitalize">{transactionLabel(transaction.type)}</td>
                        <td className="max-w-[150px] truncate px-3 py-3">{owner?.full_name || "Unknown"}</td>
                        <td className="px-3 py-3 font-mono font-bold">{money(Number(transaction.amount))}</td>
                        <td className="max-w-[280px] truncate px-3 py-3 text-[var(--color-text-secondary)]">
                          {transaction.description}
                        </td>
                        <td className="px-3 py-3 text-xs">{formatDate(transaction.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="min-w-0 space-y-4">
            <div className="min-w-0 overflow-hidden rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[4px_4px_0px_var(--color-shadow)]">
              <h2 className="font-display text-2xl font-bold">Marketplace Monitor</h2>
              <div className="mt-4 grid gap-2">
                {activeMarketplace.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">No active marketplace listings.</p>
                ) : (
                  activeMarketplace.map((item) => (
                    <div key={item.id} className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <b className="min-w-0 truncate capitalize">{item.type.replaceAll("_", " ")}</b>
                        <StatusBadge status={item.status}>{money(Number(item.amount))}</StatusBadge>
                      </div>
                      <p className="overflow-anywhere mt-2 text-xs text-[var(--color-text-secondary)]">
                        {item.author_name} • {item.days} days • trust {item.trust_score}/100
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[4px_4px_0px_var(--color-shadow)]">
              <h2 className="font-display text-2xl font-bold">Approval History</h2>
              <div className="mt-4 grid gap-2">
                {[...overview.payment_proofs, ...overview.withdrawal_requests]
                  .filter((item) => item.status !== "pending")
                  .slice(0, 10)
                  .map((item) => (
                    <div key={item.id} className="flex min-w-0 items-center justify-between gap-2 overflow-hidden rounded-[5px] bg-[var(--color-bg-secondary)] p-3 text-sm">
                      <span className="min-w-0 flex-1 overflow-hidden">
                        <b className="block truncate">
                          {"type" in item ? proofTypeLabel(item.type) : "Withdrawal"}
                        </b>
                        <span className="block truncate text-xs text-[var(--color-text-secondary)]">
                          {"user_name" in item ? item.user_name : "Unknown user"}
                        </span>
                      </span>
                      <StatusBadge status={item.status}>{item.status}</StatusBadge>
                    </div>
                  ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
