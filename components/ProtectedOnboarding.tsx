"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore, type User } from "@/lib/store";

const authRoutes = new Set(["/login", "/register"]);

const protectedPrefixes = [
  "/admin",
  "/dashboard",
  "/kyc",
  "/loans",
  "/marketplace",
  "/profile",
  "/referrals",
  "/security",
  "/wallet",
  "/withdraw",
];

const depositRequiredPrefixes = [
  "/kyc",
  "/loans",
  "/marketplace",
  "/referrals",
  "/withdraw",
];

const kycRequiredPrefixes = [
  "/loans",
  "/marketplace",
  "/referrals",
  "/withdraw",
];

function pathMatches(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (authRoutes.has(value)) return null;
  return value;
}

function getOnboardingTarget(user: User | null) {
  if (!user) return "/login";
  if (!user.registrationDepositPaid) return "/wallet";
  if (!user.kycVerified) return "/kyc";
  return "/dashboard";
}

export default function ProtectedOnboarding() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useStore((state) => state.user);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const isLoading = useStore((state) => state.isLoading);

  useEffect(() => {
    if (isLoading) return;

    const fullPath = `${pathname}${window.location.search || ""}`;
    const isProtectedPath = pathMatches(pathname, protectedPrefixes);
    const isAuthPath = authRoutes.has(pathname);

    if (!isAuthenticated) {
      if (isProtectedPath) {
        router.replace(`/login?next=${encodeURIComponent(fullPath)}`);
      }
      return;
    }

    if (!user) return;

    if (isAuthPath) {
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      router.replace(next || getOnboardingTarget(user));
      return;
    }

    if (!user.registrationDepositPaid && pathMatches(pathname, depositRequiredPrefixes)) {
      router.replace("/wallet");
      return;
    }

    if (user.registrationDepositPaid && !user.kycVerified && pathMatches(pathname, kycRequiredPrefixes)) {
      router.replace("/kyc");
    }
  }, [isAuthenticated, isLoading, pathname, router, user]);

  return null;
}
