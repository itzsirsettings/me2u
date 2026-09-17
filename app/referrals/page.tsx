"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { authorizedFetch as _authorizedFetch } from "@/lib/fetch";
import { toast } from "sonner";
import Me2uIcon from "@/components/Me2uIcon";
import { Card } from "@/components/ui/card";
import { motion, type Variants } from "framer-motion";
import ShareTemplatesModal from "@/components/referrals/ShareTemplatesModal";

interface ReferralStats {
  total_referrals: number;
  pending_withdrawal: number;
  pending_repayment: number;
  earned_withdrawal: number;
  earned_repayment: number;
  total_earned: number;
}

interface ReferralDetail {
  referee_id: string;
  referee_name: string;
  referee_email: string;
  referee_trust_score: number;
  referee_kyc_verified: boolean;
  signed_up_at: string;
  first_withdrawal_rewarded: boolean;
  first_repayment_rewarded: boolean;
  pending_rewards: string;
}

interface Challenge {
  active: boolean;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
  week_end: string;
}

interface Milestone {
  type: string;
  referralCount: number;
  rewardAmount: number;
  badgeAwarded: string | null;
  achieved: boolean;
  achievedAt: string | null;
  rewardPaid: boolean;
  progress: number;
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  referral_count: number;
  verified_referral_count: number;
  rank: number;
  prizeAmount: number | null;
  is_current_user: boolean;
}

