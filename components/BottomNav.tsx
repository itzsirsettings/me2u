"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Me2uIcon, { type Me2uIconName } from "@/components/Me2uIcon";

const navItems: Array<{ label: string; icon: Me2uIconName; path: string }> = [
  { label: "Home", icon: "home", path: "/dashboard" },
  { label: "Market", icon: "market", path: "/marketplace" },
  { label: "Wallet", icon: "wallet", path: "/wallet" },
  { label: "Profile", icon: "profile", path: "/profile" },
];

// Routes where the bottom nav should stay visible even though they aren't top-level nav items
const extraNavRoutes = ["/savings", "/circles", "/deals", "/referrals", "/loans", "/kyc", "/learn", "/security", "/withdraw", "/support", "/admin"];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activePath = pathname;
  const showNav =
    navItems.some((item) => item.path === activePath || (item.path !== "/dashboard" && pathname.startsWith(item.path))) ||
    extraNavRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"));

  if (!showNav) return null;

  return (
    <nav aria-label="Primary navigation" className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-[calc(0.45rem+env(safe-area-inset-bottom))] md:hidden">
      <div className="reference-bottom-nav relative mx-auto grid max-w-md grid-cols-5 items-center gap-0 px-2 py-2">
        {navItems.map((item) => {
          const isActive = activePath === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path));
          return (
            <motion.button
              whileTap={{ scale: 0.92 }}
              key={item.path}
              onClick={() => router.push(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-h-[3.5rem] min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-2 text-center transition-[background-color,color,transform] duration-200 ${
                isActive
                  ? "bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] font-black"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-soft)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span className={`grid h-6 w-6 place-items-center transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
                <Me2uIcon name={item.icon} size={20} />
              </span>
              <span className="w-full truncate text-[10px] font-black tracking-wide font-sans">
                {item.label}
              </span>
            </motion.button>
          );
        })}
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => router.push("/referrals")}
          aria-label="Open Refer & Earn"
          aria-current={pathname.startsWith("/referrals") ? "page" : undefined}
          className={`reference-nav-orb grid h-[4.25rem] w-[4.25rem] place-items-center justify-self-center rounded-full ${pathname.startsWith("/referrals") ? "reference-nav-orb-active" : ""}`}
        >
          <Me2uIcon name="referral" size={27} />
        </motion.button>
      </div>
    </nav>
  );
}
