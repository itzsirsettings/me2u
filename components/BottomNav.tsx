"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Icons8Icon, { type Icons8IconName } from "@/components/Icons8Icon";

const navItems: Array<{ label: string; icon: Icons8IconName; path: string }> = [
  { label: "Home", icon: "home", path: "/dashboard" },
  { label: "Market", icon: "market", path: "/marketplace" },
  { label: "Wallet", icon: "wallet", path: "/wallet" },
  { label: "Bills", icon: "bill", path: "/bills" },
  { label: "Profile", icon: "profile", path: "/profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activePath = pathname;
  const showNav = navItems.some((item) => item.path === activePath || (item.path !== "/dashboard" && pathname.startsWith(item.path)));

  if (!showNav) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden">
      <div className="relative mx-auto grid max-w-md grid-cols-5 items-center gap-1 rounded-[28px] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-2.5 shadow-[0_-8px_32px_rgba(0,0,0,0.18),0_-2px_8px_rgba(0,0,0,0.12)]">
        {navItems.map((item) => {
          const isActive = activePath === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path));
          return (
            <motion.button
              whileTap={{ scale: 0.92 }}
              key={item.path}
              onClick={() => router.push(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-h-[3.5rem] min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-2 text-center transition-all duration-200 ${
                isActive
                  ? "bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] font-black"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-soft)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span className={`grid h-6 w-6 place-items-center transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
                <Icons8Icon name={item.icon} size={20} />
              </span>
              <span className="w-full truncate text-[10px] font-black tracking-wide font-sans">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 h-1.5 w-6 rounded-full bg-[var(--color-accent-primary)]" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
