"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import LoadingButton from "@/LoadingButton";
import Icons8Icon from "@/components/Icons8Icon";
import {
  firstPlatformLoanAmount,
  getPlatformLoanRetainedDeposit,
  repeatPlatformLoanMinimum,
  registrationDepositAmount,
} from "@/lib/loans";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { motion, type Variants } from "framer-motion";

export default function Loans() {
  const activeLoans = useStore((state) => state.activeLoans);
  const requestPlatformLoan = useStore((state) => state.requestPlatformLoan);
  const repayLoan = useStore((state) => state.repayLoan);
  const user = useStore((state) => state.user);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loanAmount, setLoanAmount] = useState(String(repeatPlatformLoanMinimum));
  const [isRequestingLoan, setIsRequestingLoan] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  const platformLoans = activeLoans.filter((loan) => loan.role === "borrower" && loan.source === "platform");
  const hasPlatformLoanHistory = platformLoans.length > 0;
  const activePlatformLoan = platformLoans.find((loan) => loan.status === "active");
  const firstLoanLocked = !hasPlatformLoanHistory && !user?.registrationDepositPaid;
  const repeatLoanAmount = Number(loanAmount);
  const requestedPlatformAmount = hasPlatformLoanHistory ? repeatLoanAmount : firstPlatformLoanAmount;
  const retainedDeposit = hasPlatformLoanHistory
    ? getPlatformLoanRetainedDeposit(requestedPlatformAmount)
    : 0;
  const currentBalance = user?.balance || 0;
  const depositShortfall = Math.max(0, retainedDeposit - currentBalance);
  const repeatAmountIsValid =
    Number.isFinite(repeatLoanAmount) && repeatLoanAmount >= repeatPlatformLoanMinimum;
  const requestDisabled =
    isRequestingLoan ||
    Boolean(activePlatformLoan) ||
    (hasPlatformLoanHistory && (!repeatAmountIsValid || depositShortfall > 0));

  const handleRequestLoan = async () => {
    if (!user) {
      toast.error("Please log in first.");
      router.push("/login");
      return;
    }

    if (firstLoanLocked) {
      toast.error(`Pay the ₦${registrationDepositAmount.toLocaleString()} registration deposit first.`);
      router.push("/wallet");
      return;
    }

    if (activePlatformLoan) {
      toast.error("Repay your active platform loan before requesting another one.");
      return;
    }

    if (hasPlatformLoanHistory) {
      if (!repeatAmountIsValid) {
        toast.error("Second and later platform loans start from ₦10,000.");
        return;
      }

      if (currentBalance < retainedDeposit) {
        toast.error(
          `Fund ₦${depositShortfall.toLocaleString()} first. The 50% deposit remains in your wallet.`,
        );
        return;
      }
    }

    setIsRequestingLoan(true);
    const result = await requestPlatformLoan(hasPlatformLoanHistory ? requestedPlatformAmount : undefined);
    setIsRequestingLoan(false);

    if (!result.ok) {
      toast.error(result.error || "Unable to request loan.");
      throw new Error("Unable to request");
    }

    toast.success(
      hasPlatformLoanHistory
        ? `Loan of ₦${requestedPlatformAmount.toLocaleString()} has been added to your wallet.`
        : "Your first ₦2,000 loan has been added to your wallet.",
    );
  };

  const handleRepay = async (loanId: string, amount: number, rate: number) => {
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

    toast.success("Loan repaid successfully!");
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
      className="container mx-auto max-w-4xl px-4 pb-32 pt-20 md:px-6 md:py-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            <Icons8Icon name="requestMoney" size={18} />
            Platform Credit
          </p>
          <h1 className="text-[2.75rem] font-display leading-[0.85] md:text-7xl">
            My Loans
          </h1>
        </div>
        <div className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 shadow-[2px_2px_0px_var(--color-shadow)]">
          <p className="text-xs font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Wallet Balance</p>
          <p className="text-2xl font-display leading-none">₦{currentBalance.toLocaleString()}</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="mb-6 kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:mb-10 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
                  <Icons8Icon name={hasPlatformLoanHistory ? "shield" : "moneyBag"} size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-display leading-none md:text-3xl">
                    {hasPlatformLoanHistory ? "Next Platform Loan" : "First Platform Loan"}
                  </h2>
                  <p className="mt-1 text-sm font-sans text-[var(--color-text-secondary)]">
                    {hasPlatformLoanHistory
                      ? "Starts from ₦10,000 with 50% retained in your wallet."
                      : `Pay the ₦${registrationDepositAmount.toLocaleString()} registration deposit to unlock ₦2,000.`}
                  </p>
                </div>
              </div>

              {hasPlatformLoanHistory ? (
                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Loan Amount (₦)
                    </label>
                    <input
                      type="number"
                      min={repeatPlatformLoanMinimum}
                      value={loanAmount}
                      onChange={(event) => setLoanAmount(event.target.value)}
                      className="h-14 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 font-mono text-xl focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                    />
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
                      className="btn-primary h-14 w-full gap-2 md:w-auto opacity-60 cursor-not-allowed"
                      disabled
                    >
                      <Icons8Icon name="cash" size={20} />
                      {activePlatformLoan
                        ? "Repay Active Loan First"
                        : depositShortfall > 0
                          ? "Fund Wallet First"
                          : "Request Loan"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-5xl font-display leading-none">₦{firstPlatformLoanAmount.toLocaleString()}</p>
                    <p className="mt-2 text-sm font-sans text-[var(--color-text-secondary)]">
                      Repay this first loan before requesting your next one.
                    </p>
                  </div>
                  {!requestDisabled ? (
                    <LoadingButton
                      label="Get ₦2,000 Loan"
                      loadingText="Processing..."
                      successText="Loan Granted!"
                      icon={<Icons8Icon name="cash" size={20} />}
                      onClick={handleRequestLoan}
                    />
                  ) : (
                    <button
                      type="button"
                      className="btn-primary h-14 w-full gap-2 md:w-auto opacity-60 cursor-not-allowed"
                      disabled
                    >
                      <Icons8Icon name="cash" size={20} />
                      {activePlatformLoan
                        ? "Repay Active Loan First"
                        : firstLoanLocked
                          ? "Pay Registration Deposit"
                        : "Get ₦2,000 Loan"}
                    </button>
                  )}
                </div>
              )}

              {hasPlatformLoanHistory && (
                <div className="mt-5 grid gap-3 rounded-[5px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Minimum</p>
                    <p className="mt-1 font-mono text-lg text-[var(--color-text-primary)]">₦{repeatPlatformLoanMinimum.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">50% Retained</p>
                    <p className="mt-1 font-mono text-lg text-[var(--color-text-primary)]">₦{retainedDeposit.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Status</p>
                    <p className={`mt-1 font-sans font-semibold ${depositShortfall > 0 || activePlatformLoan ? "text-[var(--color-warning-text)]" : "text-[var(--color-positive-text)]"}`}>
                      {activePlatformLoan
                        ? "Active loan pending"
                        : depositShortfall > 0
                          ? `Fund ₦${depositShortfall.toLocaleString()}`
                          : "Ready"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4 md:space-y-8">
        {activeLoans.length === 0 ? (
          <p className="text-base leading-relaxed font-sans italic opacity-90 text-[var(--color-text-secondary)] md:text-xl">You have no loans yet.</p>
        ) : (
          activeLoans.map((loan) => (
            <motion.div 
              key={loan.id} 
              variants={itemVariants}
              whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
            >
              <Card className="kinetic-border p-5 shadow-[4px_4px_0px_var(--color-shadow)] bg-[var(--color-bg-card)] md:p-8">
                <div className="mb-4 flex flex-col gap-2 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className={`font-sans font-semibold ${loan.status === "active" ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                    {loan.status === "active" ? "Active" : "Completed"} - {loan.source === "platform" ? "Platform Loan" : loan.role === "borrower" ? "Borrowed" : "Lent"}
                  </p>
                  <p className="text-sm font-sans text-[var(--color-text-secondary)]">
                    Due: {new Date(loan.dueDate).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <p className="text-4xl font-display leading-none md:text-5xl">₦{loan.amount.toLocaleString()}</p>
                    <p className="mt-3 font-sans text-[var(--color-text-secondary)]">
                      Rate: {loan.rate}% • Duration: {loan.days} days
                    </p>
                    <p className="mt-2 text-sm font-sans text-[var(--color-text-secondary)]">
                      Repayment amount: <span className="font-semibold text-[var(--color-text-primary)]">₦{(loan.amount + (loan.amount * loan.rate) / 100).toLocaleString()}</span>
                    </p>
                  </div>
                  
                  {loan.status === "active" && loan.role === "borrower" && (
                    <LoadingButton
                      label="Repay Now"
                      loadingText="Repaying..."
                      successText="Repaid!"
                      onClick={() => handleRepay(loan.id, loan.amount, loan.rate)}
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
