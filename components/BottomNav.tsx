"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Icons8Icon, { type Icons8IconName } from "@/components/Icons8Icon";

const navItems: Array<{ label: string; icon: Icons8IconName; path: string }> = [
  { label: "Home", icon: "home", path: "/dashboard" },
  { label: "Wallet", icon: "wallet", path: "/wallet" },
  { label: "Market", icon: "market", path: "/marketplace" },
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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-glass-border)] bg-[var(--color-glass-bg)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-1 px-2 pb-[calc(0.7rem+env(safe-area-inset-bottom))] pt-2">
        {navItems.map((item) => {
          const isActive = activePath === item.path;
          return (
            <motion.button
              whileTap={{ scale: 0.94 }}
              key={item.path}
              onClick={() => router.push(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[5px] px-1 text-center transition-colors ${
                isActive
                  ? "bg-[var(--color-bg-card)] text-[var(--color-accent-primary)] shadow-[2px_2px_0px_var(--color-shadow)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-soft)]"
              }`}
            >
              <Icons8Icon name={item.icon} size={22} />
              <span className="w-full truncate text-[10px] font-bold uppercase tracking-[0.08em] font-sans">
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
