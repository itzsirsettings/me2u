"use client";

import {
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  Share2,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import ReferenceDialog from "@/components/reference/ReferenceDialog";
import {
  money,
  ReferenceIcon,
  ReferenceScreen,
  useReferenceUser,
  type ReferenceIconName,
} from "@/components/reference/ReferenceUI";
import ReferralQrCode from "@/components/ReferralQrCode";
import ShareTemplatesModal from "@/components/referrals/ShareTemplatesModal";
import { authorizedFetch } from "@/lib/fetch";
import type { ReferralDetail, ReferralStats } from "@/lib/store";

type Challenge = {
  active: boolean;
  current: number;
  target: number;
  reward: number;
  completed: boolean;
  week_end: string;
};
type Milestone = {
  type: string;
  referralCount: number;
  rewardAmount: number;
  badgeAwarded: string | null;
  achieved: boolean;
  progress: number;
};
type Leader = {
  user_id: string;
  username: string;
  verified_referral_count: number;
  rank: number;
  prizeAmount: number | null;
  is_current_user: boolean;
};
type UnlockStatus = {
  isUnlocked: boolean;
  referralsNeeded: number;
  paymentMade: boolean;
  daysUntilEligible: number;
  canUnlockNow: boolean;
  hasActiveSubscription: boolean;
  unlockFee: number;
  status: string;
};
type ReferralData = {
  stats: ReferralStats;
  referrals: Array<ReferralDetail & { signup_rewarded?: boolean }>;
};
type ChallengeData = { current: Challenge | null };
type MilestoneData = { milestones: Milestone[] };
type LeaderData = { leaderboard: Leader[]; userPosition: Leader | null };
type Resource<T> = { data: T | null; error: boolean };
const emptyResource = { data: null, error: false };
const subscribeOrigin = () => () => {};
const getOrigin = () => window.location.origin;
const getServerOrigin = () => "";

async function loadResource<T>(path: string, signal: AbortSignal): Promise<Resource<T>> {
  try {
    const response = await authorizedFetch(path, { signal });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const data = (await response.json()) as T;
    return { data, error: false };
  } catch {
    return { data: null, error: true };
  }
}

function unlockCopy(status: UnlockStatus) {
  if (status.isUnlocked)
    return { title: "Withdrawals unlocked", detail: "Your account is ready to withdraw." };
  if (status.hasActiveSubscription || status.canUnlockNow || status.referralsNeeded === 0)
    return {
      title: "You’re eligible to unlock withdrawals",
      detail: "Open withdrawal options to continue.",
    };
  if (status.paymentMade)
    return {
      title: `${status.daysUntilEligible} ${status.daysUntilEligible === 1 ? "day" : "days"} until withdrawal eligibility`,
      detail: "Your unlock payment has been received.",
    };
  return {
    title: `${status.referralsNeeded} more verified referrals`,
    detail: "to unlock early withdrawals",
  };
}

export default function ReferralsPage() {
  return (
    <Suspense fallback={<ReferenceScreen kind="referrals" ready={false} />}>
      <ReferralsContent />
    </Suspense>
  );
}

function ReferralsContent() {
  const user = useReferenceUser();
  const router = useRouter();
  const search = useSearchParams();
  const panel = search.get("panel");
  const [referral, setReferral] = useState<Resource<ReferralData>>(emptyResource);
  const [challenge, setChallenge] = useState<Resource<ChallengeData>>(emptyResource);
  const [milestones, setMilestones] = useState<Resource<MilestoneData>>(emptyResource);
  const [leaders, setLeaders] = useState<Resource<LeaderData>>(emptyResource);
  const [unlock, setUnlock] = useState<Resource<UnlockStatus>>(emptyResource);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const origin = useSyncExternalStore(subscribeOrigin, getOrigin, getServerOrigin);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userId = user?.id;
  const link =
    origin && user?.username ? `${origin}/r/${encodeURIComponent(user.username)}` : "";

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    let inFlight = false;
    const refresh = async () => {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      const [a, b, c, d, e] = await Promise.all([
        loadResource<ReferralData>("/api/referrals", controller.signal),
        loadResource<ChallengeData>("/api/referrals/challenges", controller.signal),
        loadResource<MilestoneData>("/api/referrals/milestones", controller.signal),
        loadResource<LeaderData>(
          "/api/referrals/leaderboard?period=current",
          controller.signal,
        ),
        loadResource<UnlockStatus>("/api/account/unlock", controller.signal),
      ]);
      inFlight = false;
      if (controller.signal.aborted) return;
      setReferral(a);
      setChallenge(b);
      setMilestones(c);
      setLeaders(d);
      setUnlock(e);
      setLoading(false);
    };
    void refresh();
    const onFocus = () => {
      void refresh();
    };
    const timer = window.setInterval(onFocus, 60_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [userId, attempt]);

  function closePanel() {
    const params = new URLSearchParams(search.toString());
    params.delete("panel");
    router.replace(`/referrals${params.size ? `?${params}` : ""}`, { scroll: false });
  }
  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Referral link copied");
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn’t copy the link. Select the link and copy it manually.");
    }
  }
  async function share() {
    if (!link) return;
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({
        title: "Join me on Me2U",
        text: "Join Me2U using my referral link.",
        url: link,
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        toast.error("Sharing failed. Try copying your referral link.");
    }
  }
  const retry = () => {
    setLoading(true);
    setAttempt((value) => value + 1);
  };
  if (!user) return <ReferenceScreen kind="referrals" ready={false} />;
  const stats = referral.data?.stats;
  const pendingMilestones = stats ? stats.pending_withdrawal + stats.pending_repayment : null;
  const unlockText = unlock.data ? unlockCopy(unlock.data) : null;
  const hasError = [referral, challenge, milestones, leaders, unlock].some(
    (resource) => resource.error,
  );
  const numberLabel = (value: number | undefined, currency = false) =>
    value == null || !Number.isFinite(Number(value))
      ? "—"
      : currency
        ? money(Number(value))
        : new Intl.NumberFormat("en-NG").format(Number(value));

  return (
    <ReferenceScreen kind="referrals">
      <section className="design-referral-hero">
        <div className="design-referral-intro">
          <h1>
            Invite friends.
            <br />
            Earn rewards.
          </h1>
          <p className="design-referral-subtitle">
            Share your referral link and earn <strong>₦1,500</strong> when your friend signs up.
          </p>
        </div>
        <div className="design-gift-art" aria-hidden="true">
          <Image
            src="/images/referral-gift.png"
            alt=""
            width={1280}
            height={1280}
            priority
            sizes="200px"
          />
          <span>
            <TrendingUp size={15} />
            More friends
            <br />
            More rewards
          </span>
        </div>
        <div className="design-link-card">
          <label htmlFor="referral-link">Your Referral Link</label>
          <div className="design-link-actions">
            <div className="design-link-input">
              <input
                id="referral-link"
                readOnly
                value={link}
                placeholder="Your referral link is unavailable"
                spellCheck={false}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button
                type="button"
                aria-label={copied ? "Referral link copied" : "Copy referral link"}
                onClick={() => void copy()}
                disabled={!link}
              >
                {copied ? <Check size={19} /> : <Copy size={19} />}
              </button>
            </div>
            <button
              type="button"
              className="design-share"
              onClick={() => void share()}
              disabled={!link}
            >
              <Share2 size={19} aria-hidden="true" />
              Share
            </button>
          </div>
          {!link && (
            <p className="design-inline-error">
              A username is required for your referral link.{" "}
              <Link href="/security">Open account settings</Link>.
            </p>
          )}
          {unlockText ? (
            <Link
              href="/referrals?panel=unlock"
              scroll={false}
              className={`design-unlock-notice ${unlock.data?.isUnlocked ? "design-unlocked" : ""}`}
            >
              <ReferenceIcon name={unlock.data?.isUnlocked ? "check" : "crown"} size={27} />
              <div>
                <strong>{unlockText.title}</strong>
              </div>
              <ChevronRight size={20} aria-hidden="true" />
            </Link>
          ) : (
            <div className="design-unlock-notice">
              <p role="status">
                {loading
                  ? "Checking withdrawal eligibility…"
                  : "Withdrawal eligibility unavailable."}
              </p>
              {unlock.error && (
                <button type="button" onClick={retry}>
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      </section>
      {hasError && (
        <div className="design-data-error" role="status">
          <span>Some referral information is unavailable.</span>
          <button type="button" onClick={retry} disabled={loading}>
            {loading ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}
      <section
        className="design-referral-stats"
        aria-label="Referral statistics"
        aria-busy={loading}
      >
        <Stat label="Invited" value={numberLabel(stats?.total_referrals)} icon="users" />
        <Stat label="Verified" value={numberLabel(user.verifiedReferralCount)} icon="check" />
        <Stat label="Earned" value={numberLabel(stats?.total_earned, true)} icon="wallet" />
        <Stat
          label="Pending milestones"
          value={numberLabel(pendingMilestones ?? undefined)}
          icon="market"
        />
      </section>
      <section className="design-how-it-works">
        <div className="design-section-heading">
          <h2>How It Works</h2>
          <Link href="/referrals?panel=details" scroll={false} className="design-detail-link">
            View Details
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <ol className="design-timeline">
          <li>
            <span className="design-step-number">1</span>
            <span className="design-icon-disc">
              <UserPlus aria-hidden="true" size={25} />
            </span>
            <h3>Friend signs up</h3>
            <p>They create an account with your link</p>
          </li>
          <li>
            <span className="design-step-number">2</span>
            <span className="design-icon-disc">
              <ReferenceIcon name="gift" />
            </span>
            <h3>You earn</h3>
            <p>You get ₦1,500; they get ₦500</p>
          </li>
          <li>
            <span className="design-step-number">3</span>
            <span className="design-icon-disc">
              <ReferenceIcon name="check" />
            </span>
            <h3>They verify</h3>
            <p>They complete their identity (KYC)</p>
          </li>
          <li>
            <span className="design-step-number">4</span>
            <span className="design-icon-disc">
              <ReferenceIcon name="wallet" />
            </span>
            <h3>Withdraw</h3>
            <p>Meet the unlock requirement and cash out</p>
          </li>
        </ol>
      </section>
      <section className="design-leaderboard-strip">
        <span className="design-trophy">
          <ReferenceIcon name="trophy" size={24} />
        </span>
        <div>
          <h2>Refer top performers earn more!</h2>
          <p>The more you refer, the higher your rewards.</p>
        </div>
        <Link href="/referrals?panel=leaderboard" scroll={false}>
          View Leaderboard
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </section>
      <section className="design-network-banner">
        <div>
          <h2>
            Turn your network
            <br />
            into income
          </h2>
          <p>Invite. Grow. Earn. Repeat.</p>
        </div>
        <div className="design-phone-art" aria-hidden="true">
          <Image
            src="/images/referral-phone.png"
            alt=""
            width={1280}
            height={1280}
            sizes="200px"
          />
          <span className="design-phone-amount">
            ₦1,500
          </span>
          <span className="design-phone-bubble">Earn More</span>
        </div>
      </section>

      {panel === "qr" && (
        <ReferenceDialog title="Your referral QR code" onClose={closePanel}>
          <div className="design-qr">
            <ReferralQrCode value={link} className="h-48 w-48 rounded-2xl" />
            <p>Let a friend scan this code to join with your referral link.</p>
            <button
              type="button"
              className="design-share"
              disabled={!link}
              onClick={() => void share()}
            >
              <Share2 size={18} aria-hidden="true" />
              Share your link
            </button>
          </div>
        </ReferenceDialog>
      )}
      {panel === "unlock" && (
        <ReferenceDialog title="Withdrawal eligibility" onClose={closePanel}>
          {unlockText ? (
            <div className="design-panel-section">
              <h3>{unlockText.title}</h3>
              <p>{unlockText.detail}</p>
              <p>
                Withdrawal also requires your completed identity checks and a connected bank
                account.
              </p>
              <Link href="/withdraw" className="design-share">
                View withdrawal options
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <ResourceError loading={loading} onRetry={retry} />
          )}
        </ReferenceDialog>
      )}
      {panel === "leaderboard" && (
        <ReferenceDialog title="Monthly Leaderboard" onClose={closePanel}>
          {leaders.error ? (
            <ResourceError loading={loading} onRetry={retry} />
          ) : !leaders.data ? (
            <p role="status">Loading leaderboard…</p>
          ) : (
            <>
              <p className="design-panel-description">
                This month’s top referrers and their prizes.
              </p>
              {leaders.data.userPosition && leaders.data.userPosition.rank > 10 && (
                <p className="design-position">
                  Your position: #{leaders.data.userPosition.rank} •{" "}
                  {leaders.data.userPosition.verified_referral_count} verified
                </p>
              )}
              {leaders.data.leaderboard.length ? (
                <ol className="design-leaders">
                  {leaders.data.leaderboard.slice(0, 10).map((entry) => (
                    <li
                      key={entry.user_id}
                      className={entry.is_current_user ? "design-current-user" : ""}
                    >
                      <span>#{entry.rank}</span>
                      <div>
                        <strong>{entry.is_current_user ? "You" : entry.username}</strong>
                      </div>
                      {entry.prizeAmount != null && <b>{money(entry.prizeAmount)}</b>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p>No leaderboard entries yet. Invite friends to get started.</p>
              )}
            </>
          )}
        </ReferenceDialog>
      )}
      {panel === "details" && (
        <ReferenceDialog title="Referral Details" onClose={closePanel}>
          <section className="design-panel-section">
            <h3>How rewards work</h3>
            <ol className="design-reward-list">
              <li>
                <strong>Friend signs up</strong>
                <p>You earn ₦1,500 referral bonus and they earn ₦500.</p>
              </li>
              <li>
                <strong>Friend completes KYC</strong>
                <p>They verify their identity.</p>
              </li>
              <li>
                <strong>First withdrawal</strong>
                <p>You earn another ₦250.</p>
              </li>
              <li>
                <strong>First loan repayment</strong>
                <p>You earn another ₦250.</p>
              </li>
              <li>
                <strong>Friend refers a friend</strong>
                <p>You earn a ₦500 network reward.</p>
              </li>
            </ol>
            <p>
              <strong>₦2,500 for you</strong> across these reward stages. Potential earnings are
              an estimate, not a withdrawable balance.
            </p>
            <button
              type="button"
              className="design-share"
              disabled={!link}
              onClick={() => setShowShare(true)}
            >
              <Share2 size={17} aria-hidden="true" />
              Share Templates
            </button>
          </section>
          <section className="design-panel-section">
            <h3>Weekly Challenge</h3>
            {challenge.error ? (
              <ResourceError loading={loading} onRetry={retry} />
            ) : challenge.data?.current?.active ? (
              <>
                <p>
                  {challenge.data.current.current} / {challenge.data.current.target} verified •{" "}
                  {money(challenge.data.current.reward)} reward
                </p>
                <progress
                  max={Math.max(1, challenge.data.current.target)}
                  value={challenge.data.current.current}
                  aria-label="Weekly challenge progress"
                />
                <p>
                  {challenge.data.current.completed
                    ? "Challenge complete!"
                    : `Ends ${new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(challenge.data.current.week_end))}`}
                </p>
              </>
            ) : (
              <p>
                {loading
                  ? "Loading challenge…"
                  : "No active challenge. Check back for the next one."}
              </p>
            )}
          </section>
          <section className="design-panel-section">
            <h3>Milestones</h3>
            {milestones.error ? (
              <ResourceError loading={loading} onRetry={retry} />
            ) : milestones.data?.milestones.length ? (
              milestones.data.milestones.map((item) => (
                <div key={item.type} className="design-milestone">
                  <strong>
                    {item.referralCount} referrals • {money(item.rewardAmount)}
                  </strong>
                  <p>
                    {item.achieved ? "Achieved" : `${item.progress}% complete`}
                    {item.badgeAwarded ? ` • ${item.badgeAwarded}` : ""}
                  </p>
                  <progress
                    max={100}
                    value={Math.min(100, Math.max(0, item.progress))}
                    aria-label={`${item.referralCount} referral milestone`}
                  />
                </div>
              ))
            ) : (
              <p>{loading ? "Loading milestones…" : "No milestones available yet."}</p>
            )}
          </section>
          <section className="design-panel-section">
            <h3>Your Referrals</h3>
            {referral.error ? (
              <ResourceError loading={loading} onRetry={retry} />
            ) : referral.data?.referrals.length ? (
              referral.data.referrals.map((entry) => (
                <div key={entry.referee_id} className="design-referral-record">
                  <strong>{entry.referee_name}</strong>
                  <p>{entry.pending_rewards}</p>
                  <div className="design-record-badges">
                    <span>Signed up</span>
                    {entry.signup_rewarded && <span>Signup rewarded</span>}
                    <span>{entry.referee_kyc_verified ? "KYC verified" : "Pending KYC"}</span>
                    {entry.first_withdrawal_rewarded && <span>Withdrawal rewarded</span>}
                    {entry.first_repayment_rewarded && <span>Repayment rewarded</span>}
                  </div>
                </div>
              ))
            ) : (
              <p>
                {loading
                  ? "Loading referrals…"
                  : "No referrals yet. Share your link to get started."}
              </p>
            )}
          </section>
          {showShare && user.username && (
            <div className="design-share-templates-host">
              <ShareTemplatesModal
                isOpen={showShare}
                onClose={() => setShowShare(false)}
                referralLink={link}
                username={user.username}
              />
            </div>
          )}
        </ReferenceDialog>
      )}
    </ReferenceScreen>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReferenceIconName;
}) {
  return (
    <div className="design-card design-stat">
      <ReferenceIcon name={icon} size={21} />
      <strong title={value}>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ResourceError({ loading, onRetry }: { loading: boolean; onRetry: () => void }) {
  return (
    <p className="design-inline-error" role="status">
      This information is unavailable.{" "}
      <button type="button" onClick={onRetry} disabled={loading}>
        {loading ? "Retrying…" : "Try again"}
      </button>
    </p>
  );
}
