"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Icons8Icon, { type Icons8IconName } from "@/components/Icons8Icon";

const navItems: Array<{ label: string; icon: Icons8IconName; path: string }> = [
  { label: "Home", icon: "home", path: "/dashboard" },
  { label: "Market", icon: "market", path: "/marketplace" },
  { label: "Loans", icon: "loans", path: "/loans" },
  { label: "Wallet", icon: "wallet", path: "/wallet" },
  { label: "Profile", icon: "profile", path: "/profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activePath = pathname;
  const showNav = navItems.some((item) => item.path === activePath || (item.path !== "/dashboard" && pathname.startsWith(item.path)));

  if (!showNav) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-[calc(0.25rem+env(safe-area-inset-bottom))] md:hidden">
      <div className="relative mx-auto grid max-w-md grid-cols-4 items-center gap-0.5 rounded-[22px] bg-[var(--mobile-surface)] px-2 py-1.5 shadow-[0_-10px_28px_rgba(0,64,107,0.09)]">
        {navItems.map((item) => {
          const isActive = activePath === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path));
          return (
            <motion.button
              whileTap={{ scale: 0.94 }}
              key={item.path}
              onClick={() => router.push(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-h-[3rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 text-center transition-colors ${
                isActive
                  ? "text-[var(--color-accent-primary)] font-bold"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-soft)]"
              }`}
            >
              <span className="grid h-5 w-5 place-items-center">
                <Icons8Icon name={item.icon} size={17} />
              </span>
              <span className="w-full truncate text-[9px] font-extrabold tracking-normal font-sans">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 h-1 w-1 rounded-full bg-[var(--color-accent-primary)]" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
