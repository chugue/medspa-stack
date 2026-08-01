#!/usr/bin/env node
/** WCAG contrast audit for the palette. Usage: node scripts/contrast.mjs */
const hex = h => h.replace('#', '').match(/../g).map(x => parseInt(x, 16));
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = h => { const [r, g, b] = hex(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
// what color-mix(in srgb, INK P%, transparent) actually renders as over BG
const mix = (ink, bg, p) => '#' + hex(ink).map((c, i) => Math.round(c * p + hex(bg)[i] * (1 - p)))
  .map(c => c.toString(16).padStart(2, '0')).join('');

function audit(name, bg, ink, steps) {
  console.log(`\n${name}  (bg ${bg})`);
  for (const [label, p, use, needs] of steps) {
    const c = typeof p === 'number' ? mix(ink, bg, p) : p;
    const r = ratio(c, bg);
    const ok = r >= needs;
    console.log(
      `  ${label.padEnd(10)} ${c}  ${r.toFixed(2).padStart(5)}:1  ` +
      `${ok ? 'PASS' : 'FAIL'} (needs ${needs})  ${use}`
    );
  }
}

const LIGHT_BG = '#f2f2f3', LIGHT_INK = '#1d1f20';
const DARK_BG = '#1d1f20', DARK_INK = '#f2f2f3';

audit('LIGHT', LIGHT_BG, LIGHT_INK, [
  ['ink',      1.00, 'headings', 4.5],
  ['ink-2',    0.74, 'nav, secondary prose', 4.5],
  ['ink-3',    0.62, 'stat captions, card descriptions, stamp note, crumbs', 4.5],
  ['accent-700', '#416180', 'links', 4.5],
]);

audit('DARK', DARK_BG, DARK_INK, [
  ['ink',      1.00, 'headings', 4.5],
  ['ink-2',    0.78, 'nav, secondary prose', 4.5],
  ['ink-3',    0.62, 'stat captions, card descriptions, stamp note', 4.5],
  ['accent-300', '#b5d9fd', 'links', 4.5],
]);
