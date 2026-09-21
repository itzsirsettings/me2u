"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";

import ReferenceNotifications from "@/components/reference/ReferenceNotifications";
import ThemeToggleIcon from "@/components/ThemeToggleIcon";
import { useStore } from "@/lib/store";

const shapes = {
  home: <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-5v-7h-4v7H5a2 2 0 0 1-2-2Z" />,
  market: (
    <>
      <rect x="3" y="14" width="5" height="8" rx="2" />
      <rect x="10" y="8" width="5" height="14" rx="2" />
      <rect x="17" y="2" width="5" height="20" rx="2" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7V5a2 2 0 0 1 1.6-2L17 1v5H5a1 1 0 0 0 0 2h15a2 2 0 0 1 2 2v3h-6a3 3 0 0 0 0 6h6v1a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V7Z" />
      <path
        fillRule="evenodd"
        d="M16 14h7v4h-7a2 2 0 0 1 0-4Zm1 1.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Z"
      />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="7" r="4.5" />
      <path d="M4 22v-3a8 8 0 0 1 16 0v3Z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7" r="4" />
      <circle cx="18" cy="9" r="3.2" />
      <path d="M1 22v-3a8 8 0 0 1 16 0v3Zm17-7a6 6 0 0 1 6 6v1h-5v-3a10 10 0 0 0-1-4Z" />
    </>
  ),
  shield: <path d="M12 2 22 6v5c0 6-5 10-10 12C7 21 2 17 2 11V6Z" />,
  secure: (
    <path
      fillRule="evenodd"
      d="M12 2 22 6v5c0 6-5 10-10 12C7 21 2 17 2 11V6Zm-4 9v4l4 3 4-3v-4Z"
    />
  ),
  savings: (
    <path
      fillRule="evenodd"
      d="M6 2h12a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a4 4 0 0 1 4-4Zm1 5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3h-4v1H9v-4h6v1h4V9a2 2 0 0 0-2-2Z"
    />
  ),
  book: <path d="M2 3c4-1 7-1 9 2v17c-2-2-5-3-9-2Zm20 0c-4-1-7-1-9 2v17c2-2 5-3 9-2Z" />,
  tag: (
    <path
      fillRule="evenodd"
      d="M12 2h8a2 2 0 0 1 2 2v8L11 23 1 13Zm6 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"
    />
  ),
  email: (
    <>
      <path d="M2 4h20v2L12 13 2 6Z" />
      <path d="m2 9 10 7L22 9v11H2Z" />
    </>
  ),
  bank: (
    <>
      <path d="m12 1 11 7v3H1V8Zm-9 20h18v3H3Z" />
      <path d="M4 10h4v12H4Zm6 0h4v12h-4Zm6 0h4v12h-4Z" />
    </>
  ),
  star: <path d="m12 1 3.4 7 7.6 1-5.5 5.4 1.3 7.6-6.8-3.6-6.8 3.6 1.3-7.6L1 9l7.6-1Z" />,
  check: (
    <path
      fillRule="evenodd"
      d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm-1.5 14.5L6 11l-1.5 1.5 6 6 10-10L19 7Z"
    />
  ),
  gift: (
    <>
      <path d="M2 9h9v5H1V9Zm11 0h10v5H13ZM3 15h8v8H3Zm10 0h8v8h-8Z" />
      <path
        fillRule="evenodd"
        d="M12 8C0 10 2-1 8 1c2 .5 3 3 4 5 1-2 2-4.5 4-5 6-2 8 9-4 7ZM7 3C3 3 5 8 10 7 9 5 8 3 7 3Zm10 0c4 0 2 5-3 4 1-2 2-4 3-4Z"
      />
    </>
  ),
  trophy: (
    <path
      fillRule="evenodd"
      d="M6 1h12v3h5v4c0 4-3 6-7 6l-2 2v4h5v3H5v-3h5v-4l-2-2C4 14 1 12 1 8V4h5Zm0 6H4v1c0 2 1 3 3 3Zm12 0-1 4c2 0 3-1 3-3V7Z"
    />
  ),
  crown: <path d="M2 7 7 11l5-9 5 9 5-4-3 14H5Zm3 15h14v2H5Z" />,
} satisfies Record<string, ReactNode>;

export type ReferenceIconName = keyof typeof shapes;

export function ReferenceIcon({
  name,
  size = 24,
  className = "",
}: {
  name: ReferenceIconName;
  size?: number;
  className?: string;
}) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill={`url(#${id})`}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".8" />
        </linearGradient>
      </defs>
      {shapes[name]}
    </svg>
  );
}

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
  theme = false,
  notifications = true,
  name,
}: {
  theme?: boolean;
  notifications?: boolean;
  name?: string;
}) {
  return (
    <header className="design-toolbar" aria-label="Account controls">
      {theme && <ThemeToggleIcon className="design-icon-button" />}
      {notifications && <ReferenceNotifications />}
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
