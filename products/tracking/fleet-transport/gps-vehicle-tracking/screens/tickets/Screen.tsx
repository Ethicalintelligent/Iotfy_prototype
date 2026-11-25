// IT-0036. Administration › Ticket Management, rebuilt in React from Ticket-Management.html, removed in IT-0037 (git history)
// (the reference, IT-0030 to IT-0034): same markup, texts and behaviour, without the iframe.
// Data and actions: useTicketData (Neon through @iotify/data, rules from ../../tickets.ts).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ScreenContext } from '@iotify/app-kit';
import type { DemoAlert } from '../../tickets';
import { SmartTrackPage } from '../smart-track/kit';
import { TkIcon } from './icons';
import { Detail } from './Detail';
import { AlertsDialog, DeleteConfirm, NoteDialog, Portal, TicketForm } from './dialogs';
import {
  CATEGORIES,
  PRIORITIES,
  PRIORITY,
  Pill,
  ROLE_TEXT,
  STATUS,
  STATUSES,
  eventLook,
  fmt,
  left,
  ms,
  shortId,
} from './format';
import { useTicketData, type Ticket, type TicketData } from './useTicketData';
import { ReportsView, SettingsView } from './views';
import './tickets.css';
import './tickets.fix.css';

type View = 'tickets' | 'reports' | 'settings';
type Dialog =
  | { kind: 'form'; ticket: Ticket | null; alert?: DemoAlert }
  | { kind: 'alerts' }
  | { kind: 'note'; ticket: Ticket; note: 'resolve' | 'reopen' }
  | { kind: 'delete'; ticket: Ticket }
  | null;

const TILES: {
  id: string;
  label: string;
  tone: string;
  icon: string;
  cap: string;
  count: (d: TicketData) => number;
}[] = [
  {
    id: 'all',
    label: 'Total Tickets',
    tone: 'brand',
    icon: 'ticket',
    cap: 'All time',
    count: (d) => d.tickets.length,
  },
  {
    id: 'Open',
    label: 'Open',
    tone: 'blue',
    icon: 'open',
    cap: 'Waiting for action',
    count: (d) => countStatus(d, 'Open'),
  },
  {
    id: 'In Progress',
    label: 'In Progress',
    tone: 'purple',
    icon: 'progress',
    cap: 'Being worked on',
    count: (d) => countStatus(d, 'In Progress'),
  },
  {
    id: 'On Hold',
    label: 'On Hold',
    tone: 'amber',
    icon: 'hold',
    cap: 'Waiting on others',
    count: (d) => countStatus(d, 'On Hold'),
  },
  {
    id: 'overdue',
    label: 'Overdue',
    tone: 'red',
    icon: 'warn',
    cap: 'SLA breached',
    count: (d) => d.tickets.filter((t) => t.overdue).length,
  },
  {
    id: 'Resolved',
    label: 'Resolved',
    tone: 'green',
    icon: 'done',
    cap: 'Resolved or closed',
    count: (d) => countStatus(d, 'Resolved') + countStatus(d, 'Closed'),
  },
];
const countStatus = (d: TicketData, s: string) => d.tickets.filter((t) => t.status === s).length;
const TABS = [
  { id: 'all', label: 'All' },
  ...STATUSES.map((s) => ({ id: s as string, label: s as string })),
  { id: 'overdue', label: 'Overdue' },
];

interface Filters {
  tab: string;
  q: string;
  priority: string;
  category: string;
  source: string;
}
function filterTickets(tickets: Ticket[], f: Filters) {
  const q = f.q.trim().toLowerCase();
  return tickets
    .filter((t) => {
      if (f.tab === 'overdue' ? !t.overdue : f.tab !== 'all' && t.status !== f.tab) return false;
      if (f.priority && t.priority !== f.priority) return false;
      if (f.category && t.category !== f.category) return false;
      if (f.source && t.source !== f.source) return false;
      if (
        q &&
        [shortId(t.id), t.subject, t.plate, t.category, t.assignee, t.alert_type]
          .join(' ')
          .toLowerCase()
          .indexOf(q) < 0
      )
        return false;
      return true;
    })
    .sort((a, b) => ms(b.created_at) - ms(a.created_at));
}

