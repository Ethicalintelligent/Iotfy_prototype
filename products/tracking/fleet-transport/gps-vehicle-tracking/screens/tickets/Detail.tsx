// The ticket detail panel (right column), with the original's markup and actions.
import { useState, type ChangeEvent } from 'react';
import { TkIcon } from './icons';
import {
  AGENTS,
  PRIORITY,
  Pill,
  ROLE_TEXT,
  STATUS,
  STATUSES,
  eventLook,
  fmt,
  isActive,
  left,
  ms,
  shortId,
  size,
} from './format';
import type { Ticket, TicketAction, TicketData } from './useTicketData';

const MAX_FILE = 1048576;

export function Detail({
  data,
  ticket: t,
  apply,
  toast,
  onEdit,
  onDelete,
  onResolve,
  onReopen,
}: {
  data: TicketData;
  ticket: Ticket | undefined;
  apply: (a: TicketAction) => Promise<{ id?: string }>;
  toast: (text: string, isError?: boolean) => void;
  onEdit: (t: Ticket) => void;
  onDelete: (t: Ticket) => void;
  onResolve: (t: Ticket) => void;
  onReopen: (t: Ticket) => void;
}) {
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  if (!t)
    return (
      <section className="td-card tk-detail" id="detail" aria-live="polite">
        <header className="td-card__head">
          <span className="td-badge td-badge--solid tone-brand">
            <TkIcon name="ticket" />
          </span>
          <div className="td-card__titles">
            <h2 className="td-card__title">Ticket Details</h2>
            <p className="td-card__sub">Select a ticket to see its details</p>
          </div>
        </header>
        <div className="td-card__body">
          <div className="tk-empty">
            <TkIcon name="inbox" size={32} />
            No ticket selected
          </div>
        </div>
      </section>
    );

  const st = STATUS[t.status ?? 'Open'] ?? STATUS.Open!;
  const pt = PRIORITY[t.priority ?? ''] ?? 'amber';
  const files = data.attachments.filter((f) => f.ticket_id === t.id);
  const events = data.events
    .filter((e) => e.ticket_id === t.id)
    .sort((a, b) => ms(b.created_at) - ms(a.created_at));
  const run = (action: TicketAction, done: string) =>
    apply(action).then(
      () => toast(done),
      (msg: string) => toast(msg, true),
    );

  const setStatus = (s: (typeof STATUSES)[number]) => {
    if (s === t.status) return;
    if (s === 'Resolved') return onResolve(t);
    void run({ kind: 'status', id: t.id, status: s }, `${shortId(t.id)} is now ${s}`);
  };
  const assign = (e: ChangeEvent<HTMLSelectElement>) => {
    const who = e.target.value;
    if (t.assignee !== who)
      void run({ kind: 'assign', id: t.id, assignee: who }, `${shortId(t.id)} assigned to ${who}`);
  };
  const attach = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX_FILE) return toast(`${f.name} is larger than 1 MB`, true);
    const rd = new FileReader();
    rd.onload = () =>
      void run(
        {
          kind: 'attach',
          id: t.id,
          file: { name: f.name, type: f.type, size: f.size, dataUrl: String(rd.result) },
        },
        `${f.name} attached`,
      );
    rd.onerror = () => toast(`${f.name} could not be read`, true);
    rd.readAsDataURL(f);
  };
  const send = () => {
    const text = comment.trim();
    if (!text) {
      document.getElementById('d-comment')?.focus();
      return toast('Write a comment first', true);
    }
    setSending(true);
    apply({ kind: 'comment', id: t.id, text }).then(
      () => {
        setSending(false);
        setComment('');
        toast('Comment added');
      },
      (msg: string) => {
        setSending(false);
        toast(msg, true);
      },
    );
  };

  return (
    <section className="td-card tk-detail" id="detail" aria-live="polite">
      <header className="td-card__head">
        <span className={`td-badge td-badge--solid tone-${st.tone}`}>
          <TkIcon name={st.icon} />
        </span>
        <div className="td-card__titles">
          <h2 className="td-card__title">{shortId(t.id)}</h2>
          <p className="td-card__sub">{t.subject}</p>
        </div>
        {(t.can.edit || t.can.delete) && (
          <div className="td-card__right">
            {t.can.edit && (
              <button
                type="button"
                className="td-icon-btn td-icon-btn--sm"
                data-act="edit"
                aria-label="Edit ticket"
                onClick={() => onEdit(t)}
              >
                <TkIcon name="edit" size={15} />
              </button>
            )}
            {t.can.delete && (
              <button
                type="button"
                className="td-icon-btn td-icon-btn--sm tone-red"
                data-act="delete"
                aria-label="Delete ticket"
                onClick={() => onDelete(t)}
              >
                <TkIcon name="trash" size={15} />
              </button>
            )}
          </div>
        )}
      </header>
      <div className="td-card__body">
        <div className="tk-row">
          <Pill tone={pt} dot>
            {t.priority} priority
          </Pill>
          <Pill tone={st.tone}>{t.status}</Pill>
          {t.overdue ? (
            <Pill tone="red">{left(t)}</Pill>
          ) : isActive(t) ? (
            <Pill tone="gray">SLA {left(t)}</Pill>
          ) : null}
          {!!t.escalation_level && <Pill tone="red">Escalated L{t.escalation_level}</Pill>}
          {!!t.reopen_count && <Pill tone="orange">Reopened ×{t.reopen_count}</Pill>}
        </div>
        {t.source === 'Alert' && (
          <div className="tk-box tone-teal">
            <b>
              <TkIcon name="siren" size={14} />
              Raised from a {t.alert_type} alert
            </b>
            {fmt(t.alert_at)} · {t.alert_location || ''}
          </div>
        )}
        <dl className="tk-info">
          <div>
            <dt>Plate Number</dt>
            <dd>{t.plate}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{t.category}</dd>
          </div>
          <div>
            <dt>Reported By</dt>
            <dd>{t.reporter || '—'}</dd>
          </div>
          <div>
            <dt>Assigned To</dt>
            <dd>{t.assignee || '—'}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{fmt(t.created_at)}</dd>
          </div>
          <div>
            <dt>SLA Due</dt>
            <dd>{isActive(t) ? fmt(t.due_at) : '—'}</dd>
          </div>
        </dl>
        <p className="tk-desc">{t.description || 'No description.'}</p>
        {t.resolution && !isActive(t) && (
          <div className="tk-box tone-green">
            <b>
              <TkIcon name="done" size={14} />
              Resolution · {fmt(t.resolved_at)}
            </b>
            {t.resolution}
          </div>
        )}
        {(t.next.length > 0 || t.can.reopen) && (
          <div>
            <div className="td-subhead" style={{ marginBottom: 6 }}>
              Status
            </div>
            <div className="tk-row">
              <div className="td-seg td-seg--sm" id="d-status">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`td-seg__btn${s === t.status ? ' is-active' : ''}`}
                    data-status={s}
                    disabled={!t.next.includes(s)}
                    onClick={() => setStatus(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {t.can.reopen && (
                <button
                  type="button"
                  className="td-btn td-btn--ghost"
                  id="d-reopen"
                  onClick={() => onReopen(t)}
                >
                  <TkIcon name="reopen" size={15} />
                  Reopen
                </button>
              )}
            </div>
          </div>
        )}
        <div>
          <div className="td-subhead" style={{ marginBottom: 6 }}>
            Assign To
          </div>
          {t.can.assign ? (
            <div className="tk-row">
              {/* Uncontrolled like the original: shows the choice until the saved data comes back. */}
              <select
                key={`${t.id}:${t.assignee ?? ''}`}
                className="tk-sel"
                id="d-assignee"
                aria-label="Assign to"
                defaultValue={t.assignee || '—'}
                onChange={assign}
              >
                {!AGENTS.includes(t.assignee ?? '') && <option>{t.assignee || '—'}</option>}
                {AGENTS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
          ) : (
            <p className="td-card__sub" style={{ margin: 0 }}>
              {t.assignee || '—'} · the support team assigns tickets.
            </p>
          )}
        </div>
        <div>
          <div className="td-subhead" style={{ marginBottom: 6 }}>
            Attachments ({files.length})
          </div>
          {files.length ? (
            <ul className="tk-files">
              {files.map((f) => (
                <li key={f.id}>
                  <TkIcon name="clip" size={14} />
                  <a href={f.data_url} download={f.file_name}>
                    {f.file_name}
                  </a>
                  <small>
                    {size(f.size_bytes)} · {f.uploaded_by}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="td-card__sub" style={{ margin: 0 }}>
              No files yet.
            </p>
          )}
          {t.can.attach && (
            <label className="td-btn td-btn--ghost" style={{ marginTop: 8, cursor: 'pointer' }}>
              <TkIcon name="clip" size={15} />
              Attach file (max 1 MB)
              <input type="file" id="d-file" hidden onChange={attach} />
            </label>
          )}
        </div>
        <div>
          <div className="td-subhead" style={{ marginBottom: 8 }}>
            Activity
          </div>
          <ul className="tk-feed">
            {events.map((a) => {
              const [icon, tone] = eventLook(a);
              return (
                <li key={a.id}>
                  <span className={`td-badge td-badge--solid tone-${tone}`}>
                    <TkIcon name={icon} size={12} />
                  </span>
                  <div>
                    <strong>{a.author}</strong>
                    <small>{fmt(a.created_at)}</small>
                    <p>{a.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        {t.can.comment ? (
          <div className="tk-form">
            <textarea
              className="tk-text"
              id="d-comment"
              placeholder="Write a comment or update…"
              aria-label="Comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="tk-row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                className="td-btn td-btn--primary"
                id="d-send"
                disabled={sending}
                onClick={send}
              >
                <TkIcon name="send" size={15} />
                Add Comment
              </button>
            </div>
          </div>
        ) : (
          <p className="td-card__sub">{ROLE_TEXT[data.role] ?? ''}</p>
        )}
      </div>
    </section>
  );
}
