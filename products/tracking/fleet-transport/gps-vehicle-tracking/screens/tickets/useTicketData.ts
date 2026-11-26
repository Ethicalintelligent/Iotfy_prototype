// Ticket Management data and actions (IT-0033/IT-0034, moved here from screens/TicketsBridge.tsx
// for the React page, IT-0036):
//  • reads tickets, history, attachments, settings, the user's read marker, vehicles and groups
//    through @iotify/data hooks;
//  • works out the user's role (Company Admin = support team "agent", fleet roles = "requester",
//    support session = "viewer") and what they may see and do (rules in ../../tickets.ts);
//  • gives the page ready-made figures (deadline, overdue, allowed actions, report,
//    notifications, demo alerts);
//  • turns each action into one transaction (useSaveBatch) with its history entry; a failure
//    rejects with Neon's exact error text (or the rule's message);
//  • runs the automatic steps (SLA escalation, auto-close) as "System" while a writer has it open.
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@iotify/auth';
import {
  useSaveBatch,
  useTicketAttachments,
  useTicketEvents,
  useTicketNotificationReads,
  useTicketSettings,
  useTickets,
  useVehicleDetails,
  type Batch,
  type TicketAttachmentsRow,
  type TicketEventsRow,
  type TicketsRow,
} from '@iotify/data';
import { sid, useFleetAssets, useFleetGroups } from '../fleet-rows';
import {
  DEFAULT_SETTINGS,
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
  type DemoAlert,
  type EventLike,
  type SettingsLike,
  type Status,
  type TicketReport,
  type TicketRole,
} from '../../tickets';

/** The form's fields; the vehicle is its gps id as text (the page's select). */
export type Fields = Pick<
  Ticket,
  'subject' | 'asset_id' | 'category' | 'priority' | 'assignee' | 'description'
>;
type AlertRef = { type: string; at: string; location: string };
export type TicketAction =
  | { kind: 'create'; fields: Fields; alert?: AlertRef }
  | { kind: 'edit'; id: string; fields: Fields; note: string }
  | { kind: 'status'; id: string; status: Status; resolution?: string }
  | { kind: 'reopen'; id: string; reason: string }
  | { kind: 'assign'; id: string; assignee: string }
  | { kind: 'comment'; id: string; text: string }
  | {
      kind: 'attach';
      id: string;
      file: { name: string; type: string; size: number; dataUrl: string };
    }
  | { kind: 'delete'; id: string }
  | { kind: 'settings'; settings: Partial<SettingsLike> }
  | { kind: 'seen' };

/**
 * A ticket as the page shows it: the row (with its gps vehicle and reporter ids as text) plus plate,
 * deadline, overdue, next statuses and rights.
 */
export interface Ticket extends Omit<TicketsRow, 'asset_id' | 'reporter_id'> {
  asset_id: string | null;
  reporter_id: string | null;
  plate: string;
  due_at: string;
  overdue: boolean;
  next: Status[];
  can: {
    edit: boolean;
    delete: boolean;
    assign: boolean;
    comment: boolean;
    attach: boolean;
    reopen: boolean;
  };
}

export interface TicketData {
  loading: boolean;
  error: string | null;
  role: TicketRole;
  user: string;
  readOnly: boolean;
  can: { create: boolean; settings: boolean };
  settings: SettingsLike;
  vehicles: { id: string; plate: string }[];
  alerts: DemoAlert[];
  tickets: Ticket[];
  events: TicketEventsRow[];
  attachments: TicketAttachmentsRow[];
  notifications: EventLike[];
  report: TicketReport;
}

const MAX_FILE = 1024 * 1024;
/** The fields as tickets columns (asset_id is the gps vehicle number). */
const clean = (f: Fields): Partial<TicketsRow> => ({
  subject: String(f.subject ?? '').trim(),
  asset_id: f.asset_id ? Number(f.asset_id) : null,
  category: f.category,
  priority: f.priority,
  assignee: f.assignee || null,
  description: f.description ? String(f.description).trim() : null,
});

