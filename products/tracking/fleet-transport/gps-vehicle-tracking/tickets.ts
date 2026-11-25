// Ticket Management rules (IT-0034): who may do what, the status workflow, SLA deadlines,
// automatic escalation and auto-close, which tickets a fleet user sees, demo alerts that can
// become tickets, notifications and the report figures. Pure functions, unit-tested in
// tickets.test.ts; screens/tickets/useTicketData.ts uses them, the page only displays.

export type Status = 'Open' | 'In Progress' | 'On Hold' | 'Resolved' | 'Closed';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
/** agent = the company's support team (Company Admin); requester = fleet roles; viewer = support session. */
export type TicketRole = 'agent' | 'requester' | 'viewer';
export type TicketAction =
  'create' | 'edit' | 'delete' | 'assign' | 'comment' | 'attach' | 'status' | 'reopen' | 'settings';

export const PRIORITIES: Priority[] = ['Critical', 'High', 'Medium', 'Low'];
export const STATUSES: Status[] = ['Open', 'In Progress', 'On Hold', 'Resolved', 'Closed'];
export const MAX_ESCALATION = 3;
const H = 3600_000;

export interface TicketLike {
  id: string;
  asset_id?: string | null;
  priority?: Priority | string;
  status?: Status | string;
  assignee?: string | null;
  reporter_id?: string | null;
  source?: string | null;
  created_at?: string;
  resolved_at?: string | null;
  closed_at?: string | null;
  escalated_at?: string | null;
  sla_started_at?: string | null;
  escalation_level?: number | null;
  reopen_count?: number | null;
}

export interface SettingsLike {
  sla_critical_h: number | string;
  sla_high_h: number | string;
  sla_medium_h: number | string;
  sla_low_h: number | string;
  escalation_enabled: boolean;
  escalate_to: string;
  auto_close_days: number;
}

export const DEFAULT_SETTINGS: SettingsLike = {
  sla_critical_h: 4,
  sla_high_h: 8,
  sla_medium_h: 24,
  sla_low_h: 72,
  escalation_enabled: true,
  escalate_to: 'Support Desk',
  auto_close_days: 7,
};

const time = (s?: string | null) => (s ? Date.parse(s) : NaN);

/** SLA hours of a priority. */
export function slaHours(s: SettingsLike, p?: string): number {
  const h = {
    Critical: s.sla_critical_h,
    High: s.sla_high_h,
    Medium: s.sla_medium_h,
    Low: s.sla_low_h,
  }[p as Priority];
  return Number(h ?? s.sla_medium_h);
}

export const isActive = (status?: string) => status !== 'Resolved' && status !== 'Closed';

/** Deadline: from creation, or from the last escalation or reopen (they restart the clock). */
export function dueAt(t: TicketLike, s: SettingsLike): number {
  const from = time(t.sla_started_at ?? t.escalated_at ?? t.created_at);
  return from + slaHours(s, t.priority) * H;
}

export const isOverdue = (t: TicketLike, s: SettingsLike, now: number) =>
  isActive(t.status) && now > dueAt(t, s);

/** Next statuses the role may set (reopen is its own action). */
export function nextStatuses(role: TicketRole, status?: string): Status[] {
  if (role === 'agent')
    return (
      (
        {
          Open: ['In Progress', 'On Hold', 'Resolved'],
          'In Progress': ['Open', 'On Hold', 'Resolved'],
          'On Hold': ['In Progress', 'Resolved'],
          Resolved: ['Closed'],
          Closed: [],
        } as Record<string, Status[]>
      )[status ?? ''] ?? []
    );
  // A requester confirms the fix by closing a resolved ticket.
  if (role === 'requester') return status === 'Resolved' ? ['Closed'] : [];
  return [];
}

/** May this role do this to this ticket? (A requester only acts on tickets they can see.) */
export function can(role: TicketRole, action: TicketAction, t?: TicketLike): boolean {
  if (role === 'viewer') return false;
  if (role === 'agent') {
    if (action === 'reopen') return !!t && !isActive(t.status);
    if (action === 'status') return !!t && nextStatuses(role, t.status).length > 0;
    return true;
  }
  switch (action) {
    case 'create':
    case 'comment':
    case 'attach':
      return true;
    case 'reopen':
      return !!t && !isActive(t.status);
    case 'status':
      return !!t && nextStatuses(role, t.status).length > 0;
    default:
      return false;
  }
}

/** Group names a fleet user sees: their group and every group below it. */
export function groupScope(
  groups: { name: string; parent_id?: string | null; id: string }[],
  group: string | null,
): Set<string> | null {
  if (!group) return null; // whole company
  const scope = new Set([group]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const g of groups) {
      const parent = groups.find((p) => p.id === g.parent_id);
      if (parent && scope.has(parent.name) && !scope.has(g.name)) {
        scope.add(g.name);
        grew = true;
      }
    }
  }
  return scope;
}

/** Tickets a user sees: agents all; requesters those on vehicles in their scope or reported by them. */
export function visibleTickets<T extends TicketLike>(
  tickets: T[],
  role: TicketRole,
  userId: string | null,
  vehiclesInScope: Set<string> | null,
): T[] {
  if (role !== 'requester' || !vehiclesInScope) return tickets;
  return tickets.filter(
    (t) =>
      (t.asset_id && vehiclesInScope.has(t.asset_id)) || (!!userId && t.reporter_id === userId),
  );
}

export interface Escalation {
  id: string;
  priority: Priority;
  level: number;
  assignee: string;
  note: string;
}

/**
 * Overdue active tickets move up one priority (Critical stays Critical), go to the escalation
 * assignee, and their SLA clock restarts. At most MAX_ESCALATION times per ticket.
 */
