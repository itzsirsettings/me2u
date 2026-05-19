"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import LoadingButton from "@/LoadingButton";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { getActivePlatformLoanRetainedDeposit, onboardingCreditAmount } from "@/lib/loans";
import { getWithdrawalDebitAmount, withdrawalFeeAmount } from "@/lib/revenue";
import { getRequiredWithdrawalBalance } from "@/lib/withdrawal";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import Icons8Icon from "@/components/Icons8Icon";

export default function WithdrawPage() {
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState(1);
  const user = useStore((s) => s.user);
  const activeLoans = useStore((s) => s.activeLoans);
  const withdraw = useStore((s) => s.withdraw);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  const withdrawalAmount = Number(amount);
  const currentBalance = user?.balance || 0;
  const platformLoanDeposit = getActivePlatformLoanRetainedDeposit(activeLoans);
  const requiredBalance = getRequiredWithdrawalBalance(withdrawalAmount, platformLoanDeposit);
  const withdrawalDebit = getWithdrawalDebitAmount(withdrawalAmount);
  const shortfall = Math.max(0, requiredBalance - currentBalance);
  const balanceAfterWithdrawal =
    Number.isFinite(withdrawalAmount) && withdrawalAmount > 0
      ? Math.max(0, currentBalance - withdrawalDebit)
      : currentBalance;

  // Repay outstanding loans block: User must repay all active borrower loans (except the 2,000 NGN welcome credit loan)
  const hasOutstandingLoans = activeLoans.some(
    (loan) => loan.role === "borrower" && loan.status === "active" && loan.amount !== onboardingCreditAmount
  );

  const handleRequest = () => {
    if (!user) {
      toast.error("Please log in first");
      router.push("/login");
      return;
    }
    if (hasOutstandingLoans) {
      toast.error("You must repay outstanding borrower loans before you can withdraw.");
      return;
    }
    if (!user.transactionPin) {
      toast.error("Please set a transaction PIN in Security settings first.");
      router.push("/security");
      return;
    }
    if (!Number.isFinite(withdrawalAmount) || withdrawalAmount <= 0) {
      toast.error("Enter a valid withdrawal amount");
      return;
    }
    if (!user.registrationDepositPaid) {
      toast.error("Confirm your registration deposit before withdrawal.");
      router.push("/wallet");
      return;
    }
    if (!user.kycVerified) {
      toast.error("Complete KYC before withdrawal.");
      router.push("/kyc");
      return;
    }
    if (user.balance < requiredBalance) {
      toast.error(platformLoanDeposit > 0
        ? `Fund ₦${shortfall.toLocaleString()} first. ₦${platformLoanDeposit.toLocaleString()} must remain in your wallet, plus the ₦${withdrawalFeeAmount.toLocaleString()} fee.`
        : `Insufficient balance for the withdrawal and ₦${withdrawalFeeAmount.toLocaleString()} processing fee.`
      );
      return;
    }
    setStep(2);
  };

  const confirmWithdrawal = async () => {
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      toast.error("Enter a valid 4-digit PIN.");
      throw new Error("Invalid PIN");
    }

    const result = await withdraw(Number(amount), pin);
    if (!result.ok) {
      toast.error(result.error || "Unable to process withdrawal");
      throw new Error("Withdrawal failed");
    }

    toast.success("Withdrawal request submitted for admin approval.");
    setStep(1);
    setAmount("");
    setPin("");
    router.push("/dashboard");
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
      className="app-mobile-screen mx-auto flex w-full max-w-md flex-col items-center px-3.5 pt-[4.85rem] md:max-w-xl md:px-6 md:py-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.h1 variants={itemVariants} className="sr-only md:not-sr-only md:mb-8 md:text-5xl md:font-display md:leading-[0.85] md:tracking-tighter">
        Withdraw
      </motion.h1>
      
      <motion.div variants={itemVariants} className="w-full">
        <Card className="kinetic-border p-5 shadow-[4px_4px_0px_var(--color-shadow)] bg-[var(--color-bg-card)] md:p-8">
          <div className="mb-4 border-b border-[var(--color-border)] pb-4 md:mb-6 md:pb-6">
            <p className="text-xs font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Available Balance</p>
            <p className="text-2xl font-display leading-none md:text-3xl">₦{(user?.balance || 0).toLocaleString()}</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {hasOutstandingLoans ? (
                  <div className="rounded-[12px] border border-[var(--color-warning-text)] bg-[var(--color-warning-bg)] p-4 flex gap-3 items-start">
                    <Icons8Icon name="alert" size={20} className="shrink-0 text-[var(--color-warning-text)] mt-0.5" />
                    <div className="text-xs font-sans leading-relaxed text-[var(--color-warning-text)]">
                      <span className="font-bold">Repayment Required:</span> You have active borrower loans. You must repay outstanding loans in full before you can withdraw capital from your wallet.
                    </div>
                  </div>
                ) : !user?.transactionPin ? (
                  <div className="rounded-[12px] border border-[var(--color-warning-text)] bg-[var(--color-warning-bg)] p-4 flex gap-3 items-start">
                    <Icons8Icon name="shield" size={20} className="shrink-0 text-[var(--color-warning-text)] mt-0.5" />
                    <div className="text-xs font-sans leading-relaxed text-[var(--color-warning-text)]">
                      <span className="font-bold">Setup PIN:</span> You must set up a 4-digit transaction PIN in your security settings before making withdrawals.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-warning-bg)] p-3 md:p-4">
                    <p className="text-[11px] font-sans leading-relaxed text-[var(--color-warning-text)]">
                      <span className="font-bold">Notice:</span> Withdrawals include a flat ₦{withdrawalFeeAmount.toLocaleString()} processing fee. Outgoing funds require admin review for security.
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="mb-2 block text-xs font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Amount to withdraw (₦)</label>
                  <input
                    type="number"
                    disabled={hasOutstandingLoans || !user?.transactionPin}
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 font-mono text-xl focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none disabled:opacity-45 md:text-2xl"
                  />
                </div>

                {withdrawalAmount > 0 && !hasOutstandingLoans && user?.transactionPin && (
                  <div className="grid gap-2.5 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3.5 text-xs">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 text-[var(--color-text-secondary)]">Processing fee</span>
                      <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">₦{withdrawalFeeAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 text-[var(--color-text-secondary)]">Total wallet debit</span>
                      <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">₦{withdrawalDebit.toLocaleString()}</span>
                    </div>
                    {shortfall > 0 ? (
                      <p className="rounded-[8px] bg-[var(--color-warning-bg)] p-3 text-[var(--color-warning-text)]">
                        Fund ₦{shortfall.toLocaleString()} first.
                      </p>
                    ) : (
                      <p className="rounded-[8px] bg-[var(--color-positive-bg)] p-3 text-[var(--color-positive-text)]">
                        After approval, ₦{balanceAfterWithdrawal.toLocaleString()} will remain in your wallet.
                      </p>
                    )}
                  </div>
                )}
                
                {hasOutstandingLoans ? (
                  <button onClick={() => router.push("/loans")} className="btn-primary h-11 w-full text-sm md:h-12">
                    Repay Loans
                  </button>
                ) : !user?.transactionPin ? (
                  <button onClick={() => router.push("/security")} className="btn-primary h-11 w-full text-sm md:h-12">
                    Go to Security Center
                  </button>
                ) : (
                  <button onClick={handleRequest} className="btn-primary h-11 w-full text-sm md:h-12" disabled={!amount || Number(amount) <= 0}>
                    {!user?.registrationDepositPaid
                      ? "Complete Registration Deposit"
                      : !user?.kycVerified
                        ? "Complete KYC"
                        : "Continue"}
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 space-y-4">
                  <div>
                    <p className="text-xs font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Withdraw Amount</p>
                    <p className="text-2xl font-mono">₦{Number(amount).toLocaleString()}</p>
                  </div>

                  <div className="grid gap-2 border-t border-dashed border-[var(--color-border)] pt-4 text-xs">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 text-[var(--color-text-secondary)]">Processing fee</span>
                      <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">₦{withdrawalFeeAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 text-[var(--color-text-secondary)]">Total wallet debit</span>
                      <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">₦{withdrawalDebit.toLocaleString()}</span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 text-[var(--color-text-secondary)]">Wallet after withdrawal</span>
                      <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">₦{balanceAfterWithdrawal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Transaction PIN Verification Input */}
                  <div className="pt-4 border-t border-dashed border-[var(--color-border)] space-y-2">
                    <label className="block text-xs font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Enter 4-Digit Security PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 4) setPin(val);
                      }}
                      className="w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3.5 py-2.5 font-mono text-center text-lg tracking-[0.4em] focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                    />
                  </div>
                </div>
                
                <LoadingButton
                  label="Confirm and Submit"
                  loadingText="Submitting..."
                  successText="Submitted!"
                  disabled={pin.length !== 4}
                  onClick={confirmWithdrawal}
                />
                <button onClick={() => { setStep(1); setPin(""); }} className="btn-ghost h-11 w-full">
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </motion.div>
  );
}
