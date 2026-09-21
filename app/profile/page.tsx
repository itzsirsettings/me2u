"use client";

import { ChevronRight, CircleAlert, Globe2, LogOut, Pencil, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  ReferenceIcon,
  ReferenceScreen,
  ReferenceToolbar,
  useReferenceUser,
} from "@/components/reference/ReferenceUI";
import ThemeModeSelector from "@/components/ThemeModeSelector";
import {
  getCountryConfig,
  getCreditLevel,
  getReferralProgramProgress,
} from "@/lib/product-features";
import { useStore } from "@/lib/store";

export default function Profile() {
  const user = useReferenceUser();
  const logout = useStore((state) => state.logout);
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  if (!user) return <ReferenceScreen kind="profile" ready={false} />;
  const level = getCreditLevel(user.trustScore);
  const country = getCountryConfig(user.countryCode);
  const referral = getReferralProgramProgress(user);
  const bankReady = Boolean(user.bankName && user.accountNumber);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.push("/");
    } catch {
      toast.error("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <ReferenceScreen kind="profile">
      <ReferenceToolbar theme />
      <section className="design-page-title">
        <h1>Profile</h1>
        <p>Manage your account and preferences</p>
      </section>
      <section className="design-green-card design-identity">
        <span className="design-profile-avatar">
          <ReferenceIcon name="user" size={38} />
        </span>
        <div>
          <h2>{user.name}</h2>
          <p>Good to see you again!</p>
        </div>
        <Link href="/security" className="design-edit">
          <Pencil size={17} aria-hidden="true" />
          <span>Edit Profile</span>
        </Link>
      </section>

      <section className="design-card design-profile-metrics" aria-label="Account summary">
        <div>
          <h2>Trust Level</h2>
          <span className="design-icon-disc design-bronze">
            <ReferenceIcon name="star" size={17} />
          </span>
          <strong>
            {level.name} • {user.trustScore}
          </strong>
          <p>Complete more steps to unlock higher benefits.</p>
        </div>
        <div>
          <h2>Country</h2>
          {country.code === "NG" ? (
            <span className="design-nigeria" role="img" aria-label="Nigeria flag" />
          ) : (
            <span className="design-icon-disc">
              <Globe2 aria-hidden="true" size={24} />
            </span>
          )}
          <strong>
            {country.name} • {country.currency}
          </strong>
          <p>
            Your location
            <br />
            and currency.
          </p>
        </div>
        <div>
          <h2>Referral Level</h2>
          <span className="design-icon-disc">
            <ReferenceIcon name="users" size={21} />
          </span>
          <strong>
            {referral.currentLevel?.name || "Starter"} • {referral.verifiedReferralCount}{" "}
            verified
          </strong>
          <p>Refer friends and earn rewards.</p>
        </div>
      </section>

      <section className="design-card design-account-rows" aria-label="Account details">
        <Link href="/security" className="design-account-row">
          <span className="design-icon-square">
            <ReferenceIcon name="email" />
          </span>
          <div>
            <h2>Email</h2>
            <p className="design-email">{user.email || "No email added"}</p>
          </div>
          <ChevronRight size={20} aria-hidden="true" />
        </Link>
        <Link href="/kyc" className="design-account-row">
          <span className="design-icon-square">
            <ReferenceIcon name="shield" />
          </span>
          <div>
            <div className="design-kyc-heading">
              <h2>KYC Status</h2>
              <span className={`design-status ${user.kycVerified ? "design-approved" : ""}`}>
                {user.kycVerified ? (
                  <ShieldCheck size={14} aria-hidden="true" />
                ) : (
                  <CircleAlert size={14} aria-hidden="true" />
                )}
                {user.kycVerified ? "Approved" : "Pending"}
              </span>
            </div>
            <small>
              {user.kycVerified
                ? "Your identity has been verified."
                : "Complete your KYC to unlock full features."}
            </small>
          </div>
          <ChevronRight size={20} aria-hidden="true" />
        </Link>
        <Link href="/wallet" className="design-account-row">
          <span className="design-icon-square">
            <ReferenceIcon name="bank" />
          </span>
          <div>
            <h2>Bank Details</h2>
            <p>
              {user.bankName
                ? `${user.bankName} • ${user.accountNumber || "No account number"}`
                : "Not added • No account number"}
            </p>
            <small>
              {bankReady
                ? "Your bank account is connected."
                : "Add your bank account to receive payments."}
            </small>
          </div>
          <ChevronRight size={20} aria-hidden="true" />
        </Link>
      </section>
      {user.role === "admin" && (
        <Link href="/admin" className="design-security-button">
          <ReferenceIcon name="shield" size={24} />
          Open Admin Dashboard
          <ChevronRight size={19} aria-hidden="true" />
        </Link>
      )}
      <ThemeModeSelector variant="reference" />
      <Link href="/security" className="design-security-button">
        <ShieldCheck size={24} aria-hidden="true" />
        Open Security Center
        <ChevronRight size={19} aria-hidden="true" />
      </Link>
      <button
        type="button"
        className="design-logout-button"
        disabled={loggingOut}
        onClick={() => void handleLogout()}
      >
        <LogOut size={24} aria-hidden="true" />
        {loggingOut ? "Logging out…" : "Logout"}
      </button>
    </ReferenceScreen>
  );
}
