"use client";

import BrandLogo from "@/components/BrandLogo";
import { usePathname } from "next/navigation";
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
  const title = routeTitles[pathname];

  if (!title) return null;

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--color-glass-border)] bg-[var(--color-glass-bg)] backdrop-blur">
      <div className="mx-auto flex min-h-[4rem] max-w-7xl items-center px-4 pr-4 pt-[env(safe-area-inset-top)] justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <BrandLogo className="h-8 w-32" />
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
