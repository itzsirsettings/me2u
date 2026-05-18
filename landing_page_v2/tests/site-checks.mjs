import { existsSync, readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const brandCss = readFileSync(new URL('../brand-enhancements.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const logoPath = new URL('../assets/me2_logo.svg', import.meta.url);

const requiredSections = [
  'id="hero"',
  'id="payments"',
  'id="bnpl"',
  'id="insurance"',
  'id="budget"',
  'id="rewards"',
  'id="business"',
  'id="download"',
  'id="faqs"',
];

for (const section of requiredSections) {
  assert.ok(html.includes(section), `Missing required section: ${section}`);
}

const requiredCopy = [
  'Freedom to pay your way',
  'Transfer and pay bills completely free',
  'Buy now, pay later',
  'Pay your insurance premium with ease',
  'Me2U works for your business',
  'Licensed by the Central Bank of Nigeria',
];

for (const copy of requiredCopy) {
  assert.ok(html.includes(copy), `Missing expected copy: ${copy}`);
}

const cssFeatures = [
  'backdrop-filter',
  '@keyframes marquee',
  '@keyframes phoneFloatMain',
  '@media (prefers-reduced-motion: reduce)',
  '.mega-menu',
  '.feature-carousel',
  '.sticky-download',
];

for (const feature of cssFeatures) {
  assert.ok(`${css}\n${brandCss}`.includes(feature), `Missing CSS feature: ${feature}`);
}

const jsFeatures = [
  'IntersectionObserver',
  'data-category',
  'data-business-tab',
  'showModal',
  'data-parallax',
  'data-accordion',
  'data-open-policy',
];

for (const feature of jsFeatures) {
  assert.ok(js.includes(feature), `Missing JS feature: ${feature}`);
}

const dialogCount = (html.match(/<dialog/g) || []).length;
assert.ok(dialogCount >= 4, `Expected at least 4 modals, found ${dialogCount}`);
assert.ok(existsSync(logoPath), 'Missing reusable logo asset.');
assert.ok(css.includes('Outfit_Complete/Fonts/WEB/fonts/Outfit-Variable.woff2'), 'Outfit font is not wired correctly.');
assert.ok(html.includes('href="assets/me2_logo.svg"'), 'The brand logo asset should be used for site branding.');
assert.ok(!html.includes(`favi${'con.svg'}`), 'Do not include a separate icon asset; use the brand logo asset only.');
const legacyPattern = new RegExp(`bla${'yzz'}|Chi${'llax'}`, 'i');
assert.ok(!legacyPattern.test(`${html}\n${css}\n${brandCss}\n${js}`), 'Found removed legacy brand or font references.');

console.log('All premium Me2U rebuild static checks passed.');
