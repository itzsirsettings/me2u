# me2u Design System

## Purpose

This document describes the visual system used by the me2u Next.js app. It is documentation, not executable code. The active implementation lives in:

- `app/globals.css` for tokens, utilities, buttons, glass, and borders
- `app/layout.tsx` for Google font wiring
- `components/ui/*` for reusable primitives
- `components/BottomNav.tsx` for mobile navigation
- `components/MobileHeader.tsx` for the authenticated mobile top bar
- `components/Icons8Icon.tsx` for Icons8-sourced app icons
- `components/ThemeToggle.tsx` for persisted light/dark mode switching

## Visual Direction

me2u should feel like a trustworthy Nigerian peer-to-peer lending product: warm, direct, practical, and finance-focused. The interface uses a warm beige canvas in light mode, a muted charcoal-olive canvas in dark mode, crisp tactile borders, strong blue action states, oversized display typography, and small kinetic motion.

The product UI is the first screen. Avoid marketing-only landing-page composition for authenticated app routes.

## Color Tokens

```css
--color-bg-primary: #F4F1EA;
--color-bg-secondary: #EBE7DF;
--color-bg-card: #FFFFFF;
--color-accent-primary: #0037af;
--color-text-primary: #121212;
--color-text-secondary: #4A4A4A;
--color-border: #121212;
--color-on-accent: #F8F5EC;
--color-shadow: rgba(18, 18, 18, 0.16);
```

Dark mode is controlled by `html[data-theme="dark"]` in `app/globals.css`. Add new UI colors as tokens in both themes rather than hard-coding Tailwind color names.

## Supported Utility Classes

These classes are implemented in `app/globals.css` and can be used in app markup.

```tsx
bg-primary
bg-secondary
bg-card
text-primary
text-secondary
accent-primary
border-primary
font-display
font-sans
font-serif-italic
font-mono
serif-italic
kinetic-border
glass
btn-primary
btn-ghost
```

Use arbitrary values only when a page needs a one-off product detail, for example `bg-[var(--color-bg-card)]`.

## Typography

Fonts are loaded through `next/font/google` in `app/layout.tsx`.

- Display: Bricolage Grotesque via `font-display`
- Body/UI: Geologica via `font-sans`
- Italic emphasis: Geologica italic via `serif-italic`
- Numeric form emphasis: Geologica via `font-mono`

Recommended hierarchy:

```tsx
// Page title
"text-6xl md:text-7xl font-display leading-[0.8] tracking-tighter"

// Section heading
"text-3xl font-display leading-none"

// Body large
"text-xl leading-relaxed font-sans italic text-secondary"

// Utility label
"text-[10px] font-bold tracking-[0.1em] uppercase font-sans"
```

Do not scale font size with viewport width. Use breakpoint-specific sizes and stable line heights.

## Layout

Use one centered content container per route:

```tsx
"mx-auto max-w-7xl px-6 py-24 container"
```

Authenticated routes should add mobile-specific breathing room for the fixed top and bottom app chrome:

```tsx
"px-4 pb-32 pt-20 md:px-6 md:py-24"
```

Common widths:

- Dashboard: `max-w-7xl`
- Marketplace: `max-w-5xl`
- Loans: `max-w-4xl`
- Wallet and Withdraw: `max-w-md`

Major vertical rhythm:

- Page top/bottom padding: `py-24`
- Large section gap: `mb-16`
- Heading gap: `mb-12`
- Card/grid gap: `gap-8` to `gap-16`

## Buttons

Use global button classes for product actions.

```tsx
<button className="btn-primary">Fund Wallet</button>
<button className="btn-ghost">Marketplace</button>
```

Primary buttons use the blue accent and `--color-on-accent` text. Ghost buttons use transparent surfaces and `--color-hover-soft`. Every button, including `Button` from `components/ui/button.tsx` and raw `.btn-primary` / `.btn-ghost` buttons, must keep a `var(--color-border)` outline.

## Cards

Cards should be crisp and tactile, with the black border line visible on every card surface:

```tsx
<Card className="kinetic-border bg-card p-6 shadow-[4px_4px_0px_rgba(18,18,18,0.1)]">
  ...
</Card>
```

Use cards for financial summaries, marketplace listings, loan rows, forms, login/register panels, and profile panels. Do not nest cards inside cards. Do not use gray or white card borders; use `border border-[var(--color-border)]` or `kinetic-border`.

All border radii across the app should be exactly 5px. Use `rounded-[5px]` in Tailwind markup and `border-radius: 5px` in custom CSS.

## Forms

Inputs should feel sturdy and readable:

```tsx
"w-full rounded-[5px] border border-primary bg-card p-4 font-mono text-2xl focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:outline-none"
```

Labels use uppercase Geologica with muted text:

```tsx
"mb-2 block text-sm font-sans font-bold uppercase tracking-wider text-secondary"
```

## Navigation

Mobile navigation lives in `components/BottomNav.tsx`.

- Fixed to the bottom
- Glass treatment with warm translucent background
- Icons8 icons rendered through `components/Icons8Icon.tsx`
- Active route uses `--color-accent-primary`
- Tap feedback uses Framer Motion
- Hidden on public routes such as `/`, `/login`, and `/register`

The authenticated mobile header lives in `components/MobileHeader.tsx`.

- Fixed to the top
- Displays the product mark, current route title, and Icons8 attribution
- Hidden on desktop and public routes

The global theme toggle is fixed above the mobile nav and at the desktop lower-right corner. It stores the choice in `localStorage` under `me2u-theme` and falls back to the user's system preference.

Desktop pages currently rely on route-level content rather than a persistent sidebar.

## Motion

Framer Motion is installed and used across route pages.

Preferred entrance pattern:

```tsx
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};
```

Use lift on cards sparingly:

```tsx
whileHover={{ y: -8, transition: { duration: 0.3, ease: "easeOut" } }}
```

Motion should help the user understand state changes. It should not slow down financial workflows.

## Current Routes

- `/` - public entry route
- `/login` - demo login
- `/register` - demo registration
- `/dashboard` - balance, locked funds, active loans, quick actions, transactions
- `/wallet` - fund wallet
- `/withdraw` - withdrawal confirmation flow
- `/marketplace` - create and accept borrow/lending listings
- `/loans` - active loans and repayment
- `/profile` - profile placeholder

## Implementation Notes

- Tailwind CSS v4 is used through `@import "tailwindcss"` and `@theme inline`.
- Custom design utilities are defined with `@utility` in `app/globals.css`.
- `font-display` and `font-sans` depend on `--font-bricolage` and `--font-geologica`, which are injected by `next/font`.
- `framer-motion` is a required runtime dependency.
- This app does not currently use Three.js, a custom cursor, or portfolio-style sections. Add those only if they become real product requirements.

## Accessibility

- Keep focus rings visible on all buttons and form controls.
- Use semantic buttons for actions and links for navigation when possible.
- Preserve high contrast between text and the warm background.
- Respect reduced motion if adding more complex animation.

## Maintenance Checklist

When adding or changing UI:

1. Use the color and font utilities from this file.
2. Prefer `btn-primary`, `btn-ghost`, `kinetic-border`, and existing UI primitives.
3. Keep cards sharp, readable, and uncrowded.
4. Test desktop and mobile widths.
5. Run `npm run build` before handoff.
