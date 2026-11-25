// The page's pop-ups, with the original's markup: new/edit ticket form, "From Alert" list,
// resolve/reopen note and delete confirmation. Rendered on the page body inside the style scope.
import { useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePortalRoot } from '../smart-track/kit';
import type { DemoAlert } from '../../tickets';
import { TkIcon } from './icons';
import { AGENTS, CATEGORIES, PRIORITIES, PRIORITY, Pill, fmt, shortId } from './format';
import type { Fields, Ticket, TicketAction, TicketData } from './useTicketData';

type Apply = (action: TicketAction) => Promise<{ id?: string }>;

export function Portal({ children }: { children: ReactNode }) {
  const root = usePortalRoot();
  return root ? createPortal(children, root) : null;
}

/** The page's dialog frame: head with title and close, error banner, Cancel + the given buttons. */
function TkModal({
  title,
  small,
  error,
  foot,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  small?: boolean;
  error: string | null;
  foot?: ReactNode;
  onClose: () => void;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) {
  return (
    <Portal>
      <div
        className={`td-modal tk-modal${small ? ' tk-modal--sm' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="td-modal__scrim" onClick={onClose} />
        <form
          className="td-modal__panel tk-form"
          id="m-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit?.(e);
          }}
        >
          <div className="tk-modal__head">
            <span className="td-badge td-badge--solid tone-brand">
              <TkIcon name="ticket" />
            </span>
            <h2>{title}</h2>
            <button
              type="button"
              className="td-icon-btn td-icon-btn--sm td-modal__close"
              aria-label="Close"
              onClick={onClose}
            >
              <TkIcon name="x" size={15} />
            </button>
          </div>
          <div className="td-modal__body">
            <p className="td-form__banner" id="m-error" hidden={!error}>
              {error}
            </p>
            {children}
          </div>
          <div className="tk-modal__foot">
            <button type="button" className="td-btn td-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            {foot}
          </div>
        </form>
      </div>
    </Portal>
  );
}

/** New ticket (optionally from an alert) or edit. */
export function TicketForm({
  data,
  ticket,
  alert,
  apply,
  onClose,
  onCreated,
  onSaved,
}: {
  data: TicketData;
  ticket: Ticket | null;
  alert?: DemoAlert;
  apply: Apply;
  onClose: () => void;
  onCreated: (id: string) => void;
  onSaved: (t: Ticket) => void;
}) {
  const isNew = !ticket;
  const agent = data.role === 'agent';
  const v = ticket
    ? ticket
    : alert
      ? {
          subject: `${alert.type} · ${alert.plate}`,
          asset_id: alert.asset_id,
          category: alert.category,
          priority: alert.priority,
          assignee: 'Support Desk',
          description: `${alert.description} at ${fmt(alert.at)} (${alert.location}).`,
        }
      : {
          subject: '',
          asset_id: '',
          category: '',
          priority: 'Medium',
          assignee: 'Support Desk',
          description: '',
        };
  const s = data.settings;
  const sla = {
    Critical: s.sla_critical_h,
    High: s.sla_high_h,
    Medium: s.sla_medium_h,
    Low: s.sla_low_h,
  };
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? '');
    const d: Fields = {
      subject: get('subject').trim(),
      asset_id: get('plate'),
      category: get('category') as Fields['category'],
      priority: get('priority') as Fields['priority'],
      assignee: agent ? get('assignee') : ticket ? (ticket.assignee ?? null) : null,
      description: get('description').trim(),
    };
    const missing = [];
    if (!d.subject) missing.push('Subject');
    if (!d.asset_id) missing.push('Plate Number');
    if (!d.category) missing.push('Category');
    if (missing.length) return setError(`Please fill in: ${missing.join(', ')}.`);
    setBusy(true);
    let action: TicketAction;
    if (!ticket) {
      action = {
        kind: 'create',
        fields: d,
        alert: alert ? { type: alert.type, at: alert.at, location: alert.location } : undefined,
      };
    } else {
      const changes = [];
      if (ticket.priority !== d.priority) changes.push(`priority to ${d.priority}`);
      if (ticket.assignee !== d.assignee) changes.push(`assignee to ${d.assignee}`);
      action = {
        kind: 'edit',
        id: ticket.id,
        fields: d,
        note: changes.length ? `Changed ${changes.join(', ')}` : 'Ticket details edited',
      };
    }
    apply(action).then(
      (r) => {
        setBusy(false);
        if (ticket) onSaved(ticket);
        else onCreated(r.id ?? '');
      },
      (msg: string) => {
        setBusy(false);
        setError(msg);
      },
    );
  };

  return (
    <TkModal
      title={
        isNew ? (alert ? 'New Ticket from Alert' : 'New Ticket') : `Edit ${shortId(ticket.id)}`
      }
      error={error}
      onClose={onClose}
      onSubmit={submit}
      foot={
        <button type="submit" className="td-btn td-btn--primary" disabled={busy}>
          {isNew ? (
            <>
              <TkIcon name="plus" size={15} />
              Create Ticket
            </>
          ) : (
            'Save'
          )}
        </button>
      }
    >
      {alert && (
        <div className="tk-box tone-teal" style={{ marginBottom: 12 }}>
          <b>
            <TkIcon name="siren" size={14} />
            {alert.type} alert · {alert.plate}
          </b>
          {fmt(alert.at)} · {alert.location}
        </div>
      )}
      <div className="td-form__section">
        <h3>
          <TkIcon name="ticket" size={18} />
          Ticket Information
        </h3>
        <div className="td-form__grid">
          <label className="td-field is-wide">
            <span>
              Subject <em>*</em>
            </span>
            <input
              name="subject"
              maxLength={120}
              defaultValue={v.subject}
              placeholder="Short summary of the issue"
              autoFocus
            />
          </label>
          <label className="td-field">
            <span>
              Plate Number <em>*</em>
            </span>
            <select name="plate" defaultValue={v.asset_id ?? ''}>
              <option value="">Select vehicle</option>
              {data.vehicles.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.plate}
                </option>
              ))}
            </select>
          </label>
          <label className="td-field">
            <span>
              Category <em>*</em>
            </span>
            <select name="category" defaultValue={v.category ?? ''}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="td-field">
            <span>
              Priority <em>*</em>
            </span>
            <select name="priority" defaultValue={v.priority ?? 'Medium'}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p} (SLA {String(sla[p])} h)
                </option>
              ))}
            </select>
          </label>
          {agent && (
            <label className="td-field">
              <span>Assign To</span>
              <select
                name="assignee"
                defaultValue={AGENTS.includes(v.assignee ?? '') ? (v.assignee ?? '') : AGENTS[0]}
              >
                {AGENTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="td-field is-wide">
            <span>Description</span>
            <textarea
              className="tk-text"
              name="description"
              rows={4}
              placeholder="What happened, when, and what has been tried"
              defaultValue={v.description ?? ''}
            />
          </label>
        </div>
      </div>
    </TkModal>
  );
}

/** Pick one of today's alerts to raise a ticket from. */
export function AlertsDialog({
  alerts,
  onPick,
  onClose,
}: {
  alerts: DemoAlert[];
  onPick: (a: DemoAlert) => void;
  onClose: () => void;
}) {
  return (
    <TkModal title="New Ticket from Alert" error={null} onClose={onClose}>
      <p className="td-card__sub" style={{ margin: '0 0 10px' }}>
        Today's alerts for your vehicles. <span className="td-pill tone-amber">Demo alerts</span>
      </p>
      {alerts.length ? (
        <div className="td-table-wrap">
          <table className="td-table tk-alerts">
            <thead>
              <tr>
                <th>Alert</th>
                <th>Plate Number</th>
                <th>Date &amp; Time</th>
                <th>Location</th>
                <th className="num" />
              </tr>
            </thead>
            <tbody>
              {alerts.map((a, i) => (
                <tr key={a.id}>
                  <td>
                    <Pill tone={PRIORITY[a.priority] ?? 'amber'} dot>
                      {a.type}
                    </Pill>
                  </td>
                  <td>
                    <strong>{a.plate}</strong>
                  </td>
                  <td className="muted">{fmt(a.at)}</td>
                  <td className="muted">{a.location}</td>
                  <td className="num">
                    <button
                      type="button"
                      className="td-btn td-btn--primary"
                      data-alert={i}
                      style={{ minHeight: 30, padding: '0 12px' }}
                      onClick={() => onPick(a)}
                    >
                      Create ticket
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="tk-empty">
          <TkIcon name="inbox" size={28} />
          No alerts for your vehicles today.
        </div>
      )}
    </TkModal>
  );
}

/** Resolve (needs a resolution) or reopen (needs a reason). */
export function NoteDialog({
  ticket,
  kind,
  apply,
  onClose,
  onDone,
}: {
  ticket: Ticket;
  kind: 'resolve' | 'reopen';
  apply: Apply;
  onClose: () => void;
  onDone: () => void;
}) {
  const resolve = kind === 'resolve';
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = () => {
    const text = note.trim();
    if (!text)
      return setError(
        resolve ? 'Write how the issue was resolved.' : 'Write why the ticket is reopened.',
      );
    setBusy(true);
    apply(
      resolve
        ? { kind: 'status', id: ticket.id, status: 'Resolved', resolution: text }
        : { kind: 'reopen', id: ticket.id, reason: text },
    ).then(
      () => {
        setBusy(false);
        onDone();
      },
      (msg: string) => {
        setBusy(false);
        setError(msg);
      },
    );
  };
  return (
    <TkModal
      title={`${resolve ? 'Resolve' : 'Reopen'} ${shortId(ticket.id)}`}
      small
      error={error}
      onClose={onClose}
      onSubmit={submit}
      foot={
        <button type="submit" className="td-btn td-btn--primary" disabled={busy}>
          <TkIcon name={resolve ? 'done' : 'reopen'} size={15} />
          {resolve ? 'Resolve' : 'Reopen'}
        </button>
      }
    >
      <label className="td-field">
        <span>
          {resolve ? 'How was it resolved?' : 'Why is it reopened?'} <em>*</em>
        </span>
        <textarea
          className="tk-text"
          name="note"
          rows={4}
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={resolve ? 'What was done to fix it' : 'What still does not work'}
        />
      </label>
    </TkModal>
  );
}

export function DeleteConfirm({
  ticket,
  apply,
  onClose,
  onDone,
}: {
  ticket: Ticket;
  apply: Apply;
  onClose: () => void;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const remove = () => {
    setBusy(true);
    apply({ kind: 'delete', id: ticket.id }).then(
      () => {
        setBusy(false);
        onDone();
      },
      (msg: string) => {
        setBusy(false);
        setError(msg);
      },
    );
  };
  return (
    <Portal>
      <div className="td-modal" role="alertdialog" aria-modal="true" aria-label="Delete ticket">
        <div className="td-confirm__scrim" onClick={onClose} />
        <div className="td-confirm__box">
          <div className="td-confirm__head">
            <span className="td-confirm__icon">
              <TkIcon name="trash" size={22} />
            </span>
            <h2>Delete ticket?</h2>
          </div>
          <p>
            {shortId(ticket.id)} · {ticket.subject} will be removed with its history and files. This
            cannot be undone.
          </p>
          <p className="td-confirm__error" id="c-error" hidden={!error}>
            {error}
          </p>
          <div className="td-confirm__actions">
            <button type="button" className="td-btn td-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="td-btn td-confirm__danger"
              id="c-yes"
              disabled={busy}
              onClick={remove}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
