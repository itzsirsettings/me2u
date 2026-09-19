"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TrendingUp, Calendar, Shield, Zap, Info, AlertCircle } from "lucide-react";
import Link from "next/link";
import { authorizedFetch, makeEffectController, isAbortError } from "@/lib/fetch";

type LoanEligibility = {
  eligible: boolean;
  maxAmount: number;
  maxDuration: number;
  trustScore: number;
  securityDepositPercent: number;
  requiresDeposit: boolean;
  requiresKyc: boolean;
  nextUnlockAmount?: number;
  nextUnlockTrustScore?: number;
};

export default function InstantLoanPreview() {
  const [data, setData] = useState<LoanEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { signal, cancel } = makeEffectController();
    let settled = false;

    const loadEligibility = async () => {
      try {
        const response = await authorizedFetch(
          "/api/user/loan-eligibility",
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
        console.error("Failed to load loan eligibility:", err);
      } finally {
        if (!settled) setLoading(false);
      }
    };

    loadEligibility();
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
        <p className="font-bold text-card-foreground">Couldn&apos;t load loan preview</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Main Preview Card */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-green/30 bg-gradient-to-br from-green/10 via-card to-card p-8">
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                  Your Loan Access
                </p>
              </div>
              <h2 className="text-5xl font-black text-card-foreground">
                ₦{data.maxAmount.toLocaleString()}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                {data.eligible
                  ? "Available to borrow now"
                  : "Complete onboarding to unlock"}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-green/20">
              <TrendingUp className="w-8 h-8 text-green" />
            </div>
          </div>

          {/* Loan Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-secondary/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Max Duration
                </p>
              </div>
              <p className="text-2xl font-black text-card-foreground">
                {data.maxDuration} days
              </p>
            </div>

            <div className="bg-secondary/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-purple-500" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Trust Score
                </p>
              </div>
              <p className="text-2xl font-black text-card-foreground">
                {data.trustScore}/100
              </p>
            </div>
          </div>

          {/* Interest Rate Highlight */}
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-amber-600 mb-1">
                  Interest Rate
                </p>
                <p className="text-3xl font-black text-amber-600">0%</p>
              </div>
              <div className="text-5xl">🎉</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All loans on Me2U are completely interest-free
            </p>
          </div>

          {/* Security Deposit Info */}
          {data.securityDepositPercent > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-card-foreground mb-1">
                    Security Deposit Required
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You need {data.securityDepositPercent}% of the loan amount in
                    your wallet before borrowing. This stays in your wallet and
                    isn't deducted.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {data.eligible ? (
            <Link
              href="/loans"
              className="block w-full btn-primary py-4 text-center text-lg font-bold"
            >
              Request Loan Now
            </Link>
          ) : (
            <div className="space-y-3">
              {data.requiresDeposit && (
                <Link
                  href="/wallet"
                  className="block w-full btn-primary py-4 text-center text-lg font-bold"
                >
                  Complete Registration Deposit
                </Link>
              )}
              {!data.requiresDeposit && data.requiresKyc && (
                <Link
                  href="/kyc"
                  className="block w-full btn-primary py-4 text-center text-lg font-bold"
                >
                  Complete KYC Verification
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-green/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Next Unlock Card */}
      {data.nextUnlockAmount && data.nextUnlockTrustScore && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="text-lg font-black text-card-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green" />
            Next Level
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Reach trust score {data.nextUnlockTrustScore} to unlock
              </p>
              <p className="text-3xl font-black text-card-foreground">
                ₦{data.nextUnlockAmount.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">
                You're {data.nextUnlockTrustScore - data.trustScore} points away
              </p>
              <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green to-emerald-400"
                  style={{
                    width: `${(data.trustScore / data.nextUnlockTrustScore) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* How to Improve */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-6">
        <h3 className="text-lg font-black text-card-foreground mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-500" />
          Improve Your Loan Access
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2" />
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-card-foreground">
                Build trust score
              </span>{" "}
              — Complete KYC, repay loans on time, stay active
            </p>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2" />
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-card-foreground">
                Maintain wallet balance
              </span>{" "}
              — Keep the security deposit ready
            </p>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2" />
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-card-foreground">
                Join circles
              </span>{" "}
              — Group lending unlocks even more opportunities
            </p>
          </li>
        </ul>
      </div>
    </motion.div>
  );
}
