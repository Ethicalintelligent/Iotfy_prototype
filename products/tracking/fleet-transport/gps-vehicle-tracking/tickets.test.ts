import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS as S,
  autoCloses,
  can,
  demoAlerts,
  dueAt,
  escalations,
  groupScope,
  isOverdue,
  nextStatuses,
  notificationsFor,
  report,
  visibleTickets,
  type TicketLike,
} from './tickets';

const NOW = Date.parse('2026-11-24T12:00:00Z');
const ago = (h: number) => new Date(NOW - h * 3600_000).toISOString();
const t = (o: Partial<TicketLike> = {}): TicketLike => ({
  id: 'T1',
  priority: 'High',
  status: 'Open',
  created_at: ago(1),
  ...o,
});

describe('SLA', () => {
  it('counts from creation, or from the last escalation', () => {
    expect(dueAt(t(), S)).toBe(Date.parse(ago(1)) + 8 * 3600_000);
    expect(dueAt(t({ escalated_at: ago(0.5) }), S)).toBe(Date.parse(ago(0.5)) + 8 * 3600_000);
  });
  it('is overdue only while active', () => {
    expect(isOverdue(t({ created_at: ago(9) }), S, NOW)).toBe(true);
    expect(isOverdue(t({ created_at: ago(9), status: 'Resolved' }), S, NOW)).toBe(false);
  });
});

describe('workflow', () => {
  it('lets the support team move a ticket, not to closed before resolved', () => {
    expect(nextStatuses('agent', 'Open')).toEqual(['In Progress', 'On Hold', 'Resolved']);
    expect(nextStatuses('agent', 'Resolved')).toEqual(['Closed']);
    expect(nextStatuses('agent', 'Closed')).toEqual([]);
  });
  it('lets a requester only confirm (close) a resolved ticket', () => {
    expect(nextStatuses('requester', 'Open')).toEqual([]);
    expect(nextStatuses('requester', 'Resolved')).toEqual(['Closed']);
  });
  it('gives each role its actions', () => {
    expect(can('agent', 'delete', t())).toBe(true);
    expect(can('requester', 'delete', t())).toBe(false);
    expect(can('requester', 'create')).toBe(true);
    expect(can('requester', 'reopen', t({ status: 'Closed' }))).toBe(true);
    expect(can('requester', 'reopen', t())).toBe(false);
    expect(can('viewer', 'comment', t())).toBe(false);
  });
});

describe('escalation and auto-close', () => {
  it('raises an overdue ticket one priority and reassigns it', () => {
    const [e] = escalations([t({ created_at: ago(9) })], S, NOW);
    expect(e).toMatchObject({ id: 'T1', priority: 'Critical', level: 1, assignee: 'Support Desk' });
  });
  it('keeps Critical, stops at level 3, and can be switched off', () => {
    expect(
      escalations([t({ priority: 'Critical', created_at: ago(5) })], S, NOW)[0]!.priority,
    ).toBe('Critical');
    expect(escalations([t({ created_at: ago(9), escalation_level: 3 })], S, NOW)).toEqual([]);
    expect(
      escalations([t({ created_at: ago(9) })], { ...S, escalation_enabled: false }, NOW),
    ).toEqual([]);
  });
  it('closes resolved tickets after the set number of days', () => {
    const old = t({ status: 'Resolved', resolved_at: ago(24 * 8) });
    expect(autoCloses([old, t({ status: 'Resolved', resolved_at: ago(1) })], S, NOW)).toEqual([
      'T1',
    ]);
    expect(autoCloses([old], { ...S, auto_close_days: 0 }, NOW)).toEqual([]);
  });
});

describe('who sees what', () => {
  const groups = [
    { id: 'G1', name: 'North fleet', parent_id: null },
    { id: 'G2', name: 'North depot', parent_id: 'G1' },
    { id: 'G3', name: 'South fleet', parent_id: null },
  ];
  it('includes sub-groups', () => {
    expect([...groupScope(groups, 'North fleet')!]).toEqual(['North fleet', 'North depot']);
    expect(groupScope(groups, null)).toBeNull();
  });
  it('shows a requester tickets on their vehicles or reported by them', () => {
    const list = [
      t({ id: 'A', asset_id: 'V1' }),
      t({ id: 'B', asset_id: 'V2' }),
      t({ id: 'C', asset_id: 'V2', reporter_id: 'U5' }),
    ];
    expect(visibleTickets(list, 'requester', 'U5', new Set(['V1'])).map((x) => x.id)).toEqual([
      'A',
      'C',
    ]);
    expect(visibleTickets(list, 'agent', 'U4', new Set(['V1']))).toHaveLength(3);
  });
});

describe('alerts, notifications and report', () => {
  it('makes one demo alert per vehicle with a category and priority', () => {
    const a = demoAlerts(
      [
        { id: 'V1', plate: 'KSA 1' },
        { id: 'V2', plate: 'KSA 2' },
      ],
      NOW,
    );
    expect(a.map((x) => [x.type, x.category, x.priority])).toEqual([
      ['Device Offline', 'Device Offline', 'Critical'],
      ['SOS', 'Hardware Fault', 'Critical'],
    ]);
  });
  it('notifies about others’ activity since last seen', () => {
    const ev = (id: string, author: string, h: number) => ({
      id,
      ticket_id: 'T1',
      kind: 'Comment',
      author,
      body: '',
      created_at: ago(h),
    });
    const n = notificationsFor(
      [ev('1', 'Me', 0.1), ev('2', 'Other', 0.2), ev('3', 'Other', 5)],
      [t()],
      'Me',
      ago(1),
    );
    expect(n.map((e) => e.id)).toEqual(['2']);
  });
  it('reports SLA met, resolution time and breakdowns', () => {
    const r = report(
      [
        t({ id: 'A', created_at: ago(10), resolved_at: ago(6), status: 'Resolved' }),
        t({ id: 'B', created_at: ago(10) }),
        t({ id: 'C', source: 'Alert', reopen_count: 1, escalation_level: 1 }),
      ],
      S,
      NOW,
    );
    expect(r).toMatchObject({
      total: 3,
      open: 2,
      resolved: 1,
      slaMetPct: 67,
      avgResolutionH: 4,
      reopened: 1,
      escalated: 1,
      fromAlerts: 1,
    });
    expect(r.byStatus[0]).toEqual(['Open', 2]);
  });
});