export default function TicketsScreen({ companyId, readOnly }: ScreenContext) {
  const { data, apply } = useTicketData(companyId, readOnly);
  const [view, setView] = useState<View>('tickets');
  const [filters, setFilters] = useState<Filters>({
    tab: 'all',
    q: '',
    priority: '',
    category: '',
    source: '',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<string | null>(null);
  const [bell, setBell] = useState(false);
  const [editSettings, setEditSettings] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; error: boolean; n: number } | null>(
    null,
  );
  const bellBox = useRef<HTMLDivElement>(null);

  const list = useMemo(() => filterTickets(data.tickets, filters), [data.tickets, filters]);
  const find = (id: string | null) => data.tickets.find((t) => t.id === id);

  const toast = (text: string, error = false) =>
    setToastMsg((p) => ({ text, error, n: (p?.n ?? 0) + 1 }));
  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), toastMsg.error ? 6000 : 2800);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  // As in the original, on each new data: keep the selection if it still exists, else the first ticket.
  useEffect(() => {
    if (!data.tickets.some((t) => t.id === selected)) setSelected(list[0]?.id ?? null);
    if (view === 'settings' && !data.can.settings) setView('tickets');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Clicking outside the notification list or pressing Escape closes it; Escape also closes dialogs.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (bell && bellBox.current && !bellBox.current.contains(e.target as Node)) setBell(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDialog(null);
        setBell(false);
      }
    };
    document.addEventListener('click', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [bell]);

  const setFilter = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const pages = Math.max(1, Math.ceil(list.length / pageSize));
  const current = Math.min(page, pages);
  const rows = list.slice((current - 1) * pageSize, current * pageSize);
  const n = data.notifications.length;
  const views: [View, string][] = [
    ['tickets', 'Tickets'],
    ['reports', 'Reports'],
    ...(data.can.settings ? [['settings', 'Settings'] as [View, string]] : []),
  ];
  const closeDialog = () => setDialog(null);

  return (
    <SmartTrackPage scope="st-tickets">
      <section className="td-card">
        <header className="td-card__head">
          <span className="td-badge td-badge--solid tone-brand">
            <TkIcon name="ticket" />
          </span>
          <div className="td-card__titles">
            <h2 className="td-card__title">Ticket Management</h2>
            <p className="td-card__sub">
              <span id="who">{ROLE_TEXT[data.role] ?? ''}</span>{' '}
              <span className="td-pill tone-amber">Demo data</span>
            </p>
          </div>
          <div className="td-card__right">
            <div className="td-seg" role="tablist" id="views">
              {views.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={view === id}
                  className={`td-seg__btn${view === id ? ' is-active' : ''}`}
                  data-view={id}
                  onClick={() => {
                    setView(id);
                    setEditSettings(false);
                    setBell(false);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="tk-bell" ref={bellBox}>
              <button
                type="button"
                className="td-icon-btn"
                id="btn-bell"
                aria-haspopup="true"
                aria-expanded={bell}
                aria-label={`Notifications: ${n} new`}
                onClick={() => setBell((b) => !b)}
              >
                <TkIcon name="bell" size={18} />
                {n > 0 && <span className="tk-bell__count">{n > 9 ? '9+' : n}</span>}
              </button>
              <div id="bell-pop">
                {bell && (
                  <div className="tk-pop" role="dialog" aria-label="Notifications">
                    <div className="tk-pop__head">
                      Notifications ({n})
                      {n > 0 && !data.readOnly && (
                        <button
                          type="button"
                          className="td-btn td-btn--ghost"
                          id="btn-seen"
                          style={{ minHeight: 28, padding: '0 10px' }}
                          onClick={() =>
                            apply({ kind: 'seen' }).then(
                              () => {
                                setBell(false);
                                toast('All notifications marked as read');
                              },
                              (msg: string) => toast(msg, true),
                            )
                          }
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    {n ? (
                      <ul className="tk-pop__list">
                        {data.notifications.map((e) => {
                          const [icon, tone] = eventLook(e);
                          return (
                            <li key={e.id}>
                              <button
                                type="button"
                                data-goto={e.ticket_id}
                                onClick={() => {
                                  setView('tickets');
                                  setFilters((f) => ({ ...f, tab: 'all' }));
                                  setBell(false);
                                  setSelected(e.ticket_id);
                                }}
                              >
                                <span
                                  className={`td-badge td-badge--solid td-badge--sm tone-${tone}`}
                                >
                                  <TkIcon name={icon} size={12} />
                                </span>
                                <span>
                                  <strong>
                                    {shortId(e.ticket_id)} · {e.author}
                                  </strong>
                                  <p>{e.body}</p>
                                  <small>{fmt(e.created_at)}</small>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="tk-empty">
                        <TkIcon name="inbox" size={28} />
                        You are up to date
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {data.can.create && (
              <>
                <button
                  type="button"
                  className="td-btn td-btn--ghost"
                  id="btn-alert"
                  onClick={() => setDialog({ kind: 'alerts' })}
                >
                  <TkIcon name="siren" />
                  From Alert
                </button>
                <button
                  type="button"
                  className="td-btn td-btn--primary"
                  id="btn-new"
                  onClick={() => setDialog({ kind: 'form', ticket: null })}
                >
                  <TkIcon name="plus" />
                  New Ticket
                </button>
              </>
            )}
          </div>
        </header>
      </section>

      <div id="view-tickets" hidden={view !== 'tickets'}>
        <div className="td-tiles tk-tiles" id="tiles" style={{ marginBottom: 10 }}>
          {TILES.map((k) => (
            <button
              key={k.id}
              type="button"
              className={`td-tile is-clickable tone-${k.tone}${filters.tab === k.id ? ' is-active' : ''}`}
              data-tab={k.id}
              onClick={() => setFilter({ tab: k.id })}
            >
              <span className="td-badge td-badge--lg td-badge--solid">
                <TkIcon name={k.icon} size={18} />
              </span>
              <span className="td-tile__label">{k.label}</span>
              <span className="td-tile__value">{data.loading ? '–' : k.count(data)}</span>
              <span className="td-tile__caption">{k.cap}</span>
            </button>
          ))}
        </div>
        <div className="tk-layout">
          <section className="td-card">
            <header className="td-card__head">
              <span className="td-badge td-badge--solid tone-brand">
                <TkIcon name="list" />
              </span>
              <div className="td-card__titles">
                <h2 className="td-card__title" id="list-title">
                  Tickets ({list.length})
                </h2>
                <p className="td-card__sub">
                  Device, SIM, installation and service issues for every vehicle.
                </p>
              </div>
            </header>
            <div className="td-card__body">
              <div className="tk-bar">
                <div className="td-seg" role="tablist" id="tabs">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={filters.tab === t.id}
                      className={`td-seg__btn${filters.tab === t.id ? ' is-active' : ''}`}
                      data-tab={t.id}
                      onClick={() => setFilter({ tab: t.id })}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="tk-row">
                  <label className="td-gv__search">
                    <TkIcon name="search" />
                    <input
                      type="search"
                      id="q"
                      placeholder="Search ticket, plate, subject…"
                      aria-label="Search tickets"
                      value={filters.q}
                      onChange={(e) => setFilter({ q: e.target.value })}
                    />
                  </label>
                  <select
                    className="tk-sel"
                    id="f-priority"
                    aria-label="Priority"
                    value={filters.priority}
                    onChange={(e) => setFilter({ priority: e.target.value })}
                  >
                    <option value="">All priorities</option>
                    {PRIORITIES.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                  <select
                    className="tk-sel"
                    id="f-category"
                    aria-label="Category"
                    value={filters.category}
                    onChange={(e) => setFilter({ category: e.target.value })}
                  >
                    <option value="">All categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    className="tk-sel"
                    id="f-source"
                    aria-label="Source"
                    value={filters.source}
                    onChange={(e) => setFilter({ source: e.target.value })}
                  >
                    <option value="">All sources</option>
                    <option>Manual</option>
                    <option>Alert</option>
                  </select>
                </div>
              </div>
              <div className="tk-cards" id="rows" aria-label="Tickets">
                {data.loading || data.error ? (
                  <div
                    className="td-empty"
                    {...(data.error ? { role: 'alert', style: { color: 'var(--danger)' } } : {})}
                  >
                    {data.error ? `Tickets could not be loaded: ${data.error}` : 'Loading tickets…'}
                  </div>
                ) : rows.length ? (
                  rows.map((t) => (
                    <TicketCard
                      key={t.id}
                      t={t}
                      files={data.attachments.filter((f) => f.ticket_id === t.id).length}
                      active={selected === t.id}
                      onSelect={() => setSelected(t.id)}
                      onEdit={() => setDialog({ kind: 'form', ticket: t })}
                      onDelete={() => setDialog({ kind: 'delete', ticket: t })}
                    />
                  ))
                ) : (
                  <div className="td-empty">No tickets match these filters.</div>
                )}
              </div>
              <div className="tk-pager td-pager">
                <small id="page-info">
                  {!(data.loading || data.error) && (
                    <>
                      Page <b>{current}</b> of <b>{pages}</b> · {list.length} total
                    </>
                  )}
                </small>
                <div className="tk-row">
                  <select
                    className="tk-sel"
                    id="page-size"
                    aria-label="Rows per page"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option>10</option>
                    <option>20</option>
                    <option>50</option>
                  </select>
                  <div className="td-pager__pages" id="pages">
                    {!(data.loading || data.error) && (
                      <>
                        <button
                          type="button"
                          disabled={current <= 1}
                          aria-label="Previous page"
                          onClick={() => setPage(current - 1)}
                        >
                          <TkIcon name="left" size={14} />
                        </button>
                        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                          <button
                            key={p}
                            type="button"
                            className={p === current ? 'is-active' : undefined}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={current >= pages}
                          aria-label="Next page"
                          onClick={() => setPage(current + 1)}
                        >
                          <TkIcon name="right" size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
          <Detail
            key={selected ?? ''}
            data={data}
            ticket={find(selected)}
            apply={apply}
            toast={toast}
            onEdit={(t) => setDialog({ kind: 'form', ticket: t })}
            onDelete={(t) => setDialog({ kind: 'delete', ticket: t })}
            onResolve={(t) => setDialog({ kind: 'note', ticket: t, note: 'resolve' })}
            onReopen={(t) => setDialog({ kind: 'note', ticket: t, note: 'reopen' })}
          />
        </div>
      </div>
      {view === 'reports' && <ReportsView data={data} toast={toast} />}
      {view === 'settings' && (
        <SettingsView
          data={data}
          editing={editSettings}
          setEditing={setEditSettings}
          apply={apply}
          toast={toast}
        />
      )}

      {dialog?.kind === 'form' && (
        <TicketForm
          key={dialog.ticket?.id ?? dialog.alert?.id ?? 'new'}
          data={data}
          ticket={dialog.ticket}
          alert={dialog.alert}
          apply={apply}
          onClose={closeDialog}
          onCreated={(id) => {
            setSelected(id);
            setFilters((f) => ({ ...f, tab: 'all' }));
            setPage(1);
            setView('tickets');
            closeDialog();
            toast(`${shortId(id)} created`);
          }}
          onSaved={(t) => {
            closeDialog();
            toast(`${shortId(t.id)} saved`);
          }}
        />
      )}
      {dialog?.kind === 'alerts' && (
        <AlertsDialog
          alerts={data.alerts}
          onClose={closeDialog}
          onPick={(a) => setDialog({ kind: 'form', ticket: null, alert: a })}
        />
      )}
      {dialog?.kind === 'note' && (
        <NoteDialog
          ticket={dialog.ticket}
          kind={dialog.note}
          apply={apply}
          onClose={closeDialog}
          onDone={() => {
            closeDialog();
            toast(
              `${shortId(dialog.ticket.id)}${dialog.note === 'resolve' ? ' resolved' : ' reopened'}`,
            );
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteConfirm
          ticket={dialog.ticket}
          apply={apply}
          onClose={closeDialog}
          onDone={() => {
            if (selected === dialog.ticket.id) setSelected(null);
            closeDialog();
            toast(`${shortId(dialog.ticket.id)} deleted`);
          }}
        />
      )}
      {toastMsg && (
        <Portal>
          <div className="td-toast" role={toastMsg.error ? 'alert' : 'status'} key={toastMsg.n}>
            <TkIcon name={toastMsg.error ? 'warn' : 'done'} size={18} />
            <span>{toastMsg.text}</span>
          </div>
        </Portal>
      )}
    </SmartTrackPage>
  );
}

function TicketCard({
  t,
  files,
  active,
  onSelect,
  onEdit,
  onDelete,
}: {
  t: Ticket;
  files: number;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const st = STATUS[t.status ?? 'Open'] ?? STATUS.Open!;
  const pt = PRIORITY[t.priority ?? ''] ?? 'amber';
  return (
    <article
      className={`td-gv-card tk-card tone-${pt}${active ? ' is-active' : ''}`}
      data-id={t.id}
      tabIndex={0}
      aria-label={`${shortId(t.id)} · ${t.subject}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="td-gv-card__head">
        <span className={`td-badge td-badge--solid tone-${st.tone}`}>
          <TkIcon name={st.icon} />
        </span>
        <div className="td-gv-card__who">
          <strong className="tk-id">{shortId(t.id)}</strong>
          <small>{t.category}</small>
        </div>
        <span className={`td-pill td-pill--solid tone-${st.tone}`}>
          <span className="td-dot" />
          {t.status}
        </span>
      </div>
      <p className="tk-card__subj" title={t.subject}>
        {t.subject}
      </p>
      <div className="tk-card__tags">
        <Pill tone={pt} dot>
          {t.priority}
        </Pill>
        {t.source === 'Alert' && <Pill tone="teal">From alert</Pill>}
        {!!t.escalation_level && <Pill tone="red">Escalated L{t.escalation_level}</Pill>}
        {!!t.reopen_count && <Pill tone="orange">Reopened ×{t.reopen_count}</Pill>}
        {files > 0 && <Pill tone="gray">{`${files} file${files > 1 ? 's' : ''}`}</Pill>}
      </div>
      <dl className="td-gv-card__fields">
        <div>
          <dt>
            <TkIcon name="truck" size={12} />
            Plate Number
          </dt>
          <dd>{t.plate}</dd>
        </div>
        <div>
          <dt>
            <TkIcon name="user" size={12} />
            Assigned To
          </dt>
          <dd title={t.assignee ?? ''}>{t.assignee || '—'}</dd>
        </div>
        <div>
          <dt>
            <TkIcon name="clock" size={12} />
            SLA Due
          </dt>
          <dd>
            <span className={`tk-due${t.overdue ? ' is-late' : ''}`}>{left(t)}</span>
          </dd>
        </div>
        <div>
          <dt>
            <TkIcon name="user" size={12} />
            Reported By
          </dt>
          <dd title={t.reporter ?? ''}>{t.reporter || '—'}</dd>
        </div>
      </dl>
      <div className="td-gv-card__foot">
        <small>
          <TkIcon name="clock" size={12} />
          {fmt(t.created_at)}
        </small>
        {(t.can.edit || t.can.delete) && (
          <span className="tk-actions">
            {t.can.edit && (
              <button
                type="button"
                className="td-icon-btn td-icon-btn--sm"
                data-act="edit"
                aria-label={`Edit ${shortId(t.id)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <TkIcon name="edit" size={15} />
              </button>
            )}
            {t.can.delete && (
              <button
                type="button"
                className="td-icon-btn td-icon-btn--sm tone-red"
                data-act="delete"
                aria-label={`Delete ${shortId(t.id)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <TkIcon name="trash" size={15} />
              </button>
            )}
          </span>
        )}
      </div>
    </article>
  );
}
