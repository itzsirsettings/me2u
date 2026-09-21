"use client";

import { QrCode } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ReferenceIcon, type ReferenceIconName } from "@/components/reference/ReferenceUI";

const navItems = [
  { label: "Home", path: "/dashboard", related: ["/loans", "/learn"] },
  { label: "Market", path: "/marketplace", related: ["/deals"] },
  {
    label: "Wallet",
    path: "/wallet",
    related: ["/withdraw", "/savings", "/circles", "/bills"],
  },
  {
    label: "Profile",
    path: "/profile",
    related: ["/kyc", "/security", "/support", "/admin", "/account-unlock", "/legal"],
  },
] as const;

// Secondary application screens retain the same persistent shell so navigation
// never changes shape as people move through their account journey.
const extraNavRoutes = [
  "/savings",
  "/circles",
  "/deals",
  "/referrals",
  "/loans",
  "/kyc",
  "/learn",
  "/security",
  "/withdraw",
  "/bills",
  "/account-unlock",
  "/support",
  "/admin",
  "/legal",
];

const icons: ReferenceIconName[] = ["home", "market", "wallet", "user"];

export default function BottomNav() {
  const pathname = usePathname();
  const showNav =
    navItems.some(
      (item) =>
        item.path === pathname ||
        (item.path !== "/dashboard" && pathname.startsWith(`${item.path}/`)),
    ) || extraNavRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (!showNav) return null;

  return (
    <nav aria-label="Primary navigation" className="design-reference-nav">
      <div>
        {navItems.map((item, index) => {
          const active =
            pathname === item.path ||
            pathname.startsWith(`${item.path}/`) ||
            item.related.some(
              (route) => pathname === route || pathname.startsWith(`${route}/`),
            );
          return (
            <Link key={item.path} href={item.path} aria-current={active ? "page" : undefined}>
              <ReferenceIcon name={icons[index]} size={22} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/referrals?panel=qr"
          scroll={false}
          aria-label="Open Refer & Earn"
          aria-current={pathname.startsWith("/referrals") ? "page" : undefined}
          className="design-qr-button"
        >
          <QrCode size={24} aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );
}