export default function ReferralsPage() {
  const user = useStore((s) => s.user);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const isLoading = useStore((s) => s.isLoading);
  const router = useRouter();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralDetail[]>([]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userPosition, setUserPosition] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "challenge" | "milestones" | "leaderboard">("overview");

  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setReferralLink(user?.username ? `${origin}/r/${user.username}` : `${origin}/r/XXXX`);
  }, [user?.username]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  async function fetchAllData() {
    try {
      const [referralsRes, challengeRes, milestonesRes, leaderboardRes] = await Promise.all([
        authorizedFetch("/api/referrals"),
        authorizedFetch("/api/referrals/challenges"),
        authorizedFetch("/api/referrals/milestones"),
        authorizedFetch("/api/referrals/leaderboard?period=current"),
      ]);

      if (referralsRes.ok) {
        const data = await referralsRes.json();
        setStats(data.stats);
        setReferrals(data.referrals);
      }

      if (challengeRes.ok) {
        const data = await challengeRes.json();
        setChallenge(data.current);
      }

      if (milestonesRes.ok) {
        const data = await milestonesRes.json();
        setMilestones(data.milestones);
      }

      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setLeaderboard(data.leaderboard.slice(0, 10));
        setUserPosition(data.userPosition);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load referral data");
    } finally {
      setLoading(false);
    }
  }

  async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    return _authorizedFetch(input, init);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Please copy the link manually.");
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on me2u",
          text: "Sign up using my referral link and get access to instant loans!",
          url: referralLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      copyLink();
    }
  }

  function getWeekEndCountdown() {
    if (!challenge?.week_end) return "";
    const now = new Date();
    const end = new Date(challenge.week_end);
    const diff = end.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-accent-primary)] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated && !isLoading) return null;

  return (
    <motion.div
      className="app-mobile-screen mx-auto flex w-full max-w-md flex-col items-center px-3.5 pt-[4.85rem] md:max-w-3xl md:px-6 md:py-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.h1 variants={itemVariants} className="sr-only md:not-sr-only md:mb-12 md:text-7xl md:font-display md:leading-[0.85] md:tracking-tighter">
        Refer & Earn
      </motion.h1>

      <motion.div variants={itemVariants} className="w-full space-y-4 md:space-y-6">
        {/* Referral Link Card */}
        <Card className="kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
                <Me2uIcon name="referral" size={22} />
              </div>
              <div>
                <h2 className="text-lg font-display leading-none">Your Referral Link</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">Share and earn rewards</p>
              </div>
            </div>
            <button
              onClick={() => setShowShareModal(true)}
              className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-accent-primary)] text-[var(--color-on-accent)] px-3 py-2 text-xs font-bold hover:bg-[var(--color-accent-primary)]/90"
            >
              Share Templates
            </button>
          </div>

          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-[5px] bg-[var(--color-bg-secondary)] px-4 py-3 text-sm font-mono truncate">
              {referralLink}
            </code>
            <button
              onClick={copyLink}
              className="rounded-[5px] bg-[var(--color-accent-primary)] px-4 py-3 text-sm font-bold text-[var(--color-on-accent)] hover:bg-[var(--color-accent-primary)]/90"
            >
              {copied ? "✓" : "Copy"}
            </button>
          </div>

          {/* Unlock Status */}
          {user && !user.accountUnlocked && (user.verifiedReferralCount || 0) < 10 && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                ⚠️ {10 - (user.verifiedReferralCount || 0)} more verified referrals to unlock withdrawals
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Or pay ₦2,000 one-time fee to unlock instantly
              </p>
            </div>
          )}
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: "overview", label: "Overview", icon: "dashboard" },
            { id: "challenge", label: "Challenge", icon: "fire" },
            { id: "milestones", label: "Milestones", icon: "trophy" },
            { id: "leaderboard", label: "Leaderboard", icon: "star" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-[var(--color-accent-primary)] text-[var(--color-on-accent)]"
                  : "bg-[var(--color-bg-secondary)] hover:bg-[var(--color-hover-soft)]"
              }`}
            >
              <Me2uIcon name={tab.icon as any} size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Invited" value={stats.total_referrals} icon="referral" />
                <StatCard label="Verified" value={user?.verifiedReferralCount || 0} icon="check" />
                <StatCard label="Earned" value={`₦${stats.total_earned.toLocaleString()}`} icon="moneyBag" highlight />
                <StatCard label="Potential" value={`₦${(stats.total_referrals * 500).toLocaleString()}`} icon="trophy" />
              </div>
            )}

            {/* How It Works */}
            <Card className="kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-6">
              <h2 className="mb-4 text-lg font-display">How It Works</h2>
              <div className="space-y-4">
                <RewardStep step={1} title="Friend signs up" description="They get ₦1,500 welcome bonus" reward="+₦1,500" highlight />
                <RewardStep step={2} title="Friend completes KYC" description="They verify their identity" reward={null} />
                <RewardStep step={3} title="Friend makes first withdrawal" description="You earn your first reward" reward="+₦250" />
                <RewardStep step={4} title="Friend completes first loan repayment" description="You earn your second reward" reward="+₦250" />
              </div>
              <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-xs text-[var(--color-text-secondary)]">
                  <strong>Total per referral:</strong> ₦500 (you) + ₦1,500 (them) = ₦2,000 value! 🎉
                </p>
              </div>
            </Card>

            {/* Referral List */}
            {referrals.length > 0 && (
              <Card className="kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-6">
                <h2 className="mb-4 text-lg font-display">Your Referrals</h2>
                <div className="space-y-3">
                  {referrals.map((ref) => (
                    <div key={ref.referee_id} className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-[var(--color-text-primary)]">{ref.referee_name}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{ref.pending_rewards}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <StepBadge done label="Signed" />
                          <StepBadge done={ref.referee_kyc_verified} label="KYC" />
                          <StepBadge done={ref.first_withdrawal_rewarded} label="Withdrawal" />
                          <StepBadge done={ref.first_repayment_rewarded} label="Repayment" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {referrals.length === 0 && (
              <Card className="kinetic-border bg-[var(--color-bg-card)] p-12 text-center shadow-[4px_4px_0px_var(--color-shadow)]">
                <Me2uIcon name="referral" size={48} className="mx-auto mb-4 text-[var(--color-text-secondary)]" />
                <h3 className="mb-2 text-lg font-display">No referrals yet</h3>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">Share your link and start earning today.</p>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="btn-primary px-6 py-3 rounded-xl font-bold"
                >
                  Use Share Templates
                </button>
              </Card>
            )}
          </>
        )}

        {/* Challenge Tab */}
        {activeTab === "challenge" && challenge && (
          <Card className="kinetic-border bg-gradient-to-br from-orange-500/10 to-red-500/10 border-2 border-orange-500/30 p-6 shadow-[4px_4px_0px_var(--color-shadow)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-orange-500 text-white">
                <Me2uIcon name="fire" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">Weekly Challenge</h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {getWeekEndCountdown()}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Progress</span>
                <span className="text-sm font-bold">
                  {challenge.current} / {challenge.target} verified
                </span>
              </div>
              <div className="h-4 rounded-full bg-[var(--color-bg-secondary)] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-500"
                  style={{ width: `${(challenge.current / challenge.target) * 100}%` }}
                />
              </div>
            </div>

            {challenge.completed ? (
              <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/30 text-center">
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  🎉 Challenge Complete!
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  You earned ₦{challenge.reward.toLocaleString()} bonus!
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                <p className="text-lg font-bold text-center">
                  Refer {challenge.target - challenge.current} more verified users this week
                </p>
                <p className="text-3xl font-display font-bold text-center mt-2 text-[var(--color-accent-primary)]">
                  Win ₦{challenge.reward.toLocaleString()}!
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Milestones Tab */}
        {activeTab === "milestones" && (
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <Card
                key={milestone.type}
                className={`kinetic-border p-5 shadow-[4px_4px_0px_var(--color-shadow)] ${
                  milestone.achieved
                    ? "bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-2 border-yellow-500/30"
                    : "bg-[var(--color-bg-card)]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Me2uIcon
                        name="trophy"
                        size={20}
                        className={milestone.achieved ? "text-yellow-500" : "text-[var(--color-text-secondary)]"}
                      />
                      <h3 className="font-bold">{milestone.referralCount} Referrals</h3>
                      {milestone.achieved && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 font-bold">
                          ✓ Achieved
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                      Reward: ₦{milestone.rewardAmount.toLocaleString()} + {milestone.badgeAwarded} badge
                    </p>
                    {!milestone.achieved && (
                      <>
                        <div className="h-2 rounded-full bg-[var(--color-bg-secondary)] overflow-hidden mb-2">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-500"
                            style={{ width: `${milestone.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {milestone.progress}% complete
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === "leaderboard" && (
          <Card className="kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-6">
            <h2 className="mb-4 text-lg font-display">Monthly Leaderboard</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Top 10 referrers win prizes from ₦5K to ₦50K!
            </p>

            {userPosition && userPosition.rank > 10 && (
              <div className="mb-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm font-semibold">Your Position</p>
                <p className="text-lg font-bold">
                  Rank #{userPosition.rank} · {userPosition.verified_referral_count} verified referrals
                </p>
              </div>
            )}

            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    entry.is_current_user
                      ? "bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/30"
                      : "bg-[var(--color-bg-secondary)]"
                  }`}
                >
                  <div
                    className={`h-8 w-8 flex items-center justify-center rounded-full font-bold text-sm ${
                      index === 0
                        ? "bg-yellow-500 text-white"
                        : index === 1
                          ? "bg-gray-400 text-white"
                          : index === 2
                            ? "bg-amber-600 text-white"
                            : "bg-[var(--color-bg-card)]"
                    }`}
                  >
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : entry.rank}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {entry.is_current_user ? "You" : entry.username}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {entry.verified_referral_count} verified referrals
                    </p>
                  </div>
                  {entry.prizeAmount && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        ₦{entry.prizeAmount.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </motion.div>

      {/* Share Templates Modal */}
      {showShareModal && user?.username && (
        <ShareTemplatesModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          referralLink={referralLink}
          username={user.username}
        />
      )}
    </motion.div>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: string | number; icon: string; highlight?: boolean }) {
  return (
    <Card className={`kinetic-border p-4 shadow-[4px_4px_0px_var(--color-shadow)] ${highlight ? "border-[var(--color-accent-primary)]/20 bg-[var(--color-accent-primary)]/5" : "bg-[var(--color-bg-card)]"}`}>
      <div className="mb-2 flex items-center gap-2 text-[var(--color-text-secondary)]">
        <Me2uIcon name={icon as any} size={18} />
      </div>
      <p className="text-2xl font-display font-bold">{value}</p>
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
    </Card>
  );
}

function RewardStep({ step, title, description, reward, highlight }: { step: number; title: string; description: string; reward: string | null; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-4">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${highlight ? "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]" : "bg-[var(--color-bg-secondary)]"}`}>{step}</div>
      <div className="flex-1">
        <p className="font-semibold text-[var(--color-text-primary)]">{title}</p>
        <p className="text-xs text-[var(--color-text-secondary)]">{description}</p>
      </div>
      {reward && (
        <span className="shrink-0 rounded-full bg-[var(--color-positive-bg)] px-3 py-1 text-xs font-bold text-[var(--color-positive-text)]">
          {reward}
        </span>
      )}
    </div>
  );
}

function StepBadge({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${done ? "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]" : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)]"}`}>
      <Me2uIcon name={done ? "check" : "alert"} size={10} />
      {label}
    </span>
  );
}
