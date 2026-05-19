"use client";

import Icons8Icon from "@/components/Icons8Icon";
import ThemeModeSelector from "@/components/ThemeModeSelector";
import {
  getCountryConfig,
  getCreditBuilderBadges,
  getCreditLevel,
  getReferralProgramProgress,
  getTrustScoreBreakdown,
  referralProgramLevels,
} from "@/lib/product-features";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function Profile() {
  const user = useStore((state) => state.user);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const transactions = useStore((state) => state.transactions);
  const activeLoans = useStore((state) => state.activeLoans);
  const logout = useStore((state) => state.logout);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  if (!mounted || (!isAuthenticated && !isLoading)) return null;
  const referralLink = mounted ? `${window.location.origin}/register?ref=${user?.username || ""}` : "";
  const trustScore = Math.max(0, Math.min(100, user?.trustScore || 0));
  const trustLevel = getCreditLevel(trustScore);
  const trustBreakdown = getTrustScoreBreakdown(user, transactions, activeLoans);
  const creditBadges = getCreditBuilderBadges(user, transactions, activeLoans);
  const country = getCountryConfig(user?.countryCode);
  const referralProgress = getReferralProgramProgress(user);

  return (
    <div className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[4.85rem] md:max-w-3xl md:p-6 md:py-24">
      <h1 className="sr-only md:not-sr-only md:mb-8 md:text-3xl md:font-display md:font-bold md:leading-none">
        Profile
      </h1>
      <div className="mobile-soft-card space-y-3 rounded-[5px] border border-[var(--color-border)] bg-card p-3.5 shadow-[4px_4px_0px_var(--color-shadow)] md:space-y-6 md:p-8">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
            <Icons8Icon name="referral" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Referral Link</p>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <p className="min-w-0 flex-1 truncate rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1 font-mono text-sm">
                {referralLink || "..."}
              </p>
              <button
                onClick={() => {
                  if (!referralLink) return;
                  if (!navigator.clipboard?.writeText) {
                    toast.error("Copy is unavailable in this browser.");
                    return;
                  }

                  void navigator.clipboard
                    .writeText(referralLink)
                    .then(() => toast.success("Referral link copied!"))
                    .catch(() => toast.error("Unable to copy link."));
                }}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--color-accent-primary)] transition hover:bg-[var(--color-hover-soft)]"
                aria-label="Copy referral link"
                title="Copy Link"
              >
                <Icons8Icon name="tap" size={20} />
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              Earn ₦500 after your referred friend completes verified onboarding.
            </p>
          </div>
        </div>
        <div className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3.5">
          <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Referral Level</p>
              <p className="mt-1 text-2xl font-display font-bold leading-none">
                {referralProgress.currentLevel?.name || "Starter"} • {referralProgress.currentLevel?.badge || "Bronze"}
              </p>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]">
              <Icons8Icon name="trophy" size={23} />
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-[5px] bg-[var(--color-bg-card)] p-3">
              <p className="text-xs font-bold text-[var(--color-text-secondary)]">Verified referrals</p>
              <p className="mt-1 font-mono text-lg font-bold">{referralProgress.verifiedReferralCount}</p>
            </div>
            <div className="rounded-[5px] bg-[var(--color-bg-card)] p-3">
              <p className="text-xs font-bold text-[var(--color-text-secondary)]">This week</p>
              <p className="mt-1 font-mono text-lg font-bold">{referralProgress.weeklyVerifiedReferralCount}</p>
            </div>
            <div className="rounded-[5px] bg-[var(--color-bg-card)] p-3">
              <p className="text-xs font-bold text-[var(--color-text-secondary)]">Invite 5 bonus</p>
              <p className="mt-1 font-mono text-lg font-bold">{referralProgress.inviteFiveProgress}/5</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-bg-card)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent-primary)]"
              style={{ width: `${referralProgress.nextProgressPercent}%` }}
            />
          </div>
          <div className="mt-3 overflow-hidden rounded-[5px] border border-[var(--color-border)]">
            {referralProgramLevels.map((level) => (
              <div key={level.name} className="grid grid-cols-[0.85fr_1fr_1fr] gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-card)] p-2.5 text-[11px] last:border-b-0">
                <span className="truncate font-black">{level.name}</span>
                <span className="truncate text-[var(--color-text-secondary)]">{level.summary}</span>
                <span className="truncate text-right font-bold">{level.reward}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="btn-ghost min-h-11 text-sm"
              onClick={() => toast.info("City, state, campus, and business leaderboards open after verified referral activity.")}
            >
              Leaderboards
            </button>
            <button
              type="button"
              className="btn-ghost min-h-11 text-sm"
              onClick={() => toast.info("Campus and business ambassador applications will open from this profile.")}
            >
              Ambassador Program
            </button>
          </div>
        </div>
        <div className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3.5">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Me2U Trust Score</p>
              <p className="mt-1 text-2xl font-display font-bold leading-none">{trustScore}/100</p>
            </div>
            <span className={`shrink-0 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1 text-xs font-black ${trustLevel.color}`}>
              {trustLevel.name}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-card)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent-primary)]"
              style={{ width: `${trustScore}%` }}
            />
          </div>
          <div className="mt-3 grid gap-2">
            {trustBreakdown.map((signal) => (
              <div key={signal.label} className="flex min-w-0 items-center justify-between gap-3 text-xs">
                <span className="min-w-0">
                  <b className="block truncate text-[var(--color-text-primary)]">{signal.label}</b>
                  <span className="block truncate text-[var(--color-text-secondary)]">{signal.detail}</span>
                </span>
                <span className="shrink-0 font-mono font-bold">{signal.earned}/{signal.weight}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3.5">
          <div className="mb-3 flex items-center gap-2">
            <Icons8Icon name="certificate" size={22} className="text-[var(--color-accent-primary)]" />
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Credit Builder</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {creditBadges.map((badge) => (
              <div key={badge.label} className="rounded-[5px] bg-[var(--color-bg-card)] p-3">
                <p className="truncate text-sm font-bold">{badge.label}</p>
                <p className={badge.active ? "mt-1 text-xs font-semibold text-[var(--color-positive-text)]" : "mt-1 text-xs font-semibold text-[var(--color-text-secondary)]"}>
                  {badge.value}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]">
            <Icons8Icon name="moneyBag" size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Affiliate Earnings</p>
            <p className="overflow-anywhere">₦{(user?.affiliateEarnings || 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]">
            <Icons8Icon name={user?.kycVerified ? "check" : "shield"} size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">KYC</p>
            <p className={user?.kycVerified ? "font-medium text-[var(--color-positive-text)]" : "font-medium text-[var(--color-warning-text)]"}>
              {user?.kycVerified ? "Approved" : "Pending"}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
            <Icons8Icon name="globe" size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Global Profile</p>
            <p className="overflow-anywhere">
              {country.name} • {country.currency} • {country.primaryLanguage}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              {country.lendingStatus === "active"
                ? "Wallet and lending are enabled for this country."
                : "Wallet profile is ready. Lending opens only after local setup is complete."}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
            <Icons8Icon name="bank" size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Bank</p>
            <p className="overflow-anywhere">
              {user?.bankName || "Not added"} • {user?.accountNumber || "No account number"}
            </p>
          </div>
        </div>
        <ThemeModeSelector />
        <button
          className="btn-primary h-11 w-full text-sm md:h-14 md:text-base"
          onClick={() => router.push("/security")}
        >
          Open Security Center
        </button>
        <button
          className="btn-ghost h-11 w-full text-sm md:h-12 md:text-base"
          onClick={() => router.push("/learn")}
        >
          Open Me2U Learn
        </button>
        <button
          className="btn-ghost h-11 w-full text-sm md:h-12 md:text-base"
          onClick={async () => {
            await logout();
            router.push("/");
          }}
        >
          Logout
        </button>

      </div>
    </div>
  );
}
