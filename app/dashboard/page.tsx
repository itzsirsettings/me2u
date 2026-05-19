"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icons8Icon, { type Icons8IconName } from "@/components/Icons8Icon";
import NotificationBell from "@/components/NotificationBell";
import PwaInstallButton from "@/components/PwaInstallButton";
import ReferralQrCode from "@/components/ReferralQrCode";
import { onboardingCreditAmount, registrationDepositAmount } from "@/lib/loans";
import {
  getCountryConfig,
  getCreditBuilderBadges,
  getCreditLevel,
  getReferralProgramProgress,
  getTrustScoreBreakdown,
  growthFeatureModules,
  mobileAppReadiness,
  referralProgramLevels,
} from "@/lib/product-features";
import { useStore, type Transaction } from "@/lib/store";
import { motion, type Variants } from "framer-motion";
import { toast } from "sonner";

const serviceActions: Array<{
  label: string;
  path: string;
  icon: Icons8IconName;
  tone: string;
  requiresKyc?: boolean;
  requiresDeposit?: boolean;
}> = [
  { label: "Top Up", path: "/wallet", icon: "cash", tone: "bg-[#c9c0f2] text-[#07026f]" },
  { label: "Market", path: "/marketplace", icon: "market", tone: "bg-[#ffdfad] text-[#7a3f00]", requiresKyc: true },
  { label: "Loans", path: "/loans", icon: "loans", tone: "bg-[#e0a9f0] text-[#07026f]", requiresKyc: true },
  { label: "KYC", path: "/kyc", icon: "shield", tone: "bg-[#9adbc4] text-[#00406b]", requiresDeposit: true },
];

const growthShortcuts: Array<{
  label: string;
  path: string;
  icon: Icons8IconName;
  tone: string;
}> = [
  { label: "Trust", path: "/profile", icon: "shield", tone: "bg-[#dcecff] text-[#00406b]" },
  { label: "Refer", path: "/profile", icon: "trophy", tone: "bg-[#fff4d8] text-[#7a4a00]" },
  { label: "Learn", path: "/learn", icon: "book", tone: "bg-[#e8f7f0] text-[#005f46]" },
  { label: "Secure", path: "/security", icon: "security", tone: "bg-[#eee9ff] text-[#07026f]" },
];

function getInitials(name?: string | null) {
  const parts = (name || "Me2U User").trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "MU";
}

function transactionAmountTone(transaction: Transaction) {
  return ["deposit", "loan_disbursed", "repayment_received", "affiliate_reward"].includes(transaction.type)
    ? "text-[var(--color-positive-text)]"
    : "text-[var(--color-negative-text)]";
}

function transactionPrefix(transaction: Transaction) {
  return ["deposit", "loan_disbursed", "repayment_received", "affiliate_reward"].includes(transaction.type)
    ? "+"
    : "-";
}

