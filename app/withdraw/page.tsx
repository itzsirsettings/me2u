"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import LoadingButton from "@/LoadingButton";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { getActivePlatformLoanRetainedDeposit } from "@/lib/loans";
import { getRequiredWithdrawalBalance } from "@/lib/withdrawal";
import { getWithdrawalProcessorFee, withdrawalFeeAmount } from "@/lib/revenue";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import Icons8Icon from "@/components/Icons8Icon";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { PinInput } from "@/components/ui/PinInput";

const MIN_WITHDRAWAL = 1000;

const NIGERIAN_BANKS = [
  { code: "044", name: "Access Bank" },
  { code: "023", name: "Citibank" },
  { code: "063", name: "Access Bank (Diamond)" },
  { code: "050", name: "Ecobank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank" },
  { code: "214", name: "First City Monument Bank (FCMB)" },
  { code: "058", name: "GTBank" },
  { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "526", name: "Moniepoint MFB" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "221", name: "Stanbic IBTC" },
  { code: "068", name: "Standard Chartered" },
  { code: "232", name: "Sterling Bank" },
  { code: "100", name: "Suntrust Bank" },
  { code: "032", name: "Union Bank" },
  { code: "033", name: "UBA" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
  { code: "999992", name: "OPay" },
  { code: "999991", name: "PalmPay" },
  { code: "50515", name: "Moniepoint" },
  { code: "090405", name: "Kuda Bank" },
  { code: "000026", name: "Carbon" },
  { code: "565", name: "Carbon MFB" },
  { code: "000014", name: "VFD MFB" },
].sort((a, b) => a.name.localeCompare(b.name));

type Step = "amount" | "bank" | "confirm";

export default function WithdrawPage() {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [transactionPin, setTransactionPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const user = useStore((s) => s.user);
  const activeLoans = useStore((s) => s.activeLoans);
  const loadCurrentUser = useStore((s) => s.loadCurrentUser);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const withdrawalAmount = Number(amount) || 0;
  const currentBalance = user?.balance || 0;
  const platformLoanDeposit = getActivePlatformLoanRetainedDeposit(activeLoans);
  const requiredBalance = getRequiredWithdrawalBalance(withdrawalAmount, platformLoanDeposit);
  const fee = getWithdrawalProcessorFee(withdrawalAmount);
  const totalFee = fee + withdrawalFeeAmount;
  const netAmount = withdrawalAmount;
  const totalDebit = withdrawalAmount + totalFee;
  const shortfall = Math.max(0, requiredBalance - currentBalance);

  const hasOutstandingLoans = activeLoans.some(
    (loan) => loan.role === "borrower" && loan.status === "active"
  );

  const canProceedToBank = withdrawalAmount >= MIN_WITHDRAWAL && currentBalance >= requiredBalance && !hasOutstandingLoans;

  const resolveAccount = useCallback(async () => {
    if (!bankCode || accountNumber.length !== 10) return;
    
    setVerifying(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch("/api/wallet/resolve-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ bank_code: bankCode, account_number: accountNumber }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || "Could not resolve account");
        setVerified(false);
        setAccountName("");
        return;
      }

      setAccountName(data.account_name);
      setVerified(true);
      toast.success(`Account verified: ${data.account_name}`);
    } catch {
      toast.error("Failed to verify account");
      setVerified(false);
      setAccountName("");
    } finally {
      setVerifying(false);
    }
  }, [bankCode, accountNumber]);

  const handleSubmit = async () => {
    if (!user?.transactionPin) {
      toast.error("Please set a transaction PIN in Security settings first.");
      router.push("/security");
      return;
    }

    if (!user.registrationDepositPaid) {
      toast.error("Complete your registration deposit before withdrawal.");
      router.push("/wallet");
      return;
    }

    if (!user.kycVerified) {
      toast.error("Complete KYC before withdrawal.");
      router.push("/kyc");
      return;
    }

    if (!verified || !accountName) {
      toast.error("Please verify your bank account first.");
      return;
    }

    if (!/^\d{4}$/.test(transactionPin)) {
      toast.error("Enter your 4-digit transaction PIN.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          amount: withdrawalAmount,
          bank_code: bankCode,
          account_number: accountNumber,
          account_name: accountName,
          pin: transactionPin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Withdrawal failed");
        return;
      }

      toast.success("Withdrawal initiated! You'll receive a notification when it's processed.");
      await loadCurrentUser();
      router.push("/dashboard");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
  };

  if (!isAuthenticated && !isLoading) return null;

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
          {/* Balance Header */}
          <div className="mb-6 flex items-center justify-between border-b border-[var(--color-border)] pb-4">
            <div>
              <p className="text-xs font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Available Balance</p>
              <p className="text-2xl font-display leading-none md:text-3xl">₦{currentBalance.toLocaleString()}</p>
            </div>
            {(user?.locked ?? 0) > 0 && (
              <div className="text-right">
                <p className="text-xs font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Locked</p>
                <p className="text-lg font-mono text-[var(--color-text-secondary)]">₦{(user?.locked ?? 0).toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Blockers */}
          {hasOutstandingLoans && (
            <div className="mb-4 rounded-[12px] border border-[var(--color-warning-text)] bg-[var(--color-warning-bg)] p-4 flex gap-3 items-start">
              <Icons8Icon name="alert" size={20} className="shrink-0 text-[var(--color-warning-text)] mt-0.5" />
              <div className="text-xs font-sans leading-relaxed text-[var(--color-warning-text)]">
                <span className="font-bold">Repayment Required:</span> Repay outstanding loans before withdrawing.
              </div>
            </div>
          )}

          {!user?.transactionPin && !hasOutstandingLoans && (
            <div className="mb-4 rounded-[12px] border border-[var(--color-warning-text)] bg-[var(--color-warning-bg)] p-4 flex gap-3 items-start">
              <Icons8Icon name="shield" size={20} className="shrink-0 text-[var(--color-warning-text)] mt-0.5" />
              <div className="text-xs font-sans leading-relaxed text-[var(--color-warning-text)]">
                <span className="font-bold">PIN Required:</span> Set up a transaction PIN in Security settings.
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === "amount" && (
              <motion.div
                key="amount"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-2 block text-xs font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Amount to withdraw (₦)
                  </label>
                  <input
                    type="number"
                    disabled={hasOutstandingLoans || !user?.transactionPin}
                    placeholder={`Min ₦${MIN_WITHDRAWAL.toLocaleString()}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 font-mono text-xl focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none disabled:opacity-45 md:text-2xl"
                  />
                </div>

                {withdrawalAmount > 0 && (
                  <div className="grid gap-2.5 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-secondary)]">Amount</span>
                      <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">₦{withdrawalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-secondary)]">Fee (1.5% + ₦{withdrawalFeeAmount})</span>
                      <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">₦{totalFee.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2 font-semibold">
                      <span>You receive</span>
                      <span className="font-mono text-[var(--color-positive-text)]">₦{netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {shortfall > 0 && (
                      <p className="rounded-[8px] bg-[var(--color-warning-bg)] p-3 text-[var(--color-warning-text)]">
                        Fund ₦{shortfall.toLocaleString()} first.
                      </p>
                    )}
                    {withdrawalAmount < MIN_WITHDRAWAL && (
                      <p className="rounded-[8px] bg-[var(--color-warning-bg)] p-3 text-[var(--color-warning-text)]">
                        Minimum withdrawal is ₦{MIN_WITHDRAWAL.toLocaleString()}.
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
                    Set up Transaction PIN
                  </button>
                ) : (
                  <button
                    onClick={() => setStep("bank")}
                    className="btn-primary h-11 w-full text-sm md:h-12"
                    disabled={!canProceedToBank}
                  >
                    Continue
                  </button>
                )}
              </motion.div>
            )}

            {step === "bank" && (
              <motion.div
                key="bank"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Summary */}
                <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-secondary)]">Withdraw</span>
                    <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">₦{withdrawalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-secondary)]">Fee</span>
                    <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">₦{totalFee.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2 font-semibold">
                    <span>You receive</span>
                    <span className="font-mono text-[var(--color-positive-text)]">₦{netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Bank Selection */}
                <div>
                  <label className="mb-2 block text-xs font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Bank
                  </label>
                  <select
                    value={bankCode}
                    onChange={(e) => {
                      setBankCode(e.target.value);
                      setVerified(false);
                      setAccountName("");
                    }}
                    className="w-full rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-sm focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                  >
                    <option value="">— select bank —</option>
                    {NIGERIAN_BANKS.map((bank) => (
                      <option key={bank.code} value={bank.code}>{bank.name}</option>
                    ))}
                  </select>
                </div>

                {/* Account Number */}
                <div>
                  <label className="mb-2 block text-xs font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Account number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="10-digit NUBAN"
                      value={accountNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setAccountNumber(val);
                        setVerified(false);
                        setAccountName("");
                      }}
                      className="flex-1 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 font-mono text-sm focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={resolveAccount}
                      disabled={verifying || !bankCode || accountNumber.length !== 10}
                      className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 text-xs font-semibold disabled:opacity-40 hover:bg-[var(--color-hover-soft)]"
                    >
                      {verifying ? "..." : verified ? "✓" : "Verify"}
                    </button>
                  </div>
                  {accountNumber.length > 0 && accountNumber.length < 10 && (
                    <p className="mt-1 text-xs text-[var(--color-text-danger)]">Enter a valid 10-digit account number</p>
                  )}
                </div>

                {/* Verified Account Name */}
                {verified && accountName && (
                  <div className="flex items-center gap-2 rounded-[8px] bg-[var(--color-positive-bg)] p-3 text-sm text-[var(--color-positive-text)]">
                    <Icons8Icon name="check" size={16} />
                    <span className="font-semibold">{accountName}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="mb-2 block text-xs font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Transaction PIN
                  </label>
                  <PinInput
                    value={transactionPin}
                    onChange={setTransactionPin}
                    secure
                    disabled={submitting}
                  />
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !verified || !accountName || transactionPin.length !== 4}
                    className="btn-primary h-11 w-full text-sm md:h-12 disabled:opacity-40"
                  >
                    {submitting ? "Processing…" : `Withdraw ₦${netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </button>
                  <button
                    onClick={() => {
                      setStep("amount");
                      setBankCode("");
                      setAccountNumber("");
                      setAccountName("");
                      setTransactionPin("");
                      setVerified(false);
                    }}
                    className="btn-ghost h-11 w-full"
                  >
                    Back
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </motion.div>
  );
}
