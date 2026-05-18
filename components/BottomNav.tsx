"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Icons8Icon, { type Icons8IconName } from "@/components/Icons8Icon";

const navItems: Array<{ label: string; icon: Icons8IconName; path: string; center?: boolean }> = [
  { label: "Home", icon: "home", path: "/dashboard" },
  { label: "Market", icon: "market", path: "/marketplace" },
  { label: "Wallet", icon: "wallet", path: "/wallet", center: true },
  { label: "Loans", icon: "loans", path: "/loans" },
  { label: "Profile", icon: "profile", path: "/profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activePath = pathname === "/withdraw" ? "/wallet" : pathname;
  const showNav = navItems.some((item) => item.path === activePath);

  if (!showNav) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[calc(0.55rem+env(safe-area-inset-bottom))] md:hidden">
      <div className="relative mx-auto grid max-w-md grid-cols-5 items-end gap-1 rounded-t-[34px] bg-[var(--mobile-surface)] px-3 pb-2 pt-3 shadow-[0_-18px_50px_rgba(0,64,107,0.10)]">
        {navItems.map((item) => {
          const isActive = activePath === item.path;
          const centerClasses = item.center
            ? "-mt-10 min-h-[5.75rem] justify-start gap-1 text-[var(--mobile-pill-text)]"
            : "min-h-[4.25rem] gap-1";
          return (
            <motion.button
              whileTap={{ scale: 0.94 }}
              key={item.path}
              onClick={() => router.push(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-w-0 flex-col items-center rounded-[22px] px-1 text-center transition-colors ${centerClasses} ${
                item.center
                  ? ""
                  : isActive
                    ? "text-[var(--color-accent-primary)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-soft)]"
              }`}
            >
              <span
                className={
                  item.center
                    ? "grid h-[4.65rem] w-[4.65rem] place-items-center rounded-full border-[10px] border-[var(--mobile-app-bg)] bg-[var(--gradient-primary)] text-[var(--color-on-accent)] shadow-[0_18px_38px_rgba(0,64,107,0.22)]"
                    : "grid h-8 w-8 place-items-center"
                }
              >
                <Icons8Icon name={item.icon} size={item.center ? 30 : 22} />
              </span>
              <span className="w-full truncate text-[11px] font-extrabold tracking-normal font-sans">
                {item.label}
              </span>
              {!item.center && isActive && (
                <span className="mt-0.5 h-2 w-2 rounded-full bg-[var(--color-accent-primary)]" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
