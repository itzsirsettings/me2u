"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useStore } from "@/lib/store";

export { ReferenceIcon, type ReferenceIconName } from "./ReferenceIcon";
export function Initials({ name }: { name: string }) {
  return (
    <>
      {name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "M"}
    </>
  );
}

export function useReferenceUser() {
  const user = useStore((state) => state.user);
  const authenticated = useStore((state) => state.isAuthenticated);
  return authenticated ? user : null;
}

export function ReferenceScreen({
  children,
  kind,
  ready = true,
}: {
  children?: ReactNode;
  kind: "home" | "profile" | "referrals";
  ready?: boolean;
}) {
  return (
    <div className="reference-backdrop">
      <a className="reference-skip" href="#page-content">
        Skip to content
      </a>
      <main id="page-content" className={`reference-page design-screen design-${kind}`}>
        {ready ? (
          children
        ) : (
          <div className="design-loading" role="status">
            <span className="design-spinner" />
            Loading your account…
          </div>
        )}
      </main>
    </div>
  );
}

export function ReferenceToolbar({
  name,
}: {
  name?: string;
}) {
  return (
    <header className="design-toolbar" aria-label="Account controls">
      {name && (
        <Link href="/profile" className="design-account-link" aria-label="Open profile">
          <span className="design-avatar-small">
            <Initials name={name} />
          </span>
          <span aria-hidden="true">⌄</span>
        </Link>
      )}
    </header>
  );
}

export function money(amount: number, decimals = 0) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}
