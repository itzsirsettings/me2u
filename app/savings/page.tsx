"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Lock, Plus, Target, Unlock } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import {
  ReferenceIcon,
  ReferenceScreen,
  useReferenceUser,
} from "@/components/reference/ReferenceUI";
import { authorizedFetch as _authorizedFetch } from "@/lib/fetch";
import { useStore } from "@/lib/store";
import LoadingButton from "@/LoadingButton";

type SavingsGoal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  locked: boolean;
  status: "active" | "completed" | "withdrawn";
  created_at: string;
};

function progressPct(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export default function SavingsPage() {
  const user = useReferenceUser();

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [fetching, setFetching] = useState(true);

  // Create form state
  const [newName, setNewName] = useState("Emergency Fund");
  const [newTarget, setNewTarget] = useState("10000");
  const [newLocked, setNewLocked] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Per-goal fund input
  const [fundAmounts, setFundAmounts] = useState<Record<string, string>>({});

  const loadGoals = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    try {
      const res = await _authorizedFetch("/api/savings");
      const data = await res.json().catch(() => ({}));
      if (data.ok) setGoals(data.goals || []);
    } catch {
      // silent
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadGoals();
  }, [user, loadGoals]);

  if (!user) return <ReferenceScreen kind="profile" ready={false} />;

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
    const res = await _authorizedFetch("/api/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        name: newName.trim(),
        targetAmount,
        locked: newLocked,
      }),
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
    const res = await _authorizedFetch("/api/savings", {
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
    const res = await _authorizedFetch("/api/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "withdraw", goalId: goal.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast.error(data.error || "Unable to release savings.");
      throw new Error("withdraw failed");
    }
    toast.success(
      `₦${Number(goal.current_amount).toLocaleString()} released back to your wallet.`,
    );
    await Promise.all([loadGoals(), useStore.getState().loadCurrentUser()]);
  };

  return (
    <ReferenceScreen kind="profile">
      <section className="design-page-title">
        <h1>Savings</h1>
        <p>Set targets and lock funds until you reach them</p>
      </section>

      <div className="design-savings-head">
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="design-new-goal"
          aria-expanded={showCreate}
        >
          {showCreate ? (
            <>
              <Check size={16} aria-hidden="true" />
              Done
            </>
          ) : (
            <>
              <Plus size={16} aria-hidden="true" />
              New Goal
            </>
          )}
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            key="create-form"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 13 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <section className="design-card design-savings-create">
              <h2>
                <Target size={18} aria-hidden="true" />
                New Savings Goal
              </h2>
              <label className="design-field">
                <span className="design-field-label">Goal Name</span>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Emergency Fund"
                  className="design-input"
                />
              </label>
              <label className="design-field">
                <span className="design-field-label">Target Amount (₦)</span>
                <input
                  type="number"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="10000"
                  min="1"
                  className="design-input design-input-amount"
                />
              </label>
              <label className="design-check-row">
                <input
                  type="checkbox"
                  checked={newLocked}
                  onChange={(e) => setNewLocked(e.target.checked)}
                />
                <span className="design-check-copy">
                  <strong>Lock until target reached</strong>
                </span>
              </label>
              <div className="design-create-submit">
                <LoadingButton
                  label="Create Goal"
                  loadingText="Creating..."
                  successText="Created!"
                  onClick={handleCreate}
                />
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary strip */}
      <section
        className="design-card design-profile-metrics design-savings-stats"
        aria-label="Savings summary"
      >
        <div>
          <h2>Goals</h2>
          <span className="design-icon-disc">
            <ReferenceIcon name="savings" size={17} />
          </span>
          <strong>{activeGoals.length}</strong>
          <p>Active savings goals</p>
        </div>
        <div>
          <h2>Saved</h2>
          <span className="design-icon-disc">
            <ReferenceIcon name="wallet" size={17} />
          </span>
          <strong>₦{totalSaved.toLocaleString()}</strong>
          <p>Across all active goals</p>
        </div>
        <div>
          <h2>Locked</h2>
          <span className="design-icon-disc">
            <Lock size={16} aria-hidden="true" />
          </span>
          <strong>₦{(user.locked || 0).toLocaleString()}</strong>
          <p>Unavailable until released</p>
        </div>
      </section>

      {/* Active goals */}
      {fetching ? (
        <div className="design-loading" role="status">
          <span className="design-spinner" />
          Loading your goals…
        </div>
      ) : activeGoals.length === 0 ? (
        <section className="design-card design-empty">
          <span className="design-icon-disc">
            <ReferenceIcon name="savings" size={26} />
          </span>
          <h2>No savings goals yet</h2>
          <p>Create a goal to start building your financial cushion.</p>
          <button
            type="button"
            className="design-primary-pill"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} aria-hidden="true" />
            Create First Goal
          </button>
        </section>
      ) : (
        <div className="design-goals">
          {activeGoals.map((goal) => {
            const pct = progressPct(Number(goal.current_amount), Number(goal.target_amount));
            const isCompleted = goal.status === "completed";
            const canWithdraw = !goal.locked || isCompleted;

            return (
              <section key={goal.id} className="design-card design-goal">
                <div className="design-goal-head">
                  <span className="design-icon-square">
                    <ReferenceIcon name="savings" size={20} />
                  </span>
                  <div className="design-goal-copy">
                    <h2>
                      <span>{goal.name}</span>
                      {goal.locked && !isCompleted && (
                        <span className="design-chip design-chip-locked">
                          <Lock aria-hidden="true" />
                          Locked
                        </span>
                      )}
                      {isCompleted && (
                        <span className="design-chip design-chip-done">
                          <Check aria-hidden="true" />
                          Target Met
                        </span>
                      )}
                    </h2>
                  </div>
                  <div className="design-goal-amount">
                    <strong>₦{Number(goal.current_amount).toLocaleString()}</strong>
                  </div>
                </div>

                <div
                  className="design-progress"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${goal.name} progress`}
                >
                  <span
                    className={isCompleted ? "design-progress-done" : ""}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="design-goal-actions">
                  <input
                    type="number"
                    aria-label={`Amount to add to ${goal.name}`}
                    placeholder="Amount to add"
                    min="1"
                    value={fundAmounts[goal.id] || ""}
                    onChange={(e) =>
                      setFundAmounts((prev) => ({ ...prev, [goal.id]: e.target.value }))
                    }
                    className="design-input"
                  />
                  <div className="design-goal-add">
                    <LoadingButton
                      label="Add"
                      loadingText="..."
                      successText="Saved!"
                      onClick={() => handleFund(goal)}
                    />
                  </div>
                </div>

                {canWithdraw && Number(goal.current_amount) > 0 && (
                  <div className="design-goal-release">
                    <LoadingButton
                      label={`Release ₦${Number(goal.current_amount).toLocaleString()} to Wallet`}
                      loadingText="Releasing..."
                      successText="Released!"
                      variant="outline"
                      onClick={() => handleWithdraw(goal)}
                    />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Withdrawn / history */}
      {withdrawnGoals.length > 0 && (
        <section className="design-past" aria-label="Past savings goals">
          <div className="design-past-heading">
            <h2>Past Goals</h2>
          </div>
          <div className="design-card design-account-rows">
            {withdrawnGoals.map((goal) => (
              <div key={goal.id} className="design-past-row">
                <span className="design-icon-square">
                  <Unlock size={18} aria-hidden="true" />
                </span>
                <div>
                  <strong>{goal.name}</strong>
                </div>
                <span className="design-muted-chip">Withdrawn</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </ReferenceScreen>
  );
}
