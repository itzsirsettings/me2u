"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icons8Icon, { type Icons8IconName } from "@/components/Icons8Icon";
import NotificationBell from "@/components/NotificationBell";
import { onboardingCreditAmount, registrationDepositAmount } from "@/lib/loans";
import { useStore, type Transaction } from "@/lib/store";
import { motion, type Variants } from "framer-motion";

const serviceActions: Array<{
  label: string;
  path: string;
  icon: Icons8IconName;
  tone: string;
  requiresKyc?: boolean;
  requiresDeposit?: boolean;
}> = [
  { label: "Pay Bills", path: "/wallet#bills", icon: "bill", tone: "bg-[#c9c0f2] text-[#07026f]" },
  { label: "Market", path: "/marketplace", icon: "market", tone: "bg-[#ffdfad] text-[#7a3f00]", requiresKyc: true },
  { label: "Loans", path: "/loans", icon: "loans", tone: "bg-[#e0a9f0] text-[#07026f]", requiresKyc: true },
  { label: "KYC", path: "/kyc", icon: "shield", tone: "bg-[#9adbc4] text-[#00406b]", requiresDeposit: true },
];

const simpleShortcuts: Array<{
  label: string;
  path: string;
  icon: Icons8IconName;
  tone: string;
}> = [
  { label: "Profile", path: "/profile", icon: "profile", tone: "bg-[#dcecff] text-[#00406b]" },
  { label: "Learn", path: "/learn", icon: "book", tone: "bg-[#e8f7f0] text-[#005f46]" },
  { label: "Secure", path: "/security", icon: "security", tone: "bg-[#eee9ff] text-[#07026f]" },
];

function getInitials(name?: string | null) {
  const parts = (name || "Me2U User").trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "MU";
}

function transactionAmountTone(transaction: Transaction) {
  return ["deposit", "loan_disbursed", "repayment_received", "affiliate_reward"].includes(transaction.type)
    ? "text-[var(--color-positive-text)]"
    : "text-[var(--color-negative-text)]";
}

function transactionPrefix(transaction: Transaction) {
  return ["deposit", "loan_disbursed", "repayment_received", "affiliate_reward"].includes(transaction.type)
    ? "+"
    : "-";
}

