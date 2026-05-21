"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Icons8Icon from "@/components/Icons8Icon";
import { Card } from "@/components/ui/card";
import { motion, type Variants } from "framer-motion";

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

export default function ReferralsPage() {
  const user = useStore((s) => s.user);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const isLoading = useStore((s) => s.isLoading);
  const router = useRouter();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState("");

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
      fetchReferrals();
    }
  }, [isAuthenticated]);

  async function authorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Please log in first.");
    return fetch(input, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  }

  async function fetchReferrals() {
    try {
      const res = await authorizedFetch("/api/referrals");
      if (!res.ok) throw new Error("Failed to fetch referrals");
      const data = await res.json();
      setStats(data.stats);
      setReferrals(data.referrals);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load referrals");
    } finally {
      setLoading(false);
    }
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
                <Icons8Icon name="referral" size={22} />
              </div>
              <div>
                <h2 className="text-lg font-display leading-none">Your Referral Link</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">Share and earn ₦500 per referral</p>
              </div>
            </div>
            <button
              onClick={shareLink}
              className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs font-bold hover:bg-[var(--color-hover-soft)]"
            >
              Share
            </button>
          </div>

          <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
            Earn ₦250 when your referral makes their first withdrawal, and another ₦250 when they complete their first loan repayment.
          </p>

          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-[5px] bg-[var(--color-bg-secondary)] px-4 py-3 text-sm font-mono truncate">
              {referralLink}
            </code>
            <button
              onClick={copyLink}
              className="rounded-[5px] bg-[var(--color-accent-primary)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--color-accent-primary)]/90"
            >
              {copied ? "✓" : "Copy"}
            </button>
          </div>
        </Card>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Invited" value={stats.total_referrals} icon="referral" />
            <StatCard label="Pending" value={stats.pending_withdrawal + stats.pending_repayment} icon="alert" />
            <StatCard label="Earned" value={`₦${stats.total_earned.toLocaleString()}`} icon="moneyBag" highlight />
            <StatCard label="Max Potential" value={`₦${(stats.total_referrals * 500).toLocaleString()}`} icon="trophy" />
          </div>
        )}

        {/* How It Works */}
        <Card className="kinetic-border bg-[var(--color-bg-card)] p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:p-6">
          <h2 className="mb-4 text-lg font-display">How It Works</h2>
          <div className="space-y-4">
            <RewardStep step={1} title="Friend signs up" description="They create an account using your link" reward={null} />
            <RewardStep step={2} title="Friend completes KYC" description="They verify their identity" reward={null} />
            <RewardStep step={3} title="Friend makes first withdrawal" description="They withdraw money to their bank" reward="+₦250" />
            <RewardStep step={4} title="Friend completes first loan repayment" description="They borrow and repay successfully" reward="+₦250" />
          </div>
          <p className="mt-4 text-xs text-[var(--color-text-secondary)]">
            <strong>Note:</strong> Rewards are wallet credit, not cash. You can use them to borrow or withdraw after making your own withdrawal first.
          </p>
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
                      <StepBadge done label="Signed up" />
                      <StepBadge done label="KYC" />
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
            <Icons8Icon name="referral" size={48} className="mx-auto mb-4 text-[var(--color-text-secondary)]" />
            <h3 className="mb-2 text-lg font-display">No referrals yet</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">Share your link and start earning wallet credit today.</p>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: string | number; icon: string; highlight?: boolean }) {
  return (
    <Card className={`kinetic-border p-4 shadow-[4px_4px_0px_var(--color-shadow)] ${highlight ? "border-[var(--color-accent-primary)]/20 bg-[var(--color-accent-primary)]/5" : "bg-[var(--color-bg-card)]"}`}>
      <div className="mb-2 flex items-center gap-2 text-[var(--color-text-secondary)]">
        <Icons8Icon name={icon as any} size={18} />
      </div>
      <p className="text-2xl font-display font-bold">{value}</p>
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
    </Card>
  );
}

function RewardStep({ step, title, description, reward }: { step: number; title: string; description: string; reward: string | null }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-secondary)] text-sm font-bold">{step}</div>
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
      <Icons8Icon name={done ? "check" : "alert"} size={10} />
      {label}
    </span>
  );
}
