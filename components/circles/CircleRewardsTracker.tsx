"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Gift, TrendingUp, Users, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { authorizedFetch, makeEffectController, isAbortError } from "@/lib/fetch";

type CircleReward = {
  id: string;
  rewardType: string;
  rewardPerMember: number;
  totalAmount: number;
  disbursed: boolean;
  earnedAt: string;
  disbursedAt?: string;
};

type CircleRewardsData = {
  rewards: CircleReward[];
  totalEarned: number;
  totalDisbursed: number;
  pendingRewards: number;
};

const rewardTypeLabels: Record<string, { label: string; icon: string; color: string }> = {
  perfect_month: {
    label: "Perfect Month",
    icon: "🎯",
    color: "text-green",
  },
  milestone_volume: {
    label: "Volume Milestone",
    icon: "💰",
    color: "text-blue-500",
  },
  member_growth: {
    label: "Member Growth",
    icon: "👥",
    color: "text-purple-500",
  },
  perfect_quarter: {
    label: "Perfect Quarter",
    icon: "👑",
    color: "text-amber-500",
  },
};

interface CircleRewardsTrackerProps {
  circleId: string;
}

export default function CircleRewardsTracker({ circleId }: CircleRewardsTrackerProps) {
  const [data, setData] = useState<CircleRewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { signal, cancel } = makeEffectController();
    let settled = false;

    const loadRewards = async () => {
      try {
        const response = await authorizedFetch(
          `/api/circles/${circleId}/rewards`,
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
        console.error("Failed to load circle rewards:", err);
      } finally {
        if (!settled) setLoading(false);
      }
    };

    loadRewards();
    return () => {
      settled = true;
      cancel();
    };
  }, [circleId]);

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
        <p className="font-bold text-card-foreground">Couldn&apos;t load rewards</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load rewards
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rewards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green/10 to-card border border-border rounded-2xl p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-green/20">
              <Gift className="w-5 h-5 text-green" />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Total Earned
            </p>
          </div>
          <p className="text-2xl font-black text-card-foreground">
            ₦{data.totalEarned.toLocaleString()}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-gradient-to-br from-blue-500/10 to-card border border-border rounded-2xl p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-blue-500/20">
              <CheckCircle className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Disbursed
            </p>
          </div>
          <p className="text-2xl font-black text-card-foreground">
            ₦{data.totalDisbursed.toLocaleString()}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-amber-500/10 to-card border border-border rounded-2xl p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Pending
            </p>
          </div>
          <p className="text-2xl font-black text-card-foreground">
            ₦{data.pendingRewards.toLocaleString()}
          </p>
        </motion.div>
      </div>

      {/* Rewards List */}
      {data.rewards.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-lg font-black text-card-foreground">
            Reward History
          </h3>
          {data.rewards.map((reward, index) => {
            const rewardInfo =
              rewardTypeLabels[reward.rewardType] || rewardTypeLabels.perfect_month;

            return (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-2xl border p-4 transition-all ${
                  reward.disbursed
                    ? "border-border bg-card"
                    : "border-green/30 bg-green/5"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-3xl">{rewardInfo.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-card-foreground">
                          {rewardInfo.label}
                        </h4>
                        {reward.disbursed ? (
                          <span className="px-2 py-0.5 rounded-full bg-green/20 text-green text-xs font-bold">
                            Paid
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold animate-pulse">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        ₦{reward.rewardPerMember.toLocaleString()} per member · Total: ₦
                        {reward.totalAmount.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Earned{" "}
                          {new Date(reward.earnedAt).toLocaleDateString("en-NG", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {reward.disbursed && reward.disbursedAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Paid{" "}
                            {new Date(reward.disbursedAt).toLocaleDateString("en-NG", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-secondary/50 rounded-2xl">
          <div className="inline-block p-4 rounded-2xl bg-secondary mb-4">
            <Gift className="w-12 h-12 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-bold mb-2">No rewards yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Maintain 100% on-time repayments, hit volume milestones, or grow your
            member base to earn circle rewards!
          </p>
        </div>
      )}

      {/* How to Earn More */}
      <div className="bg-gradient-to-br from-purple-500/10 via-card to-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-black text-card-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          How to Earn Circle Rewards
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="font-bold text-card-foreground text-sm">
                Perfect Month
              </p>
              <p className="text-xs text-muted-foreground">
                100% on-time repayments for 30 days · ₦100 per member
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <p className="font-bold text-card-foreground text-sm">
                Volume Milestones
              </p>
              <p className="text-xs text-muted-foreground">
                Reach ₦100K, ₦500K, or ₦1M in total loans · Up to ₦500 per member
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">👥</span>
            <div>
              <p className="font-bold text-card-foreground text-sm">
                Member Growth
              </p>
              <p className="text-xs text-muted-foreground">
                Grow to 10, 25, or 50 members · ₦50 per member at each milestone
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-2xl">👑</span>
            <div>
              <p className="font-bold text-card-foreground text-sm">
                Perfect Quarter
              </p>
              <p className="text-xs text-muted-foreground">
                100% on-time repayments for 90 days · ₦500 per member
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
