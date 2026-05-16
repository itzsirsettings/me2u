"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import LoadingButton from "@/LoadingButton";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { getActivePlatformLoanRetainedDeposit } from "@/lib/loans";
import { getRequiredWithdrawalBalance } from "@/lib/withdrawal";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";

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
  const shortfall = Math.max(0, requiredBalance - currentBalance);
  const balanceAfterWithdrawal =
    Number.isFinite(withdrawalAmount) && withdrawalAmount > 0
      ? Math.max(0, currentBalance - withdrawalAmount)
      : currentBalance;

  const handleRequest = () => {
    if (!user) {
      toast.error("Please log in first");
      router.push("/login");
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
    if (user.balance < requiredBalance) {
      toast.error(platformLoanDeposit > 0
        ? `Fund ₦${shortfall.toLocaleString()} first. ₦${platformLoanDeposit.toLocaleString()} must remain in your wallet.`
        : "Insufficient balance."
      );
      return;
    }
    setStep(2);
  };

  const confirmWithdrawal = async () => {
    const result = await withdraw(Number(amount));
    if (!result.ok) {
      toast.error(result.error || "Unable to process withdrawal");
      throw new Error("Withdrawal failed");
    }

    toast.success("Withdrawal processed.");
    setStep(1);
    setAmount("");
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
      className="container mx-auto flex max-w-md flex-col items-center px-4 pb-32 pt-20 md:px-6 md:py-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.h1 variants={itemVariants} className="mb-8 text-[3rem] font-display leading-[0.85] tracking-tight md:mb-12 md:text-7xl md:tracking-tighter">
        Withdraw
      </motion.h1>
      
      <motion.div variants={itemVariants} className="w-full">
        <Card className="kinetic-border p-5 shadow-[4px_4px_0px_var(--color-shadow)] bg-[var(--color-bg-card)] md:p-10">
          <div className="mb-6 pb-6 border-b border-[var(--color-border)]">
            <p className="text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Available Balance</p>
            <p className="text-3xl font-display leading-none md:text-4xl">₦{(user?.balance || 0).toLocaleString()}</p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="mb-6 p-4 rounded-[5px] bg-[var(--color-warning-bg)] border border-[var(--color-border)]">
                  <p className="text-sm font-sans text-[var(--color-warning-text)]">
                    <span className="font-bold">Notice:</span> Confirm your registration deposit before withdrawal. The first ₦2,000 has no 50% condition; second and later platform loans require 50% of the active loan amount to remain in your wallet.
                  </p>
                </div>
                
                <div className="mb-8">
                  <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Amount to withdraw (₦)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 font-mono text-xl focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none md:text-2xl"
                  />
                </div>

                {withdrawalAmount > 0 && (
                  <div className="mb-6 grid gap-3 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm">
                    {platformLoanDeposit > 0 && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[var(--color-text-secondary)]">Active platform loan condition</span>
                        <span className="font-mono font-semibold">₦{platformLoanDeposit.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--color-text-secondary)]">Balance needed before withdrawal</span>
                      <span className="font-mono font-semibold">₦{requiredBalance.toLocaleString()}</span>
                    </div>
                    {shortfall > 0 ? (
                      <p className="rounded-[5px] bg-[var(--color-warning-bg)] p-3 text-[var(--color-warning-text)]">
                        {platformLoanDeposit > 0
                          ? `Fund ₦${shortfall.toLocaleString()} first. The platform loan condition is retained in your wallet, not charged as a fee.`
                          : `Fund ₦${shortfall.toLocaleString()} first.`}
                      </p>
                    ) : (
                      <p className="rounded-[5px] bg-[var(--color-positive-bg)] p-3 text-[var(--color-positive-text)]">
                        After withdrawal, ₦{balanceAfterWithdrawal.toLocaleString()} will remain in your wallet.
                      </p>
                    )}
                  </div>
                )}
                
                <button onClick={handleRequest} className="btn-primary w-full h-14 text-lg" disabled={!amount || Number(amount) <= 0}>
                  {user?.registrationDepositPaid ? "Continue" : "Complete Registration Deposit"}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-8 rounded-[5px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-5 md:p-6">
                  <p className="text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Withdraw</p>
                  <p className="text-2xl font-mono mb-4">₦{Number(amount).toLocaleString()}</p>
                  
                  <div className="pt-4 border-t border-dashed border-[var(--color-border)]">
                    <p className="text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-warning-text)] mb-1">Retained In Wallet</p>
                    <p className="text-2xl font-display text-[var(--color-warning-text)] md:text-3xl">
                      ₦{platformLoanDeposit.toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm font-sans text-[var(--color-text-secondary)]">
                      This only applies when an active second or later platform loan has a 50% condition.
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-dashed border-[var(--color-border)]">
                    <p className="text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Wallet After Withdrawal</p>
                    <p className="text-2xl font-display">
                      ₦{balanceAfterWithdrawal.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <LoadingButton
                  label="Confirm Withdrawal"
                  loadingText="Processing..."
                  successText="Processed!"
                  onClick={confirmWithdrawal}
                />
                <button onClick={() => setStep(1)} className="btn-ghost w-full mt-4 h-12">
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
