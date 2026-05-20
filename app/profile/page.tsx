"use client";

import Icons8Icon from "@/components/Icons8Icon";
import ThemeModeSelector from "@/components/ThemeModeSelector";
import { useStore } from "@/lib/store";
import { getCountryConfig, getCreditLevel, getReferralProgramProgress } from "@/lib/product-features";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Profile() {
  const user = useStore((state) => state.user);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);
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
  const country = getCountryConfig(user?.countryCode);
  const creditLevel = getCreditLevel(user?.trustScore || 0);
  const referralProgress = getReferralProgramProgress(user);

  return (
    <div className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[4.85rem] md:max-w-3xl md:p-6 md:py-24">
      <h1 className="sr-only md:not-sr-only md:mb-8 md:text-3xl md:font-display md:font-bold md:leading-none">
        Profile
      </h1>
      <div className="mobile-soft-card space-y-3 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3.5 shadow-[4px_4px_0px_var(--color-shadow)] md:space-y-6 md:p-8">
        
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
            <Icons8Icon name="profile" size={22} />
          </span>
          <div className="min-w-0 flex-1 truncate">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Name</p>
            <p className="overflow-anywhere font-medium text-[var(--color-text-primary)]">
              {user?.name || "No name"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3.5 md:grid-cols-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Trust level</p>
            <p className={`mt-1 font-black ${creditLevel.color}`}>{creditLevel.name} • {user?.trustScore || 0}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Country</p>
            <p className="mt-1 font-black text-[var(--color-text-primary)]">{country.name} • {country.currency}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Referral level</p>
            <p className="mt-1 font-black text-[var(--color-text-primary)]">
              {referralProgress.currentLevel?.name || "Starter"} • {referralProgress.verifiedReferralCount} verified
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
            <Icons8Icon name="email" size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Email</p>
            <p className="overflow-anywhere font-medium text-[var(--color-text-primary)]">
              {user?.email || "No email"}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]">
            <Icons8Icon name={user?.kycVerified ? "check" : "shield"} size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">KYC Status</p>
            <p className={user?.kycVerified ? "font-medium text-[var(--color-positive-text)]" : "font-medium text-[var(--color-warning-text)]"}>
              {user?.kycVerified ? "Approved" : "Pending"}
            </p>
          </div>
        </div>
        
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
            <Icons8Icon name="bank" size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Bank details</p>
            <p className="overflow-anywhere font-medium text-[var(--color-text-primary)]">
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
          className="btn-ghost h-11 w-full text-sm md:h-12 md:text-base text-[var(--color-negative-text)]"
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