export default function Dashboard() {
  const user = useStore((state) => state.user);
  const activeLoans = useStore((state) => state.activeLoans);
  const transactions = useStore((state) => state.transactions);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
  };

  const firstName = user?.name.trim().split(/\s+/)[0] || "Guest";
  const username = user?.username || firstName.toLowerCase();
  const visibleLoans = activeLoans.filter(
    (loan) =>
      !(
        loan.role === "borrower" &&
        loan.source === "platform" &&
        loan.amount === onboardingCreditAmount &&
        loan.rate === 0
      ),
  );
  const activeLoanCount = visibleLoans.filter((loan) => loan.status === "active").length;
  const balance = user?.balance || 0;
  const bankLabel = user?.bankName && user.accountNumber
    ? `${user.bankName} • ${user.accountNumber}`
    : user?.kycVerified
      ? "Wallet account ready"
      : "Verify to add bank";
  const referralLink = mounted ? `${window.location.origin}/register?ref=${user?.username || ""}` : "";
  const trustScore = Math.max(0, Math.min(100, user?.trustScore || 0));
  const trustLevel = getCreditLevel(trustScore);
  const trustBreakdown = getTrustScoreBreakdown(user, transactions, activeLoans);
  const creditBadges = getCreditBuilderBadges(user, transactions, activeLoans);
  const country = getCountryConfig(user?.countryCode);
  const countryStatus =
    country.lendingStatus === "active" ? "Lending enabled" : "Wallet profile ready";
  const referralProgress = getReferralProgramProgress(user);
  const currentReferralLevel = referralProgress.currentLevel?.name || "Starter";
  const nextReferralLevel = referralProgress.nextLevel;

  const statusCard = useMemo(() => {
    if (!user?.registrationDepositPaid) {
      return {
        title: "Complete your registration deposit",
        body: `Your ₦${onboardingCreditAmount.toLocaleString()} welcome bonus is waiting after deposit approval and KYC.`,
        action: "Submit proof",
        path: "/wallet",
      };
    }

    if (!user?.kycVerified) {
      return {
        title: "Verify your identity",
        body: "Add your bank details and passport photo to unlock your bonus, withdrawals, loans, and marketplace access.",
        action: "Continue",
        path: "/kyc",
      };
    }

    return {
      title: "Your wallet is verified",
      body: "You can fund, borrow, lend, repay, and withdraw from one verified Me2U wallet.",
      action: "Explore loans",
      path: "/loans",
    };
  }, [user?.kycVerified, user?.registrationDepositPaid]);

  if (!mounted || (!isAuthenticated && !isLoading)) return null;

  return (
    <motion.main
      className="app-mobile-screen mx-auto w-full max-w-md overflow-x-hidden px-3.5 pt-[calc(0.75rem+env(safe-area-inset-top))] md:max-w-7xl md:px-6 md:py-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.header variants={itemVariants} className="mb-3.5 flex w-full min-w-0 items-center justify-between gap-2.5 md:mb-10">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative grid h-[3.15rem] w-[3.15rem] shrink-0 place-items-center rounded-full bg-[var(--color-accent-primary)] text-lg font-black text-[var(--color-on-accent)] shadow-[0_8px_18px_rgba(0,64,107,0.13)]">
            {getInitials(user?.name)}
            <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--mobile-app-bg)] bg-[var(--mobile-surface)] text-[var(--color-accent-deep)]">
              <Icons8Icon name="shield" size={14} />
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[0.92rem] font-medium leading-tight text-[var(--color-text-primary)]">Welcome</p>
            <h1 className="truncate text-[1.15rem] font-black leading-tight tracking-normal text-[var(--color-text-primary)]">
              @{username}
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className="mobile-icon-button"
            aria-label="Open profile"
            onClick={() => router.push("/profile")}
          >
            <Icons8Icon name="profile" size={24} />
          </button>
          <NotificationBell />
        </div>
      </motion.header>

      <div className="grid min-w-0 gap-2.5 md:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] md:items-start md:gap-6">
        <div className="grid min-w-0 gap-2.5">
          <motion.section variants={itemVariants} className="mobile-soft-card relative min-w-0 overflow-hidden p-3">
            <div className="mb-2.5 flex items-start justify-between gap-2.5">
              <p className="text-[1rem] font-extrabold leading-none tracking-normal">Main Balance</p>
              <div className="min-w-0 max-w-[55%] rounded-full bg-[var(--mobile-surface-muted)] px-2.5 py-1 text-right text-[9px] font-black leading-tight text-[var(--color-text-primary)]">
                <span className="block truncate">{bankLabel}</span>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-1.5">
              <p className="min-w-0 max-w-[calc(100%-2.6rem)] truncate font-display text-[1.72rem] font-black leading-none tracking-normal text-[var(--color-text-primary)]">
                {showBalance ? `₦${balance.toLocaleString()}` : "₦••••••"}
              </p>
              <button
                type="button"
                aria-label={showBalance ? "Hide balance" : "Show balance"}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--color-text-primary)] transition active:scale-95"
                onClick={() => setShowBalance((current) => !current)}
              >
                <Icons8Icon name={showBalance ? "visible" : "invisible"} size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button className="mobile-pill-button" onClick={() => router.push("/wallet")}>
                Receive
                <Icons8Icon name="cash" size={18} />
              </button>
              <button className="mobile-pill-button" onClick={() => router.push("/withdraw")}>
                Send
                <Icons8Icon name="requestMoney" size={18} />
              </button>
            </div>
          </motion.section>

          <motion.section
            variants={itemVariants}
            className="relative min-w-0 overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#9fd8ff_0%,#b8dcf4_42%,#8778ff_100%)] p-3 text-[#05021d] shadow-[0_8px_24px_rgba(0,64,107,0.09)]"
          >
            <div className="relative z-10 max-w-[82%]">
              <h2 className="text-[0.96rem] font-black leading-tight tracking-normal">{statusCard.title}</h2>
              <p className="mt-1 text-[0.78rem] font-medium leading-relaxed">{statusCard.body}</p>
              <button
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-xs font-black text-[#05021d] transition active:scale-95"
                onClick={() => router.push(statusCard.path)}
              >
                {statusCard.action}
                <span className="text-xl leading-none">→</span>
              </button>
            </div>
            <div className="absolute -bottom-6 -right-5 grid h-20 w-20 place-items-center rounded-full bg-[rgba(0,64,107,0.92)] text-white">
              <Icons8Icon name={user?.kycVerified ? "check" : "shield"} size={34} />
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="mobile-soft-card grid min-w-0 grid-cols-4 overflow-hidden px-1 py-2">
            {serviceActions.map((action, index) => {
              const disabled =
                (action.requiresDeposit && !user?.registrationDepositPaid) ||
                (action.requiresKyc && !user?.kycVerified);

              return (
                <button
                  key={action.path}
                  disabled={disabled}
                  className={`flex min-h-[3.75rem] flex-col items-center justify-center gap-1 px-1 text-center transition active:scale-95 disabled:opacity-45 ${
                    index > 0 ? "border-l border-[var(--color-border)]" : ""
                  }`}
                  onClick={() => {
                    if (!disabled) router.push(action.path);
                  }}
                >
                  <span className={`grid h-8 w-8 place-items-center rounded-full ${action.tone}`}>
                    <Icons8Icon name={action.icon} size={17} />
                  </span>
                  <span className="text-[0.72rem] font-black leading-none text-[var(--color-text-primary)]">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </motion.section>

          <motion.section variants={itemVariants} className="mobile-soft-card grid min-w-0 grid-cols-4 overflow-hidden px-1 py-2">
            {growthShortcuts.map((action, index) => (
              <button
                key={action.label}
                className={`flex min-h-[3.75rem] flex-col items-center justify-center gap-1 px-1 text-center transition active:scale-95 ${
                  index > 0 ? "border-l border-[var(--color-border)]" : ""
                }`}
                onClick={() => router.push(action.path)}
              >
                <span className={`grid h-8 w-8 place-items-center rounded-full ${action.tone}`}>
                  <Icons8Icon name={action.icon} size={17} />
                </span>
                <span className="text-[0.72rem] font-black leading-none text-[var(--color-text-primary)]">
                  {action.label}
                </span>
              </button>
            ))}
          </motion.section>

          <motion.section variants={itemVariants} className="mobile-soft-card min-w-0 overflow-hidden p-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="grid h-[5.3rem] w-[5.3rem] shrink-0 place-items-center rounded-full p-2"
                style={{
                  background: `conic-gradient(var(--color-accent-primary) ${trustScore * 3.6}deg, var(--mobile-surface-muted) 0deg)`,
                }}
              >
                <div className="grid h-full w-full place-items-center rounded-full bg-[var(--mobile-surface)] text-center">
                  <span className="font-display text-[1.45rem] font-black leading-none">{trustScore}</span>
                  <span className="text-[9px] font-black uppercase leading-none text-[var(--color-text-secondary)]">Score</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-[1rem] font-black leading-tight tracking-normal">Me2U Trust Score</h2>
                    <p className={`mt-1 text-xs font-black ${trustLevel.color}`}>
                      {trustLevel.name} trust • {trustLevel.next}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--mobile-surface-muted)] px-2.5 py-1 text-[9px] font-black">
                    {country.currency}
                  </span>
                </div>
                <div className="mt-3 grid gap-1.5">
                  {trustBreakdown.slice(0, 4).map((signal) => (
                    <div key={signal.label} className="min-w-0">
                      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-black">
                        <span className="truncate">{signal.label}</span>
                        <span className="shrink-0 text-[var(--color-text-secondary)]">{signal.earned}/{signal.weight}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--mobile-surface-muted)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-accent-primary)]"
                          style={{ width: `${Math.round((signal.earned / signal.weight) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="mobile-soft-card min-w-0 p-3.5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[1rem] font-black leading-tight tracking-normal">Credit Builder</h2>
                <p className="mt-1 text-xs font-medium text-[var(--color-text-secondary)]">
                  Build your financial reputation through verified behavior.
                </p>
              </div>
              <Icons8Icon name="certificate" size={24} className="shrink-0 text-[var(--color-accent-primary)]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {creditBadges.map((badge) => (
                <div
                  key={badge.label}
                  className={`min-w-0 rounded-[16px] p-2.5 ${
                    badge.active
                      ? "bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]"
                      : "bg-[var(--mobile-surface-muted)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  <p className="truncate text-[11px] font-black text-[var(--color-text-primary)]">{badge.label}</p>
                  <p className="mt-1 truncate text-[10px] font-bold">{badge.value}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="mobile-soft-card grid min-w-0 grid-cols-[5.75rem_minmax(0,1fr)] overflow-hidden">
            <div className="grid place-items-center border-r border-[var(--color-border)] p-2">
              <ReferralQrCode value={referralLink} className="h-20 w-20 rounded-[12px]" />
            </div>
            <div className="flex min-w-0 flex-col justify-center p-3">
              <h2 className="text-[0.96rem] font-black leading-tight tracking-normal">
                Refer and rise from Bronze to Gold.
              </h2>
              <p className="mt-1 text-xs font-bold text-[var(--color-text-secondary)]">
                {referralProgress.verifiedReferralCount} verified • {currentReferralLevel} track
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="mobile-pill-button min-h-10 px-3 text-xs"
                  onClick={() => {
                    if (!referralLink) return;
                    if (!navigator.clipboard?.writeText) {
                      toast.error("Copy is unavailable in this browser.");
                      return;
                    }

                    void navigator.clipboard
                      .writeText(referralLink)
                      .then(() => toast.success("Referral link copied."))
                      .catch(() => toast.error("Unable to copy link."));
                  }}
                >
                  Copy Link
                </button>
                <button className="mobile-pill-button min-h-10 px-3 text-xs" onClick={() => router.push("/profile")}>
                  My Link
                </button>
              </div>
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="mobile-soft-card min-w-0 p-3.5">
            <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[1rem] font-black leading-tight tracking-normal">Gamified Referrals</h2>
                <p className="mt-1 text-xs font-medium text-[var(--color-text-secondary)]">
                  Weekly rewards, ambassador badges, and leaderboard paths.
                </p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]">
                <Icons8Icon name="trophy" size={21} />
              </span>
            </div>
            <div className="mb-3 rounded-[16px] bg-[var(--mobile-surface-muted)] p-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black">
                <span>{nextReferralLevel ? `Next: ${nextReferralLevel.name}` : "Top referral level"}</span>
                <span>{referralProgress.nextProgressPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--mobile-surface)]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent-primary)]"
                  style={{ width: `${referralProgress.nextProgressPercent}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                Invite 5 friends and unlock bonus: {referralProgress.inviteFiveProgress}/5
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[14px] bg-[var(--mobile-surface-muted)] p-2.5">
                <p className="truncate text-[11px] font-black">Weekly challenge</p>
                <p className="mt-1 truncate text-[10px] font-bold text-[var(--color-text-secondary)]">
                  {referralProgress.weeklyVerifiedReferralCount} verified this week
                </p>
              </div>
              <div className="rounded-[14px] bg-[var(--mobile-surface-muted)] p-2.5">
                <p className="truncate text-[11px] font-black">Ambassador badge</p>
                <p className="mt-1 truncate text-[10px] font-bold text-[var(--color-text-secondary)]">
                  {referralProgress.currentLevel?.badge || "Bronze"} track
                </p>
              </div>
            </div>
          </motion.section>
        </div>

        <div className="grid min-w-0 gap-3">
          <motion.section variants={itemVariants} className="relative min-w-0 overflow-hidden rounded-[22px] bg-[#020814] p-4 text-white">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-negative-text)] text-white">
                  <Icons8Icon name="loans" size={18} />
                </span>
                <p className="text-sm font-bold">Credit</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/35 px-3 py-1 text-xs font-black">
                {activeLoanCount} active
              </span>
            </div>
            <h2 className="max-w-sm text-[1.08rem] font-black leading-tight tracking-normal">
              0% interest loan from ₦5,000.
            </h2>
            <button
              className="mt-4 inline-flex min-h-11 items-center rounded-full bg-white px-4 text-xs font-black text-[#020814] transition active:scale-95"
              onClick={() => router.push("/loans")}
            >
              View loans
            </button>
            <div className="absolute -bottom-16 -right-12 h-40 w-40 rounded-full bg-[rgba(0,127,255,0.34)] blur-sm" />
          </motion.section>

          <motion.section variants={itemVariants} className="mobile-soft-card min-w-0 p-3.5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[1rem] font-black tracking-normal">Global Wallet Profile</h2>
                <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">
                  {country.name} • {country.currency} • {country.primaryLanguage}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--mobile-surface-muted)] px-3 py-1 text-[10px] font-black uppercase text-[var(--color-text-primary)]">
                {countryStatus}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
              {country.kycSummary} Lending only opens in each country after the required local setup is ready.
            </p>
          </motion.section>

          <motion.section variants={itemVariants} className="mobile-soft-card min-w-0 p-3.5">
            <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[1rem] font-black tracking-normal">Referral Leaderboards</h2>
                <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">
                  City, state, campus, and business tracks use verified referral counts only.
                </p>
              </div>
              <Icons8Icon name="medal" size={24} className="shrink-0 text-[var(--color-accent-primary)]" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {["City/State", "Campus", "Business", "Weekly Top"].map((board) => (
                <div key={board} className="rounded-[16px] bg-[var(--mobile-surface-muted)] p-3">
                  <p className="truncate text-sm font-black">{board}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                    {referralProgress.verifiedReferralCount > 0 ? `${referralProgress.verifiedReferralCount} verified from your link` : "Opens after verified referrals"}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 overflow-hidden rounded-[16px] border border-[var(--color-border)]">
              {referralProgramLevels.map((level) => (
                <div key={level.name} className="grid grid-cols-[0.8fr_1fr_1fr] gap-2 border-b border-[var(--color-border)] p-2.5 text-[10px] last:border-b-0">
                  <span className="truncate font-black">{level.name}</span>
                  <span className="truncate text-[var(--color-text-secondary)]">{level.summary}</span>
                  <span className="truncate text-right font-bold">{level.reward}</span>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="mobile-soft-card min-w-0 p-3.5">
            <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[1rem] font-black tracking-normal">Learn, Secure, Install</h2>
                <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">
                  Responsible borrowing, visible security, and app install readiness.
                </p>
              </div>
              <Icons8Icon name="mobile" size={24} className="shrink-0 text-[var(--color-accent-primary)]" />
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button className="mobile-pill-button min-h-10 px-3 text-xs" onClick={() => router.push("/learn")}>
                Learn
                <Icons8Icon name="book" size={16} />
              </button>
              <button className="mobile-pill-button min-h-10 px-3 text-xs" onClick={() => router.push("/security")}>
                Security
                <Icons8Icon name="security" size={16} />
              </button>
            </div>
            <PwaInstallButton className="mobile-pill-button min-h-10 w-full px-3 text-xs" />
            <div className="mt-3 grid gap-2">
              {mobileAppReadiness.slice(1).map((item) => (
                <div key={item.title} className="flex min-w-0 justify-between gap-3 rounded-[14px] bg-[var(--mobile-surface-muted)] p-2.5 text-xs">
                  <span className="min-w-0 truncate font-black">{item.title}</span>
                  <span className="shrink-0 font-bold text-[var(--color-text-secondary)]">{item.status}</span>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="mobile-soft-card min-w-0 p-3.5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[1rem] font-black tracking-normal">Growth Features</h2>
              <Icons8Icon name="star" size={22} className="text-[var(--color-accent-primary)]" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {growthFeatureModules.slice(3).map((feature) => (
                <article key={feature.title} className="min-w-0 rounded-[16px] bg-[var(--mobile-surface-muted)] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="min-w-0 truncate text-sm font-black">{feature.title}</h3>
                    <span className="shrink-0 rounded-full bg-[var(--mobile-surface)] px-2 py-0.5 text-[9px] font-black uppercase text-[var(--color-text-secondary)]">
                      {feature.status}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{feature.body}</p>
                </article>
              ))}
            </div>
          </motion.section>

          {user?.role === "admin" && (
            <motion.button
              variants={itemVariants}
              className="mobile-soft-card flex min-w-0 items-center justify-between gap-4 p-3.5 text-left transition active:scale-[0.99]"
              onClick={() => router.push("/admin")}
            >
              <div>
                <p className="text-sm font-bold text-[var(--color-text-secondary)]">Operations</p>
                <p className="mt-1 text-base font-black">Admin Dashboard</p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--mobile-surface-muted)] text-[var(--color-text-primary)]">
                <Icons8Icon name="shield" size={22} />
              </span>
            </motion.button>
          )}

          <motion.section variants={itemVariants} className="mobile-soft-card min-w-0 p-3.5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[1rem] font-black tracking-normal">Recent Activity</h2>
              <button
                className="text-sm font-black text-[var(--color-accent-primary)]"
                onClick={() => router.push("/wallet")}
              >
                Wallet
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="rounded-[18px] bg-[var(--mobile-surface-muted)] p-3.5 text-sm font-medium text-[var(--color-text-secondary)]">
                No recent transactions yet. Fund your wallet to start.
              </div>
            ) : (
              <div className="grid gap-3">
                {transactions.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex min-w-0 items-center justify-between gap-2 overflow-hidden rounded-[16px] bg-[var(--mobile-surface-muted)] p-2.5"
                  >
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="truncate text-sm font-black text-[var(--color-text-primary)]">
                        {transaction.description}
                      </p>
                      <p className="mt-1 truncate text-xs font-medium text-[var(--color-text-secondary)]">
                        {new Date(transaction.date).toLocaleString()}
                      </p>
                    </div>
                    <p className={`max-w-[36%] shrink-0 truncate text-right text-xs font-black sm:text-sm ${transactionAmountTone(transaction)}`}>
                      {transactionPrefix(transaction)}₦{transaction.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </motion.main>
  );
}
