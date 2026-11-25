// Date helpers of the original Alerts page: days and times are shown in the company's time zone
// (the original sets it from the signed-in company; its demo company uses Asia/Riyadh).
export const ZONE = 'Asia/Riyadh';

const pad = (n: number) => String(n).padStart(2, '0');

const parts = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function zoned(ms: number) {
  const t: Record<string, number> = {};
  for (const p of parts.formatToParts(ms)) if (p.type !== 'literal') t[p.type] = Number(p.value);
  return { y: t.year!, m: t.month!, d: t.day!, h: (t.hour ?? 0) % 24, mi: t.minute!, s: t.second! };
}

/** `YYYY-MM-DD` of a moment, in the company zone. */
export function dayOf(d: Date): string {
  const t = zoned(d.getTime());
  return `${t.y}-${pad(t.m)}-${pad(t.d)}`;
}

/** `YYYY-MM-DDTHH:mm:ss` of a moment, in the company zone. */
export function localStamp(d: Date): string {
  const t = zoned(d.getTime());
  return `${t.y}-${pad(t.m)}-${pad(t.d)}T${pad(t.h)}:${pad(t.mi)}:${pad(t.s)}`;
}

/** Midnight of a `YYYY-MM-DD` day in the company zone, as a Date. */
export function startOfDay(day: string): Date {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const offset = (ms: number) => {
    const t = zoned(ms);
    return Date.UTC(t.y, t.m - 1, t.d, t.h, t.mi, t.s) - Math.floor(ms / 1000) * 1000;
  };
  let at = utc - offset(utc);
  at = utc - offset(at);
  return new Date(at);
}

/** Adds days to a `YYYY-MM-DD` day. */
export function addDays(day: string, n: number): string {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  const o = new Date(Date.UTC(y, m - 1, d + n));
  return `${o.getUTCFullYear()}-${pad(o.getUTCMonth() + 1)}-${pad(o.getUTCDate())}`;
}

export const today = () => dayOf(new Date());

/** First and last day of the month before the given day. */
export function lastMonth(day: string) {
  const [y = 0, m = 1] = day.split('-').map(Number);
  const first = new Date(y, m - 2, 1);
  const last = new Date(y, m - 1, 0);
  return {
    from: `${first.getFullYear()}-${pad(first.getMonth() + 1)}-01`,
    to: `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`,
  };
}

/** "2026-11-25T08:44:20" → "2026-11-25 08:44:20 AM" (the table's date format). */
export function formatStamp(stamp: string | null | undefined): string {
  if (!stamp) return '—';
  const [date, time = '00:00:00'] = stamp.split('T');
  const [h = 0, mi = 0, s = 0] = time.split(':').map(Number);
  return `${date} ${pad(h % 12 || 12)}:${pad(mi)}:${pad(Math.floor(s || 0))} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "2026-11-25" → "25 Nov 2026". */
export function formatDay(day: string): string {
  const [y = 0, m = 1, d = 1] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const pad2 = pad;
