"use client";

import { motion, type Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";

import Me2uIcon from "@/components/Me2uIcon";
import { ReferenceScreen } from "@/components/reference/ReferenceUI";
import { Card } from "@/components/ui/card";
import { authorizedFetch } from "@/lib/fetch";
import { registrationDepositAmount } from "@/lib/loans";
import {
  readPaystackRegistrationTransfer,
  readPaystackRegistrationTransferError,
  readPaystackRegistrationTransferReference,
  type PaystackRegistrationTransfer,
} from "@/lib/paystack-registration";
import { useStore } from "@/lib/store";
import LoadingButton from "@/LoadingButton";

type RegistrationDepositAccount = {
  bank: string;
  name: string;
  number: string;
};

const showPayBillsSection = false;
const subscribeToNoChanges = () => () => {};

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
  const [registrationMethod, setRegistrationMethod] = useState<"paystack" | "manual">(
    "paystack",
  );
  const [paystackTransfer, setPaystackTransfer] = useState<PaystackRegistrationTransfer | null>(
    null,
  );
  const [pendingPaystackReference, setPendingPaystackReference] = useState("");
  const [startingPaystackTransfer, setStartingPaystackTransfer] = useState(false);

  const confirmRegistrationDeposit = useStore((state) => state.confirmRegistrationDeposit);
  const loadCurrentUser = useStore((state) => state.loadCurrentUser);
  const user = useStore((state) => state.user);
  const activeLoans = useStore((state) => state.activeLoans);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const router = useRouter();
  const mounted = useSyncExternalStore(
    subscribeToNoChanges,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  const userId = user?.id;
  const registrationDepositPaid = user?.registrationDepositPaid;

  useEffect(() => {
    if (!mounted || !userId || registrationDepositPaid) return;
    let active = true;
    void authorizedFetch("/api/onboarding/registration-deposit/paystack")
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!response.ok || !active) return;
        const payment = readPaystackRegistrationTransfer(data);
        if (payment) {
          setPaystackTransfer(payment);
          if (payment.status === "success") await loadCurrentUser();
        } else if (response.status === 202) {
          const reference = readPaystackRegistrationTransferReference(data);
          if (reference) setPendingPaystackReference(reference);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [mounted, userId, registrationDepositPaid, loadCurrentUser]);

  const paystackReference = paystackTransfer?.reference || pendingPaystackReference;
  const paystackStatus = pendingPaystackReference ? "initializing" : paystackTransfer?.status;
  useEffect(() => {
    if (!paystackReference || !["initializing", "pending"].includes(paystackStatus || ""))
      return;
    let active = true;
    const checkPayment = async () => {
      try {
        const response = await authorizedFetch(
          `/api/onboarding/registration-deposit/paystack?reference=${encodeURIComponent(paystackReference)}`,
        );
        const data: unknown = await response.json();
        if (!response.ok || !active) return;
        const payment = readPaystackRegistrationTransfer(data);
        if (!payment || !active) return;
        setPaystackTransfer(payment);
        setPendingPaystackReference("");
        if (payment.status === "success") {
          toast.success("Registration deposit confirmed.");
          await loadCurrentUser();
        }
      } catch {
        // Keep the transfer instructions available while a status check retries.
      }
    };
    const interval = window.setInterval(
      () => void checkPayment(),
      paystackStatus === "initializing" ? 10_000 : 30_000,
    );
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [paystackReference, paystackStatus, loadCurrentUser]);

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

  const startPaystackTransfer = async () => {
    setStartingPaystackTransfer(true);
    try {
      const response = await authorizedFetch("/api/onboarding/registration-deposit/paystack", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data: unknown = await response.json();
      let payment = readPaystackRegistrationTransfer(data);
      const reference = readPaystackRegistrationTransferReference(data);
      if (!payment && response.status === 202 && reference) {
        for (let attempt = 0; attempt < 10; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 2_000));
          const statusResponse = await authorizedFetch(
            `/api/onboarding/registration-deposit/paystack?reference=${encodeURIComponent(reference)}`,
          );
          const statusData: unknown = await statusResponse.json();
          payment = readPaystackRegistrationTransfer(statusData);
          if (payment) break;
          if (!statusResponse.ok && statusResponse.status !== 202) {
            throw new Error(
              readPaystackRegistrationTransferError(statusData, statusResponse.status),
            );
          }
        }
      }
      if (!response.ok || !payment) {
        if (response.status === 202 && reference) {
          setPendingPaystackReference(reference);
          toast.info(
            "Your transfer details are still being prepared. Keep this page open; you do not need to click again.",
          );
          return;
        }
        throw new Error(readPaystackRegistrationTransferError(data, response.status));
      }
      setPendingPaystackReference("");
      setPaystackTransfer(payment);
      if (payment.status === "success") await loadCurrentUser();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start Paystack Transfer.",
      );
    } finally {
      setStartingPaystackTransfer(false);
    }
  };

  return (
    <ReferenceScreen kind="home">
      <motion.div
        className="wallet-reference-content"
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

        <motion.div variants={itemVariants} className="wallet-sections">
          {/* Locked balance breakdown */}
          {user && user.locked > 0 && (
            <Card className="design-card wallet-panel p-5 md:p-6">
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
            <Card className="design-card wallet-panel p-5 md:p-8">
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
                <fieldset>
                  <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Payment method
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-pressed={registrationMethod === "paystack"}
                      onClick={() => setRegistrationMethod("paystack")}
                      className={`min-h-11 rounded-[8px] border px-3 text-sm font-semibold ${registrationMethod === "paystack" ? "border-[var(--color-accent-primary)] bg-[var(--color-positive-bg)]" : "border-[var(--color-border)]"}`}
                    >
                      Paystack Transfer
                    </button>
                    <button
                      type="button"
                      aria-pressed={registrationMethod === "manual"}
                      onClick={() => setRegistrationMethod("manual")}
                      className={`min-h-11 rounded-[8px] border px-3 text-sm font-semibold ${registrationMethod === "manual" ? "border-[var(--color-accent-primary)] bg-[var(--color-positive-bg)]" : "border-[var(--color-border)]"}`}
                    >
                      Bank transfer
                    </button>
                  </div>
                </fieldset>

                {registrationMethod === "paystack" ? (
                  <div className="space-y-4">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Create a secure, one-time ₦{registrationDepositAmount.toLocaleString()}{" "}
                      transfer account. Me2U checks payment status here automatically. Complete
                      the bank transfer using your banking app, then return here for
                      confirmation.
                    </p>
                    {!paystackTransfer ? (
                      <button
                        type="button"
                        onClick={() => void startPaystackTransfer()}
                        disabled={startingPaystackTransfer || Boolean(pendingPaystackReference)}
                        className="btn-primary min-h-11 w-full disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {startingPaystackTransfer
                          ? "Preparing Paystack Transfer…"
                          : pendingPaystackReference
                            ? "Transfer details are being prepared"
                            : "Get Paystack transfer details"}
                      </button>
                    ) : (
                      <div className="space-y-3 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                        <div role="status" aria-live="polite" className="text-sm font-semibold">
                          {paystackTransfer.status === "pending" && "Waiting for your transfer"}
                          {paystackTransfer.status === "success" && "Payment confirmed"}
                          {paystackTransfer.status === "failed" &&
                            "Transfer failed or was cancelled"}
                          {paystackTransfer.status === "expired" && "Transfer account expired"}
                          {paystackTransfer.status === "review" &&
                            "Payment needs support review"}
                          {paystackTransfer.status === "initializing" &&
                            "Preparing transfer details"}
                        </div>
                        {paystackTransfer.status === "pending" && (
                          <>
                            <div className="grid gap-2 text-sm">
                              <p>
                                <span className="text-[var(--color-text-secondary)]">
                                  Amount:{" "}
                                </span>
                                ₦{registrationDepositAmount.toLocaleString()}
                              </p>
                              <p>
                                <span className="text-[var(--color-text-secondary)]">
                                  Bank:{" "}
                                </span>
                                {paystackTransfer.bankName}
                              </p>
                              <p>
                                <span className="text-[var(--color-text-secondary)]">
                                  Account name:{" "}
                                </span>
                                {paystackTransfer.accountName}
                              </p>
                              <p className="font-mono">
                                <span className="font-sans text-[var(--color-text-secondary)]">
                                  Account number:{" "}
                                </span>
                                {paystackTransfer.accountNumber}
                              </p>
                              <p className="font-mono">
                                <span className="font-sans text-[var(--color-text-secondary)]">
                                  Transfer narration/reference:{" "}
                                </span>
                                {paystackTransfer.transactionReference}
                              </p>
                              <p className="text-xs text-[var(--color-text-secondary)]">
                                Expires{" "}
                                {new Date(paystackTransfer.expiresAt).toLocaleString("en-NG", {
                                  timeZone: "Africa/Lagos",
                                })}{" "}
                                WAT. Send the exact amount shown above.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                void navigator.clipboard
                                  .writeText(paystackTransfer.accountNumber)
                                  .then(() => toast.success("Account number copied."))
                                  .catch(() =>
                                    toast.error("Could not copy the account number."),
                                  );
                              }}
                              className="btn-secondary min-h-10 w-full"
                            >
                              Copy account number
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void navigator.clipboard
                                  .writeText(paystackTransfer.transactionReference)
                                  .then(() => toast.success("Transfer reference copied."))
                                  .catch(() =>
                                    toast.error("Could not copy the transfer reference."),
                                  );
                              }}
                              className="btn-secondary min-h-10 w-full"
                            >
                              Copy transfer reference
                            </button>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              This page checks for payment automatically. Do not submit a
                              receipt for this Paystack transfer.
                            </p>
                          </>
                        )}
                        {(paystackTransfer.status === "failed" ||
                          paystackTransfer.status === "expired") && (
                          <button
                            type="button"
                            onClick={() => setPaystackTransfer(null)}
                            className="btn-secondary min-h-10 w-full"
                          >
                            Start a new transfer
                          </button>
                        )}
                        {paystackTransfer.status === "review" && (
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            Contact support from the app and include reference{" "}
                            {paystackTransfer.reference}.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : !registrationAccount ? (
                  <button
                    type="button"
                    onClick={() => void showRegistrationAccount()}
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
                        <span className="shrink-0 text-[var(--color-text-secondary)]">
                          Bank
                        </span>
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
                          <span className="text-sm font-medium">
                            Click to upload screenshot
                          </span>
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
                className="design-card wallet-quick-link flex min-w-0 items-center justify-between gap-4 rounded-[18px] p-4 text-left transition active:scale-[0.99] hover:bg-[var(--color-hover-soft)]"
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

          {showPayBillsSection && (
            <Card className="design-card wallet-panel p-5 md:p-8">
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
          )}
        </motion.div>

        <div className="h-24" />
      </motion.div>
    </ReferenceScreen>
  );
}
