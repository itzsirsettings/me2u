"use client";

import BrandLogo from "@/components/BrandLogo";
import { usePathname, useRouter } from "next/navigation";
import Icons8Icon from "@/components/Icons8Icon";
import NotificationBell from "./NotificationBell";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/wallet": "Wallet",
  "/withdraw": "Withdraw",
  "/kyc": "KYC",
  "/marketplace": "Marketplace",
  "/loans": "Loans",
  "/profile": "Profile",
  "/admin": "Admin Dashboard",
};

export default function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const title = routeTitles[pathname];

  if (!title) return null;

  const handleBack = () => {
    if (pathname === "/dashboard") {
      router.push("/");
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--color-glass-border)] bg-[var(--color-glass-bg)] backdrop-blur">
      <div className="mx-auto flex min-h-[4rem] max-w-7xl items-center justify-between gap-3 px-3 pr-4 pt-[env(safe-area-inset-top)]">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            title="Go back"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-[2px_2px_0px_var(--color-shadow)] transition hover:bg-[var(--color-bg-secondary)]"
          >
            <Icons8Icon name="back" size={20} />
          </button>
          <div className="min-w-0">
            <BrandLogo className="h-8 w-28 sm:w-32" />
            <p className="mt-1 truncate text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              {title}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
