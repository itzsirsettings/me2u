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
import TransactionPinPrompt from "@/components/TransactionPinPrompt";

const walletServices: Array<{ id: string; label: string; detail: string; icon: Icons8IconName }> = [
  { id: "airtime", label: "Airtime", detail: "Top up any network instantly", icon: "phone" },
  { id: "data", label: "Data", detail: "Buy internet bundles", icon: "globe" },
  { id: "electricity", label: "Electricity", detail: "Prepaid and postpaid tokens", icon: "bill" },
];

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

  const fundWallet = useStore((state) => state.fundWallet);
  const confirmRegistrationDeposit = useStore((state) => state.confirmRegistrationDeposit);
  const payBill = useStore((state) => state.payBill);
  const user = useStore((state) => state.user);
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

  const handlePayBillClick = () => {
    if (!user) return;
    const numAmount = Number(serviceAmount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!servicePhone.trim()) {
      toast.error("Please enter the required details");
      return;
    }
    setIsPinPromptOpen(true);
  };

  const executePayBill = async () => {
    if (!user) return;
    const numAmount = Number(serviceAmount);
    
    const serviceName = walletServices.find(s => s.id === selectedService)?.label || "Bill";
    const result = await payBill(numAmount, serviceName, `${serviceProvider} - ${servicePhone}`);
    
    if (!result.ok) {
      toast.error(result.error || "Unable to complete transaction");
      return;
    }
    
    toast.success(`${serviceName} purchase successful!`);
    setSelectedService(null);
    setServiceAmount("");
    setServicePhone("");
    setIsPinPromptOpen(false);
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
              <span className="shrink-0 rounded-[50px] border border-[var(--color-border)] bg-[var(--color-warning-bg)] px-3 py-1 text-xs font-bold uppercase text-[var(--color-warning-text)]">
                Required
              </span>
            </div>

            <div className="space-y-4">
              <div className="rounded-[50px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-4.5 px-6 text-sm">
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
                  className="w-full rounded-[50px] border border-[var(--color-border)] bg-[var(--color-bg-card)] py-4 px-6 font-sans text-base focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
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
                    className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[50px] border border-[var(--color-border)] bg-[var(--color-bg-card)] py-4 transition-colors hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
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
          <div className="mb-4 rounded-[50px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] py-4 px-6 text-sm md:p-4">
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
              className="w-full rounded-[50px] border border-[var(--color-border)] bg-[var(--color-bg-card)] py-4 px-6 font-mono text-xl focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none md:text-2xl"
            />
          </div>

          <div className="mb-4 md:mb-8">
            <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Transfer Reference</label>
            <input
              type="text"
              placeholder="Bank or Opay receipt reference"
              value={fundingReference}
              onChange={(e) => setFundingReference(e.target.value)}
              className="w-full rounded-[50px] border border-[var(--color-border)] bg-[var(--color-bg-card)] py-4 px-6 font-sans text-base focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
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
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[50px] border border-[var(--color-border)] bg-[var(--color-bg-card)] py-4 transition-colors hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
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
                className={`flex min-w-0 items-center gap-3 rounded-[50px] border py-3.5 pl-6 pr-4 text-left transition ${
                  selectedService === service.id 
                    ? "border-[var(--color-accent-primary)] bg-[var(--color-hover-soft)] shadow-inner" 
                    : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-hover-soft)]"
                }`}
                onClick={() => {
                  setSelectedService(service.id);
                  setServiceProvider(service.id === "electricity" ? "Ikeja Electric" : "MTN");
                }}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-bg-card)] text-[var(--color-accent-primary)]">
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
                <div className="space-y-4 rounded-[50px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
                  <div>
                    <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Provider
                    </label>
                    <select
                      className="h-11 w-full rounded-[50px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 font-sans focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                      value={serviceProvider}
                      onChange={(e) => setServiceProvider(e.target.value)}
                    >
                      {selectedService === "electricity" ? (
                        <>
                          <option value="Ikeja Electric">Ikeja Electric (IKEDC)</option>
                          <option value="Eko Electric">Eko Electric (EKEDC)</option>
                          <option value="Abuja Electric">Abuja Electric (AEDC)</option>
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
                      className="w-full rounded-[50px] border border-[var(--color-border)] bg-[var(--color-bg-card)] py-4 px-6 font-mono focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Amount (₦)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={serviceAmount}
                      onChange={(e) => setServiceAmount(e.target.value)}
                      className="w-full rounded-[50px] border border-[var(--color-border)] bg-[var(--color-bg-card)] py-4 px-6 font-mono focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                    />
                  </div>
                  
                  <div className="pt-2 w-full [&>button]:w-full">
                    <LoadingButton
                      label={`Pay ₦${serviceAmount || "0"}`}
                      loadingText="Processing..."
                      successText="Successful!"
                      disabled={!serviceAmount || !servicePhone || !user?.kycVerified}
                      onClick={handlePayBillClick}
                    />
                    {!user?.kycVerified && (
                      <p className="mt-2 text-xs text-center text-[var(--color-warning-text)]">Complete KYC to unlock bill payments.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      <TransactionPinPrompt
        isOpen={isPinPromptOpen}
        onSuccess={executePayBill}
        onCancel={() => setIsPinPromptOpen(false)}
        title="Pay Bill"
        description={`Enter PIN to confirm ₦${serviceAmount} payment for ${walletServices.find(s => s.id === selectedService)?.label}.`}
      />
    </motion.div>
  );
}
