# Me2U Design System

> Modelled after Moniepoint's layout language. Built for a dark-first, trust-forward P2P lending product.

---

## Color Tokens

| Token | Hex | Usage |
|---|---|---|
| `--navy` | `#081320` | Primary bg, navbar, hero, dark cards |
| `--slate` | `#1E293B` | Secondary surfaces, feature cards, dark inputs |
| `--slate-mid` | `#334155` | Borders on dark surfaces, dividers |
| `--slate-light` | `#64748B` | Muted text, captions, placeholders |
| `--green` | `#22C55E` | Primary CTA, accent text, step indicators, success |
| `--green-dark` | `#16A34A` | Green hover state |
| `--lime` | `#A3E635` | Secondary accent, trust score, final step, lime CTA |
| `--lime-dark` | `#84CC16` | Lime hover state |
| `--snow` | `#F8FAFC` | Light mode bg, stat cards, light inputs |
| `--white` | `#FFFFFF` | Card surfaces, text on dark |

### Semantic Aliases

```css
:root {
  --color-primary:        #22C55E;
  --color-primary-hover:  #16A34A;
  --color-accent:         #A3E635;
  --color-bg-dark:        #081320;
  --color-bg-surface:     #1E293B;
  --color-bg-light:       #F8FAFC;
  --color-text-on-dark:   rgba(255, 255, 255, 0.85);
  --color-text-muted-dark: rgba(255, 255, 255, 0.5);
  --color-border-dark:    rgba(255, 255, 255, 0.08);
  --color-border-light:   rgba(0, 0, 0, 0.08);
}
```

---

## Typography

| Role | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| Display | 36–48px | 500 | 1.1 | Hero headlines |
| H1 | 28–32px | 500 | 1.2 | Page titles |
| H2 | 22–24px | 500 | 1.3 | Section headings |
| H3 | 16–18px | 500 | 1.4 | Card titles |
| Body | 14–15px | 400 | 1.6 | Paragraphs, descriptions |
| Small | 12–13px | 400 | 1.5 | Captions, labels, meta |
| Mono | 12–13px | 400 | 1.4 | Amounts, codes, tokens |

### Font Stack

```css
font-family: 'Inter', 'DM Sans', system-ui, sans-serif;
font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Headline Pattern (Moniepoint-style)

```html
<h1>
  Zero-interest lending,
  <span style="color: #22C55E;">powered by trust</span>
