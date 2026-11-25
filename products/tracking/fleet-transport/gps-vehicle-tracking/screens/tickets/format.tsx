// Looks and formatting of the Ticket Management page, as in the original
// (Ticket-Management.html, removed in IT-0037 (git history)).
import type { ReactNode } from 'react';
import type { Status } from '../../tickets';
import type { Ticket } from './useTicketData';

export const STATUS: Record<string, { tone: string; icon: string }> = {
  Open: { tone: 'blue', icon: 'open' },
  'In Progress': { tone: 'purple', icon: 'progress' },
  'On Hold': { tone: 'amber', icon: 'hold' },
  Resolved: { tone: 'green', icon: 'done' },
  Closed: { tone: 'gray', icon: 'closed' },
};
export const STATUSES: Status[] = ['Open', 'In Progress', 'On Hold', 'Resolved', 'Closed'];
export const PRIORITY: Record<string, string> = {
  Critical: 'red',
  High: 'orange',
  Medium: 'amber',
  Low: 'blue',
};
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export const CATEGORIES = [
  'Device Offline',
  'GPS Not Updating',
  'SIM / Connectivity',
  'Hardware Fault',
  'Installation',
  'Sensor Calibration',
  'Application Issue',
  'Billing',
  'Other',
] as const;
export const AGENTS = [
  'Support Desk',
  'Omar Haddad',
  'Sara Nabil',
  'Faisal Karim',
  'Lina Youssef',
  'Field Technician Team',
];
export const ROLE_TEXT: Record<string, string> = {
  agent: 'Support team: you handle tickets.',
  requester: 'Requester: you raise and follow tickets for your vehicles.',
  viewer: 'View only: changes are not allowed in this session.',
};

const EVENT: Record<string, [string, string]> = {
  Created: ['open', 'blue'],
  Comment: ['msg', 'teal'],
  Assigned: ['user', 'gray'],
  Edited: ['edit', 'gray'],
  Resolved: ['done', 'green'],
  Reopened: ['reopen', 'orange'],
  Escalated: ['up', 'red'],
  Closed: ['closed', 'gray'],
  Attachment: ['clip', 'blue'],
};
/** [icon, tone] of a history entry. */
export function eventLook(e: { kind: string; body: string }): [string, string] {
  if (e.kind === 'Status') {
    const s = STATUSES.find((x) => e.body.slice(-x.length) === x);
    return s ? [STATUS[s]!.icon, STATUS[s]!.tone] : ['progress', 'purple'];
  }
  return EVENT[e.kind] ?? ['msg', 'gray'];
}

/** C1-TKT-1054 → TKT-1054. */
export function shortId(id: string | undefined) {
  const m = /TKT-\d+$/.exec(id ?? '');
  return m ? m[0] : (id ?? '');
}
const ms = (s?: string | null) => (s ? Date.parse(s) : NaN);
export { ms };

/** 2026-11-24 03:43 PM */
export function fmt(v?: string | number | null) {
  const d = new Date(typeof v === 'number' ? v : ms(v ?? undefined));
  if (isNaN(d.getTime())) return '—';
  const p = (n: number) => (n < 10 ? '0' : '') + n;
  const h = d.getHours();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(h % 12 || 12)}:${p(d.getMinutes())} ${h >= 12 ? 'PM' : 'AM'}`;
}
export const isActive = (t: Pick<Ticket, 'status'>) =>
  t.status !== 'Resolved' && t.status !== 'Closed';

/** Time left until the SLA deadline ("4 h 0 min left", "Overdue 2 d"). */
export function left(t: Ticket) {
  if (!isActive(t)) return '—';
  const m = Math.round((ms(t.due_at) - Date.now()) / 60000);
  const a = Math.abs(m);
  const s =
    a >= 1440
      ? `${Math.round(a / 1440)} d`
      : a >= 60
        ? `${Math.floor(a / 60)} h ${a % 60} min`
        : `${a} min`;
  return m < 0 ? `Overdue ${s}` : `${s} left`;
}
export function size(b: number) {
  return b >= 1048576
    ? `${(b / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(b / 1024))} KB`;
}

export function Pill({
  tone,
  dot,
  children,
}: {
  tone: string;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`td-pill tone-${tone}`}>
      {dot && <span className="td-dot" />}
      {children}
    </span>
  );
}
