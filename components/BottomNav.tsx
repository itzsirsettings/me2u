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
    <div className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-[calc(0.35rem+env(safe-area-inset-bottom))] md:hidden">
      <div className="relative mx-auto grid max-w-md grid-cols-5 items-end gap-1 rounded-t-[28px] bg-[var(--mobile-surface)] px-2 pb-1.5 pt-2 shadow-[0_-12px_36px_rgba(0,64,107,0.10)]">
        {navItems.map((item) => {
          const isActive = activePath === item.path;
          const centerClasses = item.center
            ? "-mt-7 min-h-[4.85rem] justify-start gap-0.5 text-[var(--mobile-pill-text)]"
            : "min-h-[3.65rem] gap-0.5";
          return (
            <motion.button
              whileTap={{ scale: 0.94 }}
              key={item.path}
              onClick={() => router.push(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-w-0 flex-col items-center rounded-[18px] px-1 text-center transition-colors ${centerClasses} ${
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
                    ? "grid h-[3.9rem] w-[3.9rem] place-items-center rounded-full border-[8px] border-[var(--mobile-app-bg)] bg-[var(--gradient-primary)] text-[var(--color-on-accent)] shadow-[0_14px_30px_rgba(0,64,107,0.20)]"
                    : "grid h-7 w-7 place-items-center"
                }
              >
                <Icons8Icon name={item.icon} size={item.center ? 26 : 20} />
              </span>
              <span className="w-full truncate text-[10px] font-extrabold tracking-normal font-sans">
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
