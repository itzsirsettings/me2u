"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TrendingUp, Users, Award, Target } from "lucide-react";

type PlatformStats = {
  totalBorrowed: number;
  totalRepaid: number;
  activeCircles: number;
  totalUsers: number;
  successfulLoans: number;
  activeLoans: number;
  trustScoreAvg: number;
};

const defaultStats: PlatformStats = {
  totalBorrowed: 0,
  totalRepaid: 0,
  activeCircles: 0,
  totalUsers: 0,
  successfulLoans: 0,
  activeLoans: 0,
  trustScoreAvg: 85,
};

export default function PlatformStatsWidget() {
  const [stats, setStats] = useState<PlatformStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const response = await fetch("/api/platform/stats", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!cancelled && data.ok && data.stats) {
          setStats(data.stats);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load platform stats:", error);
        if (!cancelled) setLoading(false);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30s

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

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
      label: "Trusted Members",
      value: loading ? "—" : stats.totalUsers.toLocaleString(),
      subtitle: `${stats.activeCircles} active circles`,
      color: "text-blue-500",
    },
    {
      icon: Award,
      label: "Success Rate",
      value: loading
        ? "—"
        : `${Math.round((stats.successfulLoans / Math.max(stats.successfulLoans + stats.activeLoans, 1)) * 100)}%`,
      subtitle: `${stats.successfulLoans} repaid loans`,
      color: "text-amber-500",
    },
    {
      icon: Target,
      label: "Trust Score",
      value: loading ? "—" : `${Math.round(stats.trustScoreAvg)}/100`,
      subtitle: "Community average",
      color: "text-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <p className="text-2xl font-black text-card-foreground mb-1">
            {stat.value}
          </p>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
            {stat.label}
          </p>
          <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
        </motion.div>
      ))}
    </div>
  );
}
