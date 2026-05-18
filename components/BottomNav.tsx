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
    <div className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-[calc(0.25rem+env(safe-area-inset-bottom))] md:hidden">
      <div className="relative mx-auto grid max-w-md grid-cols-5 items-end gap-0.5 rounded-t-[22px] bg-[var(--mobile-surface)] px-2 pb-1 pt-1.5 shadow-[0_-10px_28px_rgba(0,64,107,0.09)]">
        {navItems.map((item) => {
          const isActive = activePath === item.path;
          const centerClasses = item.center
            ? "-mt-5 min-h-[4.25rem] justify-start gap-0.5 text-[var(--mobile-pill-text)]"
            : "min-h-[3.25rem] gap-0.5";
          return (
            <motion.button
              whileTap={{ scale: 0.94 }}
              key={item.path}
              onClick={() => router.push(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-w-0 flex-col items-center rounded-[16px] px-1 text-center transition-colors ${centerClasses} ${
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
                    ? "grid h-[3.35rem] w-[3.35rem] place-items-center rounded-full border-[6px] border-[var(--mobile-app-bg)] bg-[var(--gradient-primary)] text-[var(--color-on-accent)] shadow-[0_12px_24px_rgba(0,64,107,0.18)]"
                    : "grid h-6 w-6 place-items-center"
                }
              >
                <Icons8Icon name={item.icon} size={item.center ? 23 : 18} />
              </span>
              <span className="w-full truncate text-[9px] font-extrabold tracking-normal font-sans">
                {item.label}
              </span>
              {!item.center && isActive && (
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent-primary)]" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
