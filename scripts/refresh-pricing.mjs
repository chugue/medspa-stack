#!/usr/bin/env node
/**
 * Weekly pricing re-verification.
 *
 * Re-fetches every vendor pricing page, extracts dollar figures, and compares them
 * against what we currently publish. It does NOT auto-edit the dataset — it writes a
 * review queue. A human confirms each change before it goes live, which is what keeps
 * the "verified" stamp meaningful.
 *
 *   node scripts/refresh-pricing.mjs            # report only
 *   node scripts/refresh-pricing.mjs --stamp    # also bump VERIFIED date for unchanged vendors
 */
import { readFile, writeFile } from 'node:fs/promises';

const DATA = new URL('../src/data/vendors.json', import.meta.url);
const OUT = new URL('../price-review.json', import.meta.url);
const UA = 'MedSpaStackBot/1.0 (+https://medspastack.net/methodology/; pricing verification)';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function dollars(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ');
  const found = new Set();
  for (const m of text.matchAll(/\$\s?([0-9][0-9,]*(?:\.[0-9]{2})?)/g)) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (n > 0 && n < 100000) found.add(n);
  }
  return [...found].sort((a, b) => a - b);
}

const vendors = JSON.parse(await readFile(DATA, 'utf8'));
const targets = vendors.filter(v => v.pricingUrl);
const report = [];

for (const v of targets) {
  let entry = { slug: v.slug, name: v.displayName || v.name, url: v.pricingUrl };
  try {
    const res = await fetch(v.pricingUrl, { headers: { 'user-agent': UA }, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const seen = dollars(await res.text());
    const published = (v.tiers || []).map(t => t.monthly_price_usd).filter(n => n != null);

    const missing = published.filter(n => !seen.includes(n));
    entry.status = !published.length ? 'no-published-prices'
                 : missing.length ? 'CHANGED'
                 : 'ok';
    entry.publishedPrices = published;
    entry.missingFromPage = missing;
    entry.pageSample = seen.slice(0, 14);
  } catch (err) {
    entry.status = 'FETCH-FAILED';
    entry.error = String(err.message || err);
  }
  report.push(entry);
  console.log(`${entry.status.padEnd(20)} ${entry.name}`);
  await sleep(1200); // be a polite crawler
}

const changed = report.filter(r => r.status === 'CHANGED');
const failed = report.filter(r => r.status === 'FETCH-FAILED');

await writeFile(OUT, JSON.stringify({
  ranAt: new Date().toISOString(),
  checked: report.length,
  needsReview: changed.length,
  fetchFailed: failed.length,
  report,
}, null, 2));

console.log(`\n${report.length} checked · ${changed.length} need review · ${failed.length} unreachable`);
console.log('Review queue written to price-review.json');

if (changed.length) {
  console.log('\nA price we publish no longer appears on the vendor page:');
  for (const c of changed) console.log(`  ${c.name}: missing ${c.missingFromPage.join(', ')} — ${c.url}`);
  console.log('\nOpen each URL, confirm the new figure, update src/data/vendors.json, then bump VERIFIED in src/data/site.js.');
}
process.exitCode = changed.length ? 1 : 0;
