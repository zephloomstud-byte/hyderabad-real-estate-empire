// Formatting and small math helpers. Indian numbering throughout — this is a
// rupee game and "₹1,25,00,000" reads correctly to the intended player.

export const LAKH = 1e5;
export const CRORE = 1e7;
export const SQYD_PER_ACRE = 4840;

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const round = (v, n = 0) => { const p = 10 ** n; return Math.round(v * p) / p; };
export const sum = (arr, f = (x) => x) => arr.reduce((a, b) => a + f(b), 0);

/** Indian digit grouping: 12,34,56,789 */
export function indianGroup(n) {
  const neg = n < 0;
  let s = Math.abs(Math.round(n)).toString();
  if (s.length <= 3) return (neg ? '-' : '') + s;
  const last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  const parts = [];
  while (rest.length > 2) { parts.unshift(rest.slice(-2)); rest = rest.slice(0, -2); }
  if (rest) parts.unshift(rest);
  return (neg ? '-' : '') + parts.join(',') + ',' + last3;
}

/** Compact rupee display: ₹4.62 Cr / ₹18.4 L / ₹42,500 */
export function money(n, opts = {}) {
  const { sign = false, precise = false } = opts;
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const a = Math.abs(n);
  const s = n < 0 ? '-' : (sign && n > 0 ? '+' : '');
  if (precise || a < LAKH) return s + '₹' + indianGroup(a);
  if (a < CRORE) return s + '₹' + round(a / LAKH, a / LAKH < 10 ? 2 : 1) + ' L';
  if (a < 1e12) return s + '₹' + round(a / CRORE, a / CRORE < 10 ? 2 : 1) + ' Cr';
  return s + '₹' + round(a / 1e12, 2) + ' Lakh Cr';
}

export function usd(n, rate) {
  const d = n / rate;
  const a = Math.abs(d);
  const s = d < 0 ? '-' : '';
  if (a < 1e3) return s + '$' + round(a);
  if (a < 1e6) return s + '$' + round(a / 1e3, 1) + 'K';
  if (a < 1e9) return s + '$' + round(a / 1e6, 2) + 'M';
  return s + '$' + round(a / 1e9, 3) + 'B';
}

export const pct = (v, n = 1) => (v === null || Number.isNaN(v) ? '—' : round(v * 100, n) + '%');
export const num = (v, n = 0) => indianGroup(round(v, n));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const START_YEAR = 1995;
export const END_MONTH = (2020 - START_YEAR) * 12 + 2;          // March 2020
export const EXTENDED_END_MONTH = (2030 - START_YEAR) * 12 + 11; // December 2030

/** The last playable month for this particular run. */
export const horizonOf = (s) => (s && s.extended ? EXTENDED_END_MONTH : END_MONTH);

export const yearOf = (m) => START_YEAR + Math.floor(m / 12);
export const monthOf = (m) => m % 12;
export const dateLabel = (m) => `${MONTHS[m % 12]} ${yearOf(m)}`;
export const longDate = (m) => `${MONTHS[m % 12]} ${yearOf(m)}`;

/** Interpolate a series of {year, v} anchor points at a fractional year. */
export function anchorAt(anchors, absMonth) {
  const y = START_YEAR + absMonth / 12;
  if (y <= anchors[0].year) return anchors[0].v;
  const last = anchors[anchors.length - 1];
  if (y >= last.year) return last.v;
  for (let i = 1; i < anchors.length; i++) {
    if (y <= anchors[i].year) {
      const a = anchors[i - 1], b = anchors[i];
      const t = (y - a.year) / (b.year - a.year);
      // Smoothstep: prices move in waves, not straight lines.
      const ts = t * t * (3 - 2 * t);
      return lerp(a.v, b.v, ts);
    }
  }
  return last.v;
}

export function uid(prefix, n) { return `${prefix}${n.toString(36)}`; }
