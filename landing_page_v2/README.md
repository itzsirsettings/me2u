# Me2U Premium UI/UX Rebuild

A polished, responsive static landing page rebuild inspired by the public Me2U website structure. This version upgrades the earlier rebuild with a more premium product experience: animated hero visuals, sticky glass navigation, mega menu, product carousel, tabbed sections, app-device mockups, scroll reveals, dashboard-style cards, modals, FAQ accordion, responsive mobile navigation, reduced-motion support, and production-friendly organization.

## What is included

- `index.html` — complete landing page markup
- `styles.css` — advanced responsive styling and animation system
- `brand-enhancements.css` — brand color refinements layered over the base styles
- `script.js` — navigation, tabs, modals, reveal animations, counters, parallax, and accordion behavior
- `assets/me2_logo.svg` — reusable brand logo asset used for the navbar and browser icon
- `Outfit_Complete/Fonts/WEB/fonts/Outfit-Variable.woff2` — bundled Outfit variable font
- `tests/site-checks.mjs` — static checks for required sections and interactions

## Usage

Open `index.html` directly in a browser or serve locally:

```bash
python -m http.server 5173
```

Then visit:

```bash
http://localhost:5173
```

Run the project checks with:

```bash
node tests/site-checks.mjs
```

## Important production note

This rebuild does not copy the official website source code or proprietary media assets. It uses original code and custom CSS-generated visual mockups. Replace placeholder logos, app-store links, demo video, and official product imagery only if you are authorized to use them.

The page is static and contains no login, data capture, payment capture, or credential collection.
