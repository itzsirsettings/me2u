"use client";

import Icons8Icon from "@/components/Icons8Icon";
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
  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-20 md:p-6 md:py-24">
      <h1 className="mb-6 text-[2.75rem] font-display font-bold leading-[0.85] tracking-tight md:mb-8 md:text-3xl md:leading-none">
        Profile
      </h1>
      <div className="space-y-5 rounded-[5px] border border-[var(--color-border)] bg-card p-5 shadow-[4px_4px_0px_var(--color-shadow)] md:space-y-6 md:p-8">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-accent-primary)]">
            <Icons8Icon name="referral" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">Referral Link</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="truncate font-mono text-sm bg-[var(--color-bg-secondary)] px-2 py-1 rounded-[5px] border border-[var(--color-border)]">
                {mounted ? `${window.location.origin}/register?ref=${user?.username || ""}` : "..."}
              </p>
              <button
                onClick={() => {
                  const link = `${window.location.origin}/register?ref=${user?.username || ""}`;
                  navigator.clipboard.writeText(link);
                  toast.success("Referral link copied!");
                }}
                className="shrink-0 text-[var(--color-accent-primary)] hover:opacity-80 p-1"
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
        <button className="btn-primary w-full h-14 text-base" disabled>
          2FA Setup Coming Soon
        </button>
        <button
          className="btn-ghost w-full h-12 text-base"
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
