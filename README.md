# MedSpaStack

Independent pricing and capability research on med spa / aesthetics practice management software.

**42 static pages. No database, no CMS, no server. Hosting cost: $0.**

---

## Deploy in 5 minutes

### Fastest — drag and drop
1. `npm install && npm run build`
2. Drag the `dist/` folder onto <https://vercel.com/new> (or Cloudflare Pages → "Direct Upload").
3. Add your domain in the dashboard.

### Better — connect the repo (gives you auto-deploy + the weekly price check)
1. Push this folder to a **public** GitHub repo (public = unlimited free Actions minutes).
2. Vercel → New Project → import the repo. Framework preset: **Astro**. Nothing else to configure.
3. Add your domain.

> **Vercel caveat:** the Hobby plan is personal-use only under Vercel's terms. This site will
> carry affiliate links, which makes it commercial. Fine while you're pre-revenue — but move to
> **Cloudflare Pages** (free, commercial use explicitly allowed, unlimited bandwidth) before the
> first affiliate link goes live. Migration is a 15-minute job for a static site.

### Before going live
Domain is set to `medspastack.net` in `astro.config.mjs` (`site:`) and `public/robots.txt`. Change both
if you ever move domains — they control canonical URLs and the sitemap.

---

## How it's built

```
src/data/vendors.json     ← the entire dataset. 24 vendors, verified pricing, fees, classification
src/data/site.js          ← VERIFIED date, class labels, comparison pairs
src/layouts/Base.astro    ← single global stylesheet, no framework, no JS on most pages
src/pages/                ← every page reads from vendors.json
scripts/refresh-pricing.mjs   ← weekly re-verification
.github/workflows/        ← runs the above every Monday, opens an issue on drift
```

**The point of the architecture:** content is generated from data, not written per page. Add a
vendor to `vendors.json` and it appears in the database, the EMR/booking split, the calculator, the
software index and the sitemap automatically. Add a pair to `PAIRS` in `site.js` and a comparison
page builds itself.

That's what makes this maintainable at 5 hours a week — and it's the opposite of the pattern
Google's scaled-content-abuse enforcement targets, because the asset being automated is a
verifiable dataset, not prose.

---

## Weekly price verification

```bash
node scripts/refresh-pricing.mjs
```

Re-fetches every vendor pricing page, extracts dollar figures, and flags any price we publish that
no longer appears on the vendor's page. Writes `price-review.json`.

**It never edits the dataset automatically.** It produces a review queue; you confirm and update by
hand, then bump `VERIFIED` in `src/data/site.js`. That human step is the whole reason the
"verified July 30, 2026" stamp on every page means something.

The GitHub Action runs it every Monday at 06:00 UTC and opens an issue when something drifts.

> Won't run inside a restricted sandbox (vendor domains return 403). Run it locally or in CI.

---

## Editorial rules baked into the code

- Nothing gets a score out of ten. The right platform depends on whether you chart treatments and
  how the team is shaped — a single ranking would flatten exactly that.
- Anything unverifiable is labelled `unclear`, not guessed.
- Tables sort by price or alphabetically. **Never by commission.**
- `/disclosure/` lists every vendor and whether they pay us — including the ones that don't.
- No clinical, legal or regulatory advice anywhere. Software only. This is the YMYL guardrail;
  don't cross it.

## Adding a comparison page

`src/data/site.js` → add a slug pair to `PAIRS`. The page builds itself:

```js
export const PAIRS = [
  ['zenoti', 'boulevard'],
  ['your-slug', 'other-slug'],   // ← that's it
];
```

Current pairs were chosen from verified Google autocomplete demand, not guessed.
