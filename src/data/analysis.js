/* ============================================================================
   Pair analysis — derives what is actually true about two platforms from the
   pricing data, so each comparison page says something about THAT pair rather
   than repeating the same generic advice.

   Every finding is computed. Nothing here is written per-pair by hand, and
   nothing is emitted unless the data supports it. If a comparison cannot be
   made — which is the case whenever a vendor refuses to publish a rate — the
   honest finding is that it cannot be made, and why that costs the buyer.
   ========================================================================= */

import { money } from './site.js';

const monthly = (v, loc, usr) =>
  v.billingBasis === 'location' ? v.startingPrice * loc
  : v.billingBasis === 'user' ? v.startingPrice * usr
  : v.startingPrice;

const yearOne = (v, loc, usr) => monthly(v, loc, usr) * 12 + (v.setupFee || 0);

/** The vendor's own published standard rate, where the headline is a promotion. */
function standardPrice(v) {
  const m = /(?:normally|regular price|regularly)\s*\$?([0-9][0-9,.]*)/i.exec(v.entryNote || '');
  return m ? parseFloat(m[1].replace(/,/g, '')) : null;
}

/** Smallest count in 2..limit at which the cheaper platform stops being cheaper. */
function crossover(a, b, axis, limit) {
  const at = n => axis === 'loc' ? [monthly(a, n, 1), monthly(b, n, 1)]
                                 : [monthly(a, 1, n), monthly(b, 1, n)];
  const [a1, b1] = at(1);
  if (a1 === b1) return null;
  const startedAhead = a1 < b1;
  for (let n = 2; n <= limit; n++) {
    const [x, y] = at(n);
    if ((x < y) !== startedAhead) return { n, winnerBefore: startedAhead ? a : b, winnerAfter: startedAhead ? b : a };
  }
  return null;
}

