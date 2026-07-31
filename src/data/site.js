import vendors from './vendors.json';

export const VERIFIED = '2026-07-30';
export const VERIFIED_LABEL = 'July 30, 2026';

export const KLASS_LABEL = {
  emr: 'Clinical EMR',
  booking: 'Booking / POS',
  hybrid: 'Hybrid',
  adjacent: 'Add-on tool',
  unclear: 'Unverified',
};

export const KLASS_NOTE = {
  emr: 'Has genuine medical charting — SOAP/procedure notes, consent forms, before-and-after photo management, and in most cases e-prescribing.',
  booking: 'Scheduling, point of sale and marketing only. No medical charting. A med spa performing injectables or laser treatments will need a separate EMR.',
  hybrid: 'Core product is booking and payments; clinical charting exists but only on higher tiers or as a paid add-on. Read the tier detail before assuming it is included.',
  adjacent: 'Not a practice management system. Sits alongside one — memberships and patient financing, or patient communications.',
  unclear: 'The vendor markets clinical capability but we could not verify the specifics from public documentation. We do not score what we cannot check.',
};

export { vendors };

export const bySlug = Object.fromEntries(vendors.map(v => [v.slug, v]));

export const priced = vendors.filter(v => v.startingPrice != null);

export function money(n) {
  if (n == null) return '—';
  return '$' + (Number.isInteger(n) ? n : n.toFixed(2));
}

// Comparison pairs, drawn from verified Google autocomplete demand.
export const PAIRS = [
  ['zenoti', 'boulevard'],
  ['zenoti', 'mindbody'],
  ['zenoti', 'vagaro'],
  ['zenoti', 'mangomint'],
  ['zenoti', 'pabau'],
  ['boulevard', 'mangomint'],
  ['boulevard', 'vagaro'],
  ['aesthetic-record', 'zenoti'],
  ['aestheticspro', 'aesthetic-record'],
  ['mangomint', 'vagaro'],
];

export function pairSlug([a, b]) {
  return `${a}-vs-${b}`;
}
