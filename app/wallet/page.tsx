"use client";

import { Card } from "@/components/ui/card";
import { registrationDepositAmount, firstPlatformLoanAmount } from "@/lib/loans";
import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import LoadingButton from "@/LoadingButton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";

export default function WalletPage() {
  const [amount, setAmount] = useState("");
  const [fundingReference, setFundingReference] = useState("");
  const [registrationReference, setRegistrationReference] = useState("");
  const fundWallet = useStore((state) => state.fundWallet);
  const confirmRegistrationDeposit = useStore((state) => state.confirmRegistrationDeposit);
  const user = useStore((state) => state.user);
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

  const platformAccountName = process.env.NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME?.trim();
  const platformAccountBank = process.env.NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK?.trim();
  const platformAccountNumber = process.env.NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER?.trim();
  const hasPlatformAccountDetails = Boolean(
    platformAccountName && platformAccountBank && platformAccountNumber,
  );

  const handleConfirmRegistrationDeposit = async () => {
    if (!user) {
      toast.error("Please log in first");
      router.push("/login");
      return;
    }

    const result = await confirmRegistrationDeposit(registrationReference);
    if (!result.ok) {
      toast.error(result.error || "Unable to confirm registration deposit");
      throw new Error("Unable to confirm");
    }

    toast.success(
      `Registration deposit confirmed. Your first ₦${firstPlatformLoanAmount.toLocaleString()} loan is now in your wallet.`,
    );
    setRegistrationReference("");
  };

  const handleFund = async () => {
    if (!user) {
      toast.error("Please log in first");
      router.push("/login");
      return;
    }
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (fundingReference.trim().length < 4) {
      toast.error("Enter the transfer reference from your bank or Opay receipt");
      return;
    }
    
    const result = await fundWallet(numAmount, fundingReference);
    if (!result.ok) {
      toast.error(result.error || "Unable to fund wallet");
      throw new Error("Unable to fund");
    }

    toast.success(`Wallet successfully funded with ₦${numAmount.toLocaleString()}`);
    setAmount("");
    setFundingReference("");
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
        Wallet
      </motion.h1>
      
      <motion.div variants={itemVariants} className="w-full space-y-5 md:space-y-6">
        <Card className="kinetic-border p-5 shadow-[4px_4px_0px_var(--color-shadow)] bg-[var(--color-bg-card)] md:p-8">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-5">
            <div>
              <h2 className="text-2xl font-display md:text-3xl">Registration Deposit</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Pay ₦{registrationDepositAmount.toLocaleString()} to unlock your first ₦{firstPlatformLoanAmount.toLocaleString()} withdrawal.
              </p>
            </div>
            <span className={`rounded-[5px] border border-[var(--color-border)] px-3 py-1 text-xs font-bold uppercase ${
              user?.registrationDepositPaid
                ? "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]"
                : "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]"
            }`}>
              {user?.registrationDepositPaid ? "Confirmed" : "Required"}
            </span>
          </div>

          {user?.registrationDepositPaid ? (
            <div className="rounded-[5px] bg-[var(--color-positive-bg)] p-4 text-sm text-[var(--color-positive-text)]">
              Your registration deposit is confirmed. Referral earnings are credited automatically when direct referrals complete onboarding.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-[5px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm">
                {hasPlatformAccountDetails ? (
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--color-text-secondary)]">Bank</span>
                      <span className="font-semibold">{platformAccountBank}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--color-text-secondary)]">Account Name</span>
                      <span className="font-semibold">{platformAccountName}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[var(--color-text-secondary)]">Account Number</span>
                      <span className="font-mono font-semibold">{platformAccountNumber}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[var(--color-text-secondary)]">
                    Platform account details will be shared soon. After payment, enter the transfer reference below.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Payment Reference</label>
                <input
                  type="text"
                  placeholder="Bank transfer reference"
                  value={registrationReference}
                  onChange={(e) => setRegistrationReference(e.target.value)}
                  className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 font-sans text-base focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                />
              </div>

              {registrationReference.trim().length >= 4 && (
                <LoadingButton
                  label="Confirm Registration Deposit"
                  loadingText="Confirming..."
                  successText="Confirmed!"
                  onClick={handleConfirmRegistrationDeposit}
                />
              )}
            </div>
          )}
        </Card>

        <Card className="kinetic-border p-5 shadow-[4px_4px_0px_var(--color-shadow)] bg-[var(--color-bg-card)] md:p-10">
          <h2 className="mb-6 text-2xl font-display md:mb-8 md:text-3xl">Fund Wallet</h2>
          <div className="mb-6 rounded-[5px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm">
            {hasPlatformAccountDetails ? (
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--color-text-secondary)]">Bank</span>
                  <span className="font-semibold">{platformAccountBank}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--color-text-secondary)]">Account Name</span>
                  <span className="font-semibold">{platformAccountName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--color-text-secondary)]">Account Number</span>
                  <span className="font-mono font-semibold">{platformAccountNumber}</span>
                </div>
              </div>
            ) : (
              <p className="text-[var(--color-text-secondary)]">
                Platform account details are not configured yet.
              </p>
            )}
          </div>
          
          <div className="mb-5">
            <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Amount (₦)</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 font-mono text-xl focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none md:text-2xl"
            />
          </div>

          <div className="mb-6 md:mb-8">
            <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Transfer Reference</label>
            <input
              type="text"
              placeholder="Bank or Opay receipt reference"
              value={fundingReference}
              onChange={(e) => setFundingReference(e.target.value)}
              className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 font-sans text-base focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
            />
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
              Transfer to the platform account first, then submit the amount and reference here.
            </p>
          </div>
          
          {hasPlatformAccountDetails && amount && Number(amount) > 0 && fundingReference.trim().length >= 4 && (
            <LoadingButton
              label="Fund Now"
              loadingText="Funding..."
              successText="Funded!"
              onClick={handleFund}
            />
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
