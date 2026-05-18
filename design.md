# me2u Design System

## Purpose

This document describes the visual system used by the me2u Next.js app. It is documentation, not executable code. The active implementation lives in:

- `app/globals.css` for tokens, utilities, buttons, mobile surfaces, and responsive overrides
- `app/layout.tsx` for font wiring
- `components/ui/*` for reusable primitives
- `components/BottomNav.tsx` for mobile navigation
- `components/MobileHeader.tsx` for authenticated route headers
- `components/NotificationBell.tsx` for alerts
- `components/Icons8Icon.tsx` for Icons8-sourced app icons

## Visual Direction

me2u should feel like a modern mobile finance app: confident, clean, direct, and easy to scan with one hand. Authenticated mobile screens use a soft gray canvas, large white rounded financial panels, deep blue brand accents, lavender action pills, bold account typography, and compact operational cards.

The public landing page remains the brand entry point. Authenticated routes should feel like the real product immediately, not like marketing pages.

## Brand Tokens

Core brand colors are defined in `app/globals.css` and mirrored in dark mode through `html[data-theme="dark"]`.

```css
--brand-primary: #00406b;
--brand-accent: #007fff;
--brand-text: #5a5a5a;
--brand-surface: #f1f1f4;
--brand-background: #ffffff;
--gradient-primary: linear-gradient(135deg, var(--brand-primary), var(--brand-accent));
```

Semantic app tokens should be used in markup instead of one-off colors whenever possible:

```css
--color-bg-primary;
--color-bg-secondary;
--color-bg-card;
--color-accent-primary;
--color-accent-deep;
--color-text-primary;
--color-text-secondary;
--color-border;
--color-on-accent;
--color-shadow;
```

## Mobile Tokens

The mobile product shell has its own tactile layer:

```css
--mobile-app-bg: #dedede;
--mobile-surface: #ffffff;
--mobile-surface-muted: #ededed;
--mobile-pill: #c9c0f2;
--mobile-pill-text: #07026f;
--mobile-radius-xl: 28px;
--mobile-radius-lg: 22px;
```

Use these utilities for authenticated mobile screens:

```tsx
app-mobile-screen
mobile-soft-card
mobile-icon-button
mobile-pill-button
mobile-qr-pattern
```

## Typography

Fonts are loaded through `next/font/google` in `app/layout.tsx`.

- Display: Bricolage Grotesque via `font-display`
- Body and UI: Geologica via `font-sans`
- Numeric and compact financial text: Geologica via `font-mono`

Mobile finance hierarchy:

```tsx
// Account greeting
"text-[1.72rem] font-black leading-tight tracking-normal"

// Main balance
"font-display text-[2.25rem] font-black leading-none tracking-normal"

// Card heading
"text-[1.45rem] font-black leading-tight tracking-normal"

// Action label
"text-[1rem] font-black leading-none"
```

Do not scale fonts with viewport width. Use fixed mobile sizes, breakpoint-specific desktop sizes, and stable line heights.

## Mobile Layout

Authenticated app routes should use the mobile shell first:

```tsx
"app-mobile-screen mx-auto w-full max-w-md px-4 pt-20 md:max-w-..."
```

Dashboard is the densest route and owns its top greeting, so `MobileHeader` is hidden on `/dashboard`. Other authenticated routes use the fixed mobile header with a back icon at the top-left.

Mobile screen rules:

- Keep one primary column at `max-w-md`.
- Reserve bottom space for the fixed nav with `app-mobile-screen`.
- Use `px-4` and `pt-20` on non-dashboard mobile app routes so the fixed header does not waste vertical space.
- Use `mobile-soft-card` for grouped financial panels and forms.
- Prefer pill CTAs for wallet, transfer, KYC, and loan actions.
- Keep repeated action tiles stable in height to avoid layout shift.
- Avoid nested cards. A panel can contain rows, but not another decorated card.
- Keep mobile icon buttons compact but touch-safe: 48px for circular chrome, 46px minimum for pill buttons, and 48px minimum for inputs.

## Desktop Layout

Desktop routes keep the existing wider content limits:

- Dashboard: `max-w-7xl`
- Marketplace: `max-w-5xl`
- Loans: `max-w-4xl`
- Wallet and Withdraw: `max-w-3xl`
- Profile and KYC: compact centered panels

Desktop can keep sharper `kinetic-border` surfaces while mobile receives rounded soft cards through the responsive overrides in `app/globals.css`.

## Buttons

Use global button classes for standard product actions:

```tsx
<button className="btn-primary">Fund Wallet</button>
<button className="btn-ghost">Marketplace</button>
```

On mobile, `.btn-primary`, `.btn-ghost`, and `.mobile-pill-button` become large rounded pills with no cramped text. Icon-only actions should use `.mobile-icon-button`.

## Navigation

Mobile navigation lives in `components/BottomNav.tsx`.

- Fixed to the bottom
- Five destinations: Home, Market, Wallet, Loans, Profile
- Wallet is the raised center action, kept compact enough not to cover form controls
- Active non-center items show a brand blue dot
- Hidden on public routes and routes outside the tab set

The authenticated mobile header lives in `components/MobileHeader.tsx`.

- Fixed to the top on non-dashboard authenticated routes
- Includes a top-left back icon
- Uses a soft mobile background
- Shows notifications on the right

`ThemeToggle` is hidden on mobile to prevent floating controls from competing with the app chrome.

## Motion

Framer Motion is used for route entrance and tap feedback.

Preferred entrance pattern:

```tsx
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
};
```

Motion should clarify state and touch response. It should not slow down payments, withdrawals, KYC, or loan workflows. Reduced motion is respected in `app/globals.css`.

## Current Routes

- `/` - public landing page
- `/login` - demo login
- `/register` - demo registration
- `/dashboard` - mobile finance home with balance, onboarding status, quick actions, referral, loans, admin entry, and transactions
- `/wallet` - fund wallet and transaction history
- `/withdraw` - withdrawal request flow
- `/kyc` - identity verification and bank details
- `/marketplace` - create and accept lending listings
- `/loans` - platform credit, active loans, and repayment
- `/profile` - profile, referral, and account status
- `/admin` - operational dashboard

## Accessibility

- Keep focus rings visible on buttons and form controls.
- Use semantic buttons for actions and links for navigation.
- Keep mobile tap targets at least 44px.
- Preserve contrast between deep blue text and the gray or white surfaces.
- Do not hide required route titles from assistive technology. Mobile page titles can be visually hidden with `sr-only` when the fixed header already names the route.

## Maintenance Checklist

When adding or changing UI:

1. Use the brand and mobile tokens from `app/globals.css`.
2. Match the mobile finance shell on authenticated routes.
3. Keep cards readable, spacious, and stable across device widths.
4. Avoid overlapping fixed header, fixed nav, toasts, and floating actions.
5. Run `npm run typecheck`, `npm run build`, and `npm run audit:prod` before shipping.
