"use client";

import BrandLogo from "@/components/BrandLogo";
import { usePathname, useRouter } from "next/navigation";
import Icons8Icon from "@/components/Icons8Icon";
import NotificationBell from "./NotificationBell";
import ThemeToggleIcon from "@/components/ThemeToggleIcon";

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/wallet": "Wallet",
  "/bills": "Bills & Utilities",
  "/withdraw": "Withdraw",
  "/kyc": "KYC",
  "/marketplace": "Marketplace",
  "/loans": "Loans",
  "/profile": "Profile",
  "/learn": "Me2U Learn",
  "/security": "Security Center",
  "/legal": "Legal Information",
  "/legal/data-policy": "Data Policy",
  "/legal/privacy-policy": "Privacy Policy",
  "/legal/terms-of-use": "Terms of Use",
  "/legal/security-policy": "Security Policy",
  "/legal/cookie-policy": "Cookie Policy",
  "/legal/lending-disclosure": "Lending Disclosure",
  "/legal/referral-terms": "Referral Terms",
  "/legal/complaint-resolution": "Complaint Policy",
  "/support": "Support",
  "/support/report-fraud": "Report Fraud",
  "/support/account-safety": "Account Safety",
  "/support/kyc-help": "KYC Help",
  "/support/loan-repayment-help": "Repayment Help",
  "/admin": "Admin Dashboard",
};

export default function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const title = routeTitles[pathname] || (pathname.startsWith("/bills/transactions") ? "Bill Receipt" : undefined);

  if (!title) return null;
  if (pathname === "/dashboard") return null;

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
    <header className="fixed left-0 right-0 top-0 z-50 bg-[var(--mobile-app-bg)]/95 backdrop-blur md:border-b md:border-[var(--color-glass-border)] md:bg-[var(--color-glass-bg)]">
      <div className="mx-auto flex min-h-[3.85rem] max-w-7xl items-center justify-between gap-3 px-3.5 pr-3.5 pt-[env(safe-area-inset-top)] md:min-h-[4rem] md:px-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            title="Go back"
            className="mobile-icon-button grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--color-text-primary)] transition hover:bg-[var(--color-bg-secondary)] md:h-11 md:w-11 md:rounded-[5px] md:border md:border-[var(--color-border)] md:bg-[var(--color-bg-card)] md:shadow-[2px_2px_0px_var(--color-shadow)]"
          >
            <Icons8Icon name="back" size={20} />
          </button>
          <div className="min-w-0">
            <BrandLogo src="/me2u_nav_logo.svg" className="hidden h-12 w-36 sm:w-40 md:inline-flex" />
            <p className="truncate text-[1rem] font-extrabold leading-none tracking-normal text-[var(--color-text-primary)] md:mt-1 md:text-xs md:font-semibold md:uppercase md:tracking-[0.1em] md:text-[var(--color-text-secondary)]">
              {title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggleIcon className="border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] hover:border-[var(--color-accent-primary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-accent-primary)] focus-visible:ring-[var(--color-accent-primary)] focus-visible:ring-offset-[var(--mobile-app-bg)]" />
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
