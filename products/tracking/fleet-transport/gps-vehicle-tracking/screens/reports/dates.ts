// Day and time helpers of the original Reports page: days are "yyyy-mm-dd" strings in the
// company's time zone (Sample Company A: Asia/Riyadh, as in the original's demo company).
export const ZONE = 'Asia/Riyadh';

const pad = (n: number) => String(n).padStart(2, '0');
const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function parts(ms: number) {
  const t: Record<string, number> = {};
  for (const p of partsFmt.formatToParts(ms)) if (p.type !== 'literal') t[p.type] = Number(p.value);
  return {
    y: t.year ?? 1970,
    m: t.month ?? 1,
    d: t.day ?? 1,
    h: (t.hour ?? 0) % 24,
    mi: t.minute ?? 0,
    s: t.second ?? 0,
  };
}

/** Today in the company's zone. */
export function todayIn(now = new Date()): string {
  const t = parts(now.getTime());
  return `${t.y}-${pad(t.m)}-${pad(t.d)}`;
}

/** Midnight of a day in the company's zone, as a Date. */
export function startOfDay(day: string): Date {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const offset = (ms: number) => {
    const c = parts(ms);
    return Date.UTC(c.y, c.m - 1, c.d, c.h, c.mi, c.s) - Math.floor(ms / 1000) * 1000;
  };
  let at = utc - offset(utc);
  at = utc - offset(at);
  return new Date(at);
}

export function addDays(day: string, n: number): string {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  const s = new Date(Date.UTC(y, m - 1, d + n));
  return `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}`;
}

/** "2h 05m", "3d 4h", "45s" (the original's duration format). */
export function duration(seconds: number | null | undefined): string {
  if (seconds == null) return '';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const min = Math.floor(seconds / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return h < 24
    ? `${h}h ${String(min % 60).padStart(2, '0')}m`
    : `${Math.floor(h / 24)}d ${h % 24}h`;
}

export interface Formats {
  assetLabel: string;
  day: (day: string | null | undefined) => string;
  time: (iso: string | null | undefined) => string;
  stamp: (iso: string | null | undefined) => string;
}

export function formats(assetLabel: string, h24: boolean): Formats {
  const dayFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeFmt = new Intl.DateTimeFormat(h24 ? 'en-GB' : 'en-US', {
    timeZone: ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: !h24,
  });
  const time = (iso: string | null | undefined) => (iso ? timeFmt.format(new Date(iso)) : '');
  return {
    assetLabel,
    day: (day) => {
      if (!day) return '';
      const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
      return dayFmt.format(new Date(Date.UTC(y, m - 1, d, 12)));
    },
    time,
    stamp: (iso) => (iso ? `${dayFmt.format(new Date(iso))}, ${time(iso)}` : ''),
  };
}
