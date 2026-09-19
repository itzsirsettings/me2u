"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Trophy, Users, TrendingUp, Award, Crown, AlertCircle } from "lucide-react";
import Link from "next/link";
import { authorizedFetch, makeEffectController, isAbortError } from "@/lib/fetch";

type CircleLeaderboardEntry = {
  id: string;
  name: string;
  memberCount: number;
  totalVolume: number;
  onTimeRepaymentRate: number;
  performanceScore: number;
  totalLoansIssued: number;
  totalLoansRepaid: number;
  rank: number;
  isUserMember?: boolean;
};

type LeaderboardData = {
  leaderboard: CircleLeaderboardEntry[];
  total: number;
};

const rankColors = {
  1: "bg-gradient-to-br from-amber-400 to-amber-600 text-white",
  2: "bg-gradient-to-br from-gray-300 to-gray-500 text-white",
  3: "bg-gradient-to-br from-amber-600 to-amber-800 text-white",
};

const rankIcons = {
  1: Crown,
  2: Trophy,
  3: Award,
};

export default function CircleLeaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { signal, cancel } = makeEffectController();
    let settled = false;

    const loadLeaderboard = async () => {
      try {
        const response = await authorizedFetch(
          "/api/circles/leaderboard?limit=10",
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
        console.error("Failed to load circle leaderboard:", err);
      } finally {
        if (!settled) setLoading(false);
      }
    };

    loadLeaderboard();
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

  if (error && (!data || data.leaderboard.length === 0)) {
    return (
      <div className="text-center py-12 px-6 rounded-2xl border border-amber-500/30 bg-amber-500/5">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="font-bold text-card-foreground">Couldn&apos;t load leaderboard</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  if (!data || data.leaderboard.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-block p-4 rounded-2xl bg-secondary mb-4">
          <Trophy className="w-12 h-12 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No circles yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Be the first to create a high-performing circle!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-card-foreground flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Circle Leaderboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Top performing lending circles
          </p>
        </div>
      </div>

      {/* Top 3 Podium */}
      {data.leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Second Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="order-1"
          >
            <div className="text-center">
              <div className="relative inline-block mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-gray-400 flex items-center justify-center text-xs font-black">
                  2
                </div>
              </div>
              <p className="font-bold text-sm text-card-foreground mb-1 truncate">
                {data.leaderboard[1].name}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.leaderboard[1].performanceScore} pts
              </p>
            </div>
          </motion.div>

          {/* First Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="order-2"
          >
            <div className="text-center">
              <div className="relative inline-block mb-3">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/50">
                  <Crown className="w-10 h-10 text-white" />
                </div>
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-amber-500 flex items-center justify-center text-sm font-black text-amber-600"
                >
                  1
                </motion.div>
              </div>
              <p className="font-bold text-card-foreground mb-1 truncate">
                {data.leaderboard[0].name}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.leaderboard[0].performanceScore} pts
              </p>
            </div>
          </motion.div>

          {/* Third Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="order-3"
          >
            <div className="text-center">
              <div className="relative inline-block mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-amber-700 flex items-center justify-center text-xs font-black">
                  3
                </div>
              </div>
              <p className="font-bold text-sm text-card-foreground mb-1 truncate">
                {data.leaderboard[2].name}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.leaderboard[2].performanceScore} pts
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Full Leaderboard List */}
      <div className="space-y-3">
        {data.leaderboard.map((circle, index) => {
          const RankIcon = rankIcons[circle.rank as keyof typeof rankIcons];

          return (
            <motion.div
              key={circle.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`relative overflow-hidden rounded-2xl border transition-all ${
                circle.isUserMember
                  ? "border-green bg-green/5"
                  : "border-border bg-card hover:shadow-md"
              }`}
            >
              <div className="p-4">
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                      rankColors[circle.rank as keyof typeof rankColors] ||
                      "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {RankIcon ? (
                      <RankIcon className="w-6 h-6" />
                    ) : (
                      circle.rank
                    )}
                  </div>

                  {/* Circle Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-card-foreground truncate">
                        {circle.name}
                      </h3>
                      {circle.isUserMember && (
                        <span className="px-2 py-0.5 rounded-full bg-green/20 text-green text-xs font-bold">
                          Your Circle
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {circle.memberCount} members
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {circle.onTimeRepaymentRate.toFixed(0)}% on-time
                      </span>
                      <span>₦{circle.totalVolume.toLocaleString()} volume</span>
                    </div>
                  </div>

                  {/* Performance Score */}
                  <div className="text-right">
                    <p className="text-2xl font-black text-card-foreground">
                      {circle.performanceScore}
                    </p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                </div>
              </div>

              {/* Progress indicator for user's circle */}
              {circle.isUserMember && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-green/20">
                  <div
                    className="h-full bg-green transition-all"
                    style={{
                      width: `${Math.min(circle.performanceScore, 100)}%`,
                    }}
                  />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* View All Link */}
      <div className="text-center pt-4">
        <Link
          href="/circles"
          className="inline-block px-6 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-card-foreground font-bold transition-colors"
        >
          View All Circles
        </Link>
      </div>
    </div>
  );
}
