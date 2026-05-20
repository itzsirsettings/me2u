"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import LoadingButton from "@/LoadingButton";
import Icons8Icon, { type Icons8IconName } from "@/components/Icons8Icon";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { loanDurationMaxDays, loanDurationMinDays } from "@/lib/loans";
import {
  isMarketplaceBoostActive,
  marketplaceBoostDurationHours,
  marketplaceBoostFeeAmount,
} from "@/lib/revenue";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type ListingType = "borrow_request" | "lending_offer";

const protectionSteps: Array<{ title: string; detail: string; icon: Icons8IconName }> = [
  { title: "Agreement summary", detail: "Review amount, 0% interest, duration, and role before acceptance.", icon: "receipt" },
  { title: "Locked funding record", detail: "Funding, repayment, and wallet movements stay traceable in the app.", icon: "shield" },
  { title: "Repayment countdown", detail: "Due dates and reminders keep both sides aligned.", icon: "loans" },
  { title: "Dispute evidence", detail: "Receipts and proof uploads support admin review if a loan goes wrong.", icon: "certificate" },
  { title: "Downloadable summary", detail: "Save a clear copy of the loan terms before confirmation.", icon: "download" },
];

const circleTypes = [
  "Family Circle",
  "Business Circle",
  "Student Circle",
  "Church Circle",
  "Trader Circle",
  "Freelancer Circle",
];

