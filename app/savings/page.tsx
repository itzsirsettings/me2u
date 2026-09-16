"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { motion, type Variants, AnimatePresence } from "framer-motion";
import Me2uIcon from "@/components/Me2uIcon";
import { Card } from "@/components/ui/card";
import LoadingButton from "@/LoadingButton";
import { authorizedFetch as _authorizedFetch } from "@/lib/fetch";

type SavingsGoal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  locked: boolean;
  status: "active" | "completed" | "withdrawn";
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

function progressPct(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export default function SavingsPage() {
  const user = useStore((s) => s.user);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const isLoading = useStore((s) => s.isLoading);
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [fetching, setFetching] = useState(true);

  // Create form state
  const [newName, setNewName] = useState("Emergency Fund");
  const [newTarget, setNewTarget] = useState("10000");
  const [newLocked, setNewLocked] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Per-goal fund input
  const [fundAmounts, setFundAmounts] = useState<Record<string, string>>({});

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) router.push("/login");
  }, [mounted, isLoading, isAuthenticated, router]);

  async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    return _authorizedFetch(input, init);
  }

  const loadGoals = useCallback(async () => {
    if (!isAuthenticated) return;
    setFetching(true);
    try {
      const res = await authorizedFetch("/api/savings");
      const data = await res.json().catch(() => ({}));
      if (data.ok) setGoals(data.goals || []);
    } catch {
      // silent
    } finally {
      setFetching(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (mounted && isAuthenticated) loadGoals();
  }, [mounted, isAuthenticated, loadGoals]);

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  const activeGoals = goals.filter((g) => g.status === "active" || g.status === "completed");
  const withdrawnGoals = goals.filter((g) => g.status === "withdrawn");
  const totalSaved = activeGoals.reduce((sum, g) => sum + Number(g.current_amount), 0);

  const handleCreate = async () => {
    const targetAmount = Number(newTarget);
    if (!newName.trim() || newName.trim().length < 2) {
      toast.error("Enter a goal name (at least 2 characters).");
      return;
    }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      toast.error("Enter a valid target amount.");
      return;
    }
    const res = await authorizedFetch("/api/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: newName.trim(), targetAmount, locked: newLocked }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast.error(data.error || "Unable to create savings goal.");
      throw new Error("create failed");
    }
    toast.success("Savings goal created!");
    setNewName("Emergency Fund");
    setNewTarget("10000");
    setNewLocked(true);
    setShowCreate(false);
    await loadGoals();
  };

  const handleFund = async (goal: SavingsGoal) => {
    const amount = Number(fundAmounts[goal.id] || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount to save.");
      return;
    }
    const res = await authorizedFetch("/api/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fund", goalId: goal.id, amount }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast.error(data.error || "Unable to fund savings goal.");
      throw new Error("fund failed");
    }
    toast.success(`₦${amount.toLocaleString()} saved toward "${goal.name}".`);
    setFundAmounts((prev) => ({ ...prev, [goal.id]: "" }));
    await Promise.all([loadGoals(), useStore.getState().loadCurrentUser()]);
  };

  const handleWithdraw = async (goal: SavingsGoal) => {
    const res = await authorizedFetch("/api/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "withdraw", goalId: goal.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast.error(data.error || "Unable to release savings.");
      throw new Error("withdraw failed");
    }
    toast.success(`₦${Number(goal.current_amount).toLocaleString()} released back to your wallet.`);
    await Promise.all([loadGoals(), useStore.getState().loadCurrentUser()]);
  };

  return (
    <motion.div
      className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[4.85rem] md:max-w-3xl md:px-6 md:py-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-4 flex min-w-0 items-end justify-between gap-3 md:mb-10">
        <div className="min-w-0">
          <h1 className="sr-only md:not-sr-only md:text-7xl md:font-display md:leading-[0.85] md:tracking-tighter">
            Savings
          </h1>
          <p className="text-[0.78rem] font-black uppercase tracking-widest text-[var(--color-text-secondary)] md:hidden">
            Savings Goals
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="mobile-soft-card flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-black text-[var(--color-accent-primary)] transition active:scale-95"
        >
          <Me2uIcon name="savings" size={15} />
          {showCreate ? "Cancel" : "New Goal"}
        </button>
      </motion.div>

      {/* Summary strip */}
      <motion.div variants={itemVariants} className="mobile-soft-card mb-4 grid grid-cols-3 divide-x divide-[var(--color-border)] overflow-hidden rounded-[20px]">
        <div className="flex flex-col items-center justify-center gap-0.5 px-2 py-3">
          <p className="text-[1.1rem] font-black text-[var(--color-text-primary)]">
            {activeGoals.length}
          </p>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Active
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-0.5 px-2 py-3">
          <p className="text-[1.1rem] font-black text-[var(--color-text-primary)]">
            ₦{totalSaved.toLocaleString()}
          </p>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Saved
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-0.5 px-2 py-3">
          <p className="text-[1.1rem] font-black text-[var(--color-positive-text)]">
            ₦{(user?.locked || 0).toLocaleString()}
          </p>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Locked
          </p>
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
              <h2 className="mb-4 text-lg font-display leading-none">New Savings Goal</h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Emergency Fund"
                    className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Target Amount (₦)
                  </label>
                  <input
                    type="number"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    placeholder="10000"
                    min="1"
                    className="w-full rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 font-mono text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-3 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                  <input
                    type="checkbox"
                    checked={newLocked}
                    onChange={(e) => setNewLocked(e.target.checked)}
                    className="h-4 w-4 accent-[var(--color-accent-primary)]"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text-primary)]">Lock until target reached</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Funds can't be withdrawn early when locked</p>
                  </div>
                </label>
                <div className="[&>button]:w-full">
                  <LoadingButton
                    label="Create Goal"
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

      {/* Active goals */}
      {fetching ? (
        <motion.div variants={itemVariants} className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent-primary)] border-t-transparent" />
        </motion.div>
      ) : activeGoals.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <Me2uIcon name="savings" size={44} className="text-[var(--color-text-secondary)]" />
            <p className="text-base font-display">No savings goals yet</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Create a goal to start building your financial cushion.
            </p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="btn-primary mt-1 px-6 py-2 text-sm font-bold"
            >
              Create First Goal
            </button>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {activeGoals.map((goal) => {
            const pct = progressPct(Number(goal.current_amount), Number(goal.target_amount));
            const isCompleted = goal.status === "completed";
            const canWithdraw = !goal.locked || isCompleted;

            return (
              <motion.div key={goal.id} variants={itemVariants}>
                <Card className="p-5">
                  <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-display text-base leading-none">{goal.name}</p>
                        {goal.locked && !isCompleted && (
                          <span className="shrink-0 rounded-full bg-[var(--color-warning-bg)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-warning-text)]">
                            Locked
                          </span>
                        )}
                        {isCompleted && (
                          <span className="shrink-0 rounded-full bg-[var(--color-positive-bg)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--color-positive-text)]">
                            Target Met ✓
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        Target: ₦{Number(goal.target_amount).toLocaleString()}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-lg font-black text-[var(--color-text-primary)]">
                        ₦{Number(goal.current_amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{pct}% saved</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-[var(--mobile-surface-muted)]">
                    <motion.div
                      className={`h-full rounded-full ${isCompleted ? "bg-[var(--color-positive-text)]" : "bg-[var(--color-accent-primary)]"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>

                  {/* Fund input */}
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Amount to add"
                      min="1"
                      value={fundAmounts[goal.id] || ""}
                      onChange={(e) => setFundAmounts((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                      className="h-10 min-w-0 flex-1 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                    />
                    <div className="[&>button]:h-10 [&>button]:px-4 [&>button]:text-sm">
                      <LoadingButton
                        label="Add"
                        loadingText="..."
                        successText="Saved!"
                        onClick={() => handleFund(goal)}
                      />
                    </div>
                  </div>

                  {canWithdraw && Number(goal.current_amount) > 0 && (
                    <div className="mt-2 [&>button]:w-full [&>button]:h-9 [&>button]:text-xs">
                      <LoadingButton
                        label={`Release ₦${Number(goal.current_amount).toLocaleString()} to Wallet`}
                        loadingText="Releasing..."
                        successText="Released!"
                        variant="outline"
                        onClick={() => handleWithdraw(goal)}
                      />
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Withdrawn / history */}
      {withdrawnGoals.length > 0 && (
        <motion.div variants={itemVariants} className="mt-6">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-[var(--color-text-secondary)]">
            Past Goals
          </p>
          <div className="space-y-2">
            {withdrawnGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center justify-between gap-3 rounded-[14px] bg-[var(--mobile-surface-muted)] px-4 py-3"
              >
                <p className="truncate text-sm font-semibold text-[var(--color-text-secondary)]">
                  {goal.name}
                </p>
                <span className="shrink-0 text-xs text-[var(--color-text-secondary)]">Withdrawn</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="h-24" />
    </motion.div>
  );
}