export function escalations(tickets: TicketLike[], s: SettingsLike, now: number): Escalation[] {
  if (!s.escalation_enabled) return [];
  return tickets
    .filter((t) => isOverdue(t, s, now) && (t.escalation_level ?? 0) < MAX_ESCALATION)
    .map((t) => {
      const i = PRIORITIES.indexOf(t.priority as Priority);
      const priority = PRIORITIES[Math.max(0, (i < 0 ? 2 : i) - 1)]!;
      const level = (t.escalation_level ?? 0) + 1;
      return {
        id: t.id,
        priority,
        level,
        assignee: s.escalate_to,
        note: `SLA breached: escalated (level ${level})${priority !== t.priority ? `, priority ${t.priority} → ${priority}` : ''}, assigned to ${s.escalate_to}`,
      };
    });
}

/** Resolved tickets nobody reopened within auto_close_days are closed (0 = never). */
export function autoCloses(tickets: TicketLike[], s: SettingsLike, now: number): string[] {
  if (!s.auto_close_days) return [];
  return tickets
    .filter(
      (t) => t.status === 'Resolved' && now - time(t.resolved_at) > s.auto_close_days * 24 * H,
    )
    .map((t) => t.id);
}

export interface DemoAlert {
  id: string;
  type: string;
  asset_id: string;
  plate: string;
  at: string;
  location: string;
  description: string;
  category: string;
  priority: Priority;
}

const ALERT_TYPES: [string, string, string, Priority][] = [
  ['Device Offline', 'No report for 2 h', 'Device Offline', 'Critical'],
  ['SOS', 'Panic button pressed', 'Hardware Fault', 'Critical'],
  ['Power Cut', 'External power disconnected', 'Hardware Fault', 'High'],
  ['Towed', 'Moved with the ignition off', 'GPS Not Updating', 'High'],
  ['Harsh Braking', 'Sudden deceleration', 'Other', 'Medium'],
  ['Geofence Exit', 'Left Customer Zone East', 'Other', 'Medium'],
  ['Idle', 'Engine on, not moving for 24 min', 'Sensor Calibration', 'Low'],
];

/** Today's demo alerts for the company's vehicles (labelled as demo on screen), newest first. */
export function demoAlerts(vehicles: { id: string; plate: string }[], now: number): DemoAlert[] {
  return vehicles.slice(0, 12).map((v, i) => {
    const [type, description, category, priority] = ALERT_TYPES[i % ALERT_TYPES.length]!;
    const at = new Date(now - (i * 47 + 9) * 60_000);
    at.setSeconds(0, 0);
    return {
      id: `AL-${v.id}-${i}`,
      type,
      asset_id: v.id,
      plate: v.plate,
      at: at.toISOString(),
      location: `${(24.6 + ((i * 37) % 30) / 100).toFixed(5)}, ${(46.55 + ((i * 53) % 30) / 100).toFixed(5)}`,
      description,
      category,
      priority,
    };
  });
}

export interface EventLike {
  id: string;
  ticket_id: string;
  kind: string;
  author: string;
  body: string;
  created_at?: string;
}

/** New activity for a user since they last looked: agents see everything, requesters their tickets. */
export function notificationsFor(
  events: EventLike[],
  visible: TicketLike[],
  me: string,
  seenAt: string | null,
): EventLike[] {
  const mine = new Set(visible.map((t) => t.id));
  const since = seenAt ? Date.parse(seenAt) : 0;
  return events
    .filter((e) => mine.has(e.ticket_id) && e.author !== me && time(e.created_at) > since)
    .sort((a, b) => time(b.created_at) - time(a.created_at));
}

export interface TicketReport {
  total: number;
  open: number;
  resolved: number;
  slaMetPct: number | null;
  avgResolutionH: number | null;
  reopened: number;
  escalated: number;
  fromAlerts: number;
  byStatus: [string, number][];
  byPriority: [string, number][];
  byCategory: [string, number][];
  byAssignee: [string, number][];
}

const countBy = <T>(rows: T[], key: (r: T) => string, order?: string[]): [string, number][] => {
  const m = new Map<string, number>();
  for (const k of order ?? []) m.set(k, 0);
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  const out = [...m.entries()];
  return order ? out : out.sort((a, b) => b[1] - a[1]);
};

/** Report figures. SLA met = resolved within the deadline (or still active and not overdue). */
export function report(tickets: TicketLike[], s: SettingsLike, now: number): TicketReport {
  const done = tickets.filter((t) => t.resolved_at);
  const met = tickets.filter((t) =>
    t.resolved_at ? time(t.resolved_at) <= dueAt(t, s) : !isOverdue(t, s, now),
  );
  const hours = done.map((t) => (time(t.resolved_at) - time(t.created_at)) / H);
  return {
    total: tickets.length,
    open: tickets.filter((t) => isActive(t.status)).length,
    resolved: tickets.filter((t) => !isActive(t.status)).length,
    slaMetPct: tickets.length ? Math.round((met.length / tickets.length) * 100) : null,
    avgResolutionH: hours.length
      ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10
      : null,
    reopened: tickets.filter((t) => (t.reopen_count ?? 0) > 0).length,
    escalated: tickets.filter((t) => (t.escalation_level ?? 0) > 0).length,
    fromAlerts: tickets.filter((t) => t.source === 'Alert').length,
    byStatus: countBy(tickets, (t) => t.status ?? 'Open', STATUSES),
    byPriority: countBy(tickets, (t) => t.priority ?? 'Medium', PRIORITIES),
    byCategory: countBy(tickets, (t) => (t as { category?: string }).category ?? 'Other'),
    byAssignee: countBy(tickets, (t) => t.assignee || 'Unassigned'),
  };
}
