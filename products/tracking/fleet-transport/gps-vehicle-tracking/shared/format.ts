// Number, time and date formats shared by the GPS Vehicle Tracking screens.
const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');

/** 12,345 */
export const num = (v: number) => Math.round(v).toLocaleString('en-US');
/** 12,345 km */
export const km = (v: number) => `${num(v)} km`;
/** "5h 24m", "14m", "0m". */
export function hm(hours: number): string {
  const m = Math.round(hours * 60);
  const h = Math.floor(m / 60);
  return h ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
}
/** "23 Nov 2026" */
export const dateText = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
/** "23 Nov" */
export const shortDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
/** "02:28 PM" */
export const timeText = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
/** "23 Nov 2026, 02:28 PM" */
export const dateTimeText = (d: Date) => `${dateText(d)}, ${timeText(d)}`;
/** "Just now", "12 min ago", "3 h ago", "2 d ago". */
export function ago(d: Date | null, now: Date): string {
  if (!d) return 'No report yet';
  const min = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60_000));
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}
/** Share of a total as "41.7%". */
export const pct = (part: number, total: number) =>
  `${total ? ((part / total) * 100).toFixed(1) : '0.0'}%`;
