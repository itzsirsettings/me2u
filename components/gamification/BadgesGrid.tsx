"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

type Badge = {
  id: string;
  badgeType: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  rarity: string;
  rewardAmount: number;
  earned: boolean;
  earnedAt?: string;
};

type BadgesData = {
  badges: Badge[];
  earnedCount: number;
  totalCount: number;
  progress: number;
};

const rarityColors = {
  common: "border-gray-500 bg-gray-500/10",
  rare: "border-blue-500 bg-blue-500/10",
  epic: "border-purple-500 bg-purple-500/10",
  legendary: "border-amber-500 bg-amber-500/10",
};

const categoryLabels: Record<string, string> = {
  trust: "Trust Building",
  lending: "Lending",
  borrowing: "Borrowing",
  circles: "Circle Activity",
  referrals: "Referrals",
  education: "Financial Literacy",
  milestones: "Milestones",
  repayment: "Repayment",
};

export default function BadgesGrid() {
  const [data, setData] = useState<BadgesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    const loadBadges = async () => {
      try {
        const response = await fetch("/api/user/badges", { cache: "no-store" });
        const result = await response.json();

        if (result.ok) {
          setData(result);
        }
      } catch (error) {
        console.error("Failed to load badges:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBadges();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load badges
      </div>
    );
  }

  const categories = [
    "all",
    ...Array.from(new Set(data.badges.map((b) => b.category))),
  ];

  const filteredBadges =
    selectedCategory === "all"
      ? data.badges
      : data.badges.filter((b) => b.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-black text-card-foreground">
              Badge Collection
            </h3>
            <p className="text-sm text-muted-foreground">
              {data.earnedCount} of {data.totalCount} badges earned
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-green">{data.progress}%</p>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-green to-emerald-400"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-green text-white"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {cat === "all" ? "All Badges" : categoryLabels[cat] || cat}
          </button>
        ))}
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBadges.map((badge, index) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative overflow-hidden rounded-2xl border-2 p-6 transition-all ${
              badge.earned
                ? rarityColors[badge.rarity as keyof typeof rarityColors] ||
                  rarityColors.common
                : "border-border bg-secondary/50 opacity-60"
            } ${badge.earned ? "hover:shadow-lg hover:scale-105" : ""}`}
          >
            {/* Earned Badge */}
            {badge.earned && (
              <div className="absolute top-3 right-3">
                <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
              </div>
            )}

            {/* Locked Badge */}
            {!badge.earned && (
              <div className="absolute top-3 right-3 text-muted-foreground">
                <Lock className="w-4 h-4" />
              </div>
            )}

            <div className="flex flex-col items-center text-center space-y-3">
              <div
                className={`text-5xl ${
                  badge.earned ? "filter-none" : "grayscale opacity-40"
                }`}
              >
                {badge.icon}
              </div>

              <div>
                <h4 className="font-black text-card-foreground mb-1">
                  {badge.name}
                </h4>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-bold mb-2">
                  {badge.rarity}
                </p>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {badge.description}
              </p>

              {badge.rewardAmount > 0 && (
                <div
                  className={`mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                    badge.earned
                      ? "bg-green/20 text-green"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {badge.earned ? "Earned" : "Reward"}: ₦
                  {badge.rewardAmount.toLocaleString()}
                </div>
              )}

              {badge.earned && badge.earnedAt && (
                <p className="text-xs text-muted-foreground">
                  Earned{" "}
                  {new Date(badge.earnedAt).toLocaleDateString("en-NG", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
