"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import LoadingButton from "@/LoadingButton";
import Icons8Icon from "@/components/Icons8Icon";
import {
  repeatPlatformLoanMinimum,
  registrationDepositAmount,
  getSecurityDeposit,
  getMaxLoanDuration,
  getTierLabel,
  getNextTierInfo,
  defaultTrustTiers,
} from "@/lib/loans";

import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { motion, type Variants } from "framer-motion";

type TierInfo = {
  trustScore: number;
  tierLabel: string;
  depositRate: number;
  maxDuration: number;
  nextTier: { label: string; minScore: number; rate: number; maxDays: number } | null;
};

export default function Loans() {
  const activeLoans = useStore((state) => state.activeLoans);
  const transactions = useStore((state) => state.transactions);
  const requestPlatformLoan = useStore((state) => state.requestPlatformLoan);
  const repayLoan = useStore((state) => state.repayLoan);
  const user = useStore((state) => state.user);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loanAmount, setLoanAmount] = useState(String(repeatPlatformLoanMinimum));
  const [loanDays, setLoanDays] = useState(14);
  const [isRequestingLoan, setIsRequestingLoan] = useState(false);
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user?.trustScore !== undefined) {
      fetchTierInfo();
    }
  }, [user?.trustScore]);

  const fetchTierInfo = async () => {
    try {
      const res = await fetch("/api/loans/retention-rate");
      if (res.ok) {
        const data = await res.json();
        setTierInfo(data);
      }
    } catch {
      if (user?.trustScore !== undefined) {
        setTierInfo({
          trustScore: user.trustScore,
          tierLabel: getTierLabel(user.trustScore),
          depositRate: getSecurityDeposit(100, user.trustScore) / 100,
          maxDuration: getMaxLoanDuration(user.trustScore),
          nextTier: getNextTierInfo(user.trustScore),
        });
      }
    }
  };

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  const visibleLoans = activeLoans;
  const platformLoans = visibleLoans.filter((loan) => loan.role === "borrower" && loan.source === "platform");
  const activePlatformLoan = platformLoans.find((loan) => loan.status === "active");
  const repeatLoanAmount = Number(loanAmount);

  const trustScore = user?.trustScore ?? 50;
  const currentTierLabel = tierInfo?.tierLabel ?? getTierLabel(trustScore);
  const currentMaxDuration = tierInfo?.maxDuration ?? getMaxLoanDuration(trustScore);
  const currentDepositRate = tierInfo?.depositRate ?? getSecurityDeposit(100, trustScore) / 100;
  const nextTier = tierInfo?.nextTier ?? getNextTierInfo(trustScore);

  const securityDeposit = getSecurityDeposit(repeatLoanAmount, trustScore);
  const currentBalance = user?.balance || 0;
  const depositShortfall = Math.max(0, securityDeposit - currentBalance);
  const repeatAmountIsValid =
    Number.isFinite(repeatLoanAmount) && repeatLoanAmount >= repeatPlatformLoanMinimum;
  const loanDaysIsValid = loanDays >= 1 && loanDays <= currentMaxDuration;
  const requestDisabled =
    isRequestingLoan ||
    Boolean(activePlatformLoan) ||
    !user?.registrationDepositPaid ||
    !user?.kycVerified ||
    !repeatAmountIsValid ||
    !loanDaysIsValid ||
    depositShortfall > 0;

  const durationOptions = [7, 14, 21, 30, 45, 60].filter((d) => d <= currentMaxDuration);

  const handleRequestLoan = async () => {
    if (!user) {
      toast.error("Please log in first.");
      router.push("/login");
      return;
    }

    if (!user.registrationDepositPaid) {
      toast.error(`Pay the registration deposit first.`);
      router.push("/wallet");
      return;
    }

    if (!user.kycVerified) {
      toast.error("Complete KYC before requesting a loan.");
      router.push("/kyc");
      return;
    }

    if (activePlatformLoan) {
      toast.error("Repay your active loan before requesting another one.");
      return;
    }

    if (!repeatAmountIsValid) {
      toast.error(`Loans start from ₦${repeatPlatformLoanMinimum.toLocaleString()}.`);
      return;
    }

    if (!loanDaysIsValid) {
      toast.error(`Your tier allows max ${currentMaxDuration} days.`);
      return;
    }

    if (currentBalance < securityDeposit) {
      toast.error(
        `Fund ₦${depositShortfall.toLocaleString()} first. The security deposit remains in your wallet.`,
      );
      return;
    }

    setIsRequestingLoan(true);
    const result = await requestPlatformLoan(repeatLoanAmount, loanDays);
    setIsRequestingLoan(false);

    if (!result.ok) {
      toast.error(result.error || "Unable to request loan.");
      throw new Error("Unable to request");
    }

    toast.success(`Loan of ₦${repeatLoanAmount.toLocaleString()} has been added to your wallet.`);
  };

  const handleRepay = async (loanId: string, amount: number, rate: number, securityDeposit: number) => {
    if (!user) return;
    const totalRepayment = amount + (amount * rate) / 100;
    if (user.balance < totalRepayment) {
      toast.error("Insufficient balance to repay this loan.");
      throw new Error("Insufficient balance");
    }
    const result = await repayLoan(loanId);
    if (!result.ok) {
      toast.error(result.error || "Unable to repay this loan.");
      throw new Error("Unable to repay");
    }

    const msg = securityDeposit > 0
      ? `Loan repaid! ₦${securityDeposit.toLocaleString()} security deposit unlocked.`
      : "Loan repaid successfully!";
    toast.success(msg);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <motion.div 
      className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[4.85rem] md:max-w-4xl md:px-6 md:py-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="mb-4 flex min-w-0 flex-col gap-3 md:mb-12 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="mb-2 hidden items-center gap-2 text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)] md:flex">
            <Icons8Icon name="requestMoney" size={18} />
            Credit
          </p>
          <h1 className="sr-only md:not-sr-only md:text-7xl md:font-display md:leading-[0.85]">
            My Loans
          </h1>
        </div>
        <div className="mobile-soft-card min-w-0 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3.5 py-2.5 shadow-[2px_2px_0px_var(--color-shadow)] md:px-5 md:py-4">
          <p className="text-xs font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Wallet Balance</p>
          <p className="overflow-anywhere text-xl font-display leading-none md:text-2xl">₦{currentBalance.toLocaleString()}</p>
        </div>
      </motion.div>

      {/* Tier Info Card */}
      {tierInfo && (
        <motion.div variants={itemVariants} className="mb-4">
          <Card className="kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
                  <Icons8Icon name="shield" size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-display leading-none">{currentTierLabel} Tier</h2>
                  <p className="text-xs text-[var(--color-text-secondary)]">Trust Score: {trustScore}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-[5px] bg-[var(--color-bg-secondary)] p-3">
                <p className="text-xs font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Deposit Rate</p>
                <p className="mt-1 font-mono text-lg text-[var(--color-text-primary)]">{Math.round(currentDepositRate * 100)}%</p>
              </div>
              <div className="rounded-[5px] bg-[var(--color-bg-secondary)] p-3">
                <p className="text-xs font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Max Duration</p>
                <p className="mt-1 font-mono text-lg text-[var(--color-text-primary)]">{currentMaxDuration} days</p>
              </div>
            </div>

            {nextTier && (
              <div className="rounded-[5px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                <p className="text-xs font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
                  Next: {nextTier.label} (score {nextTier.minScore})
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {nextTier.rate * 100}% deposit · {nextTier.maxDays}-day loans
                </p>
              </div>
            )}
          </Card>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Card className="mb-4 kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:mb-10 md:p-8">
          <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
                  <Icons8Icon name="cash" size={24} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-display leading-none md:text-3xl">
                    0% Interest Loan
                  </h2>
                </div>
              </div>

              <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div className="min-w-0 space-y-3">
                  <div>
                    <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Loan Amount (₦)
                    </label>
                    <input
                      type="number"
                      min={repeatPlatformLoanMinimum}
                      value={loanAmount}
                      onChange={(event) => setLoanAmount(event.target.value)}
                      title="Loan Amount"
                      placeholder="Enter amount"
                      className="h-11 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 font-mono text-base focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none md:h-14 md:p-4 md:text-xl"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Duration (days)
                    </label>
                    <select
                      value={loanDays}
                      onChange={(event) => setLoanDays(Number(event.target.value))}
                      className="h-11 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-base focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none md:h-14"
                    >
                      {durationOptions.map((d) => (
                        <option key={d} value={d}>{d} days</option>
                      ))}
                    </select>
                  </div>
                </div>
                {!requestDisabled ? (
                  <LoadingButton
                    label="Request Loan"
                    loadingText="Processing..."
                    successText="Loan Granted!"
                    icon={<Icons8Icon name="cash" size={20} />}
                    onClick={handleRequestLoan}
                  />
                ) : (
                  <button
                    type="button"
                    className="btn-primary h-11 w-full cursor-not-allowed gap-2 opacity-60 md:h-14 md:w-auto"
                    disabled
                  >
                    <Icons8Icon name="cash" size={20} />
                    {activePlatformLoan
                      ? "Repay Active Loan First"
                      : !user?.registrationDepositPaid
                        ? "Pay Registration Deposit"
                        : !user?.kycVerified
                          ? "Complete KYC"
                          : depositShortfall > 0
                            ? "Fund Wallet First"
                            : !loanDaysIsValid
                              ? "Reduce Duration"
                              : "Request Loan"}
                  </button>
                )}
              </div>

              {/* Deposit breakdown */}
              {repeatAmountIsValid && (
                <div className="mt-5 grid gap-3 rounded-[5px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm md:grid-cols-3">
                  <div className="min-w-0">
                    <p className="font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Minimum</p>
                    <p className="overflow-anywhere mt-1 font-mono text-lg text-[var(--color-text-primary)]">₦{repeatPlatformLoanMinimum.toLocaleString()}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Security Deposit ({Math.round(currentDepositRate * 100)}%)</p>
                    <p className="overflow-anywhere mt-1 font-mono text-lg text-[var(--color-text-primary)]">₦{securityDeposit.toLocaleString()}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Status</p>
                    <p className={`mt-1 font-sans font-semibold ${requestDisabled ? "text-[var(--color-warning-text)]" : "text-[var(--color-positive-text)]"}`}>
                      {activePlatformLoan
                        ? "Active loan pending"
                        : !user?.registrationDepositPaid
                          ? "Deposit required"
                          : !user?.kycVerified
                            ? "KYC required"
                            : depositShortfall > 0
                              ? `Fund ₦${depositShortfall.toLocaleString()}`
                              : !loanDaysIsValid
                                ? `Max ${currentMaxDuration} days`
                                : "Ready"}
                    </p>
                  </div>
                </div>
              )}

              {securityDeposit > 0 && repeatAmountIsValid && (
                <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                  ₦{securityDeposit.toLocaleString()} will be held as a security deposit and returned when you repay on time.
                </p>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4 md:space-y-8">
        {visibleLoans.length === 0 ? (
          <p className="text-base leading-relaxed font-sans italic opacity-90 text-[var(--color-text-secondary)] md:text-xl">You have no loans yet.</p>
        ) : (
          visibleLoans.map((loan) => (
            <motion.div 
              key={loan.id} 
              variants={itemVariants}
              whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
            >
              <Card className="kinetic-border p-5 shadow-[4px_4px_0px_var(--color-shadow)] bg-[var(--color-bg-card)] md:p-8">
                <div className="mb-4 flex min-w-0 flex-col gap-2 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className={`min-w-0 font-sans font-semibold ${loan.status === "active" ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                    {loan.status === "active" ? "Active" : "Completed"} - {loan.source === "platform" ? "Loan" : loan.role === "borrower" ? "Borrowed" : "Lent"}
                  </p>
                  <p className="shrink-0 text-sm font-sans text-[var(--color-text-secondary)]">
                    Due: {new Date(loan.dueDate).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex min-w-0 flex-col justify-between gap-4 md:flex-row md:items-end md:gap-6">
                  <div className="min-w-0">
                    <p className="overflow-anywhere text-2xl font-display leading-none md:text-5xl">₦{loan.amount.toLocaleString()}</p>
                    <p className="mt-3 font-sans text-[var(--color-text-secondary)]">
                      Rate: {loan.rate}% • Duration: {loan.days} days
                    </p>
                    <p className="mt-2 text-sm font-sans text-[var(--color-text-secondary)]">
                      Repayment amount: <span className="font-semibold text-[var(--color-text-primary)]">₦{(loan.amount + (loan.amount * loan.rate) / 100).toLocaleString()}</span>
                    </p>
                    {loan.securityDeposit > 0 && loan.role === "borrower" && (
                      <p className="mt-2 text-sm font-sans">
                        Security deposit: <span className="font-semibold text-[var(--color-accent-primary)]">₦{loan.securityDeposit.toLocaleString()} held</span>
                        {loan.status === "completed" ? " (unlocked)" : " (locked)"}
                      </p>
                    )}
                    {loan.source === "peer" && loan.status === "active" && (
                      <div className="mt-4 p-3 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
                          Peer Contact Info
                        </p>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          Phone: {loan.peerPhone || "N/A"}
                        </p>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)] mt-1">
                          Bank: {loan.peerBankDetails || "N/A"}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {loan.status === "active" && loan.role === "borrower" && (
                    <LoadingButton
                      label="Repay Now"
                      loadingText="Repaying..."
                      successText="Repaid!"
                      onClick={() => handleRepay(loan.id, loan.amount, loan.rate, loan.securityDeposit)}
                    />
                  )}
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
}