export default function Marketplace() {
  const marketplace = useStore((state) => state.marketplace);
  const acceptMarketplaceItem = useStore((state) => state.acceptMarketplaceItem);
  const createMarketplaceItem = useStore((state) => state.createMarketplaceItem);
  const user = useStore((state) => state.user);
  const toggleGroupLending = useStore((state) => state.toggleGroupLending);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingAgreementId, setPendingAgreementId] = useState<string | null>(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [formData, setFormData] = useState({
    type: "borrow_request" as ListingType,
    amount: 10000,
    rate: 0,
    days: loanDurationMaxDays,
    boost: false,
  });

  const [circles, setCircles] = useState<any[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");
  const [selectedCircle, setSelectedCircle] = useState<any | null>(null);
  const [circleAction, setCircleAction] = useState<"contribute" | "borrow" | null>(null);
  const [actionAmount, setActionAmount] = useState(5000);
  const [circlePin, setCirclePin] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [togglingGroupLending, setTogglingGroupLending] = useState(false);

  const authorizedFetch = useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Please log in first.");
    }

    return fetch(input, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  }, []);

  const fetchCircles = useCallback(async () => {
    try {
      setCirclesLoading(true);
      const res = await authorizedFetch("/api/circles");
      const data = await res.json();
      if (data.ok) {
        setCircles(data.circles || []);
      } else {
        toast.error(data.error || "Unable to load circles.");
      }
    } catch (err) {
      console.error("Error fetching circles:", err);
    } finally {
      setCirclesLoading(false);
    }
  }, [authorizedFetch]);

  useEffect(() => {
    if (user?.groupLendingEnabled) {
      fetchCircles().catch(() => {});
    }
  }, [fetchCircles, user?.groupLendingEnabled]);

  useEffect(() => {
    if (!user?.groupLendingEnabled) return;

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("me2u-circles-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "circles" },
        () => {
          fetchCircles().catch(() => {});
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCircles, user?.groupLendingEnabled]);

  const handleToggleGroupLending = async () => {
    setTogglingGroupLending(true);
    try {
      const res = await toggleGroupLending();
      if (res.ok) {
        toast.success(
          user?.groupLendingEnabled
            ? "Group lending disabled."
            : "Group lending enabled successfully! Welcome to Circles."
        );
      } else {
        toast.error(res.error || "Failed to toggle group lending.");
      }
    } catch (err) {
      toast.error("An error occurred while toggling group lending.");
    } finally {
      setTogglingGroupLending(false);
    }
  };

  const handleCreateCircle = async () => {
    if (!newCircleName.trim()) {
      toast.error("Please enter a circle name.");
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await authorizedFetch("/api/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: newCircleName }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Circle "${newCircleName}" created!`);
        setNewCircleName("");
        setShowCreateModal(false);
        fetchCircles().catch(() => {});
      } else {
        toast.error(data.error || "Failed to create circle.");
      }
    } catch (err) {
      toast.error("An error occurred while creating the circle.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCircleAction = async () => {
    if (!selectedCircle || !circleAction) return;
    if (actionAmount <= 0) {
      toast.error("Please enter a positive amount.");
      return;
    }
    if (!user?.transactionPin) {
      toast.error("Set a transaction PIN before using circle funds.");
      router.push("/security");
      return;
    }
    if (!/^\d{4}$/.test(circlePin)) {
      toast.error("Enter your 4-digit transaction PIN.");
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await authorizedFetch("/api/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: circleAction,
          circleId: selectedCircle.id,
          amount: actionAmount,
          pin: circlePin,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(
          circleAction === "contribute"
            ? `Successfully contributed ₦${actionAmount.toLocaleString()} to ${selectedCircle.name}`
            : `Successfully borrowed ₦${actionAmount.toLocaleString()} from ${selectedCircle.name}`
        );
        setSelectedCircle(null);
        setCircleAction(null);
        setCirclePin("");
        fetchCircles().catch(() => {});
        // Load user again to refresh balance
        useStore.getState().loadCurrentUser().catch(() => {});
      } else {
        toast.error(data.error || `Failed to ${circleAction}.`);
      }
    } catch (err) {
      toast.error(`An error occurred during the ${circleAction}.`);
    } finally {
      setSubmittingAction(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  if (!mounted || (!isAuthenticated && !isLoading)) return null;
  const pendingAgreement = marketplace.find((item) => item.id === pendingAgreementId) || null;
  const isFundingBorrowRequest = pendingAgreement?.type === "borrow_request";
  const lenderName = pendingAgreement
    ? isFundingBorrowRequest
      ? user?.name || "You"
      : pendingAgreement.authorName
    : "";
  const borrowerName = pendingAgreement
    ? isFundingBorrowRequest
      ? pendingAgreement.authorName
      : user?.name || "You"
    : "";
  const lenderTrustScore = pendingAgreement
    ? isFundingBorrowRequest
      ? user?.trustScore || 0
      : pendingAgreement.trustScore
    : 0;
  const borrowerTrustScore = pendingAgreement
    ? isFundingBorrowRequest
      ? pendingAgreement.trustScore
      : user?.trustScore || 0
    : 0;
  const repaymentDate = pendingAgreement
    ? new Date(Date.now() + pendingAgreement.days * 86_400_000).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  const handleCreate = async () => {
    if (isCreating) return;
    if (!user) {
      toast.error("Please login to create an offer");
      return;
    }
    if (
      formData.amount < 1000 ||
      formData.days < loanDurationMinDays ||
      formData.days > loanDurationMaxDays
    ) {
      toast.error(`Enter an amount from ₦1,000 and duration from ${loanDurationMinDays} to ${loanDurationMaxDays} days.`);
      return;
    }

    if (formData.boost && user.balance < marketplaceBoostFeeAmount) {
      toast.error(`Fund your wallet first. The listing boost costs ₦${marketplaceBoostFeeAmount.toLocaleString()}.`);
      return;
    }

    setIsCreating(true);
    try {
      const result = await createMarketplaceItem({ ...formData, rate: 0 });
      if (!result.ok) {
        toast.error(result.error || "Unable to create listing");
        throw new Error("Unable to create");
      }

      toast.success("Listing created successfully!");
      setShowForm(false);
      setFormData((current) => ({ ...current, boost: false }));
    } finally {
      setIsCreating(false);
    }
  };

  const handleAccept = async (itemId: string, amount: number, type: string) => {
    if (!user) {
      toast.error("Please login to accept offers");
      return;
    }
    if (type === "borrow_request" && user.balance < amount) {
      toast.error("Insufficient balance to fund this loan.");
      return;
    }

    const result = await acceptMarketplaceItem(itemId);
    if (!result.ok) {
      toast.error(result.error || "Unable to accept this listing");
      throw new Error("Unable to accept");
    }

    toast.success("Transaction successful!");
  };

  const confirmAgreement = async () => {
    if (!pendingAgreement) return;
    if (!agreementAccepted) {
      toast.error("Review and accept the loan agreement summary first.");
      return;
    }

    await handleAccept(pendingAgreement.id, pendingAgreement.amount, pendingAgreement.type);
    setPendingAgreementId(null);
    setAgreementAccepted(false);
  };

  const downloadAgreementSummary = () => {
    if (!pendingAgreement) return;

    const lines = [
      "Me2U Loan Agreement Summary",
      `Listing: ${pendingAgreement.type.replaceAll("_", " ")}`,
      `Amount: NGN ${pendingAgreement.amount.toLocaleString()}`,
      "Interest: 0%",
      `Duration: ${pendingAgreement.days} days`,
      `Repayment date: ${repaymentDate}`,
      "Wallet retention rule: borrower keeps the required retained balance while the loan is active.",
      "Late repayment consequence: late repayment may reduce trust score, limit marketplace access, and trigger review.",
      `Lender: ${lenderName} (${lenderTrustScore}/100 trust)`,
      `Borrower: ${borrowerName} (${borrowerTrustScore}/100 trust)`,
      "Agreement: both parties should keep lending, repayment, receipts, and disputes inside Me2U.",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `me2u-loan-agreement-${pendingAgreement.id}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Agreement summary downloaded.");
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
      className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[4.85rem] md:max-w-5xl md:px-6 md:py-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="mb-4 flex min-w-0 flex-col gap-3 md:mb-12 md:flex-row md:items-center md:justify-between md:gap-6">
        <h1 className="sr-only md:not-sr-only md:text-7xl md:font-display md:leading-[0.85] md:tracking-tighter">Marketplace</h1>
        <button className={`${showForm ? "btn-ghost" : "btn-primary"} h-11 w-full md:h-12 md:w-auto`} onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Create Listing"}
        </button>
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="mb-5 glass kinetic-border p-4 bg-[var(--color-bg-secondary)] md:mb-12 md:p-8">
              <h2 className="mb-4 text-xl font-display md:mb-6 md:text-3xl">Create New Listing</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleCreate().catch(()=>{}); }} className="grid gap-3.5 md:grid-cols-2 md:gap-6">
                <div>
                  <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Type</label>
                  <select
                    className="h-11 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 font-sans focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none md:h-12"
                    value={formData.type}
                    title="Listing Type"
                    onChange={(e) => {
                      const nextType = e.target.value;
                      if (nextType === "borrow_request" || nextType === "lending_offer") {
                        setFormData({ ...formData, type: nextType, boost: nextType === "borrow_request" ? formData.boost : false });
                      }
                    }}
                  >
                    <option value="borrow_request">I want to Borrow</option>
                    <option value="lending_offer">I want to Lend</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Amount (₦)</label>
                  <input
                    type="number"
                    min="1000"
                    className="h-11 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 font-mono focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none md:h-12"
                    value={formData.amount}
                    title="Amount"
                    placeholder="Enter amount"
                    onChange={(e) =>
                      setFormData({ ...formData, amount: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="rounded-[5px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
                  <p className="mb-1 text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Interest</p>
                  <p className="font-mono text-xl text-[var(--color-positive-text)]">0%</p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">All me2u loans are interest-free.</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Duration (Days)</label>
                  <input
                    type="number"
                    min={loanDurationMinDays}
                    max={loanDurationMaxDays}
                    className="h-11 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 font-mono focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none md:h-12"
                    value={formData.days}
                    title="Duration in Days"
                    placeholder="Days"
                    onChange={(e) =>
                      setFormData({ ...formData, days: Number(e.target.value) })
                    }
                  />
                </div>
                {formData.type === "borrow_request" && (
                  <label className="md:col-span-2 flex min-w-0 cursor-pointer items-start gap-3 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
                    <input
                      type="checkbox"
                      checked={formData.boost}
                      onChange={(e) => setFormData({ ...formData, boost: e.target.checked })}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent-primary)]"
                    />
                    <span className="min-w-0 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      <b className="block text-[var(--color-text-primary)]">Promote for ₦{marketplaceBoostFeeAmount.toLocaleString()}</b>
                      Keep this borrow request near the top for {marketplaceBoostDurationHours} hours. Promotion improves visibility but does not guarantee funding.
                    </span>
                  </label>
                )}
                <div className="md:col-span-2 mt-4">
                  <LoadingButton
                    label="Publish Listing"
                    loadingText="Publishing..."
                    successText="Published!"
                    onClick={handleCreate}
                  />
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={itemVariants} className="mb-4 grid gap-4 md:mb-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-6">
          <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-display leading-none md:text-3xl">Protected Peer Lending</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Review the terms, keep records, and handle repayment or disputes inside one flow.
              </p>
            </div>
            <Icons8Icon name="shield" size={28} className="shrink-0 text-[var(--color-accent-primary)]" />
          </div>
          <div className="grid gap-2">
            {protectionSteps.map((step) => (
              <div key={step.title} className="flex min-w-0 items-start gap-3 rounded-[5px] bg-[var(--color-bg-secondary)] p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[5px] bg-[var(--color-bg-card)] text-[var(--color-accent-primary)]">
                  <Icons8Icon name={step.icon} size={19} />
                </span>
                <span className="min-w-0">
                  <b className="block truncate text-sm">{step.title}</b>
                  <span className="block text-xs leading-relaxed text-[var(--color-text-secondary)]">{step.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-display leading-none md:text-3xl">Me2U Circles</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  Pool funds with trusted groups, contribute to pools, or borrow instantly at 0% interest.
                </p>
              </div>
              <Icons8Icon name="group" size={28} className="shrink-0 text-[var(--color-accent-primary)]" />
            </div>

            {!user?.groupLendingEnabled ? (
              <div className="rounded-[8px] bg-[var(--color-bg-secondary)] p-4 text-center my-4">
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] mb-4">
                  Group lending is currently disabled. Enable it to join and manage peer circles.
                </p>
                <button
                  type="button"
                  disabled={togglingGroupLending}
                  className="btn-primary w-full py-2.5 text-sm"
                  onClick={handleToggleGroupLending}
                >
                  {togglingGroupLending ? "Enabling..." : "Enable Group Lending"}
                </button>
              </div>
            ) : (
              <div className="space-y-3 my-4">
                <div className="flex justify-between items-center pb-2 border-b border-[var(--color-border)]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Active Pools ({circles.length})
                  </span>
                  <button
                    type="button"
                    className="text-xs font-bold text-[var(--color-accent-primary)] hover:underline"
                    onClick={() => setShowCreateModal(true)}
                  >
                    + New Circle
                  </button>
                </div>

                <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
                  {circlesLoading ? (
                    <div className="text-center py-6 text-sm text-[var(--color-text-secondary)]">
                      Loading circles...
                    </div>
                  ) : circles.length === 0 ? (
                    <div className="text-center py-6 text-sm italic text-[var(--color-text-secondary)]">
                      No active circles. Create one to begin!
                    </div>
                  ) : (
                    circles.map((circle) => (
                      <div
                        key={circle.id}
                        className="flex flex-col gap-2 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-left"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <b className="block text-sm text-[var(--color-text-primary)]">{circle.name}</b>
                            <span className="text-[10px] text-[var(--color-text-secondary)]">
                              {circle.creator_id === user.id ? "Created by you" : "Member"}
                            </span>
                          </div>
                          <span className="font-mono text-sm font-bold text-[var(--color-positive-text)]">
                            ₦{Number(circle.pool_balance || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <button
                            type="button"
                            className="btn-primary flex-1 py-1.5 text-xs h-auto min-h-0"
                            onClick={() => {
                              setSelectedCircle(circle);
                              setCircleAction("contribute");
                              setActionAmount(5000);
                              setCirclePin("");
                            }}
                          >
                            Contribute
                          </button>
                          <button
                            type="button"
                            className="btn-ghost flex-1 py-1.5 text-xs h-auto min-h-0 border border-[var(--color-border)] bg-[var(--color-bg-card)]"
                            onClick={() => {
                              setSelectedCircle(circle);
                              setCircleAction("borrow");
                              setActionAmount(5000);
                              setCirclePin("");
                            }}
                          >
                            Borrow
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {user?.groupLendingEnabled && (
            <div className="border-t border-[var(--color-border)] pt-3 mt-auto flex justify-between items-center text-xs">
              <span className="text-[var(--color-text-secondary)]">Group Lending Active</span>
              <button
                type="button"
                disabled={togglingGroupLending}
                className="text-[var(--color-negative-text)] hover:underline font-bold"
                onClick={handleToggleGroupLending}
              >
                Disable
              </button>
            </div>
          )}
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 md:gap-8">
        {marketplace.map((item) => (
          <motion.div key={item.id} whileHover={{ y: -8, transition: { duration: 0.3 } }}>
            <Card className="kinetic-border p-5 h-full flex flex-col justify-between shadow-[4px_4px_0px_var(--color-shadow)] bg-[var(--color-bg-card)] md:p-8">
              <div>
                <div className="mb-4 flex min-w-0 items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3 md:mb-6 md:pb-4">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className={`font-sans font-bold uppercase tracking-wide text-sm ${item.type === "borrow_request" ? "text-[var(--color-warning-text)]" : "text-[var(--color-accent-primary)]"}`}>
                        {item.type === "borrow_request" ? "Borrow Request" : "Lending Offer"}
                      </p>
                      {isMarketplaceBoostActive(item) && (
                        <span className="shrink-0 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-warning-bg)] px-2 py-0.5 text-[10px] font-black uppercase tracking-normal text-[var(--color-warning-text)]">
                          Promoted
                        </span>
                      )}
                    </div>
                    <p className="overflow-anywhere mt-1 font-sans text-sm italic text-[var(--color-text-secondary)]">by {item.authorName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-positive-bg)] px-2 py-1 text-[11px] font-bold font-mono text-[var(--color-positive-text)] shadow-[2px_2px_0px_var(--color-shadow)] md:px-3 md:text-xs">
                    <Icons8Icon name="shield" size={16} />
                    Trust: {item.trustScore}
                  </div>
                </div>
                <p className="overflow-anywhere mt-2 text-2xl font-display leading-none md:text-5xl">₦{item.amount.toLocaleString()}</p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm font-sans text-[var(--color-text-secondary)] md:mt-6 md:gap-4">
                  <div className="p-3 bg-[var(--color-bg-primary)] rounded-[5px] kinetic-border border-dashed">
                    <p className="text-[10px] uppercase font-bold tracking-[0.1em] mb-1 md:tracking-[0.2em]">Interest</p>
                    <p className="text-xl font-mono text-[var(--color-positive-text)]">0%</p>
                  </div>
                  <div className="p-3 bg-[var(--color-bg-primary)] rounded-[5px] kinetic-border border-dashed">
                    <p className="text-[10px] uppercase font-bold tracking-[0.1em] mb-1 md:tracking-[0.2em]">Duration</p>
                    <p className="text-xl font-mono text-[var(--color-text-primary)]">{item.days}d</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 md:mt-8">
                <button
                  type="button"
                  className={`${item.type === "borrow_request" ? "btn-primary" : "btn-ghost"} min-h-11 w-full`}
                  onClick={() => {
                    setPendingAgreementId(item.id);
                    setAgreementAccepted(false);
                  }}
                >
                  {item.type === "borrow_request" ? "Fund this Loan" : "Accept Offer"}
                </button>
              </div>
            </Card>
          </motion.div>
        ))}
        {marketplace.length === 0 && (
          <div className="py-12 text-center md:col-span-2 md:py-16">
            <p className="text-base leading-relaxed font-sans italic opacity-90 text-[var(--color-text-secondary)] md:text-xl">No items in the marketplace. Create one!</p>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {pendingAgreement && (
          <motion.div
            className="fixed inset-0 z-[70] grid place-items-end bg-[var(--color-scrim)] px-3.5 pb-3.5 md:place-items-center md:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-[22px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[0_18px_48px_rgba(0,64,107,0.22)] md:rounded-[8px] md:p-6"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
            >
              <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-display leading-none">Loan Agreement Summary</h2>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    Confirm the protected terms before creating an active loan.
                  </p>
                </div>
                <button
                  type="button"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-bg-secondary)] text-sm font-black"
                  onClick={() => {
                    setPendingAgreementId(null);
                    setAgreementAccepted(false);
                  }}
                  aria-label="Close agreement summary"
                >
                  x
                </button>
              </div>

              <dl className="grid gap-2 rounded-[5px] bg-[var(--color-bg-secondary)] p-3 text-sm">
                <div className="flex min-w-0 justify-between gap-3">
                  <dt className="shrink-0 text-[var(--color-text-secondary)]">Listing</dt>
                  <dd className="min-w-0 text-right font-bold capitalize">{pendingAgreement.type.replaceAll("_", " ")}</dd>
                </div>
                <div className="flex min-w-0 justify-between gap-3">
                  <dt className="shrink-0 text-[var(--color-text-secondary)]">Amount</dt>
                  <dd className="min-w-0 text-right font-mono font-bold">₦{pendingAgreement.amount.toLocaleString()}</dd>
                </div>
                <div className="flex min-w-0 justify-between gap-3">
                  <dt className="shrink-0 text-[var(--color-text-secondary)]">Interest</dt>
                  <dd className="min-w-0 text-right font-mono font-bold text-[var(--color-positive-text)]">0%</dd>
                </div>
                <div className="flex min-w-0 justify-between gap-3">
                  <dt className="shrink-0 text-[var(--color-text-secondary)]">Duration</dt>
                  <dd className="min-w-0 text-right font-mono font-bold">{pendingAgreement.days} days</dd>
                </div>
                <div className="flex min-w-0 justify-between gap-3">
                  <dt className="shrink-0 text-[var(--color-text-secondary)]">Repayment date</dt>
                  <dd className="min-w-0 text-right font-bold">{repaymentDate}</dd>
                </div>
                <div className="flex min-w-0 justify-between gap-3">
                  <dt className="shrink-0 text-[var(--color-text-secondary)]">Lender</dt>
                  <dd className="min-w-0 text-right font-bold">{lenderName} • {lenderTrustScore}/100</dd>
                </div>
                <div className="flex min-w-0 justify-between gap-3">
                  <dt className="shrink-0 text-[var(--color-text-secondary)]">Borrower</dt>
                  <dd className="min-w-0 text-right font-bold">{borrowerName} • {borrowerTrustScore}/100</dd>
                </div>
                <div className="flex min-w-0 justify-between gap-3">
                  <dt className="shrink-0 text-[var(--color-text-secondary)]">Wallet rule</dt>
                  <dd className="min-w-0 text-right font-bold">Retained balance applies</dd>
                </div>
                <div className="flex min-w-0 justify-between gap-3">
                  <dt className="shrink-0 text-[var(--color-text-secondary)]">Late repayment</dt>
                  <dd className="min-w-0 text-right font-bold">Score and access review</dd>
                </div>
              </dl>

              <label className="mt-4 flex min-w-0 cursor-pointer items-start gap-3 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-sm leading-relaxed">
                <input
                  type="checkbox"
                  checked={agreementAccepted}
                  onChange={(event) => setAgreementAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent-primary)]"
                />
                <span className="min-w-0 text-[var(--color-text-secondary)]">
                  I understand this creates an active 0% loan with wallet records, repayment tracking, receipts, and dispute review if needed.
                </span>
              </label>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="btn-ghost min-h-11"
                  onClick={() => {
                    setPendingAgreementId(null);
                    setAgreementAccepted(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-ghost min-h-11"
                  onClick={downloadAgreementSummary}
                >
                  Download
                </button>
              </div>
              <button
                type="button"
                className="btn-primary mt-2 min-h-11 w-full"
                onClick={() => {
                  confirmAgreement().catch(() => {});
                }}
              >
                Confirm
              </button>
            </motion.div>
          </motion.div>
        )}

        {showCreateModal && (
          <motion.div
            className="fixed inset-0 z-[70] grid place-items-end bg-[var(--color-scrim)] px-3.5 pb-3.5 md:place-items-center md:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-[22px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[0_18px_48px_rgba(0,64,107,0.22)] md:rounded-[8px] md:p-6"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-display">Create Me2U Circle</h3>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-bg-secondary)] text-sm font-black"
                  onClick={() => setShowCreateModal(false)}
                >
                  x
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Circle Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Family Fund, Business Partners"
                    className="h-11 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-sm focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                    value={newCircleName}
                    onChange={(e) => setNewCircleName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost flex-1 min-h-11"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submittingAction || !newCircleName.trim()}
                    className="btn-primary flex-1 min-h-11"
                    onClick={handleCreateCircle}
                  >
                    {submittingAction ? "Creating..." : "Create Circle"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedCircle && circleAction && (
          <motion.div
            className="fixed inset-0 z-[70] grid place-items-end bg-[var(--color-scrim)] px-3.5 pb-3.5 md:place-items-center md:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-[22px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 shadow-[0_18px_48px_rgba(0,64,107,0.22)] md:rounded-[8px] md:p-6"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-display capitalize">
                  {circleAction} to {selectedCircle.name}
                </h3>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-bg-secondary)] text-sm font-black"
                  onClick={() => {
                    setSelectedCircle(null);
                    setCircleAction(null);
                    setCirclePin("");
                  }}
                >
                  x
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Amount (₦)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    className="h-11 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 font-mono text-lg focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                    value={actionAmount}
                    onChange={(e) => setActionAmount(Math.max(0, Number(e.target.value)))}
                  />
                  <p className="mt-1.5 text-xs text-[var(--color-text-secondary)]">
                    {circleAction === "contribute"
                      ? `Your wallet balance: ₦${Number(user?.balance || 0).toLocaleString()}`
                      : `Circle pool balance: ₦${Number(selectedCircle.pool_balance || 0).toLocaleString()}`}
                  </p>
                </div>
                {!user?.transactionPin ? (
                  <div className="rounded-[8px] border border-[var(--color-warning-text)] bg-[var(--color-warning-bg)] p-3 text-xs font-semibold leading-relaxed text-[var(--color-warning-text)]">
                    Set a transaction PIN in Security Center before moving circle funds.
                  </div>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Transaction PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      placeholder="0000"
                      value={circlePin}
                      onChange={(event) => setCirclePin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="h-11 w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-center font-mono text-lg tracking-[0.35em] focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost flex-1 min-h-11"
                    onClick={() => {
                      setSelectedCircle(null);
                      setCircleAction(null);
                      setCirclePin("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submittingAction || actionAmount <= 0 || !user?.transactionPin || circlePin.length !== 4}
                    className="btn-primary flex-1 min-h-11"
                    onClick={handleCircleAction}
                  >
                    {submittingAction
                      ? "Processing..."
                      : circleAction === "contribute"
                      ? "Contribute"
                      : "Borrow"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
