// Demo activity (trips, alerts, readings) for product screens until devices report live data.
// Port of the legacy xCtx (legacy/src/app.js ~791). Seeded: the same product + screen + company
// always shows the same numbers. Everything made here is labelled as demo on screen (CLAUDE.md §8).
// Invented names only.

const PEOPLE = [
  'Faisal Al-Otaibi',
  'Mohammed Al-Harbi',
  'Imran Khan',
  'Saeed Al-Qahtani',
  'Abdullah Al-Shehri',
  'Ravi Kumar',
  'Khalid Al-Dosari',
  'Omar Haddad',
  'Yousef Al-Malki',
  'Ahmed Saleh',
  'Nasser Al-Ghamdi',
  'Bilal Hussain',
];
const PLACES = [
  'Olaya',
  'Al Malaz',
  'King Fahd Rd',
  'Al Nakheel',
  'Exit 9',
  'Industrial City 2',
  'Airport Rd',
  'Diriyah',
  'Al Yasmin',
  'Sulaimaniyah',
  'Al Rawdah',
  'Hittin',
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface DemoAsset {
  id: string;
  name: string;
  /** e.g. the asset type name */
  detail?: string;
}

export interface DemoContext {
  /** Number of assets. */
  n: number;
  assets: DemoAsset[];
  /** Next random number in [0, 1) (seeded). */
  r: () => number;
  /** Asset name number i (wraps). */
  a: (i: number) => string;
  /** Person name number i. */
  p: (i: number) => string;
  /** Place name number i. */
  pl: (i: number) => string;
  /** A time today, i steps back ("14:32"). */
  t: (i: number) => string;
  /** A date i days back ("17 Nov"); negative = days ahead. */
  d: (i: number) => string;
  /** Random whole number between a and b. */
  i: (a: number, b: number) => number;
  /** Random number between a and b with dp decimals, as text. */
  f: (a: number, b: number, dp?: number) => string;
  pick: <T>(arr: T[]) => T;
  /** Thousands separators: 12345 → "12,345". */
  k: (v: number) => string;
}

export function demoContext(
  seed: string,
  assets: DemoAsset[],
  now: Date = new Date(),
): DemoContext {
  let s = [...seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 233280, 7);
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const names = assets.length ? assets.map((x) => x.name) : ['Unit 1', 'Unit 2', 'Unit 3'];
  const pad = (v: number) => String(v).padStart(2, '0');
  return {
    n: names.length,
    assets,
    r,
    a: (i) => names[((i % names.length) + names.length) % names.length]!,
    p: (i) => PEOPLE[(i * 5 + 3) % PEOPLE.length]!,
    pl: (i) => PLACES[(i * 7 + 2) % PLACES.length]!,
    t: (i) => {
      const m = now.getHours() * 60 + now.getMinutes() - 7 - i * 23;
      const mm = ((m % 1440) + 1440) % 1440;
      return pad(Math.floor(mm / 60)) + ':' + pad(mm % 60);
    },
    d: (i) => {
      const x = new Date(now.getTime() - i * 864e5);
      return x.getDate() + ' ' + MONTHS[x.getMonth()];
    },
    i: (a, b) => Math.round(a + r() * (b - a)),
    f: (a, b, dp = 1) => (a + r() * (b - a)).toFixed(dp),
    pick: (arr) => arr[Math.floor(r() * arr.length)]!,
    k: (v) => Number(v).toLocaleString('en-US'),
  };
}

/**
 * Cell text with a status prefix, as in the legacy specs:
 * "!High" red chip, "~Medium" amber chip, "+Done" green chip, "^Low" blue chip, plain text otherwise.
 */
export type DemoCell = string | number;
export const cellTone = (
  v: DemoCell,
): { tone: 'bad' | 'warn' | 'green' | 'info' | null; text: string } => {
  const s = String(v ?? '');
  const tone = ({ '!': 'bad', '~': 'warn', '+': 'green', '^': 'info' } as const)[
    s[0] as '!' | '~' | '+' | '^'
  ];
  return tone ? { tone, text: s.slice(1) } : { tone: null, text: s };
};

/** 12 alert rows (time, asset, alert, severity, status) from a product's alert list. */
export const demoAlerts = (alerts: string[], c: DemoContext): DemoCell[][] =>
  [...Array(12)].map((_, i) => {
    const al = alerts[i % alerts.length] ?? 'Alert';
    const sev = al[0] === '!' ? '!High' : al[0] === '~' ? '~Medium' : '^Low';
    return [
      c.t(i),
      c.a(i * 3 + 1),
      al.replace(/^[!~^]/, ''),
      sev,
      i < 3 ? '!Open' : i < 6 ? '~Acknowledged' : '+Closed',
    ];
  });
