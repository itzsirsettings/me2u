"use client";

import { motion, type Variants, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import Me2uIcon from "@/components/Me2uIcon";
import { Card } from "@/components/ui/card";
import { authorizedFetch as _authorizedFetch } from "@/lib/fetch";
import { useStore } from "@/lib/store";
import LoadingButton from "@/LoadingButton";

type Circle = {
  id: string;
  name: string;
  creator_id: string;
  pool_balance: number;
  created_at: string;
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.44, ease: [0.16, 1, 0.3, 1] } },
};

export default function CirclesPage() {
  const user = useStore((s) => s.user);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const isLoading = useStore((s) => s.isLoading);
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [fetching, setFetching] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");

  // Per-circle action state
  const [contributeAmounts, setContributeAmounts] = useState<Record<string, string>>({});
  const [contributePins, setContributePins] = useState<Record<string, string>>({});
  const [borrowAmounts, setBorrowAmounts] = useState<Record<string, string>>({});
  const [borrowPins, setBorrowPins] = useState<Record<string, string>>({});
  const [expandedCircle, setExpandedCircle] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) router.push("/login");
  }, [mounted, isLoading, isAuthenticated, router]);

  async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    return _authorizedFetch(input, init);
  }

  const loadCircles = useCallback(async () => {
    if (!isAuthenticated) return;
    setFetching(true);
    try {
      const res = await authorizedFetch("/api/circles");
      const data = await res.json().catch(() => ({}));
      if (data.ok) setCircles(data.circles || []);
    } catch {
      // silent
    } finally {
      setFetching(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (mounted && isAuthenticated) loadCircles();
  }, [mounted, isAuthenticated, loadCircles]);

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  const groupLendingEnabled = user?.groupLendingEnabled;

  const handleCreate = async () => {
    if (!newCircleName.trim()) {
      toast.error("Enter a circle name.");
      return;
    }
    const res = await authorizedFetch("/api/circles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: newCircleName.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast.error(data.error || "Unable to create circle.");
      throw new Error("create failed");
    }
    toast.success(`Circle "${newCircleName.trim()}" created!`);
    setNewCircleName("");
    setShowCreate(false);
    await loadCircles();
  };

  const handleContribute = async (circle: Circle) => {
    const amount = Number(contributeAmounts[circle.id] || 0);
    const pin = contributePins[circle.id] || "";
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid contribution amount.");
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error("Enter your 4-digit transaction PIN.");
      return;
    }
    const res = await authorizedFetch("/api/circles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "contribute", circleId: circle.id, amount, pin }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast.error(data.error || "Unable to contribute.");
      throw new Error("contribute failed");
    }
    toast.success(`₦${amount.toLocaleString()} added to "${circle.name}" pool.`);
    setContributeAmounts((prev) => ({ ...prev, [circle.id]: "" }));
    setContributePins((prev) => ({ ...prev, [circle.id]: "" }));
    await Promise.all([loadCircles(), useStore.getState().loadCurrentUser()]);
  };

  const handleBorrow = async (circle: Circle) => {
    const amount = Number(borrowAmounts[circle.id] || 0);
    const pin = borrowPins[circle.id] || "";
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid borrow amount.");
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast.error("Enter your 4-digit transaction PIN.");
      return;
    }
    const res = await authorizedFetch("/api/circles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "borrow", circleId: circle.id, amount, pin }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast.error(data.error || "Unable to borrow from circle.");
      throw new Error("borrow failed");
    }
    toast.success(`₦${amount.toLocaleString()} borrowed from "${circle.name}" pool.`);
    setBorrowAmounts((prev) => ({ ...prev, [circle.id]: "" }));
    setBorrowPins((prev) => ({ ...prev, [circle.id]: "" }));
    await Promise.all([loadCircles(), useStore.getState().loadCurrentUser()]);
  };

  // Feature gate: group lending not enabled
  if (!groupLendingEnabled) {
    return (
      <div className="app-mobile-screen mx-auto flex w-full max-w-md flex-col items-center justify-center px-3.5 pt-[3.85rem] md:max-w-3xl md:px-6 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--mobile-surface-muted)]">
              <Me2uIcon name="group" size={32} className="text-[var(--color-text-secondary)]" />
            </div>
            <div>
              <h2 className="text-xl font-display">Me2U Circles</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Group lending circles let you pool funds with trusted people and borrow from the
                collective pool — 0% interest.
              </p>
            </div>
            <div className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--mobile-surface-muted)] p-4 text-left text-sm">
              <p className="font-bold text-[var(--color-text-primary)]">
                Requirements to join:
              </p>
              <ul className="mt-2 space-y-1.5 text-[var(--color-text-secondary)]">
                <li className="flex items-center gap-2">
                  <Me2uIcon
                    name={user?.kycVerified ? "check" : "alert"}
                    size={14}
                    className={
                      user?.kycVerified
                        ? "text-[var(--color-positive-text)]"
                        : "text-[var(--color-warning-text)]"
                    }
                  />
                  KYC verified {!user?.kycVerified && "— complete KYC first"}
                </li>
                <li className="flex items-center gap-2">
                  <Me2uIcon
                    name={user?.transactionPin ? "check" : "alert"}
                    size={14}
                    className={
                      user?.transactionPin
                        ? "text-[var(--color-positive-text)]"
                        : "text-[var(--color-warning-text)]"
                    }
                  />
                  Transaction PIN set {!user?.transactionPin && "— set PIN in Security"}
                </li>
                <li className="flex items-center gap-2">
                  <Me2uIcon
                    name="alert"
                    size={14}
                    className="text-[var(--color-warning-text)]"
                  />
                  Group lending enabled in Security Center
                </li>
              </ul>
            </div>
            <button
              type="button"
              className="btn-primary w-full py-3 text-sm font-bold"
              onClick={() => router.push("/security")}
            >
              Go to Security Center
            </button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[3.85rem] md:max-w-3xl md:px-6 md:py-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="mb-4 flex min-w-0 items-end justify-between gap-3 md:mb-10"
      >
        <div className="min-w-0">
          <h1 className="sr-only md:not-sr-only md:text-7xl md:font-display md:leading-[0.85] md:tracking-tighter">
            Circles
          </h1>
          <p className="text-[0.78rem] font-black uppercase tracking-widest text-[var(--color-text-secondary)] md:hidden">
            Me2U Circles
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="mobile-soft-card flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-black text-[var(--color-accent-primary)] transition active:scale-95"
        >
          <Me2uIcon name="group" size={15} />
          {showCreate ? "Cancel" : "New Circle"}
        </button>
      </motion.div>

      {/* Info strip */}
      <motion.div variants={itemVariants} className="mobile-soft-card mb-4 rounded-[18px] p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-positive-bg)]">
            <Me2uIcon name="group" size={18} className="text-[var(--color-positive-text)]" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--color-text-primary)]">
              {circles.length} {circles.length === 1 ? "circle" : "circles"} available
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Contribute to a pool, borrow up to the pool size at 0% interest over 30 days.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            key="create-form"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <Card className="p-5">
              <h2 className="mb-4 text-lg font-display leading-none">Create a Circle</h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Circle Name
                  </label>
                  <input
                    type="text"
                    value={newCircleName}
                    onChange={(e) => setNewCircleName(e.target.value)}
                    placeholder="e.g. Family Pool, Friends Circle"
                    className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                  />
                </div>
                <div className="[&>button]:w-full">
                  <LoadingButton
                    label="Create Circle"
                    loadingText="Creating..."
                    successText="Created!"
                    onClick={handleCreate}
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Circles list */}
      {fetching ? (
        <motion.div variants={itemVariants} className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent-primary)] border-t-transparent" />
        </motion.div>
      ) : circles.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <Me2uIcon name="group" size={44} className="text-[var(--color-text-secondary)]" />
            <p className="text-base font-display">No circles yet</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Create a circle or wait for a friend to invite you to theirs.
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="btn-primary mt-1 px-6 py-2 text-sm font-bold"
            >
              Create First Circle
            </button>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {circles.map((circle) => {
            const isExpanded = expandedCircle === circle.id;
            const isOwner = circle.creator_id === user?.id;

            return (
              <motion.div key={circle.id} variants={itemVariants}>
                <Card className="overflow-hidden p-0">
                  {/* Circle header row */}
                  <button
                    type="button"
                    className="flex w-full min-w-0 items-center justify-between gap-3 p-5 text-left transition hover:bg-[var(--color-hover-soft)]"
                    onClick={() => setExpandedCircle(isExpanded ? null : circle.id)}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-positive-bg)]">
                        <Me2uIcon
                          name="group"
                          size={20}
                          className="text-[var(--color-positive-text)]"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-display text-base leading-none">
                          {circle.name}
                        </p>
                        {isOwner && (
                          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                            You created this
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-lg font-black text-[var(--color-text-primary)]">
                        ₦{Number(circle.pool_balance).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-secondary)]">
                        Pool balance
                      </p>
                    </div>
                  </button>

                  {/* Expanded actions */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 border-t border-[var(--color-border)] p-5">
                          {/* Contribute */}
                          <div>
                            <p className="mb-2 text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                              Contribute to Pool
                            </p>
                            <div className="grid grid-cols-[1fr_auto] gap-2">
                              <input
                                type="number"
                                placeholder="Amount (₦)"
                                min="1"
                                value={contributeAmounts[circle.id] || ""}
                                onChange={(e) =>
                                  setContributeAmounts((prev) => ({
                                    ...prev,
                                    [circle.id]: e.target.value,
                                  }))
                                }
                                className="h-10 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                              />
                              <input
                                type="password"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="PIN"
                                value={contributePins[circle.id] || ""}
                                onChange={(e) =>
                                  setContributePins((prev) => ({
                                    ...prev,
                                    [circle.id]: e.target.value,
                                  }))
                                }
                                className="h-10 w-20 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 font-mono text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                              />
                            </div>
                            <div className="mt-2 [&>button]:h-9 [&>button]:w-full [&>button]:text-xs">
                              <LoadingButton
                                label="Contribute"
                                loadingText="..."
                                successText="Done!"
                                onClick={() => handleContribute(circle)}
                              />
                            </div>
                          </div>

                          {/* Borrow */}
                          {Number(circle.pool_balance) > 0 && (
                            <div>
                              <p className="mb-2 text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                                Borrow from Pool
                              </p>
                              <p className="mb-2 text-xs text-[var(--color-text-secondary)]">
                                0% interest · 30-day repayment · Max ₦
                                {Number(circle.pool_balance).toLocaleString()} available
                              </p>
                              <div className="grid grid-cols-[1fr_auto] gap-2">
                                <input
                                  type="number"
                                  placeholder="Amount (₦)"
                                  min="1"
                                  max={circle.pool_balance}
                                  value={borrowAmounts[circle.id] || ""}
                                  onChange={(e) =>
                                    setBorrowAmounts((prev) => ({
                                      ...prev,
                                      [circle.id]: e.target.value,
                                    }))
                                  }
                                  className="h-10 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                                />
                                <input
                                  type="password"
                                  inputMode="numeric"
                                  maxLength={4}
                                  placeholder="PIN"
                                  value={borrowPins[circle.id] || ""}
                                  onChange={(e) =>
                                    setBorrowPins((prev) => ({
                                      ...prev,
                                      [circle.id]: e.target.value,
                                    }))
                                  }
                                  className="h-10 w-20 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 font-mono text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                                />
                              </div>
                              <div className="mt-2 [&>button]:h-9 [&>button]:w-full [&>button]:text-xs">
                                <LoadingButton
                                  label="Borrow"
                                  loadingText="..."
                                  successText="Credited!"
                                  onClick={() => handleBorrow(circle)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="h-24" />
    </motion.div>
  );
}