export function analyse(a, b) {
  const out = [];
  const bothPriced = a.startingPrice != null && b.startingPrice != null;

  // — 1. The comparison is impossible, and that is the finding ---------------
  if (!bothPriced) {
    const quiet = [a, b].filter(v => v.startingPrice == null);
    const open = [a, b].filter(v => v.startingPrice != null);
    out.push({
      kind: 'no-price',
      title: quiet.length === 2
        ? 'Neither of these will tell you what it costs'
        : `${quiet[0].displayName} will not tell you what it costs`,
      body: quiet.length === 2
        ? `Both require a sales call before you see a number, so there is no honest way to put them side by side on price — including for us. What you can compare is what each discloses without one, and on that measure they are equally opaque.`
        : `${open[0].displayName} publishes ${money(open[0].startingPrice)}/mo for its ${open[0].entryTier} tier. ${quiet[0].displayName} publishes nothing, so the only way to price this comparison is to complete a discovery call and wait for a proposal. Budget the time, not just the money: you cannot shortlist ${quiet[0].displayName} on cost until you have spent an hour with their sales team.`,
    });
  }

  // — 1b. Disclosure depth: what each tells you before you talk to sales ----
  // Worth computing on every pair, and it is the only quantitative comparison
  // available at all when one side is quote-only.
  {
    const discloses = v => [
      v.startingPrice != null && 'a starting price',
      v.tiers?.length && `${v.tiers.length} named tier${v.tiers.length > 1 ? 's' : ''}`,
      v.tiers?.some(t => t.monthly_price_usd != null) && 'per-tier pricing',
      v.freeTrial && 'trial terms',
      v.processing && 'payment processing rates',
      v.setupFee != null && v.setupFee > 0 && 'its onboarding fee',
    ].filter(Boolean);
    const [da, db] = [discloses(a), discloses(b)];
    if (Math.abs(da.length - db.length) >= 2) {
      const open = da.length > db.length ? a : b;
      const shut = da.length > db.length ? b : a;
      const openList = da.length > db.length ? da : db;
      const shutList = da.length > db.length ? db : da;
      out.push({
        kind: 'disclosure',
        title: `${open.displayName} publishes ${openList.length} of these facts. ${shut.displayName} publishes ${shutList.length}.`,
        body: `Without speaking to anyone you can learn ${openList.join(', ')} about ${open.displayName}. For ${shut.displayName} the public record is ${shutList.length ? shutList.join(' and ') + ', and nothing else' : 'effectively empty'}. That asymmetry is itself a buying signal: it tells you how each company expects the purchase to go, and how much of your time the quieter one intends to consume before it quotes a number.`,
      });
    }
  }

  if (bothPriced) {
    const [m1a, m1b] = [monthly(a, 1, 1), monthly(b, 1, 1)];
    const cheaper = m1a <= m1b ? a : b;
    const dearer = m1a <= m1b ? b : a;

    // — 2. Same billing basis: the gap is a fixed ratio at every size --------
    if (a.billingBasis === b.billingBasis && m1a !== m1b) {
      const pct = Math.round(((Math.max(m1a, m1b) / Math.min(m1a, m1b)) - 1) * 100);
      const unit = a.billingBasis === 'location' ? 'location'
                 : a.billingBasis === 'user' ? 'user' : null;
      out.push({
        kind: 'fixed-ratio',
        title: 'The gap between these two never changes',
        body: unit
          ? `Both bill per ${unit}, so the ratio holds at any size: ${dearer.displayName} is ${pct}% more than ${cheaper.displayName} whether you run one ${unit} or ten. At three ${unit}s that is ${money(monthly(cheaper, 3, 3))} against ${money(monthly(dearer, 3, 3))} a month. Growth will not change which one is cheaper — only a tier change or an add-on will.`
          : `Both charge a flat rate, so the ${pct}% gap between them is the same at any practice size. ${money(m1a === Math.min(m1a, m1b) ? m1a : m1b)}/mo against ${money(Math.max(m1a, m1b))}/mo, and adding staff or locations moves neither.`,
      });
    }

    // — 3. Different bases: there is a size where the answer flips -----------
    for (const [axis, label, limit] of [['loc', 'location', 12], ['usr', 'staff login', 25]]) {
      const x = crossover(a, b, axis, limit);
      if (!x) continue;
      const before = axis === 'loc' ? monthly(x.winnerBefore, x.n - 1, 1) : monthly(x.winnerBefore, 1, x.n - 1);
      const after = axis === 'loc' ? monthly(x.winnerAfter, x.n, 1) : monthly(x.winnerAfter, 1, x.n);
      out.push({
        kind: `crossover-${axis}`,
        title: `They swap places at ${x.n} ${label}s`,
        body: `Up to ${x.n - 1} ${label}${x.n - 1 > 1 ? 's' : ''}, ${x.winnerBefore.displayName} is the cheaper of the two — ${money(before)}/mo at that point. From ${x.n} ${label}s on, ${x.winnerAfter.displayName} takes over at ${money(after)}/mo. ${a.billingBasis !== b.billingBasis ? `That is the whole reason: ${a.displayName} bills ${a.billingBasis === 'flat' ? 'a flat rate' : 'per ' + a.billingBasis}, ${b.displayName} bills ${b.billingBasis === 'flat' ? 'a flat rate' : 'per ' + b.billingBasis}. Comparing their headline prices tells you nothing until you fix your own numbers.` : ''}`,
      });
    }

    // — 4. Setup fee reverses the year-one answer ---------------------------
    if ((a.setupFee || b.setupFee)) {
      const [y1a, y1b] = [yearOne(a, 1, 1), yearOne(b, 1, 1)];
      const monthlyWinner = m1a < m1b ? a : b;
      const yearWinner = y1a < y1b ? a : b;
      if (monthlyWinner.slug !== yearWinner.slug) {
        const withFee = a.setupFee ? a : b;
        out.push({
          kind: 'setup-flip',
          title: `${withFee.displayName}'s onboarding fee reverses the answer`,
          body: `On the monthly rate ${monthlyWinner.displayName} looks cheaper. Add ${withFee.displayName}'s ${money(withFee.setupFee)} one-time onboarding charge and the first year lands the other way: ${money(Math.min(y1a, y1b))} against ${money(Math.max(y1a, y1b))}. ${yearWinner.displayName} is the cheaper platform to actually start on, and the fee does not appear next to the headline price on ${withFee.displayName}'s pricing page.`,
        });
      } else if (a.setupFee !== b.setupFee) {
        const withFee = a.setupFee ? a : b;
        const months = Math.max(1, Math.round(withFee.setupFee / Math.abs(m1a - m1b || 1)));
        out.push({
          kind: 'setup-fee',
          title: `One of these charges to let you start`,
          body: `${withFee.displayName} adds a ${money(withFee.setupFee)} one-time onboarding fee that the other does not. Over a first year that is ${money(withFee.setupFee / 12)} a month of hidden cost, and it is charged before you have run a single appointment through the system.`,
        });
      }
    }

    // — 5. The headline is a promotion --------------------------------------
    for (const v of [a, b]) {
      const std = standardPrice(v);
      if (!v.promo || !std || std <= v.startingPrice) continue;
      const other = v.slug === a.slug ? b : a;
      const stdBeats = std > monthly(other, 1, 1) && v.startingPrice < monthly(other, 1, 1);
      out.push({
        kind: 'promo',
        title: `${v.displayName}'s ${money(v.startingPrice)} is a promotional rate`,
        body: `The standard published price is ${money(std)}/mo — ${Math.round((std / v.startingPrice - 1) * 100)}% higher. ${stdBeats ? `At the standard rate ${v.displayName} is no longer the cheaper of these two; ${other.displayName} at ${money(monthly(other, 1, 1))}/mo is. ` : ''}Ask what happens at renewal before you compare these on the promotional number.`,
      });
    }

    // — 6. What the ceiling looks like --------------------------------------
    const top = v => (v.tiers || []).map(t => t.monthly_price_usd).filter(n => n != null);
    const [ta, tb] = [top(a), top(b)];
    if (ta.length > 1 && tb.length > 1) {
      const [ha, hb] = [Math.max(...ta), Math.max(...tb)];
      if (Math.max(ha, hb) / Math.min(ha, hb) >= 1.5) {
        const steep = ha > hb ? a : b;
        out.push({
          kind: 'ceiling',
          title: 'The published ranges are not the same shape',
          body: `${a.displayName} runs ${money(Math.min(...ta))}–${money(ha)} across ${ta.length} published tiers; ${b.displayName} runs ${money(Math.min(...tb))}–${money(hb)} across ${tb.length}. ${steep.displayName} has the steeper ceiling, which matters if you expect to outgrow the entry plan — the number you compare today is not the number you will be paying in two years.`,
        });
      }
    }
  }

  return out;
}