</h1>
```

Green accent on the key phrase. Never underline. Never all-caps.

---

## Spacing Scale

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Icon gaps, tight inline |
| `--space-2` | 8px | Component internals |
| `--space-3` | 12px | Button padding inline |
| `--space-4` | 16px | Card padding, form gaps |
| `--space-6` | 24px | Section element spacing |
| `--space-8` | 32px | Card gaps, grid gaps |
| `--space-12` | 48px | Section padding top/bottom |
| `--space-16` | 64px | Large section breaks |
| `--space-20` | 80px | Hero padding |

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 8px | Inputs, small badges, icons |
| `--radius-md` | 12px | Cards, modals, dropdowns |
| `--radius-lg` | 20px | Large cards, hero sections |
| `--radius-pill` | 999px | All buttons, tags, nav items |

---

## Buttons

### Variants

```css
/* Primary — main CTA */
.btn-primary {
  background: #22C55E;
  color: #081320;
  border: none;
  border-radius: 999px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 500;
}
.btn-primary:hover { background: #16A34A; }

/* Secondary — ghost green */
.btn-secondary {
  background: transparent;
  color: #22C55E;
  border: 1.5px solid #22C55E;
  border-radius: 999px;
  padding: 10px 24px;
}
.btn-secondary:hover { background: rgba(34, 197, 94, 0.08); }

/* Dark — navy fill */
.btn-dark {
  background: #081320;
  color: #FFFFFF;
  border: none;
  border-radius: 999px;
  padding: 10px 24px;
}

/* Lime — secondary accent CTA */
.btn-lime {
  background: #A3E635;
  color: #081320;
  border: none;
  border-radius: 999px;
  padding: 10px 24px;
}

/* Ghost — neutral */
.btn-ghost {
  background: transparent;
  color: currentColor;
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 999px;
  padding: 10px 24px;
}
```

### Sizes

| Size | Padding | Font |
|---|---|---|
| sm | 6px 14px | 12px |
| md (default) | 10px 24px | 14px |
| lg | 14px 32px | 16px |

---

## Badges & Labels

```css
/* Success */
.badge-green  { background: #DCFCE7; color: #15803D; }

/* Accent */
.badge-lime   { background: #ECFCCB; color: #4D7C0F; }

/* Dark */
.badge-navy   { background: #081320; color: #F8FAFC; }
.badge-slate  { background: #1E293B; color: #F8FAFC; }

/* Warning */
.badge-warn   { background: #FEF9C3; color: #854D0E; }

/* Error */
.badge-error  { background: #FEE2E2; color: #B91C1C; }

/* Shared */
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
}
```

---

## Card Surfaces

| Surface | Background | Border | Use case |
|---|---|---|---|
| Light | `#FFFFFF` | 0.5px solid rgba(0,0,0,0.08) | Default content cards |
| Snow | `#F8FAFC` | 0.5px solid rgba(0,0,0,0.06) | Stat cards, input wrappers |
| Slate | `#1E293B` | none | Feature cards on dark bg |
| Navy | `#081320` | none | Deep dark cards, hero panels |

```css
.card {
  border-radius: 12px;
  padding: 1.25rem;
}
.card-light  { background: #FFFFFF; border: 0.5px solid rgba(0,0,0,0.08); }
.card-snow   { background: #F8FAFC; border: 0.5px solid rgba(0,0,0,0.06); }
.card-slate  { background: #1E293B; }
.card-navy   { background: #081320; }
```

---

## Form Inputs

```css
/* Light mode */
.input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #FFFFFF;
  font-size: 14px;
  color: #0F172A;
}
.input:focus {
  outline: none;
  border-color: #22C55E;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}

/* Dark mode */
.input-dark {
  background: #1E293B;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #FFFFFF;
}
.input-dark::placeholder { color: rgba(255,255,255,0.35); }
.input-dark:focus { border-color: #22C55E; }
```

---

## Navigation Bar

```css
.navbar {
  background: #081320;
  height: 60px;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.navbar-logo {
  font-size: 16px;
  font-weight: 500;
  color: #FFFFFF;
}
.navbar-logo span { color: #22C55E; }

.navbar-link {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
}
.navbar-link:hover { color: #FFFFFF; }

.navbar-cta {
  background: #22C55E;
  color: #081320;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 18px;
  border-radius: 999px;
  border: none;
}
```

---

## Hero Section Pattern

```html
<section class="hero">
  <span class="hero-tag">
    ✓ CBN licensed · NDIC insured
  </span>
  <h1>
    Zero-interest lending,<br>
    <span class="accent">powered by trust</span>
  </h1>
  <p>Send, borrow, and repay with people you trust. No interest, no hidden fees — fair P2P finance built for Nigeria.</p>
  <div class="hero-actions">
    <button class="btn-primary">Open account</button>
    <button class="btn-ghost-white">Learn more</button>
  </div>
</section>
```

```css
.hero {
  background: #081320;
  padding: 80px 1.5rem;
}
.hero-tag {
  display: inline-block;
  background: rgba(34, 197, 94, 0.12);
  color: #22C55E;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 14px;
  border-radius: 999px;
  margin-bottom: 1.5rem;
}
.hero h1 {
  font-size: 42px;
  font-weight: 500;
  color: #FFFFFF;
  line-height: 1.15;
  margin-bottom: 1rem;
}
.hero h1 .accent { color: #22C55E; }
.hero p {
  font-size: 15px;
  color: rgba(255,255,255,0.6);
  line-height: 1.7;
  max-width: 520px;
  margin-bottom: 2rem;
}
.btn-ghost-white {
  background: rgba(255, 255, 255, 0.08);
  color: #FFFFFF;
  border: none;
  border-radius: 999px;
  padding: 10px 24px;
}
```

---

## Feature Cards (Dark)

```css
.feature-card {
  background: #1E293B;
  border-radius: 16px;
  padding: 1.5rem;
}
.feature-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(34, 197, 94, 0.12);
  color: #22C55E;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-bottom: 1rem;
}
.feature-title {
  font-size: 15px;
  font-weight: 500;
  color: #FFFFFF;
  margin-bottom: 6px;
}
.feature-desc {
  font-size: 13px;
  color: rgba(255,255,255,0.5);
  line-height: 1.6;
}
```

---

## Stat Cards

```css
/* Light stat */
.stat-card {
  background: #F8FAFC;
  border-radius: 8px;
  padding: 1rem;
}
.stat-label { font-size: 12px; color: #64748B; margin-bottom: 4px; }
.stat-value { font-size: 24px; font-weight: 500; color: #0F172A; }
.stat-value.green { color: #22C55E; }
.stat-value.lime  { color: #A3E635; }

/* Dark stat */
.stat-card-dark {
  background: #1E293B;
  border-radius: 8px;
  padding: 1rem;
}
.stat-card-dark .stat-label { color: rgba(255,255,255,0.5); }
.stat-card-dark .stat-value { color: #22C55E; }
```

---

## Onboarding Steps

```css
.steps { display: flex; gap: 0; }

.step { flex: 1; position: relative; }

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #22C55E;
  color: #081320;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}
.step:last-child .step-number { background: #A3E635; }

.step-connector {
  position: absolute;
  top: 14px;
  left: 28px;
  right: 0;
  height: 1px;
  background: rgba(34, 197, 94, 0.25);
}
.step:last-child .step-connector { display: none; }

.step-title { font-size: 13px; font-weight: 500; color: #0F172A; margin-bottom: 2px; }
.step-desc  { font-size: 12px; color: #64748B; line-height: 1.4; padding-right: 12px; }
```

---

## Icon System

Use **Tabler Icons** (outline only).

| Context | Size | Color |
|---|---|---|
| Feature card icons | 20–24px | `#22C55E` |
| Inline with text | 16px | inherit |
| Nav icons | 18px | `rgba(255,255,255,0.6)` |
| Action buttons | 16px | inherit |

```html
<i class="ti ti-arrows-exchange"></i>  <!-- P2P / transfer -->
<i class="ti ti-wallet"></i>           <!-- Wallet -->
<i class="ti ti-star"></i>             <!-- Trust score -->
<i class="ti ti-users"></i>            <!-- Referral -->
<i class="ti ti-shield-check"></i>     <!-- Security / compliance -->
<i class="ti ti-chart-bar"></i>        <!-- Analytics -->
<i class="ti ti-lock"></i>             <!-- Lock / collateral -->
<i class="ti ti-check"></i>            <!-- Verified / done -->
<i class="ti ti-bell"></i>             <!-- Notifications -->
<i class="ti ti-arrow-right"></i>      <!-- CTA arrow -->
```

---

## Do / Don't

| Do | Don't |
|---|---|
| Use pill radius on all buttons | Use squared buttons |
| Use `#22C55E` for primary actions only | Overuse green on every element |
| Use `#A3E635` sparingly as a second accent | Mix lime and green at equal weight |
| Put white/muted text on dark cards | Put black text directly on navy |
| Use sentence case everywhere | Use Title Case or ALL CAPS in UI |
| One green accent per headline | Colour every word in a headline |
| Fade nav links to 60% white opacity | Use pure white for inactive nav |

---

## Tailwind Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        navy:  '#081320',
        slate: {
          DEFAULT: '#1E293B',
          mid:   '#334155',
          light: '#64748B',
        },
        green: {
          DEFAULT: '#22C55E',
          dark:   '#16A34A',
        },
        lime: {
          DEFAULT: '#A3E635',
          dark:   '#84CC16',
        },
        snow: '#F8FAFC',
      },
      borderRadius: {
        pill: '999px',
      },
    },
  },
}
```
