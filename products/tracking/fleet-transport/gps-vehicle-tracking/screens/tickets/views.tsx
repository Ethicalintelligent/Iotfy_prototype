// The Reports and Settings views of Ticket Management, with the original's markup.
import { useState, type FormEvent } from 'react';
import type { SettingsLike } from '../../tickets';
import { TkIcon } from './icons';
import { AGENTS, PRIORITY, STATUS, fmt, isActive, shortId } from './format';
import type { TicketAction, TicketData } from './useTicketData';

function Bars({
  title,
  rows,
  toneOf,
}: {
  title: string;
  rows: [string, number][];
  toneOf: (k: string) => string;
}) {
  const max = Math.max(...rows.map((r) => r[1]), 1);
  return (
    <section className="td-card">
      <header className="td-card__head">
        <div className="td-card__titles">
          <h2 className="td-card__title">{title}</h2>
        </div>
      </header>
      <div className="td-card__body">
        <ul className="tk-bars">
          {rows.map(([label, n]) => (
            <li key={label} className={`tone-${toneOf(label)}`}>
              <span>{label}</span>
              <span className="tk-track">
                <i style={{ width: `${Math.round((n / max) * 100)}%` }} />
              </span>
              <b>{n}</b>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function exportCsv(data: TicketData) {
  const cols = [
    'Ticket ID',
    'Subject',
    'Plate Number',
    'Category',
    'Priority',
    'Status',
    'Source',
    'Alert',
    'Assigned To',
    'Reported By',
    'Created',
    'SLA Due',
    'Overdue',
    'Escalation Level',
    'Reopened',
    'Resolved',
    'Resolution',
  ];
  const q = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(',')].concat(
    data.tickets.map((t) =>
      [
        shortId(t.id),
        t.subject,
        t.plate,
        t.category,
        t.priority,
        t.status,
        t.source,
        t.alert_type,
        t.assignee,
        t.reporter,
        fmt(t.created_at),
        isActive(t) ? fmt(t.due_at) : '',
        t.overdue ? 'Yes' : 'No',
        t.escalation_level || 0,
        t.reopen_count || 0,
        t.resolved_at ? fmt(t.resolved_at) : '',
        t.resolution,
      ]
        .map(q)
        .join(','),
    ),
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv' }));
  a.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function ReportsView({ data, toast }: { data: TicketData; toast: (text: string) => void }) {
  const r = data.report;
  const tiles: [string, string | number, string, string, string][] = [
    ['Total Tickets', r.total, 'brand', 'ticket', 'In your view'],
    ['Still Open', r.open, 'blue', 'open', 'Not resolved yet'],
    [
      'SLA Met',
      r.slaMetPct == null ? '—' : `${r.slaMetPct}%`,
      'green',
      'done',
      'Within the deadline',
    ],
    [
      'Avg Resolution',
      r.avgResolutionH == null ? '—' : `${r.avgResolutionH} h`,
      'purple',
      'clock',
      'Created → resolved',
    ],
    ['Escalated', r.escalated, 'red', 'up', 'SLA breached once or more'],
    ['Reopened', r.reopened, 'orange', 'reopen', 'Fix did not hold'],
    ['From Alerts', r.fromAlerts, 'teal', 'siren', 'Raised from an alert'],
  ];
  return (
    <div id="view-reports">
      <section className="td-card" style={{ marginBottom: 10 }}>
        <header className="td-card__head">
          <span className="td-badge td-badge--solid tone-brand">
            <TkIcon name="chart" />
          </span>
          <div className="td-card__titles">
            <h2 className="td-card__title">Ticket Reports</h2>
            <p className="td-card__sub">
              Figures for the tickets you can see, using the current SLA settings.
            </p>
          </div>
          <div className="td-card__right">
            <button
              type="button"
              className="td-btn td-btn--ghost"
              id="btn-export"
              onClick={() => {
                exportCsv(data);
                toast(`Exported ${data.tickets.length} tickets`);
              }}
            >
              <TkIcon name="download" size={15} />
              Export CSV
            </button>
          </div>
        </header>
        <div className="td-card__body">
          <div className="td-tiles tk-tiles">
            {tiles.map(([label, value, tone, icon, cap]) => (
              <div key={label} className={`td-tile tone-${tone}`}>
                <span className="td-badge td-badge--lg td-badge--solid">
                  <TkIcon name={icon} size={18} />
                </span>
                <span className="td-tile__label">{label}</span>
                <span className="td-tile__value">{value}</span>
                <span className="td-tile__caption">{cap}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="tk-report">
        <Bars title="By Status" rows={r.byStatus} toneOf={(s) => STATUS[s]?.tone ?? 'gray'} />
        <Bars title="By Priority" rows={r.byPriority} toneOf={(p) => PRIORITY[p] ?? 'gray'} />
        <Bars title="By Category" rows={r.byCategory} toneOf={() => 'brand'} />
        <Bars title="By Assignee" rows={r.byAssignee} toneOf={() => 'teal'} />
      </div>
    </div>
  );
}

const SLA_FIELDS: [keyof SettingsLike, string][] = [
  ['sla_critical_h', 'Critical'],
  ['sla_high_h', 'High'],
  ['sla_medium_h', 'Medium'],
  ['sla_low_h', 'Low'],
];

/** Support team only; read-only until Edit, Save writes, Cancel reverts. */
export function SettingsView({
  data,
  editing,
  setEditing,
  apply,
  toast,
}: {
  data: TicketData;
  editing: boolean;
  setEditing: (on: boolean) => void;
  apply: (a: TicketAction) => Promise<{ id?: string }>;
  toast: (text: string) => void;
}) {
  const s = data.settings;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ro = !editing;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => Number(f.get(k));
    const next = {
      sla_critical_h: num('sla_critical_h'),
      sla_high_h: num('sla_high_h'),
      sla_medium_h: num('sla_medium_h'),
      sla_low_h: num('sla_low_h'),
      escalation_enabled: f.get('escalation_enabled') === 'on',
      escalate_to: String(f.get('escalate_to') ?? ''),
      auto_close_days: num('auto_close_days'),
    };
    if (SLA_FIELDS.some(([k]) => !((next[k as keyof typeof next] as number) > 0)))
      return setError('SLA hours must be more than 0.');
    setBusy(true);
    apply({ kind: 'settings', settings: next }).then(
      () => {
        setBusy(false);
        setError(null);
        setEditing(false);
        toast('Ticket settings saved');
      },
      (msg: string) => {
        setBusy(false);
        setError(msg);
      },
    );
  };

  return (
    <div id="view-settings">
      {/* key: Edit and Cancel show the saved values again, as the original re-renders the form. */}
      <form
        className="td-card tk-form"
        id="settings-form"
        noValidate
        onSubmit={submit}
        key={editing ? 'edit' : `view-${JSON.stringify(s)}`}
      >
        <header className="td-card__head">
          <span className="td-badge td-badge--solid tone-brand">
            <TkIcon name="sliders" />
          </span>
          <div className="td-card__titles">
            <h2 className="td-card__title">Ticket Settings</h2>
            <p className="td-card__sub">
              Response deadlines (SLA), automatic escalation and auto-close for your company.
            </p>
          </div>
          <div className="td-card__right">
            {editing ? (
              <>
                <button
                  type="button"
                  className="td-btn td-btn--ghost"
                  id="s-cancel"
                  onClick={() => {
                    setError(null);
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="td-btn td-btn--primary" disabled={busy}>
                  Save
                </button>
              </>
            ) : (
              <button
                type="button"
                className="td-btn td-btn--primary"
                id="s-edit"
                onClick={() => setEditing(true)}
              >
                <TkIcon name="edit" size={15} />
                Edit
              </button>
            )}
          </div>
        </header>
        <div className="td-card__body">
          <p className="td-form__banner" id="s-error" hidden={!error}>
            {error}
          </p>
          <div className="td-form__section">
            <h3>
              <TkIcon name="clock" size={18} />
              SLA: hours to resolve, per priority
            </h3>
            <div className="td-form__grid">
              {SLA_FIELDS.map(([name, label]) => (
                <label key={name} className="td-field">
                  <span>
                    {label} <em>*</em>
                  </span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    name={name}
                    defaultValue={String(s[name] ?? '')}
                    disabled={ro}
                    aria-label={`${label} in hours`}
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="td-form__section">
            <h3>
              <TkIcon name="up" size={18} />
              Escalation and auto-close
            </h3>
            <div className="td-form__grid">
              <label className="tk-check is-wide">
                <input
                  type="checkbox"
                  name="escalation_enabled"
                  defaultChecked={!!s.escalation_enabled}
                  disabled={ro}
                />{' '}
                Escalate overdue tickets automatically (one priority up, up to 3 times)
              </label>
              <label className="td-field">
                <span>Escalate to</span>
                <select
                  name="escalate_to"
                  defaultValue={AGENTS.includes(s.escalate_to) ? s.escalate_to : AGENTS[0]}
                  disabled={ro}
                >
                  {AGENTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label className="td-field">
                <span>Close resolved tickets after (days, 0 = never)</span>
                <input
                  type="number"
                  min={0}
                  max={90}
                  step={1}
                  name="auto_close_days"
                  defaultValue={String(s.auto_close_days ?? '')}
                  disabled={ro}
                />
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
