"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TrendingUp, Target, Award, Zap, AlertCircle } from "lucide-react";
import { authorizedFetch, makeEffectController, isAbortError } from "@/lib/fetch";

type TrustData = {
  currentScore: number;
  currentMilestone: number;
  nextMilestone: number;
  milestones: Array<{
    milestoneScore: number;
    reachedAt: string;
    celebrated: boolean;
  }>;
  allMilestones: Array<{
    score: number;
    reached: boolean;
    isCurrent: boolean;
  }>;
  firstName: string;
};

const milestoneRewards: Record<number, string> = {
  50: "Wallet verified",
  60: "Active borrower",
  70: "Trusted member",
  80: "Elite status",
  85: "Premium access",
  90: "Trust builder",
  95: "Exceptional",
  100: "Perfect trust",
};

export default function TrustScoreProgress() {
  const [data, setData] = useState<TrustData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { signal, cancel } = makeEffectController();
    let settled = false;

    const loadTrustData = async () => {
      try {
        const response = await authorizedFetch(
          "/api/user/trust-milestones",
          { cache: "no-store", signal },
        );
        const result = await response.json().catch(() => ({}));

        if (result.ok) {
          setData(result);
          setError(null);
        } else if (typeof result.error === "string") {
          setError(result.error);
        }
      } catch (err) {
        if (isAbortError(err)) return;
        const msg = err instanceof Error ? err.message : "Failed to load";
        setError(msg);
        console.error("Failed to load trust data:", err);
      } finally {
        if (!settled) setLoading(false);
      }
    };

    loadTrustData();
    return () => {
      settled = true;
      cancel();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-12 px-6 rounded-2xl border border-amber-500/30 bg-amber-500/5">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="font-bold text-card-foreground">Couldn&apos;t load trust score</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load trust score
      </div>
    );
  }

  const progressToNext =
    ((data.currentScore - data.currentMilestone) /
      (data.nextMilestone - data.currentMilestone)) *
    100;

  return (
    <div className="space-y-6">
      {/* Current Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-green/10 via-card to-card p-8"
      >
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-2">
                Your Trust Score
              </p>
              <h2 className="text-6xl font-black text-card-foreground">
                {data.currentScore}
                <span className="text-3xl text-muted-foreground">/100</span>
              </h2>
            </div>
            <div className="p-3 rounded-2xl bg-green/20">
              <TrendingUp className="w-8 h-8 text-green" />
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Next milestone: {data.nextMilestone}
              </span>
              <span className="font-bold text-green">
                {Math.round(progressToNext)}%
              </span>
            </div>
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressToNext}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-green to-emerald-400"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {data.nextMilestone - data.currentScore} points to go
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="px-4 py-2 rounded-xl bg-secondary border border-border">
              <p className="text-xs text-muted-foreground">Current Level</p>
              <p className="font-bold text-card-foreground">
                {milestoneRewards[data.currentMilestone] || "Building trust"}
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-green/10 border border-green/20">
              <p className="text-xs text-green">Next Level</p>
              <p className="font-bold text-green">
                {milestoneRewards[data.nextMilestone] || "Maximum trust"}
              </p>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-green/5 rounded-full blur-3xl" />
      </motion.div>

      {/* Milestone Journey */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-xl font-black text-card-foreground mb-6 flex items-center gap-2">
          <Award className="w-5 h-5 text-green" />
          Your Trust Journey
        </h3>

        <div className="relative">
          {/* Progress Line */}
          <div className="absolute left-6 top-0 bottom-0 w-1 bg-secondary" />
          <div
            className="absolute left-6 top-0 w-1 bg-gradient-to-b from-green to-emerald-400 transition-all duration-1000"
            style={{
              height: `${(data.milestones.length / data.allMilestones.length) * 100}%`,
            }}
          />

          {/* Milestones */}
          <div className="space-y-6">
            {data.allMilestones.map((milestone, index) => {
              const isReached = milestone.reached;
              const isCurrent = milestone.isCurrent;

              return (
                <motion.div
                  key={milestone.score}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative flex items-center gap-4"
                >
                  {/* Milestone Dot */}
                  <div
                    className={`relative z-10 w-12 h-12 rounded-full border-4 flex items-center justify-center font-black text-sm transition-all ${
                      isReached
                        ? "border-green bg-green text-white"
                        : isCurrent
                          ? "border-green bg-card text-green animate-pulse"
                          : "border-secondary bg-card text-muted-foreground"
                    }`}
                  >
                    {isReached ? "✓" : milestone.score}
                  </div>

                  {/* Milestone Info */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-card-foreground">
                          {milestoneRewards[milestone.score] || `Level ${milestone.score}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Trust score: {milestone.score}
                        </p>
                      </div>
                      {isReached && (
                        <div className="px-3 py-1 rounded-full bg-green/10 text-green text-xs font-bold">
                          Achieved
                        </div>
                      )}
                      {isCurrent && !isReached && (
                        <div className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          In Progress
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-gradient-to-br from-blue-500/10 via-card to-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-black text-card-foreground mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Quick Ways to Boost Your Score
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green mt-2" />
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-card-foreground">
                Complete KYC
              </span>{" "}
              — Get +18 points instantly
            </p>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green mt-2" />
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-card-foreground">
                Repay loans on time
              </span>{" "}
              — Earn +18 points for completed loans
            </p>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green mt-2" />
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-card-foreground">
                Stay active
              </span>{" "}
              — Regular wallet activity adds +12 points
            </p>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green mt-2" />
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-card-foreground">
                Refer friends
              </span>{" "}
              — Get +10 points for 5+ verified referrals
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
}
