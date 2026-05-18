"use client";

import Icons8Icon from "@/components/Icons8Icon";
import ThemeModeSelector from "@/components/ThemeModeSelector";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  const referralLink = mounted ? `${window.location.origin}/register?ref=${user?.username || ""}` : "";

  return (
    <div className="app-mobile-screen mx-auto w-full max-w-md px-3.5 pt-[4.85rem] md:max-w-3xl md:p-6 md:py-24">
      <h1 className="sr-only md:not-sr-only md:mb-8 md:text-3xl md:font-display md:font-bold md:leading-none">
        Profile
      </h1>
      <div className="mobile-soft-card space-y-3 rounded-[5px] border border-[var(--color-border)] bg-card p-3.5 shadow-[4px_4px_0px_var(--color-shadow)] md:space-y-6 md:p-8">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
            <Icons8Icon name="referral" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Referral Link</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="truncate font-mono text-sm bg-[var(--color-bg-secondary)] px-2 py-1 rounded-[5px] border border-[var(--color-border)]">
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
              Earn 500 naira for telling your friend about me2u.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]">
            <Icons8Icon name="moneyBag" size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Affiliate Earnings</p>
            <p className="break-words">₦{(user?.affiliateEarnings || 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-positive-bg)] text-[var(--color-positive-text)]">
            <Icons8Icon name={user?.kycVerified ? "check" : "shield"} size={22} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">KYC</p>
            <p className={user?.kycVerified ? "font-medium text-[var(--color-positive-text)]" : "font-medium text-[var(--color-warning-text)]"}>
              {user?.kycVerified ? "Approved" : "Pending"}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
            <Icons8Icon name="bank" size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Bank</p>
            <p className="break-words">
              {user?.bankName || "Not added"} • {user?.accountNumber || "No account number"}
            </p>
          </div>
        </div>
        <ThemeModeSelector />
        <button className="btn-primary h-11 w-full text-sm md:h-14 md:text-base" disabled>
          2FA Setup Coming Soon
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
