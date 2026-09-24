"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  CircleAlert,
  Eye,
  EyeOff,
  Sprout,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import ReferenceNotifications from "@/components/reference/ReferenceNotifications";
import {
  Initials,
  money,
  ReferenceIcon,
  ReferenceScreen,
  useReferenceUser,
  type ReferenceIconName,
} from "@/components/reference/ReferenceUI";
import { getCreditLevel } from "@/lib/product-features";

const primaryActions: Array<{
  label: string;
  path: string;
  icon: ReferenceIconName;
  lime?: boolean;
}> = [
  { label: "Market", path: "/marketplace", icon: "market" },
  { label: "Loans", path: "/loans", icon: "wallet", lime: true },
  { label: "KYC", path: "/kyc", icon: "shield" },
];
const shortcuts: Array<{
  label: string;
  path: string;
  icon: ReferenceIconName;
  lime?: boolean;
}> = [
  {
    label: "Savings",
    path: "/savings",
    icon: "savings",
    lime: true,
  },
  { label: "Circles", path: "/circles", icon: "users" },
  { label: "Deals", path: "/deals", icon: "tag" },
  { label: "Refer", path: "/referrals", icon: "users", lime: true },
  { label: "Learn", path: "/learn", icon: "book" },
  { label: "Secure", path: "/security", icon: "secure" },
];

export default function Dashboard() {
  const user = useReferenceUser();
  const [showBalance, setShowBalance] = useState(true);
  if (!user) return <ReferenceScreen kind="home" ready={false} />;
  const score = Math.max(0, Math.min(100, user.trustScore));
  const level = getCreditLevel(score);
  const bankReady = Boolean(user.bankName && user.accountNumber);

  return (
    <ReferenceScreen kind="home">
      <section className="design-welcome">
        <Link href="/profile" className="design-avatar" aria-label="Open profile">
          <Initials name={user.name} />
        </Link>
        <div className="design-welcome-copy">
          <h1 title={`@${user.username || user.name}`}>
            @{user.username || user.name.split(" ")[0]}
          </h1>
          <p>Good to see you again!</p>
        </div>
        <div className="design-growth">
          <Sprout aria-hidden="true" />
          <span>
            Smarter
            <br />
            Money Together
          </span>
        </div>
      </section>

      <section className="design-green-card design-balance" aria-label="Wallet balance">
        <div className="design-balance-heading">
          <h2>Main Balance</h2>
          {!bankReady && (
            <Link href="/profile" className="design-verify">
              <CircleAlert size={16} aria-hidden="true" />
              <span>add bank</span>
              <ChevronRight size={15} aria-hidden="true" />
            </Link>
          )}
        </div>
        <div className="design-balance-amount">
          <p data-testid="main-balance">{showBalance ? money(user.balance, 2) : "₦••••••"}</p>
          <div className="design-balance-controls">
            <button
              type="button"
              onClick={() => setShowBalance(!showBalance)}
              aria-label={showBalance ? "Hide balance" : "Show balance"}
            >
              {showBalance ? <Eye size={22} /> : <EyeOff size={22} />}
            </button>
            <ReferenceNotifications className="design-balance-notifications" />
          </div>
        </div>
        <p className="design-balance-caption">Your wallet, more possibilities.</p>
        <div className="design-money-actions">
          <Link href="/wallet" className="design-receive">
            <span>
              <ArrowDown aria-hidden="true" />
            </span>
            <div>
              <strong>Receive</strong>
            </div>
          </Link>
          <Link href="/withdraw" className="design-withdraw">
            <span>
              <ArrowUp aria-hidden="true" />
            </span>
            <div>
              <strong>Withdraw</strong>
            </div>
          </Link>
        </div>
      </section>

      <section className="design-primary-actions" aria-label="Main services">
        {primaryActions.map((item) => (
          <Link key={item.label} href={item.path} className="design-card design-service">
            <span className={`design-icon-disc ${item.lime ? "design-lime" : ""}`}>
              <ReferenceIcon name={item.icon} />
            </span>
            <ChevronRight className="design-service-chevron" size={18} aria-hidden="true" />
            <strong>{item.label}</strong>
          </Link>
        ))}
      </section>
      <section className="design-card design-shortcuts" aria-label="More services">
        {shortcuts.map((item) => (
          <Link key={item.label} href={item.path}>
            <span className={`design-icon-disc ${item.lime ? "design-lime" : ""}`}>
              <ReferenceIcon name={item.icon} size={22} />
            </span>
            <strong>{item.label}</strong>
          </Link>
        ))}
      </section>

      <section className="design-card design-trust">
        <div className="design-trust-heading">
          <div>
            <h2>Me2U Trust Score</h2>
            <p>
              {level.name} level • {level.next}
            </p>
          </div>
          <div
            className="design-score"
            role="img"
            aria-label={`Trust score ${score} out of 100, ${level.name}`}
          >
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="43" className="design-score-track" />
              <circle
                cx="50"
                cy="50"
                r="43"
                className="design-score-progress"
                pathLength="100"
                strokeDasharray={`${score} 100`}
              />
            </svg>
            <div>
              <strong>{score}</strong>
            </div>
            <span className="design-level-badge">{level.name}</span>
          </div>
        </div>
        <div className="design-next-heading">
          <h3>Next steps</h3>
          <Link href="/profile">
            See all <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <Link href="/kyc" className="design-step-row">
          <span className="design-icon-square">
            <ReferenceIcon name="secure" size={22} />
          </span>
          <div>
            <strong>{user.kycVerified ? "KYC complete" : "Complete KYC"}</strong>
          </div>
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
        <Link href="/referrals" className="design-step-row">
          <span className="design-icon-square">
            <ReferenceIcon name="users" size={22} />
          </span>
          <div>
            <strong>{user.verifiedReferralCount ?? 0} verified referrals</strong>
          </div>
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
        <Link href="/referrals" className="design-step-row">
          <span className="design-icon-square">
            <ReferenceIcon name="wallet" size={22} />
          </span>
          <div>
            <strong>Refer a friend</strong>
          </div>
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      </section>
    </ReferenceScreen>
  );
}
