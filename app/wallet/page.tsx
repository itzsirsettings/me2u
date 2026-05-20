"use client";

import { Card } from "@/components/ui/card";
import Icons8Icon, { type Icons8IconName } from "@/components/Icons8Icon";
import { onboardingCreditAmount, registrationDepositAmount } from "@/lib/loans";
import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import LoadingButton from "@/LoadingButton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion, type Variants, AnimatePresence } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const walletServices: Array<{ id: string; label: string; detail: string; icon: Icons8IconName }> = [
  { id: "airtime", label: "Airtime", detail: "Top up any network instantly", icon: "phone" },
  { id: "data", label: "Data", detail: "Buy internet bundles", icon: "globe" },
  { id: "electricity", label: "Electricity", detail: "Prepaid and postpaid tokens", icon: "bill" },
  { id: "cable", label: "Cable TV", detail: "Pay TV subscriptions", icon: "bill" },
  { id: "internet", label: "Internet", detail: "Router and broadband plans", icon: "globe" },
  { id: "school", label: "School Fees", detail: "Partner school payments", icon: "book" },
  { id: "merchant_qr", label: "Merchant QR", detail: "Pay verified merchants", icon: "market" },
  { id: "payment_link", label: "Payment Link", detail: "Small business links", icon: "requestMoney" },
];

type SavingsGoal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  locked: boolean;
  status: "active" | "completed" | "withdrawn";
};

type MerchantDeal = {
  id: string;
  merchant_name: string;
  category: string;
  title: string;
  description: string;
  discount_percent: number;
};

type MerchantClaim = {
  deal_id: string;
  status: string;
};

type SupportBeneficiary = {
  id: string;
  beneficiary_name: string;
  relationship: string;
  purpose: string;
  support_mode: "repayment" | "non_repayment";
  verified: boolean;
  last_support_amount: number;
};