export default function Dashboard() {
  const user = useStore((state) => state.user);
  const activeLoans = useStore((state) => state.activeLoans);
  const transactions = useStore((state) => state.transactions);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
  };

  const firstName = user?.name.trim().split(/\s+/)[0] || "Guest";
  const username = user?.username || firstName.toLowerCase();
  const visibleLoans = activeLoans.filter(
    (loan) =>
      !(
        loan.role === "borrower" &&
        loan.source === "platform" &&
        loan.amount === onboardingCreditAmount &&
        loan.rate === 0
      ),
  );
  const activeLoanCount = visibleLoans.filter((loan) => loan.status === "active").length;
  const balance = user?.balance || 0;
  const bankLabel = user?.bankName && user.accountNumber
    ? `${user.bankName} • ${user.accountNumber}`
    : user?.kycVerified
      ? "Wallet account ready"
      : "Verify to add bank";

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  return (
    <motion.main
      className="app-mobile-screen mx-auto w-full max-w-md overflow-x-hidden px-3.5 pt-[calc(0.75rem+env(safe-area-inset-top))] md:max-w-7xl md:px-6 md:py-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.header variants={itemVariants} className="mb-3.5 flex w-full min-w-0 items-center justify-between gap-2.5 md:mb-10">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative grid h-[3.15rem] w-[3.15rem] shrink-0 place-items-center rounded-full bg-[var(--color-accent-primary)] text-lg font-black text-[var(--color-on-accent)] shadow-[0_8px_18px_rgba(0,64,107,0.13)]">
            {getInitials(user?.name)}
          </div>
          <div className="min-w-0">
            <p className="text-[0.92rem] font-medium leading-tight text-[var(--color-text-primary)]">Welcome</p>
            <h1 className="truncate text-[1.15rem] font-black leading-tight tracking-normal text-[var(--color-text-primary)]">
              @{username}
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className="mobile-icon-button"
            aria-label="Open profile"
            onClick={() => router.push("/profile")}
          >
            <Icons8Icon name="profile" size={24} />
          </button>
          <NotificationBell />
        </div>
      </motion.header>

      <div className="grid min-w-0 gap-2.5 md:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] md:items-start md:gap-6">
        <div className="grid min-w-0 gap-2.5">
          <motion.section variants={itemVariants} className="mobile-soft-card relative min-w-0 overflow-hidden p-3">
            <div className="mb-2.5 flex items-start justify-between gap-2.5">
              <p className="text-[1rem] font-extrabold leading-none tracking-normal">Main Balance</p>
              <div className="min-w-0 max-w-[55%] rounded-full bg-[var(--mobile-surface-muted)] px-2.5 py-1 text-right text-[9px] font-black leading-tight text-[var(--color-text-primary)]">
                <span className="block truncate">{bankLabel}</span>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-1.5">
              <p className="min-w-0 max-w-[calc(100%-2.6rem)] truncate font-display text-[1.72rem] font-black leading-none tracking-normal text-[var(--color-text-primary)]">
                {showBalance ? `₦${balance.toLocaleString()}` : "₦••••••"}
              </p>
              <button
                type="button"
                aria-label={showBalance ? "Hide balance" : "Show balance"}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--color-text-primary)] transition active:scale-95"
                onClick={() => setShowBalance((current) => !current)}
              >
                <Icons8Icon name={showBalance ? "visible" : "invisible"} size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button className="mobile-pill-button" onClick={() => router.push("/wallet")}>
                Receive
                <Icons8Icon name="cash" size={18} />
              </button>
              <button className="mobile-pill-button" onClick={() => router.push("/withdraw")}>
                Withdraw
                <Icons8Icon name="requestMoney" size={18} />
              </button>
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="mobile-soft-card grid min-w-0 grid-cols-4 overflow-hidden px-1 py-2">
            {serviceActions.map((action, index) => {
              const disabled =
                (action.requiresDeposit && !user?.registrationDepositPaid) ||
                (action.requiresKyc && !user?.kycVerified);

              return (
                <button
                  key={action.path}
                  disabled={disabled}
                  className={`flex min-h-[3.75rem] flex-col items-center justify-center gap-1 px-1 text-center transition active:scale-95 disabled:opacity-45 ${
                    index > 0 ? "border-l border-[var(--color-border)]" : ""
                  }`}
                  onClick={() => {
                    if (!disabled) router.push(action.path);
                  }}
                >
                  <span className={`grid h-8 w-8 place-items-center rounded-full ${action.tone}`}>
                    <Icons8Icon name={action.icon} size={17} />
                  </span>
                  <span className="text-[0.72rem] font-black leading-none text-[var(--color-text-primary)]">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </motion.section>

          <motion.section variants={itemVariants} className="mobile-soft-card grid min-w-0 grid-cols-3 overflow-hidden px-1 py-2">
            {simpleShortcuts.map((action, index) => (
              <button
                key={action.label}
                className={`flex min-h-[3.75rem] flex-col items-center justify-center gap-1 px-1 text-center transition active:scale-95 ${
                  index > 0 ? "border-l border-[var(--color-border)]" : ""
                }`}
                onClick={() => router.push(action.path)}
              >
                <span className={`grid h-8 w-8 place-items-center rounded-full ${action.tone}`}>
                  <Icons8Icon name={action.icon} size={17} />
                </span>
                <span className="text-[0.72rem] font-black leading-none text-[var(--color-text-primary)]">
                  {action.label}
                </span>
              </button>
            ))}
          </motion.section>
        </div>

        <div className="grid min-w-0 gap-3">
          <motion.section variants={itemVariants} className="relative min-w-0 overflow-hidden rounded-[22px] bg-[#020814] p-4 text-white">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-negative-text)] text-white">
                  <Icons8Icon name="loans" size={18} />
                </span>
                <p className="text-sm font-bold">Credit</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/35 px-3 py-1 text-xs font-black">
                {activeLoanCount} active
              </span>
            </div>
            <h2 className="max-w-sm text-[1.08rem] font-black leading-tight tracking-normal">
              0% interest loan from ₦5,000.
            </h2>
            <button
              className="mt-4 inline-flex min-h-11 items-center rounded-full bg-white px-4 text-xs font-black text-[#020814] transition active:scale-95"
              onClick={() => router.push("/loans")}
            >
              View loans
            </button>
            <div className="absolute -bottom-16 -right-12 h-40 w-40 rounded-full bg-[rgba(0,127,255,0.34)] blur-sm" />
          </motion.section>

          {user?.role === "admin" && (
            <motion.button
              variants={itemVariants}
              className="mobile-soft-card flex min-w-0 items-center justify-between gap-4 p-3.5 text-left transition active:scale-[0.99]"
              onClick={() => router.push("/admin")}
            >
              <div>
                <p className="text-sm font-bold text-[var(--color-text-secondary)]">Operations</p>
                <p className="mt-1 text-base font-black">Admin Dashboard</p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--mobile-surface-muted)] text-[var(--color-text-primary)]">
                <Icons8Icon name="shield" size={22} />
              </span>
            </motion.button>
          )}

          <motion.section variants={itemVariants} className="mobile-soft-card min-w-0 p-3.5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[1rem] font-black tracking-normal">Recent Activity</h2>
              <button
                className="text-sm font-black text-[var(--color-accent-primary)]"
                onClick={() => router.push("/wallet")}
              >
                Wallet
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="rounded-[18px] bg-[var(--mobile-surface-muted)] p-3.5 text-sm font-medium text-[var(--color-text-secondary)]">
                No recent transactions yet. Fund your wallet to start.
              </div>
            ) : (
              <div className="grid gap-3">
                {transactions.slice(0, 5).map((transaction) => {
                  const isExpanded = expandedTxId === transaction.id;
                  return (
                    <div
                      key={transaction.id}
                      className="flex flex-col min-w-0 cursor-pointer overflow-hidden rounded-[16px] bg-[var(--mobile-surface-muted)] p-3 transition hover:bg-[var(--color-hover-soft)]"
                      onClick={() => setExpandedTxId(isExpanded ? null : transaction.id)}
                    >
                      <div className="flex min-w-0 items-center justify-between gap-2 overflow-hidden">
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate text-sm font-black text-[var(--color-text-primary)]">
                            {transaction.description}
                          </p>
                          <p className="mt-1 truncate text-xs font-medium text-[var(--color-text-secondary)]">
                            {new Date(transaction.date).toLocaleString()}
                          </p>
                        </div>
                        <p className={`max-w-[36%] shrink-0 truncate text-right text-xs font-black sm:text-sm ${transactionAmountTone(transaction)}`}>
                          {transactionPrefix(transaction)}₦{transaction.amount.toLocaleString()}
                        </p>
                      </div>

                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-secondary)] space-y-1.5"
                        >
                          <div className="flex justify-between gap-2">
                            <span>Transaction ID</span>
                            <span className="font-mono text-[var(--color-text-primary)] select-all">{transaction.id}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span>Type</span>
                            <span className="capitalize text-[var(--color-text-primary)]">{transaction.type.replace(/_/g, " ")}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span>Processing Fee</span>
                            <span className="text-[var(--color-text-primary)]">{transaction.type === "withdrawal" ? "₦100" : "₦0"}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span>Status</span>
                            <span className="font-bold text-[var(--color-positive-text)]">SUCCESSFUL</span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </motion.main>
  );
}
