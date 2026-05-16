"use client";

import Icons8Icon from "@/components/Icons8Icon";
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
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-accent-primary)] shadow-[2px_2px_0px_var(--color-shadow)]">
            <Icons8Icon name="app" size={22} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-[var(--color-text-primary)]">
              me2u
            </p>
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                {title}
              </p>
              <a
                href="https://icons8.com"
                target="_blank"
                rel="noreferrer noopener"
                className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
              >
                Icons8
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
