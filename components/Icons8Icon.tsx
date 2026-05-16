import type { CSSProperties } from "react";

export const icons8Icons = {
  app: "https://img.icons8.com/material-outlined/96/android-app-drawer.png",
  home: "https://img.icons8.com/material-outlined/96/home.png",
  wallet: "https://img.icons8.com/material-outlined/96/wallet.png",
  market: "https://img.icons8.com/material-outlined/96/combo-chart.png",
  loans: "https://img.icons8.com/material-outlined/96/bank-card-back-side.png",
  profile: "https://img.icons8.com/material-outlined/96/user.png",
  sun: "https://img.icons8.com/material-outlined/96/sun.png",
  moon: "https://img.icons8.com/material-outlined/96/moon.png",
  shield: "https://img.icons8.com/material-outlined/96/shield.png",
  email: "https://img.icons8.com/material-outlined/96/new-post.png",
  phone: "https://img.icons8.com/material-outlined/96/phone.png",
  lock: "https://img.icons8.com/material-outlined/96/lock.png",
  visible: "https://img.icons8.com/material-outlined/96/visible.png",
  invisible: "https://img.icons8.com/material-outlined/96/invisible.png",
  referral: "https://img.icons8.com/material-outlined/96/conference-call.png",
  moneyBag: "https://img.icons8.com/material-outlined/96/money-bag.png",
  requestMoney: "https://img.icons8.com/material-outlined/96/request-money.png",
  bank: "https://img.icons8.com/material-outlined/96/bank-building.png",
  cash: "https://img.icons8.com/material-outlined/96/cash-app.png",
  tap: "https://img.icons8.com/material-outlined/96/tap.png",
  check: "https://img.icons8.com/material-outlined/96/checked--v1.png",
} as const;

export type Icons8IconName = keyof typeof icons8Icons;

type Icons8IconProps = {
  name: Icons8IconName;
  size?: number;
  className?: string;
  label?: string;
  decorative?: boolean;
};

export default function Icons8Icon({
  name,
  size = 24,
  className = "",
  label,
  decorative = true,
}: Icons8IconProps) {
  const style: CSSProperties = {
    width: size,
    height: size,
    WebkitMask: `url(${icons8Icons[name]}) center / contain no-repeat`,
    mask: `url(${icons8Icons[name]}) center / contain no-repeat`,
    backgroundColor: "currentColor",
    display: "inline-block",
    flexShrink: 0,
  };

  return (
    <span
      className={className}
      style={style}
      aria-hidden={decorative ? "true" : undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label || `${name} icon`}
    />
  );
}
