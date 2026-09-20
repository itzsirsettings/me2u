"use client";

import { Card } from "@/components/ui/card";
import Me2uIcon from "@/components/Me2uIcon";
import { registrationDepositAmount, getSecurityDeposit } from "@/lib/loans";
import { useStore } from "@/lib/store";
import { useState, useEffect } from "react";
import LoadingButton from "@/LoadingButton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { authorizedFetch } from "@/lib/fetch";

type RegistrationDepositAccount = {
  bank: string;
  name: string;
  number: string;
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

type QuickLink = {
  label: string;
  description: string;
  path: string;
  icon: "savings" | "group" | "deal" | "family";
  tone: string;
};

const quickLinks: QuickLink[] = [
  {
    label: "Savings Goals",
    description: "Set targets and lock funds until you reach them.",
    path: "/savings",
    icon: "savings",
    tone: "text-[var(--color-accent-primary)]",
  },
  {
    label: "Me2U Circles",
    description: "Pool funds with trusted people and borrow at 0%.",
    path: "/circles",
    icon: "group",
    tone: "text-[var(--color-positive-text)]",
  },
  {
    label: "Merchant Deals",
    description: "Exclusive discounts from partner merchants.",
    path: "/deals",
    icon: "deal",
    tone: "text-[var(--color-warning-text)]",
  },
];

export default function WalletPage() {
  const [registrationReference, setRegistrationReference] = useState("");
  const [regReceiptFile, setRegReceiptFile] = useState<File | null>(null);
  const [registrationAccount, setRegistrationAccount] =
    useState<RegistrationDepositAccount | null>(null);
  const [isLoadingRegistrationAccount, setIsLoadingRegistrationAccount] = useState(false);

  const confirmRegistrationDeposit = useStore((state) => state.confirmRegistrationDeposit);
  const user = useStore((state) => state.user);
  const activeLoans = useStore((state) => state.activeLoans);
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

  const registrationProofReady =
    Boolean(registrationAccount) &&
    registrationReference.trim().length >= 4 &&
    Boolean(regReceiptFile);

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
    toast.success(
      "Receipt submitted! After approval, your dedicated wallet account will be created.",
    );
    setRegistrationReference("");
    setRegReceiptFile(null);
  };

  const showRegistrationAccount = async () => {
    setIsLoadingRegistrationAccount(true);
    try {
      const response = await authorizedFetch("/api/onboarding/registration-deposit");
      const data = (await response.json()) as {
        account?: RegistrationDepositAccount;
        error?: string;
      };
      if (!response.ok || !data.account) {
        throw new Error(data.error || "Unable to load registration payment details.");
      }
      setRegistrationAccount(data.account);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load registration payment details.",
      );
    } finally {
      setIsLoadingRegistrationAccount(false);
    }
  };

  return (
    <motion.div
      className="app-mobile-screen mx-auto flex w-full max-w-md flex-col items-center px-3.5 pt-[4.85rem] md:max-w-3xl md:px-6 md:py-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.h1
        variants={itemVariants}
        className="sr-only md:not-sr-only md:mb-12 md:text-7xl md:font-display md:leading-[0.85] md:tracking-tighter"
      >
        Wallet
      </motion.h1>

      <motion.div variants={itemVariants} className="w-full space-y-4 md:space-y-6">
        {/* Locked balance breakdown */}
        {user && user.locked > 0 && (
          <Card className="kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
                <Me2uIcon name="shield" size={22} />
              </div>
              <div>
                <h2 className="text-lg font-display leading-none">Locked Balance</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  ₦{user.locked.toLocaleString()} held
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {(() => {
                const loanDeposits = activeLoans
                  .filter(
                    (l) =>
                      l.role === "borrower" && l.status === "active" && l.securityDeposit > 0,
                  )
                  .map((l) => ({
                    id: l.id,
                    source: l.source,
                    amount: l.securityDeposit,
                    dueDate: l.dueDate,
                  }));
                const otherLocked =
                  user.locked - loanDeposits.reduce((sum, d) => sum + d.amount, 0);
                return (
                  <>
                    {loanDeposits.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-[5px] bg-[var(--color-bg-secondary)] p-3 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-[var(--color-text-primary)]">
                            Security Deposit
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {d.source === "platform" ? "Platform" : "Peer"} loan · Due{" "}
                            {new Date(d.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="font-mono font-semibold text-[var(--color-accent-primary)]">
                          ₦{d.amount.toLocaleString()}
                        </p>
                      </div>
                    ))}
                    {otherLocked > 0 && (
                      <div className="flex items-center justify-between rounded-[5px] bg-[var(--color-bg-secondary)] p-3 text-sm">
                        <div>
                          <p className="font-semibold text-[var(--color-text-primary)]">
                            Other Locked
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            Savings goals or pending transactions
                          </p>
                        </div>
                        <p className="font-mono font-semibold text-[var(--color-text-secondary)]">
                          ₦{otherLocked.toLocaleString()}
                        </p>
                      </div>
                    )}
                    <p className="pt-1 text-xs text-[var(--color-text-secondary)]">
                      Security deposits return to your usable balance when you repay on time.
                    </p>
                  </>
                );
              })()}
            </div>
          </Card>
        )}

        {/* Registration deposit */}
        {!user?.registrationDepositPaid && (
          <Card className="kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-8">
            <div className="mb-5 flex min-w-0 items-start justify-between gap-4 border-b border-[var(--color-border)] pb-5">
              <div className="min-w-0">
                <h2 className="text-xl font-display md:text-3xl">Registration Deposit</h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  Submit the ₦{registrationDepositAmount.toLocaleString()} deposit proof, then
                  complete KYC to unlock full access.
                </p>
              </div>
              <span className="shrink-0 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-warning-bg)] px-3 py-1 text-xs font-bold uppercase text-[var(--color-warning-text)]">
                Required
              </span>
            </div>

            <div className="space-y-4">
              {!registrationAccount ? (
                <button
                  type="button"
                  onClick={showRegistrationAccount}
                  disabled={isLoadingRegistrationAccount}
                  className="btn-secondary min-h-11 w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoadingRegistrationAccount
                    ? "Loading payment details..."
                    : "View payment account details"}
                </button>
              ) : (
                <div className="rounded-[5px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm">
                  <div className="grid gap-2">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="shrink-0 text-[var(--color-text-secondary)]">Bank</span>
                      <span className="overflow-anywhere min-w-0 text-right font-semibold">
                        {registrationAccount.bank}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="shrink-0 text-[var(--color-text-secondary)]">
                        Account Name
                      </span>
                      <span className="overflow-anywhere min-w-0 text-right font-semibold">
                        {registrationAccount.name}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="shrink-0 text-[var(--color-text-secondary)]">
                        Account Number
                      </span>
                      <span className="overflow-anywhere min-w-0 text-right font-mono font-semibold">
                        {registrationAccount.number}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {registrationAccount && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Payment Reference
                    </label>
                    <input
                      type="text"
                      placeholder="Bank transfer reference"
                      value={registrationReference}
                      onChange={(e) => setRegistrationReference(e.target.value)}
                      className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 font-sans text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Proof of Payment
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) setRegReceiptFile(e.target.files[0]);
                      }}
                      className="hidden"
                      id="reg-receipt-upload"
                    />
                    <label
                      htmlFor="reg-receipt-upload"
                      className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] py-4 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                    >
                      {regReceiptFile ? (
                        <span className="text-sm font-medium text-[var(--color-positive-text)]">
                          {regReceiptFile.name}
                        </span>
                      ) : (
                        <span className="text-sm font-medium">Click to upload screenshot</span>
                      )}
                    </label>
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
                </>
              )}
            </div>
          </Card>
        )}

        {/* Quick links to dedicated feature pages */}
        <div className="grid gap-3">
          {quickLinks.map((link) => (
            <button
              key={link.path}
              type="button"
              onClick={() => router.push(link.path)}
              className="mobile-soft-card flex min-w-0 items-center justify-between gap-4 rounded-[18px] p-4 text-left transition active:scale-[0.99] hover:bg-[var(--color-hover-soft)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--mobile-surface-muted)] ${link.tone}`}
                >
                  <Me2uIcon name={link.icon} size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-[var(--color-text-primary)]">
                    {link.label}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-secondary)] leading-snug">
                    {link.description}
                  </p>
                </div>
              </div>
              <Me2uIcon
                name="back"
                size={16}
                className="shrink-0 rotate-180 text-[var(--color-text-secondary)]"
              />
            </button>
          ))}
        </div>

        {/* Bills redirect */}
        <Card className="kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-8">
          <div className="mb-4 flex min-w-0 items-start justify-between gap-3 md:mb-6">
            <div className="min-w-0">
              <h2 className="text-xl font-display md:text-3xl">Pay Bills</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Bill payments are coming soon. Airtime, data, electricity, and cable TV are
                launching together in the next phase.
              </p>
            </div>
            <Me2uIcon
              name="bill"
              size={26}
              className="shrink-0 text-[var(--color-accent-primary)]"
            />
          </div>
          <div className="grid gap-3 rounded-[5px] bg-[var(--color-bg-secondary)] p-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              VTpass-powered fulfilment with automatic refunds on failure — arriving soon.
            </p>
            <button
              type="button"
              className="btn-ghost min-h-11 px-5 text-sm font-bold"
              onClick={() => router.push("/bills")}
            >
              Preview Bills
            </button>
          </div>
        </Card>
      </motion.div>

      <div className="h-24" />
    </motion.div>
  );
}