export function useTicketData(
  companyId: string,
  readOnly: boolean,
): { data: TicketData; apply: (action: TicketAction) => Promise<{ id?: string }> } {
  const auth = useAuth();
  const me = auth.user?.name ?? 'User';
  // core.app_user ids are numbers; the ticket rules compare text ids.
  const userNo = auth.user?.id ?? null;
  const userId = userNo == null ? null : String(userNo);
  // Fleet roles are view-only elsewhere, but raise and follow tickets here; support sessions never write.
  const role: TicketRole = auth.support
    ? 'viewer'
    : auth.role === 'fleet'
      ? 'requester'
      : readOnly
        ? 'viewer'
        : 'agent';

  const tickets = useTickets({ company_id: Number(companyId) });
  const ids = useMemo(() => (tickets.data ?? []).map((t) => t.id), [tickets.data]);
  const some = { enabled: ids.length > 0 };
  const events = useTicketEvents({ ticket_id: ids }, some);
  const files = useTicketAttachments({ ticket_id: ids }, some);
  const settingsRows = useTicketSettings({ company_id: Number(companyId) });
  const reads = useTicketNotificationReads({ user_id: userNo ?? -1 }, { enabled: userNo != null });
  // Ticket rows with their gps ids (vehicle, reporter) as text, like the rest of the page.
  const ticketRows = useMemo(
    () =>
      tickets.data?.map((t) => ({ ...t, asset_id: sid(t.asset_id), reporter_id: sid(t.reporter_id) })),
    [tickets.data],
  );
  const assets = useFleetAssets(companyId);
  const assetIds = useMemo(() => (assets.data ?? []).map((a) => a.id), [assets.data]);
  const vehicles = useVehicleDetails({ asset_id: assetIds.map(Number) }, { enabled: assetIds.length > 0 });
  const groups = useFleetGroups(companyId);
  const save = useSaveBatch();

  const settings: SettingsLike = useMemo(() => {
    const s = settingsRows.data?.[0];
    return s
      ? {
          escalation_enabled: s.escalation_enabled ?? DEFAULT_SETTINGS.escalation_enabled,
          escalate_to: s.escalate_to ?? DEFAULT_SETTINGS.escalate_to,
          auto_close_days: s.auto_close_days ?? DEFAULT_SETTINGS.auto_close_days,
          sla_critical_h: Number(s.sla_critical_h),
          sla_high_h: Number(s.sla_high_h),
          sla_medium_h: Number(s.sla_medium_h),
          sla_low_h: Number(s.sla_low_h),
        }
      : DEFAULT_SETTINGS;
  }, [settingsRows.data]);

  // Vehicles this user works with: a fleet user only their group and the groups below it.
  const scope = useMemo(() => {
    const isVehicle = new Set((vehicles.data ?? []).map((v) => String(v.asset_id)));
    const groupNames =
      role === 'requester' ? groupScope(groups.data ?? [], auth.user?.asset_group ?? null) : null;
    return (assets.data ?? []).filter(
      (a) =>
        isVehicle.has(a.id) && (!groupNames || (a.asset_group && groupNames.has(a.asset_group))),
    );
  }, [assets.data, vehicles.data, groups.data, role, auth.user?.asset_group]);

  const visible = useMemo(
    () =>
      visibleTickets(
        ticketRows ?? [],
        role,
        userId,
        role === 'requester' ? new Set(scope.map((a) => a.id)) : null,
      ),
    [ticketRows, role, userId, scope],
  );

  const loading =
    tickets.isLoading ||
    assets.isLoading ||
    settingsRows.isLoading ||
    (ids.length > 0 && events.isLoading);
  const error =
    tickets.error?.message ??
    events.error?.message ??
    settingsRows.error?.message ??
    assets.error?.message ??
    null;

  const data: TicketData = useMemo(() => {
    const now = Date.now();
    const plate = new Map((assets.data ?? []).map((a) => [a.id, a.plate_serial || a.name || a.id]));
    const shown = new Set(visible.map((t) => t.id));
    const vehicleList = scope
      .map((a) => ({ id: a.id, plate: String(plate.get(a.id)) }))
      .sort((a, b) => a.plate.localeCompare(b.plate));
    const ev = (events.data ?? []).filter((e) => shown.has(e.ticket_id));
    return {
      loading,
      error,
      role,
      user: me,
      readOnly: role === 'viewer',
      can: { create: can(role, 'create'), settings: can(role, 'settings') },
      settings,
      vehicles: vehicleList,
      alerts: can(role, 'create') ? demoAlerts(vehicleList, now) : [],
      tickets: visible.map((t) => ({
        ...t,
        plate: t.asset_id ? (plate.get(t.asset_id) ?? t.asset_id) : '—',
        due_at: new Date(dueAt(t, settings)).toISOString(),
        overdue: isOverdue(t, settings, now),
        next: nextStatuses(role, t.status),
        can: {
          edit: can(role, 'edit', t),
          delete: can(role, 'delete', t),
          assign: can(role, 'assign', t),
          comment: can(role, 'comment', t),
          attach: can(role, 'attach', t),
          reopen: can(role, 'reopen', t),
        },
      })),
      events: ev,
      attachments: (files.data ?? []).filter((f) => shown.has(f.ticket_id)),
      notifications: notificationsFor(ev, visible, me, reads.data?.[0]?.seen_at ?? null).slice(
        0,
        30,
      ),
      report: report(visible, settings, now),
    };
  }, [
    visible,
    events.data,
    files.data,
    settings,
    reads.data,
    scope,
    assets.data,
    loading,
    error,
    role,
    me,
  ]);

  const latest = useRef(data);
  latest.current = data;

  const event = useCallback(
    (ticketId: string, kind: TicketEventsRow['kind'], body: string, author = me) => ({
      id: `${ticketId}-E${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      ticket_id: ticketId,
      kind,
      author,
      body,
      created_at: new Date().toISOString(),
    }),
    [me],
  );

  // Automatic steps: SLA escalation and auto-close, once per ticket state, by any writer's session.
  const done = useRef(new Set<string>());
  useEffect(() => {
    if (loading || role === 'viewer' || !ticketRows) return;
    const now = Date.now();
    const all = ticketRows!;
    const up = escalations(all, settings, now).filter(
      (e) => !done.current.has(`esc:${e.id}:${e.level}`),
    );
    const close = autoCloses(all, settings, now).filter((id) => !done.current.has(`close:${id}`));
    if (!up.length && !close.length) return;
    up.forEach((e) => done.current.add(`esc:${e.id}:${e.level}`));
    close.forEach((id) => done.current.add(`close:${id}`));
    const at = new Date(now).toISOString();
    save.mutate({
      updates: [
        {
          table: 'tickets',
          rows: [
            ...up.map((e) => ({
              id: e.id,
              priority: e.priority,
              assignee: e.assignee,
              escalation_level: e.level,
              escalated_at: at,
              sla_started_at: at,
            })),
            ...close.map((id) => ({ id, status: 'Closed' as const, closed_at: at })),
          ],
        },
      ],
      upserts: [
        {
          table: 'ticket_events',
          rows: [
            ...up.map((e) => event(e.id, 'Escalated', e.note, 'System')),
            ...close.map((id) =>
              event(
                id,
                'Closed',
                `Closed automatically ${settings.auto_close_days} days after it was resolved`,
                'System',
              ),
            ),
          ],
        },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketRows, settings, loading, role]);

  const { mutateAsync } = save;
  /** One change, saved in Neon; resolves once the data is re-read, rejects with the exact error text. */
  const apply = useCallback(
    async (a: TicketAction): Promise<{ id?: string }> => {
      const run = async (batch: Batch, id?: string) => {
        try {
          await mutateAsync(batch);
        } catch (err) {
          throw err instanceof Error ? err.message : String(err);
        }
        return { id };
      };
      const refuse = (msg: string) => Promise.reject(msg);
      const now = new Date().toISOString();

      if (a.kind === 'seen') {
        if (!userId || role === 'viewer') return {};
        return run({
          upserts: [
            { table: 'ticket_notification_reads', rows: [{ user_id: userNo!, seen_at: now }] },
          ],
        });
      }
      if (a.kind === 'settings') {
        if (!can(role, 'settings'))
          return refuse('Only the support team can change ticket settings.');
        return run({
          upserts: [
            {
              table: 'ticket_settings',
              rows: [{ ...a.settings, company_id: Number(companyId), updated_at: now }],
            },
          ],
        });
      }
      if (a.kind === 'create') {
        if (!can(role, 'create')) return refuse('You cannot raise tickets in this session.');
        const f = clean(a.fields);
        if (role === 'requester' && f.asset_id && !scope.some((v) => v.id === String(f.asset_id)))
          return refuse('That vehicle is not in your group.');
        // Company-scoped id (C1-TKT-1055): never the same as another company's ticket.
        const n = (tickets.data ?? []).reduce(
          (max, t) => Math.max(max, Number(/(\d+)$/.exec(t.id)?.[1] ?? 0)),
          1040,
        );
        const id = `${companyId}-TKT-${n + 1}`;
        return run(
          {
            upserts: [
              {
                table: 'tickets',
                rows: [
                  {
                    id,
                    company_id: Number(companyId),
                    status: 'Open',
                    reporter: me,
                    reporter_id: userNo,
                    ...f,
                    // A requester cannot pick who handles it.
                    ...(role === 'requester' ? { assignee: settings.escalate_to } : {}),
                    ...(a.alert
                      ? {
                          source: 'Alert' as const,
                          alert_type: a.alert.type,
                          alert_at: a.alert.at,
                          alert_location: a.alert.location,
                        }
                      : { source: 'Manual' as const }),
                  },
                ],
              },
              {
                table: 'ticket_events',
                rows: [
                  event(
                    id,
                    'Created',
                    a.alert ? `Ticket created from a ${a.alert.type} alert` : 'Ticket created',
                  ),
                ],
              },
            ],
          },
          id,
        );
      }

      const id = a.id;
      const t = latest.current.tickets.find((x) => x.id === id);
      if (!t) return refuse('That ticket does not belong to this company.');
      const update = (row: Partial<TicketsRow>) => ({
        table: 'tickets' as const,
        rows: [{ id, updated_at: now, ...row }],
      });
      const log = (kind: TicketEventsRow['kind'], body: string) => ({
        table: 'ticket_events' as const,
        rows: [event(id, kind, body)],
      });
      const allowed = (act: Parameters<typeof can>[1]) => can(role, act, t);
      let batch: Batch;
      if (a.kind === 'delete') {
        if (!allowed('delete')) return refuse('Only the support team can delete tickets.');
        batch = { deletes: [{ table: 'tickets', keys: [{ id }] }] };
      } else if (a.kind === 'edit') {
        if (!allowed('edit')) return refuse('Only the support team can edit tickets.');
        batch = { updates: [update(clean(a.fields))], upserts: [log('Edited', a.note)] };
      } else if (a.kind === 'status') {
        if (!a.status || !nextStatuses(role, t.status).includes(a.status))
          return refuse(`A ticket that is ${t.status} cannot be set to ${a.status} by you.`);
        if (a.status === 'Resolved' && !a.resolution?.trim())
          return refuse('Write how the issue was resolved.');
        const row: Partial<TicketsRow> = { status: a.status };
        if (a.status === 'Resolved')
          Object.assign(row, { resolution: a.resolution!.trim(), resolved_at: now });
        if (a.status === 'Closed') row.closed_at = now;
        batch = {
          updates: [update(row)],
          upserts: [
            a.status === 'Resolved'
              ? log('Resolved', `Resolved: ${a.resolution!.trim()}`)
              : a.status === 'Closed'
                ? log(
                    'Closed',
                    role === 'requester' ? 'Fix confirmed; ticket closed' : 'Ticket closed',
                  )
                : log('Status', `Status changed to ${a.status}`),
          ],
        };
      } else if (a.kind === 'reopen') {
        if (!allowed('reopen')) return refuse('This ticket cannot be reopened.');
        if (!a.reason?.trim()) return refuse('Write why the ticket is reopened.');
        batch = {
          updates: [
            update({
              status: 'Open',
              reopen_count: (t.reopen_count ?? 0) + 1,
              resolved_at: null,
              closed_at: null,
              sla_started_at: now,
            }),
          ],
          upserts: [log('Reopened', `Reopened: ${a.reason.trim()}`)],
        };
      } else if (a.kind === 'assign') {
        if (!allowed('assign')) return refuse('Only the support team can assign tickets.');
        batch = {
          updates: [update({ assignee: a.assignee })],
          upserts: [log('Assigned', `Assigned to ${a.assignee}`)],
        };
      } else if (a.kind === 'comment') {
        if (!allowed('comment')) return refuse('You cannot comment in this session.');
        batch = { updates: [update({})], upserts: [log('Comment', String(a.text).trim())] };
      } else if (a.kind === 'attach') {
        if (!allowed('attach')) return refuse('You cannot attach files in this session.');
        if (a.file.size > MAX_FILE) return refuse('Files can be at most 1 MB.');
        batch = {
          updates: [update({})],
          upserts: [
            {
              table: 'ticket_attachments',
              rows: [
                {
                  id: `${id}-F${Date.now().toString(36)}`,
                  ticket_id: id,
                  file_name: a.file.name,
                  mime_type: a.file.type || null,
                  size_bytes: a.file.size,
                  data_url: a.file.dataUrl,
                  uploaded_by: me,
                },
              ],
            },
            log('Attachment', `Attached ${a.file.name}`),
          ],
        };
      } else return refuse('Unknown action.');
      return run(batch, id);
    },
    [companyId, me, userId, role, mutateAsync, scope, settings, tickets.data, event],
  );

  return { data, apply };
}
