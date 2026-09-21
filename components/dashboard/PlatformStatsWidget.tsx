"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TrendingUp, Users, Award, Target } from "lucide-react";
import type { PlatformStats } from "@/lib/server/platform-stats";

export default function PlatformStatsWidget() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const response = await fetch("/api/platform/stats", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || !data.ok || !data.stats) {
          throw new Error("Platform statistics unavailable.");
        }
        if (!cancelled) {
          setStats(data.stats);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30s

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [attempt]);

  if (!stats) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4" role="status">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading community activity…" : "Community activity is unavailable."}
        </p>
        {failed && (
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-primary"
            onClick={() => {
              setLoading(true);
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  const statCards = [
    {
      icon: TrendingUp,
      label: "Community Activity",
      value: loading ? "—" : `₦${stats.totalBorrowed.toLocaleString()}`,
      subtitle: "Total borrowed",
      color: "text-green",
    },
    {
      icon: Users,
      label: "Community Members",
      value: loading ? "—" : stats.totalUsers.toLocaleString(),
      subtitle: `${stats.activeCircles} active circles`,
      color: "text-blue-500",
    },
    {
      icon: Award,
      label: "Loans Repaid",
      value: loading
        ? "—"
        : `${Math.round((stats.successfulLoans / Math.max(stats.successfulLoans + stats.activeLoans, 1)) * 100)}%`,
      subtitle: `${stats.successfulLoans} repaid loans`,
      color: "text-amber-500",
    },
    {
      icon: Target,
      label: "Trust Score",
      value: stats.trustScoreAvg === null ? "—" : `${Math.round(stats.trustScoreAvg)}/100`,
      subtitle:
        stats.trustScoreAvg === null ? "No verified members yet" : "Verified member average",
      color: "text-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {failed && (
        <p className="col-span-full text-xs text-muted-foreground" role="status">
          Showing the last loaded activity. Refresh will retry automatically.
        </p>
      )}
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-xl bg-secondary ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-card-foreground mb-1">{stat.value}</p>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
            {stat.label}
          </p>
          <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
        </motion.div>
      ))}
    </div>
  );
}