export default function WalletPage() {
  const [amount, setAmount] = useState("");
  const [fundingReference, setFundingReference] = useState("");
  const [fundReceiptFile, setFundReceiptFile] = useState<File | null>(null);
  const [registrationReference, setRegistrationReference] = useState("");
  const [regReceiptFile, setRegReceiptFile] = useState<File | null>(null);
  
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [servicePhone, setServicePhone] = useState("");
  const [serviceAmount, setServiceAmount] = useState("");
  const [serviceProvider, setServiceProvider] = useState("MTN");
  const [billPin, setBillPin] = useState("");
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [merchantDeals, setMerchantDeals] = useState<MerchantDeal[]>([]);
  const [merchantClaims, setMerchantClaims] = useState<MerchantClaim[]>([]);
  const [supportBeneficiaries, setSupportBeneficiaries] = useState<SupportBeneficiary[]>([]);
  const [newGoalName, setNewGoalName] = useState("Emergency wallet");
  const [newGoalTarget, setNewGoalTarget] = useState("10000");
  const [newGoalLocked, setNewGoalLocked] = useState(true);
  const [goalFundingAmounts, setGoalFundingAmounts] = useState<Record<string, string>>({});
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryPurpose, setBeneficiaryPurpose] = useState("School fees");
  const [supportAmounts, setSupportAmounts] = useState<Record<string, string>>({});
  const [featureLoading, setFeatureLoading] = useState(false);

  const fundWallet = useStore((state) => state.fundWallet);
  const confirmRegistrationDeposit = useStore((state) => state.confirmRegistrationDeposit);
  const payBill = useStore((state) => state.payBill);
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

  async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) throw new Error("Please log in first.");

    return fetch(input, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  }

  const loadWalletFeatures = async () => {
    if (!isAuthenticated) return;
    setFeatureLoading(true);
    try {
      const [savingsResponse, dealsResponse, beneficiariesResponse] = await Promise.all([
        authorizedFetch("/api/savings"),
        authorizedFetch("/api/merchant-deals"),
        authorizedFetch("/api/support-beneficiaries"),
      ]);
      const [savingsData, dealsData, beneficiariesData] = await Promise.all([
        savingsResponse.json().catch(() => ({})),
        dealsResponse.json().catch(() => ({})),
        beneficiariesResponse.json().catch(() => ({})),
      ]);

      if (savingsData.ok) setSavingsGoals(savingsData.goals || []);
      if (dealsData.ok) {
        setMerchantDeals(dealsData.deals || []);
        setMerchantClaims(dealsData.claims || []);
      }
      if (beneficiariesData.ok) setSupportBeneficiaries(beneficiariesData.beneficiaries || []);
    } finally {
      setFeatureLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && isAuthenticated) {
      loadWalletFeatures().catch(() => {});
    }
  }, [mounted, isAuthenticated]);

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  const platformAccountName = process.env.NEXT_PUBLIC_PLATFORM_ACCOUNT_NAME?.trim();
  const platformAccountBank = process.env.NEXT_PUBLIC_PLATFORM_ACCOUNT_BANK?.trim();
  const platformAccountNumber = process.env.NEXT_PUBLIC_PLATFORM_ACCOUNT_NUMBER?.trim();
  const hasPlatformAccountDetails = Boolean(
    platformAccountName && platformAccountBank && platformAccountNumber,
  );
  const registrationProofReady = registrationReference.trim().length >= 4 && Boolean(regReceiptFile);
  const fundingProofReady =
    hasPlatformAccountDetails &&
    Boolean(amount) &&
    Number(amount) > 0 &&
    fundingReference.trim().length >= 4 &&
    Boolean(fundReceiptFile);

  const handleConfirmRegistrationDeposit = async () => {
    if (!user) {
      toast.error("Please log in first");
      router.push("/login");
      return;
    }

    if (!regReceiptFile) {
      toast.error("Please upload a proof of payment screenshot");
      return;
    }

    const result = await confirmRegistrationDeposit(registrationReference, regReceiptFile);
    if (!result.ok) {
      toast.error(result.error || "Unable to submit registration deposit");
      throw new Error("Unable to submit");
    }

    toast.success("Receipt submitted! After approval, complete KYC to unlock your welcome bonus.");
    setRegistrationReference("");
    setRegReceiptFile(null);
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
    
    if (!fundReceiptFile) {
      toast.error("Please upload a proof of payment screenshot");
      return;
    }
    
    const result = await fundWallet(numAmount, fundingReference, fundReceiptFile);
    if (!result.ok) {
      toast.error(result.error || "Unable to submit wallet funding request");
      throw new Error("Unable to submit request");
    }

    toast.success("Receipt submitted! Awaiting approval to credit your wallet.");
    setAmount("");
    setFundingReference("");
    setFundReceiptFile(null);
  };

  const handlePayBill = async () => {
    if (!user) return;
    if (!user.transactionPin) {
      toast.error("Please set a transaction PIN in Security settings first.");
      router.push("/security");
      return;
    }
    const numAmount = Number(serviceAmount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!servicePhone.trim()) {
      toast.error("Please enter the required details");
      return;
    }
    if (billPin.length !== 4 || !/^\d+$/.test(billPin)) {
      toast.error("Please enter a valid 4-digit transaction PIN");
      return;
    }
    
    const serviceName = walletServices.find(s => s.id === selectedService)?.label || "Bill";
    const result = await payBill(numAmount, serviceName, `${serviceProvider} - ${servicePhone}`, billPin);
    
    if (!result.ok) {
      toast.error(result.error || "Unable to complete transaction");
      throw new Error("Transaction failed");
    }
    
    toast.success(`${serviceName} purchase successful!`);
    setSelectedService(null);
    setServiceAmount("");
    setServicePhone("");
    setBillPin("");
  };

  const createSavingsGoal = async () => {
    const targetAmount = Number(newGoalTarget);
    if (!newGoalName.trim()) {
      toast.error("Enter a savings goal name.");
      return;
    }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      toast.error("Enter a valid savings target.");
      return;
    }

    const response = await authorizedFetch("/api/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        name: newGoalName,
        targetAmount,
        locked: newGoalLocked,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      toast.error(data.error || "Unable to create savings goal.");
      return;
    }
    toast.success("Savings goal created.");
    setNewGoalName("Emergency wallet");
    setNewGoalTarget("10000");
    await loadWalletFeatures();
  };

  const fundSavingsGoal = async (goal: SavingsGoal) => {
    const amount = Number(goalFundingAmounts[goal.id] || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid savings amount.");
      return;
    }

    const response = await authorizedFetch("/api/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fund", goalId: goal.id, amount }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      toast.error(data.error || "Unable to fund savings goal.");
      return;
    }
    toast.success(`Saved ₦${amount.toLocaleString()} toward ${goal.name}.`);
    setGoalFundingAmounts((current) => ({ ...current, [goal.id]: "" }));
    await Promise.all([loadWalletFeatures(), useStore.getState().loadCurrentUser()]);
  };

  const withdrawSavingsGoal = async (goal: SavingsGoal) => {
    const response = await authorizedFetch("/api/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "withdraw", goalId: goal.id }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      toast.error(data.error || "Unable to release savings.");
      return;
    }
    toast.success("Savings released back to wallet.");
    await Promise.all([loadWalletFeatures(), useStore.getState().loadCurrentUser()]);
  };

  const claimMerchantDeal = async (deal: MerchantDeal) => {
    const response = await authorizedFetch("/api/merchant-deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId: deal.id }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      toast.error(data.error || "Unable to claim merchant deal.");
      return;
    }
    toast.success(`${deal.merchant_name} deal claimed.`);
    await loadWalletFeatures();
  };

  const createBeneficiary = async () => {
    if (!beneficiaryName.trim()) {
      toast.error("Enter a beneficiary name.");
      return;
    }

    const response = await authorizedFetch("/api/support-beneficiaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        beneficiaryName,
        purpose: beneficiaryPurpose,
        relationship: "Family",
        supportMode: "non_repayment",
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      toast.error(data.error || "Unable to add beneficiary.");
      return;
    }
    toast.success("Support beneficiary added.");
    setBeneficiaryName("");
    await loadWalletFeatures();
  };

  const recordBeneficiarySupport = async (beneficiary: SupportBeneficiary) => {
    const amount = Number(supportAmounts[beneficiary.id] || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid support amount.");
      return;
    }

    const response = await authorizedFetch("/api/support-beneficiaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "record_support",
        beneficiaryId: beneficiary.id,
        amount,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      toast.error(data.error || "Unable to record support.");
      return;
    }
    toast.success("Support history updated.");
    setSupportAmounts((current) => ({ ...current, [beneficiary.id]: "" }));
    await loadWalletFeatures();
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
        Wallet
      </motion.h1>
      
      <motion.div variants={itemVariants} className="w-full space-y-4 md:space-y-6">
        {!user?.registrationDepositPaid && (
          <Card className="kinetic-border p-5 shadow-[4px_4px_0px_var(--color-shadow)] bg-[var(--color-bg-card)] md:p-8">
            <div className="mb-5 flex min-w-0 items-start justify-between gap-4 border-b border-[var(--color-border)] pb-5">
              <div className="min-w-0">
                <h2 className="text-xl font-display md:text-3xl">Registration Deposit</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Your ₦{onboardingCreditAmount.toLocaleString()} welcome bonus is waiting. Submit the ₦{registrationDepositAmount.toLocaleString()} deposit proof, then complete KYC to unlock it.
                </p>
              </div>
              <span className="shrink-0 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-warning-bg)] px-3 py-1 text-xs font-bold uppercase text-[var(--color-warning-text)]">
                Required
              </span>
            </div>

            <div className="space-y-4">
              <div className="rounded-[5px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm">
                {hasPlatformAccountDetails ? (
                  <div className="grid gap-2">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="shrink-0 text-[var(--color-text-secondary)]">Bank</span>
                      <span className="overflow-anywhere min-w-0 text-right font-semibold">{platformAccountBank}</span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="shrink-0 text-[var(--color-text-secondary)]">Account Name</span>
                      <span className="overflow-anywhere min-w-0 text-right font-semibold">{platformAccountName}</span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="shrink-0 text-[var(--color-text-secondary)]">Account Number</span>
                      <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">{platformAccountNumber}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[var(--color-text-secondary)]">
                    Payment account details will be shared soon. After payment, enter the transfer reference below.
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

              <div>
                <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Proof of Payment</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setRegReceiptFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="reg-receipt-upload"
                  />
                  <label
                    htmlFor="reg-receipt-upload"
                    className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] py-4 transition-colors hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    {regReceiptFile ? (
                      <span className="text-sm font-medium text-[var(--color-positive-text)]">
                        {regReceiptFile.name}
                      </span>
                    ) : (
                      <>
                        <span className="text-sm font-medium">Click to upload screenshot</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="w-full [&>button]:w-full">
                <LoadingButton
                  label="Submit Deposit Proof"
                  loadingText="Submitting..."
                  successText="Submitted!"
                  disabled={!registrationProofReady}
                  onClick={handleConfirmRegistrationDeposit}
                />
              </div>
            </div>
          </Card>
        )}

        <Card className="kinetic-border p-5 shadow-[4px_4px_0px_var(--color-shadow)] bg-[var(--color-bg-card)] md:p-10">
          <h2 className="mb-4 text-xl font-display md:mb-8 md:text-3xl">Fund Wallet</h2>
          <div className="mb-4 rounded-[5px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-sm md:p-4">
            {hasPlatformAccountDetails ? (
              <div className="grid gap-2">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <span className="shrink-0 text-[var(--color-text-secondary)]">Bank</span>
                  <span className="overflow-anywhere min-w-0 text-right font-semibold">{platformAccountBank}</span>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <span className="shrink-0 text-[var(--color-text-secondary)]">Account Name</span>
                  <span className="overflow-anywhere min-w-0 text-right font-semibold">{platformAccountName}</span>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <span className="shrink-0 text-[var(--color-text-secondary)]">Account Number</span>
                  <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">{platformAccountNumber}</span>
                </div>
              </div>
            ) : (
              <p className="text-[var(--color-text-secondary)]">
                Payment account details are not configured yet.
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

          <div className="mb-4 md:mb-8">
            <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Transfer Reference</label>
            <input
              type="text"
              placeholder="Bank or Opay receipt reference"
              value={fundingReference}
              onChange={(e) => setFundingReference(e.target.value)}
              className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 font-sans text-base focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
            />
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
              Transfer to the payment account first, then submit the amount and reference here.
            </p>
          </div>
          
          <div className="mb-4 md:mb-8">
            <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Proof of Payment</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFundReceiptFile(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="fund-receipt-upload"
              />
              <label
                htmlFor="fund-receipt-upload"
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] py-4 transition-colors hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                {fundReceiptFile ? (
                  <span className="text-sm font-medium text-[var(--color-positive-text)]">
                    {fundReceiptFile.name}
                  </span>
                ) : (
                  <>
                    <span className="text-sm font-medium">Click to upload screenshot</span>
                  </>
                )}
              </label>
            </div>
          </div>
          
          <div className="w-full [&>button]:w-full">
            <LoadingButton
              label="Submit Funding Proof"
              loadingText="Submitting..."
              successText="Submitted!"
              disabled={!fundingProofReady}
              onClick={handleFund}
            />
          </div>
        </Card>

        <Card className="kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-8">
          <div className="mb-4 flex min-w-0 items-start justify-between gap-3 md:mb-6">
            <div className="min-w-0">
              <h2 className="text-xl font-display md:text-3xl">Pay Bills</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Instantly buy airtime, data, or pay electricity bills directly from your wallet.
              </p>
            </div>
            <Icons8Icon name="bill" size={26} className="shrink-0 text-[var(--color-accent-primary)]" />
          </div>
          
          <div className="grid gap-2 sm:grid-cols-3 mb-6">
            {walletServices.map((service) => (
              <button
                key={service.id}
                type="button"
                className={`flex min-w-0 items-center gap-3 rounded-[5px] border p-3 text-left transition ${
                  selectedService === service.id 
                    ? "border-[var(--color-accent-primary)] bg-[var(--color-hover-soft)] shadow-inner" 
                    : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-hover-soft)]"
                }`}
                onClick={() => {
                  setSelectedService(service.id);
                  setServiceProvider(
                    service.id === "electricity"
                      ? "Ikeja Electric"
                      : service.id === "cable"
                        ? "DSTV"
                        : service.id === "internet"
                          ? "Spectranet"
                          : service.id === "school"
                            ? "Partner School"
                            : service.id === "merchant_qr"
                              ? "Verified Merchant"
                              : service.id === "payment_link"
                                ? "Business Payment Link"
                                : "MTN",
                  );
                }}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[5px] bg-[var(--color-bg-card)] text-[var(--color-accent-primary)]">
                  <Icons8Icon name={service.icon} size={21} />
                </span>
                <span className="min-w-0">
                  <b className="block truncate text-sm">{service.label}</b>
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {selectedService && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                  <div>
                    <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Provider
                    </label>
                    <select
                      className="h-11 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 font-sans focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                      value={serviceProvider}
                      onChange={(e) => setServiceProvider(e.target.value)}
                    >
                      {selectedService === "electricity" ? (
                        <>
                          <option value="Ikeja Electric">Ikeja Electric (IKEDC)</option>
                          <option value="Eko Electric">Eko Electric (EKEDC)</option>
                          <option value="Abuja Electric">Abuja Electric (AEDC)</option>
                        </>
                      ) : selectedService === "cable" ? (
                        <>
                          <option value="DSTV">DSTV</option>
                          <option value="GOtv">GOtv</option>
                          <option value="Startimes">Startimes</option>
                        </>
                      ) : selectedService === "internet" ? (
                        <>
                          <option value="Spectranet">Spectranet</option>
                          <option value="Smile">Smile</option>
                          <option value="Fiber Partner">Fiber Partner</option>
                        </>
                      ) : selectedService === "school" ? (
                        <>
                          <option value="Partner School">Partner School</option>
                          <option value="Training Center">Training Center</option>
                        </>
                      ) : selectedService === "merchant_qr" || selectedService === "payment_link" ? (
                        <>
                          <option value="Verified Merchant">Verified Merchant</option>
                          <option value="Small Business">Small Business</option>
                        </>
                      ) : (
                        <>
                          <option value="MTN">MTN</option>
                          <option value="Airtel">Airtel</option>
                          <option value="Glo">Glo</option>
                          <option value="9mobile">9mobile</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      {selectedService === "electricity" ? "Meter Number" : "Phone Number"}
                    </label>
                    <input
                      type="text"
                      placeholder={selectedService === "electricity" ? "Enter meter number" : "Enter phone number"}
                      value={servicePhone}
                      onChange={(e) => setServicePhone(e.target.value)}
                      className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 font-mono focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Amount (₦)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={serviceAmount}
                      onChange={(e) => setServiceAmount(e.target.value)}
                      className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 font-mono focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                    />
                  </div>
                  {!user?.transactionPin ? (
                    <div className="rounded-[8px] border border-[var(--color-warning-text)] bg-[var(--color-warning-bg)] p-3 text-xs text-[var(--color-warning-text)]">
                      <span className="font-bold font-sans">PIN Setup Required:</span> You need to set a transaction PIN in Security settings before you can buy airtime/data or pay bills.
                    </div>
                  ) : (
                    <div>
                      <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Transaction PIN</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        placeholder="••••"
                        value={billPin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          if (val.length <= 4) setBillPin(val);
                        }}
                        className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 font-mono text-center text-lg tracking-[0.4em] focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                      />
                    </div>
                  )}
                  
                  <div className="pt-2 w-full [&>button]:w-full">
                    {!user?.transactionPin ? (
                      <button
                        onClick={() => router.push("/security")}
                        className="btn-primary min-h-11 w-full text-sm font-bold"
                      >
                        Set up Transaction PIN
                      </button>
                    ) : (
                      <LoadingButton
                        label={`Pay ₦${serviceAmount || "0"}`}
                        loadingText="Processing..."
                        successText="Successful!"
                        disabled={!serviceAmount || !servicePhone || !user?.kycVerified || billPin.length !== 4}
                        onClick={handlePayBill}
                      />
                    )}
                    {!user?.kycVerified && (
                      <p className="mt-2 text-xs text-center text-[var(--color-warning-text)]">Complete KYC to unlock bill payments.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <Card className="kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-8">
          <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-display md:text-3xl">Savings Goals</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Save small before you borrow. Locked goals move funds into your protected wallet balance.
              </p>
            </div>
            <Icons8Icon name="savings" size={26} className="shrink-0 text-[var(--color-accent-primary)]" />
          </div>

          <div className="grid gap-3 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
            <input
              value={newGoalName}
              onChange={(event) => setNewGoalName(event.target.value)}
              className="h-11 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-sm focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
              placeholder="Emergency wallet, rent, school fees..."
            />
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                type="number"
                value={newGoalTarget}
                onChange={(event) => setNewGoalTarget(event.target.value)}
                className="h-11 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 font-mono text-sm focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                placeholder="Target amount"
              />
              <label className="flex min-h-11 items-center gap-2 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-xs font-bold text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={newGoalLocked}
                  onChange={(event) => setNewGoalLocked(event.target.checked)}
                  className="accent-[var(--color-accent-primary)]"
                />
                Locked
              </label>
            </div>
            <button type="button" className="btn-primary min-h-11 w-full text-sm" onClick={createSavingsGoal}>
              Create Savings Goal
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {featureLoading && savingsGoals.length === 0 ? (
              <p className="rounded-[5px] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-secondary)]">Loading savings...</p>
            ) : savingsGoals.length === 0 ? (
              <p className="rounded-[5px] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-secondary)]">No savings goals yet.</p>
            ) : (
              savingsGoals.map((goal) => {
                const progress = Math.min(100, Math.round((Number(goal.current_amount || 0) / Number(goal.target_amount || 1)) * 100));
                return (
                  <div key={goal.id} className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{goal.name}</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                          ₦{Number(goal.current_amount).toLocaleString()} / ₦{Number(goal.target_amount).toLocaleString()} • {goal.locked ? "locked" : "flexible"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--color-positive-bg)] px-2 py-1 text-[10px] font-black uppercase text-[var(--color-positive-text)]">
                        {goal.status}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-bg-card)]">
                      <div className="h-full rounded-full bg-[var(--color-accent-primary)]" style={{ width: `${progress}%` }} />
                    </div>
                    {goal.status === "active" && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <input
                          type="number"
                          value={goalFundingAmounts[goal.id] || ""}
                          onChange={(event) => setGoalFundingAmounts((current) => ({ ...current, [goal.id]: event.target.value }))}
                          className="h-10 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 font-mono text-sm focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                          placeholder="Amount"
                        />
                        <button type="button" className="btn-primary min-h-10 px-4 text-xs" onClick={() => fundSavingsGoal(goal)}>
                          Save
                        </button>
                      </div>
                    )}
                    {(goal.status === "completed" || !goal.locked) && Number(goal.current_amount || 0) > 0 && (
                      <button type="button" className="btn-ghost mt-3 min-h-10 w-full text-xs" onClick={() => withdrawSavingsGoal(goal)}>
                        Release to Wallet
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-8">
          <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-display md:text-3xl">Merchant Deals</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Claim verified wallet deals from food, health, education, business, and phone partners.
              </p>
            </div>
            <Icons8Icon name="market" size={26} className="shrink-0 text-[var(--color-accent-primary)]" />
          </div>
          <div className="grid gap-3">
            {merchantDeals.length === 0 ? (
              <p className="rounded-[5px] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-secondary)]">No merchant deals are active yet.</p>
            ) : (
              merchantDeals.map((deal) => {
                const claimed = merchantClaims.some((claim) => claim.deal_id === deal.id);
                return (
                  <div key={deal.id} className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wider text-[var(--color-accent-primary)]">{deal.category}</p>
                        <h3 className="mt-1 text-sm font-black">{deal.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">{deal.description}</p>
                        <p className="mt-2 text-xs font-bold text-[var(--color-text-primary)]">{deal.merchant_name} • {deal.discount_percent}% off</p>
                      </div>
                      <button
                        type="button"
                        disabled={claimed}
                        className={claimed ? "btn-ghost min-h-10 shrink-0 px-3 text-xs opacity-70" : "btn-primary min-h-10 shrink-0 px-3 text-xs"}
                        onClick={() => claimMerchantDeal(deal)}
                      >
                        {claimed ? "Claimed" : "Claim"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-8">
          <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-display md:text-3xl">Diaspora Support</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Create verified beneficiary profiles and keep transparent support history for family, school, rent, health, or business needs.
              </p>
            </div>
            <Icons8Icon name="group" size={26} className="shrink-0 text-[var(--color-accent-primary)]" />
          </div>
          <div className="grid gap-2 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
            <input
              value={beneficiaryName}
              onChange={(event) => setBeneficiaryName(event.target.value)}
              className="h-11 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-sm focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
              placeholder="Beneficiary name"
            />
            <select
              value={beneficiaryPurpose}
              onChange={(event) => setBeneficiaryPurpose(event.target.value)}
              className="h-11 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 text-sm focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
            >
              <option>School fees</option>
              <option>Rent</option>
              <option>Food</option>
              <option>Health</option>
              <option>Business</option>
            </select>
            <button type="button" className="btn-primary min-h-11 w-full text-sm" onClick={createBeneficiary}>
              Add Beneficiary
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {supportBeneficiaries.length === 0 ? (
              <p className="rounded-[5px] bg-[var(--color-bg-secondary)] p-3 text-sm text-[var(--color-text-secondary)]">
                No support beneficiaries yet.
              </p>
            ) : (
              supportBeneficiaries.map((beneficiary) => (
                <div key={beneficiary.id} className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                  <div className="flex min-w-0 justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{beneficiary.beneficiary_name}</p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        {beneficiary.purpose} • {beneficiary.support_mode === "repayment" ? "repayable" : "support only"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-black text-[var(--color-positive-text)]">
                      ₦{Number(beneficiary.last_support_amount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      type="number"
                      value={supportAmounts[beneficiary.id] || ""}
                      onChange={(event) => setSupportAmounts((current) => ({ ...current, [beneficiary.id]: event.target.value }))}
                      className="h-10 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 font-mono text-sm focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                      placeholder="Support amount"
                    />
                    <button type="button" className="btn-primary min-h-10 px-4 text-xs" onClick={() => recordBeneficiarySupport(beneficiary)}>
                      Record
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
