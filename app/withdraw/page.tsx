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
import TransactionPinPrompt from "@/components/TransactionPinPrompt";

export default function WithdrawPage() {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState(1);
  const user = useStore((s) => s.user);
  const activeLoans = useStore((s) => s.activeLoans);
  const withdraw = useStore((s) => s.withdraw);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isPinPromptOpen, setIsPinPromptOpen] = useState(false);

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

  const handleRequest = () => {
    if (!user) {
      toast.error("Please log in first");
      router.push("/login");
      return;
    }
    if (activeLoans && activeLoans.length > 0) {
      toast.error("You must repay all outstanding loans before you can withdraw.");
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

  const confirmWithdrawal = () => {
    setIsPinPromptOpen(true);
  };

  const executeWithdrawal = async () => {
    const result = await withdraw(Number(amount));
    if (!result.ok) {
      toast.error(result.error || "Unable to process withdrawal");
      return;
    }

    toast.success("Withdrawal request submitted for admin approval.");
    setStep(1);
    setAmount("");
    setIsPinPromptOpen(false);
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
      className="app-mobile-screen mx-auto flex w-full max-w-md flex-col items-center px-3.5 pt-[4.85rem] md:max-w-3xl md:px-6 md:py-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.h1 variants={itemVariants} className="sr-only md:not-sr-only md:mb-12 md:text-7xl md:font-display md:leading-[0.85] md:tracking-tighter">
        Withdraw
      </motion.h1>
      
      <motion.div variants={itemVariants} className="w-full">
        <Card className="kinetic-border p-5 shadow-[4px_4px_0px_var(--color-shadow)] bg-[var(--color-bg-card)] md:p-10">
          <div className="mb-4 border-b border-[var(--color-border)] pb-4 md:mb-6 md:pb-6">
            <p className="text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Available Balance</p>
            <p className="text-2xl font-display leading-none md:text-4xl">₦{(user?.balance || 0).toLocaleString()}</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                 {activeLoans.length > 0 ? (
                  <div className="mb-4 rounded-[50px] border border-[var(--color-border)] bg-[var(--color-negative-bg)] py-3.5 px-5 md:mb-6 md:p-4">
                    <p className="text-sm font-sans text-[var(--color-negative-text)] font-semibold">
                      <span className="font-bold">Repayment Required:</span> You have active loans. You must repay all outstanding loans before you can request a withdrawal.
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 rounded-[50px] border border-[var(--color-border)] bg-[var(--color-warning-bg)] py-3 px-5 md:mb-6 md:p-4">
                    <p className="text-sm font-sans text-[var(--color-warning-text)]">
                      <span className="font-bold">Notice:</span> Your ₦{onboardingCreditAmount.toLocaleString()} welcome bonus unlocks after KYC. Withdrawals include a flat ₦{withdrawalFeeAmount.toLocaleString()} processing fee.
                    </p>
                  </div>
                )}
                
                <div className="mb-5 md:mb-8">
                  <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Amount to withdraw (₦)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-[50px] border border-[var(--color-border)] bg-[var(--color-bg-card)] py-4 px-6 font-mono text-xl focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none md:text-2xl"
                  />
                </div>

                {withdrawalAmount > 0 && (
                  <div className="mb-4 grid gap-2.5 rounded-[50px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 text-sm md:mb-6 md:p-4">
                    {platformLoanDeposit > 0 && (
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <span className="min-w-0 text-[var(--color-text-secondary)]">Active loan condition</span>
                        <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">₦{platformLoanDeposit.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 text-[var(--color-text-secondary)]">Processing fee</span>
                      <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">₦{withdrawalFeeAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 text-[var(--color-text-secondary)]">Total wallet debit</span>
                      <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">₦{withdrawalDebit.toLocaleString()}</span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 text-[var(--color-text-secondary)]">Balance needed before withdrawal</span>
                      <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">₦{requiredBalance.toLocaleString()}</span>
                    </div>
                    {shortfall > 0 ? (
                      <p className="rounded-[50px] bg-[var(--color-warning-bg)] p-4 text-[var(--color-warning-text)]">
                        {platformLoanDeposit > 0
                          ? `Fund ₦${shortfall.toLocaleString()} first. The loan condition is retained in your wallet, not charged as a fee.`
                          : `Fund ₦${shortfall.toLocaleString()} first.`}
                      </p>
                    ) : (
                      <p className="rounded-[50px] bg-[var(--color-positive-bg)] p-4 text-[var(--color-positive-text)]">
                        After admin approval, ₦{balanceAfterWithdrawal.toLocaleString()} will remain in your wallet.
                      </p>
                    )}
                  </div>
                )}
                
                 <button 
                  onClick={handleRequest} 
                  className="btn-primary h-11 w-full text-sm md:h-14 md:text-lg" 
                  disabled={activeLoans.length > 0 || !amount || Number(amount) <= 0}
                >
                  {activeLoans.length > 0
                    ? "Repay Outstanding Loans First"
                    : !user?.registrationDepositPaid
                      ? "Complete Registration Deposit"
                      : !user?.kycVerified
                        ? "Complete KYC"
                        : "Continue"}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-5 rounded-[50px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 md:mb-8 md:p-6">
                  <p className="text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Withdraw</p>
                  <p className="mb-3 text-xl font-mono md:mb-4 md:text-2xl">₦{Number(amount).toLocaleString()}</p>
                  <p className="mb-4 rounded-[50px] bg-[var(--color-warning-bg)] p-4 text-sm text-[var(--color-warning-text)]">
                    This creates a pending request. An admin must approve it before your wallet is debited.
                  </p>

                  <div className="grid gap-2 border-t border-dashed border-[var(--color-border)] pt-4 text-sm">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 text-[var(--color-text-secondary)]">Processing fee</span>
                      <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">₦{withdrawalFeeAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 text-[var(--color-text-secondary)]">Total wallet debit</span>
                      <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">₦{withdrawalDebit.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-dashed border-[var(--color-border)]">
                    <p className="text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-warning-text)] mb-1">Retained In Wallet</p>
                    <p className="text-xl font-display text-[var(--color-warning-text)] md:text-3xl">
                      ₦{platformLoanDeposit.toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm font-sans text-[var(--color-text-secondary)]">
                      This only applies when an active second or later loan has a 50% condition.
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-dashed border-[var(--color-border)]">
                    <p className="text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Wallet After Approval</p>
                    <p className="text-xl font-display md:text-2xl">
                      ₦{balanceAfterWithdrawal.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <LoadingButton
                  label="Submit Withdrawal Request"
                  loadingText="Submitting..."
                  successText="Submitted!"
                  onClick={confirmWithdrawal}
                />
                <button onClick={() => setStep(1)} className="btn-ghost mt-3 h-11 w-full md:mt-4 md:h-12">
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      <TransactionPinPrompt
        isOpen={isPinPromptOpen}
        onSuccess={executeWithdrawal}
        onCancel={() => setIsPinPromptOpen(false)}
        title="Withdraw Funds"
        description={`Enter PIN to confirm withdrawal of ₦${Number(amount).toLocaleString()}.`}
      />
    </motion.div>
  );
}
