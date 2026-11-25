// IT-0036. The Add / Edit Alert form's people and escalation, as in the original (`uQ` initial
// recipients, `h7` directory picker, `A7` new external contact, `mQ` escalation view with its
// `dQ` levels, conditions, checks and "What happens", `iQ` checks, `QK` default levels).
import { useState, type ReactNode } from 'react';
import { Icon } from '../../smart-track/kit';
import { Check, Select } from '../ui';

export const CHANNELS = ['PUSH', 'EMAIL', 'SMS'] as const;
export type Channel = (typeof CHANNELS)[number];
export const CHANNEL_LABEL: Record<string, string> = { PUSH: 'Push', EMAIL: 'Email', SMS: 'SMS' };
const MAX_LEVELS = 5;
const MAX_CONDITIONS = 3;
export const OCCURRENCE_HOURS = 24;

export interface Contact {
  name: string;
  email?: string | null;
  mobile?: string | null;
  organisation?: string | null;
}
export interface Person {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  active: boolean;
}
export interface Recipient {
  userId?: string | null;
  contact?: Contact | null;
  channels?: string[];
}
export interface Condition {
  type: string;
  value: number | null;
}
export interface Level {
  enabled: boolean;
  conditions: Condition[];
  recipients: Recipient[];
  channels: string[];
}
export interface Escalation {
  enabled: boolean;
  occurrenceHours: number;
  levels: Level[];
}
export const NO_ESCALATION: Escalation = {
  enabled: false,
  occurrenceHours: OCCURRENCE_HOURS,
  levels: [],
};
export interface People {
  users: Person[];
  contacts: Contact[];
  loading: boolean;
}
/** What the escalation checks need to know about the alert (original `F`). */
export interface AlertCtx {
  code: string;
  base: number | null;
  unit: string;
  users: Person[];
}

/* ------------------------------------------------------------------ rules */

const THRESHOLDS: Record<string, { key: string; label: string; up: boolean }> = {
  OVERSPEED: { key: 'speedLimit', label: 'Speed', up: true },
  LOW_BATTERY: { key: 'battLevel', label: 'Battery level', up: false },
  FUEL_MAX: { key: 'fuelMax', label: 'Fuel level', up: true },
  FUEL_MIN: { key: 'fuelMin', label: 'Fuel level', up: false },
};
export const thresholdOf = (code: string) => THRESHOLDS[code];
const ALL = ['ACTIVE_FOR', 'OCCURS', 'NOT_ACKNOWLEDGED', 'UNRESOLVED', 'IMMEDIATELY'];
const EVENTS = ['OCCURS', 'NOT_ACKNOWLEDGED', 'UNRESOLVED', 'IMMEDIATELY'];
const DATED = ['NOT_ACKNOWLEDGED', 'UNRESOLVED', 'IMMEDIATELY'];
const EVENT_CODES = new Set([
  'SOS',
  'PANIC',
  'HARSH_BRAKING',
  'HARSH_ACCELERATION',
  'FUEL_FILL',
  'FUEL_THEFT',
]);
const DATE_CODES = new Set(['MAINTENANCE_DUE', 'SCHEDULED_MAINTENANCE']);
/** The condition types a level of this alert can use (original `vv`). */
export function conditionTypes(code: string) {
  const l = DATE_CODES.has(code) ? DATED : EVENT_CODES.has(code) ? EVENTS : ALL;
  return THRESHOLDS[code] ? ['THRESHOLD', ...l] : l;
}
function conditionLabel(type: string, t?: { label: string; up: boolean }) {
  switch (type) {
    case 'THRESHOLD':
      return `${t?.label ?? 'Threshold'} ${t?.up === false ? 'falls to' : 'reaches'}`;
    case 'ACTIVE_FOR':
      return 'Active for';
    case 'OCCURS':
      return 'Occurs';
    case 'NOT_ACKNOWLEDGED':
      return 'Not acknowledged for';
    case 'UNRESOLVED':
      return 'Unresolved for';
    default:
      return 'Immediately';
  }
}
const DEFAULT_VALUE: Record<string, number | null> = {
  ACTIVE_FOR: 20,
  OCCURS: 3,
  NOT_ACKNOWLEDGED: 15,
  UNRESOLVED: 60,
  IMMEDIATELY: null,
};
const stepThreshold = (c: AlertCtx) => {
  const b = c.base ?? 0;
  return THRESHOLDS[c.code]?.up === false ? Math.max(0, b - 10) : b + 20;
};
const newCondition = (type: string, c: AlertCtx): Condition => ({
  type,
  value: type === 'THRESHOLD' ? stepThreshold(c) : DEFAULT_VALUE[type]!,
});
function extraCondition(c: AlertCtx) {
  const t = conditionTypes(c.code);
  return newCondition(t.includes('NOT_ACKNOWLEDGED') ? 'NOT_ACKNOWLEDGED' : t[0]!, c);
}
function nextLevel(levels: Level[], c: AlertCtx): Level {
  const t = conditionTypes(c.code);
  const type = t.includes('UNRESOLVED') ? 'UNRESOLVED' : t[0]!;
  const last = levels[levels.length - 1];
  const top = Math.max(
    0,
    ...(last?.conditions.filter((x) => x.type === type).map((x) => x.value ?? 0) ?? []),
  );
  const value = type === 'THRESHOLD' ? stepThreshold(c) : top ? top * 2 : DEFAULT_VALUE[type]!;
  return {
    enabled: true,
    conditions: [{ type, value }],
    recipients: [],
    channels: ['PUSH', 'EMAIL'],
  };
}
/** The levels "Turn on escalation" starts with (original `QK`). */
export function defaultLevels(severity: string, c: AlertCtx): Level[] {
  const t = conditionTypes(c.code);
  const has = (x: string) => t.includes(x);
  const th = THRESHOLDS[c.code];
  const b = c.base;
  const step = (m: number): Condition | null =>
    th && b != null && b > 0
      ? {
          type: 'THRESHOLD',
          value: th.up
            ? b + m * Math.max(1, Math.round(b / 3))
            : Math.max(0, Math.round(b * (1 - [0, 0.33, 0.66, 0.85][m]!))),
        }
      : null;
  const level = (conds: (Condition | null)[], channels: string[]): Level => ({
    enabled: true,
    conditions: conds.filter((x): x is Condition => x != null),
    recipients: [],
    channels,
  });
  const active = (m: number): Condition | null =>
    has('ACTIVE_FOR') ? { type: 'ACTIVE_FOR', value: m } : null;
  if (severity === 'CRITICAL')
    return [
      level([{ type: 'IMMEDIATELY', value: null }], [...CHANNELS]),
      level([{ type: 'NOT_ACKNOWLEDGED', value: 10 }], [...CHANNELS]),
    ];
  return [
    level(
      [
        step(1) ?? { type: has('NOT_ACKNOWLEDGED') ? 'NOT_ACKNOWLEDGED' : t[0]!, value: 15 },
        active(20),
      ],
      ['PUSH', 'EMAIL'],
    ),
    level([step(2) ?? { type: 'UNRESOLVED', value: 60 }, active(40)], ['EMAIL', 'SMS']),
    level([step(3) ?? { type: 'UNRESOLVED', value: 120 }, active(60)], [...CHANNELS]),
  ];
}
/** A condition in words (original `nw`). */
export function describe(x: Condition, c: AlertCtx, hours = OCCURRENCE_HOURS) {
  const th = THRESHOLDS[c.code];
  switch (x.type) {
    case 'THRESHOLD':
      return `${th?.up === false ? '≤' : '≥'} ${x.value ?? '—'}${c.unit ? ` ${c.unit}` : ''}`;
    case 'ACTIVE_FOR':
      return `active ${x.value ?? '—'} min`;
    case 'OCCURS':
      return `${x.value ?? '—'}× in ${hours} h`;
    case 'NOT_ACKNOWLEDGED':
      return `not acknowledged ${x.value ?? '—'} min`;
    case 'UNRESOLVED':
      return `unresolved ${x.value ?? '—'} min`;
    default:
      return 'immediately';
  }
}
const low = (s?: string | null) => (s ?? '').trim().toLowerCase();
/** A recipient's identity (original `rs`). */
export const keyOf = (r: Recipient) =>
  r.userId
    ? `u:${r.userId}`
    : `c:${low(r.contact?.name)}|${low(r.contact?.email)}|${low(r.contact?.mobile)}`;
const userOf = (r: Recipient, users: Person[]) =>
  r.userId ? users.find((u) => u.id === r.userId) : undefined;
export const nameOf = (r: Recipient, users: Person[]) =>
  r.contact ? r.contact.name : (userOf(r, users)?.name ?? 'Unknown user');
function reachable(r: Recipient, users: Person[]): Record<string, boolean> {
  if (r.contact) return { PUSH: false, EMAIL: !!r.contact.email, SMS: !!r.contact.mobile };
  const u = userOf(r, users);
  return { PUSH: u ? u.active : true, EMAIL: !!u?.email, SMS: !!u?.mobile };
}
const firstChannels = (r: Recipient, modes: string[], users: Person[]) => {
  const ok = reachable(r, users);
  return CHANNELS.filter((c) => modes.includes(c) && ok[c] && (r.contact || c !== 'SMS'));
};
/** Problems of the initial recipients (original `$K`). */
export function recipientProblems(list: Recipient[], modes: string[], users: Person[]) {
  const out: string[] = [];
  for (const r of list) {
    const n = nameOf(r, users);
    if (userOf(r, users)?.active === false) out.push(`${n} is inactive; remove them.`);
    if (!(r.channels ?? []).some((c) => modes.includes(c))) out.push(`Choose a channel for ${n}.`);
  }
  return out;
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE = /^\+?[0-9 ()-]{6,20}$/;
function contactProblem(c: Contact) {
  if (!c.name.trim()) return 'Enter a name.';
  if (c.name.trim().length > 100) return 'The name is at most 100 characters.';
  if (!c.email?.trim() && !c.mobile?.trim()) return 'Give an e-mail address or a mobile number.';
  if (c.email?.trim() && (!EMAIL.test(c.email.trim()) || c.email.trim().length > 150))
    return 'Enter a valid e-mail address.';
  if (c.mobile?.trim() && !MOBILE.test(c.mobile.trim()))
    return 'Enter the mobile number with its country code, e.g. +91 98400 12345.';
  return null;
}
export type CheckItem = { state: 'ok' | 'bad' | 'warn'; text: string };
const mark = (text: string, n: number): CheckItem => ({
  state: n ? 'bad' : 'ok',
  text: n ? `${text} (${n})` : text,
});
export interface EscalationCheck {
  levels: { conditions: string[]; messages: string[] }[];
  checks: CheckItem[];
  problems: number;
  warnings: string[];
}
const ORDERED = ['THRESHOLD', 'ACTIVE_FOR', 'OCCURS', 'NOT_ACKNOWLEDGED', 'UNRESOLVED'];
/** The escalation checks (original `iQ`). */
export function checkEscalation(e: Escalation, first: Recipient[], c: AlertCtx): EscalationCheck {
  const th = THRESHOLDS[c.code];
  const n = { value: 0, order: 0, dup: 0, level: 0 };
  const seen = new Map(first.map((r) => [keyOf(r), 'the first alert']));
  const warnings: string[] = [];
  const prev: Record<string, { n: number; v: number }> = {};
  const levels = e.levels.map((l, li) => {
    const res = { conditions: l.conditions.map(() => ''), messages: [] as string[] };
    if (!l.enabled) return res;
    const keys = new Set<string>();
    l.conditions.forEach((x, i) => {
      const v = x.value ?? Number.NaN;
      let m = '';
      if (x.type === 'THRESHOLD') {
        if (c.base == null)
          m = `Enter the ${(th?.label ?? 'threshold').toLowerCase()} in Settings first.`;
        else if (th?.up === false ? !(v < c.base) : !(v > c.base))
          m = `Must be ${th?.up === false ? 'below' : 'above'} ${c.base}${c.unit ? ` ${c.unit}` : ''}, the level at which this alert already fires.`;
      } else if (x.type === 'OCCURS') {
        if (!(v >= 2) || v % 1)
          m = 'Whole number of 2 or more (the first occurrence is the alert itself).';
      } else if (x.type !== 'IMMEDIATELY' && !(v >= 1)) m = 'Enter at least 1 minute.';
      if (m) n.value++;
      const k = `${x.type}:${x.type === 'IMMEDIATELY' ? '' : v}`;
      if (!m && keys.has(k)) {
        m = 'Duplicate condition in this level.';
        n.dup++;
      }
      keys.add(k);
      res.conditions[i] = m;
    });
    for (const type of ORDERED) {
      const at = l.conditions.map((x, i) => (x.type === type ? i : -1)).filter((i) => i >= 0);
      if (!at.length) continue;
      const down = type === 'THRESHOLD' && th?.up === false;
      const vals = at.map((i) => l.conditions[i]!.value ?? 0);
      const v = down ? Math.max(...vals) : Math.min(...vals);
      const p = prev[type];
      if (p && (down ? v >= p.v : v <= p.v)) {
        const i = at[vals.indexOf(v)]!;
        if (!res.conditions[i]) {
          res.conditions[i] = `Must be ${down ? 'lower' : 'higher'} than Level ${p.n} (${p.v}).`;
          n.order++;
        }
      }
      prev[type] = { n: li + 1, v };
    }
    if (!l.conditions.length) {
      res.messages.push('Add at least one condition.');
      n.level++;
    }
    if (!l.recipients.length) {
      res.messages.push('Add at least one recipient.');
      n.level++;
    }
    if (!l.channels.length) {
      res.messages.push('Choose at least one channel.');
      n.level++;
    }
    for (const r of l.recipients) {
      const nm = nameOf(r, c.users);
      if (userOf(r, c.users)?.active === false) {
        res.messages.push(`${nm} is inactive; remove them.`);
        n.level++;
      }
      const at = seen.get(keyOf(r));
      if (at) warnings.push(`${nm} is notified at ${at} and at Level ${li + 1}.`);
      else seen.set(keyOf(r), `Level ${li + 1}`);
    }
    return res;
  });
  const noneOn = e.enabled && !e.levels.some((l) => l.enabled) ? 1 : 0;
  const checks: CheckItem[] = [
    mark('Thresholds and values are valid', n.value),
    mark('Each condition gets stricter with each level', n.order),
    mark('No duplicate conditions', n.dup),
    mark('Every level has a condition, recipients and a channel', n.level),
    ...(noneOn
      ? [{ state: 'bad' as const, text: 'Turn on at least one level, or switch escalation off' }]
      : []),
    warnings.length
      ? {
          state: 'warn',
          text: `${warnings.length} person${warnings.length === 1 ? '' : 's'} notified more than once`,
        }
      : { state: 'ok', text: 'No level notifies the same person twice' },
  ];
  return {
    levels,
    checks,
    problems: e.enabled ? n.value + n.order + n.dup + n.level + noneOn : 0,
    warnings,
  };
}

/* ------------------------------------------------------------------ pieces */

function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`ui-switch ${on ? 'is-on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="ui-switch__track">
        <span className="ui-switch__knob" />
      </span>
      <span>{on ? 'On' : 'Off'}</span>
    </button>
  );
}

export function Checks({ checks }: { checks: CheckItem[] }) {
  return (
    <ul className="vm-acx__checks">
      {checks.map((c) => (
        <li key={c.text} className={`is-${c.state}`}>
          <Icon
            name={
              c.state === 'ok' ? 'CircleCheck' : c.state === 'warn' ? 'TriangleAlert' : 'CircleX'
            }
            size={13}
          />
          {c.text}
        </li>
      ))}
    </ul>
  );
}

const contactKey = (c: Contact) => keyOf({ contact: c });
/** "Add from directory…" (original `h7`). */
function PeoplePicker({
  people,
  used,
  label,
  onPick,
}: {
  people: People;
  used: Recipient[];
  label: string;
  onPick: (r: Recipient) => void;
}) {
  const taken = new Set(used.map(keyOf));
  const options = [
    ...people.users
      .filter((u) => u.active && !taken.has(`u:${u.id}`))
      .map((u) => ({ value: `u:${u.id}`, label: `${u.name} · user` })),
    ...people.contacts
      .filter((c) => !taken.has(contactKey(c)))
      .map((c) => ({ value: contactKey(c), label: `${c.name} · ${c.organisation || 'external'}` })),
  ];
  return (
    <Select
      value=""
      placeholder={
        people.loading ? 'Loading people…' : options.length ? label : 'Nobody else to add'
      }
      aria-label={label}
      disabled={!options.length}
      options={options}
      onChange={(v) => {
        if (v.startsWith('u:')) onPick({ userId: v.slice(2) });
        else {
          const c = people.contacts.find((x) => contactKey(x) === v);
          if (c) onPick({ contact: c });
        }
      }}
    />
  );
}

const BLANK_CONTACT: Contact = { name: '', email: '', mobile: '', organisation: '' };
/** "+ New external contact" (original `A7`). */
function ContactForm({ onAdd, onCancel }: { onAdd: (c: Contact) => void; onCancel: () => void }) {
  const [c, setC] = useState<Contact>(BLANK_CONTACT);
  const [err, setErr] = useState<string | null>(null);
  const field = (k: keyof Contact) => (e: { target: { value: string } }) =>
    setC((x) => ({ ...x, [k]: e.target.value }));
  return (
    <div className="vm-acx__contact" role="group" aria-label="New external contact">
      <input value={c.name} onChange={field('name')} placeholder="Name *" aria-label="Name" />
      <input
        value={c.email ?? ''}
        onChange={field('email')}
        placeholder="Email"
        aria-label="Email"
        inputMode="email"
      />
      <input
        value={c.mobile ?? ''}
        onChange={field('mobile')}
        placeholder="Mobile with country code, +91…"
        aria-label="Mobile"
        inputMode="tel"
      />
      <input
        value={c.organisation ?? ''}
        onChange={field('organisation')}
        placeholder="Organisation"
        aria-label="Organisation"
      />
      <div className="vm-acx__contact-foot">
        <small className={err ? 'is-bad' : ''}>
          {err ?? 'External contacts get e-mail or SMS only.'}
        </small>
        <button type="button" className="td-btn td-btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="td-btn td-btn--primary"
          onClick={() => {
            const p = contactProblem(c);
            setErr(p);
            if (!p) onAdd(c);
          }}
        >
          Add contact
        </button>
      </div>
    </div>
  );
}

function Who({ r, users }: { r: Recipient; users: Person[] }) {
  const u = userOf(r, users);
  const email = r.contact ? r.contact.email : u?.email;
  const mobile = r.contact ? r.contact.mobile : u?.mobile;
  return (
    <div className="vm-acx__who">
      <b>{nameOf(r, users)}</b>
      <span className="vm-acx__tag">{r.contact ? 'external' : 'user'}</span>
      {u && !u.active && <span className="vm-acx__tag is-bad">inactive</span>}
      <small>
        {[r.contact?.organisation, email || 'no email', mobile || 'no mobile']
          .filter(Boolean)
          .join(' · ')}
      </small>
    </div>
  );
}

/** "Initial notification recipients" under the notification modes (original `uQ`). */
export function InitialRecipients({
  people,
  recipients,
  modes,
  errors,
  onChange,
  onAddContact,
}: {
  people: People;
  recipients: Recipient[];
  modes: string[];
  errors: string[];
  onChange: (r: Recipient[]) => void;
  onAddContact: (c: Contact) => void;
}) {
  const [adding, setAdding] = useState(false);
  const shown = CHANNELS.filter((c) => modes.includes(c));
  const add = (r: Recipient) =>
    onChange([...recipients, { ...r, channels: firstChannels(r, modes, people.users) }]);
  return (
    <section className="vm-acx__people" aria-label="Initial notification recipients">
      <h4>
        <Icon name="Users" size={15} />
        Initial notification recipients ({recipients.length})
        <small>
          Who else gets the first alert, and by which channel. You get it by the modes above.
        </small>
      </h4>
      {recipients.map((r, i) => {
        const ok = reachable(r, people.users);
        return (
          <div key={keyOf(r)} className="vm-acx__person">
            <Who r={r} users={people.users} />
            <div className="vm-acx__modes">
              {shown.map((c) => (
                <Check
                  key={c}
                  checked={(r.channels ?? []).includes(c)}
                  disabled={!ok[c]}
                  onChange={(on) =>
                    onChange(
                      recipients.map((x, j) =>
                        j !== i
                          ? x
                          : {
                              ...x,
                              channels: on
                                ? [...(x.channels ?? []), c]
                                : (x.channels ?? []).filter((y) => y !== c),
                            },
                      ),
                    )
                  }
                >
                  {CHANNEL_LABEL[c]}
                </Check>
              ))}
            </div>
            <button
              type="button"
              className="vm-acx__x"
              aria-label={`Remove ${nameOf(r, people.users)}`}
              onClick={() => onChange(recipients.filter((_, j) => j !== i))}
            >
              <Icon name="X" size={13} />
            </button>
          </div>
        );
      })}
      {errors.map((e) => (
        <em key={e} className="vm-acx__err">
          {e}
        </em>
      ))}
      <div className="vm-acx__add">
        <PeoplePicker people={people} used={recipients} label="Add from directory…" onPick={add} />
        <button type="button" className="td-link" onClick={() => setAdding(true)}>
          + New external contact
        </button>
      </div>
      {adding && (
        <ContactForm
          onCancel={() => setAdding(false)}
          onAdd={(c) => {
            onAddContact(c);
            add({ contact: c });
            setAdding(false);
          }}
        />
      )}
    </section>
  );
}

function valueHint(type: string, v: number | null, c: AlertCtx, hours: number) {
  if (v == null) return '';
  if (type === 'THRESHOLD' && c.base != null)
    return THRESHOLDS[c.code]?.up === false
      ? `(${c.base - v} below the ${c.base} trigger)`
      : `(+${v - c.base} over the ${c.base} trigger)`;
  if (type === 'OCCURS') return `in ${hours} h`;
  if (type !== 'IMMEDIATELY' && v >= 60) return `= ${(v / 60).toFixed(v % 60 ? 1 : 0)} h`;
  return '';
}

/** One escalation level (original `dQ`). */
function LevelEditor({
  level,
  n,
  check,
  ctx,
  hours,
  people,
  onChange,
  onRemove,
  onAddContact,
}: {
  level: Level;
  n: number;
  check: { conditions: string[]; messages: string[] };
  ctx: AlertCtx;
  hours: number;
  people: People;
  onChange: (l: Level) => void;
  onRemove: () => void;
  onAddContact: (c: Contact) => void;
}) {
  const [confirming, setConfirming] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const types = conditionTypes(ctx.code);
  const th = THRESHOLDS[ctx.code];
  const setCond = (i: number, p: Partial<Condition>) =>
    onChange({
      ...level,
      conditions: level.conditions.map((x, j) => (j === i ? { ...x, ...p } : x)),
    });
  const addPerson = (r: Recipient) => onChange({ ...level, recipients: [...level.recipients, r] });
  return (
    <section className={`vm-acx__level ${level.enabled ? '' : 'is-off'}`} aria-label={`Level ${n}`}>
      <h4>
        Level {n}
        <span className="vm-acx__level-tools">
          <Switch
            on={level.enabled}
            label={`Level ${n} on or off`}
            onChange={(on) => onChange({ ...level, enabled: on })}
          />
          <button
            type="button"
            className="vm-acx__x"
            aria-label={`Remove level ${n}`}
            onClick={onRemove}
          >
            <Icon name="X" size={13} />
          </button>
        </span>
      </h4>
      <div className="vm-acx__k">
        Escalation conditions<small>Any one condition reaches this level</small>
      </div>
      <ul className="vm-acx__conds" aria-label={`Level ${n} escalation conditions`}>
        {level.conditions.map((x, i) => {
          const err = check.conditions[i];
          const hint = valueHint(x.type, x.value, ctx, hours);
          return (
            <li key={i} className={err ? 'is-bad' : ''}>
              <div className="vm-acx__cond">
                <Select
                  value={x.type}
                  aria-label={`Condition ${i + 1} type`}
                  options={types.map((t) => ({ value: t, label: conditionLabel(t, th) }))}
                  onChange={(t) => setCond(i, newCondition(t, ctx))}
                />
                {x.type !== 'IMMEDIATELY' && (
                  <>
                    <input
                      type="number"
                      min={0}
                      value={x.value ?? ''}
                      aria-label={`Condition ${i + 1} value`}
                      aria-invalid={!!err}
                      onChange={(e) =>
                        setCond(i, { value: e.target.value === '' ? null : Number(e.target.value) })
                      }
                    />
                    <span className="vm-acx__unit">
                      {x.type === 'THRESHOLD'
                        ? ctx.unit
                        : x.type === 'OCCURS'
                          ? 'times'
                          : 'minutes'}
                    </span>
                  </>
                )}
                <span className="vm-acx__hint" title={hint}>
                  {hint}
                </span>
                <button
                  type="button"
                  className="vm-acx__x"
                  disabled={level.conditions.length < 2}
                  title={
                    level.conditions.length < 2
                      ? 'A level needs at least one condition'
                      : 'Remove this condition'
                  }
                  aria-label={`Remove condition ${i + 1}: ${describe(x, ctx, hours)}`}
                  onClick={() => setConfirming(i)}
                >
                  <Icon name="Trash" size={14} />
                </button>
              </div>
              {confirming === i && (
                <div
                  className="vm-acx__confirm"
                  role="group"
                  aria-label={`Confirm removing condition ${i + 1}`}
                >
                  <span>Remove this condition? Other conditions in Level {n} stay.</span>
                  <button
                    type="button"
                    className="td-btn gp-btn-danger"
                    onClick={() => {
                      setConfirming(null);
                      onChange({
                        ...level,
                        conditions: level.conditions.filter((_, j) => j !== i),
                      });
                    }}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    className="td-btn td-btn--ghost"
                    onClick={() => setConfirming(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {err && <em className="vm-acx__err">{err}</em>}
            </li>
          );
        })}
      </ul>
      {level.conditions.length < MAX_CONDITIONS && (
        <button
          type="button"
          className="td-link"
          onClick={() =>
            onChange({ ...level, conditions: [...level.conditions, extraCondition(ctx)] })
          }
        >
          + Add condition
        </button>
      )}
      <div className="vm-acx__k">Notify</div>
      <div className="vm-acx__chips">
        {level.recipients.map((r, i) => (
          <span key={keyOf(r)} className="vm-acx__chip">
            {nameOf(r, people.users)} · {r.contact ? 'external' : 'user'}
            <button
              type="button"
              aria-label={`Remove ${nameOf(r, people.users)}`}
              onClick={() =>
                onChange({ ...level, recipients: level.recipients.filter((_, j) => j !== i) })
              }
            >
              <Icon name="X" size={11} />
            </button>
          </span>
        ))}
      </div>
      <div className="vm-acx__add">
        <PeoplePicker
          people={people}
          used={level.recipients}
          label="+ Add recipients"
          onPick={addPerson}
        />
        <button type="button" className="td-link" onClick={() => setAdding(true)}>
          + New external contact
        </button>
      </div>
      {adding && (
        <ContactForm
          onCancel={() => setAdding(false)}
          onAdd={(c) => {
            onAddContact(c);
            addPerson({ contact: c });
            setAdding(false);
          }}
        />
      )}
      <div className="vm-acx__k">Channels</div>
      <div className="vm-acx__modes">
        {CHANNELS.map((c) => (
          <Check
            key={c}
            checked={level.channels.includes(c)}
            onChange={(on) =>
              onChange({
                ...level,
                channels: on ? [...level.channels, c] : level.channels.filter((x) => x !== c),
              })
            }
          >
            {CHANNEL_LABEL[c]}
          </Check>
        ))}
      </div>
      {check.messages.map((m) => (
        <em key={m} className="vm-acx__err">
          {m}
        </em>
      ))}
    </section>
  );
}

/** The Escalation view (original `mQ`). */
export function EscalationView({
  name,
  severity,
  severityLabel,
  severityTone,
  vehicles,
  trigger,
  escalation,
  first,
  firstNeeded,
  ctx,
  check,
  people,
  onChange,
  onAddContact,
  onEditTrigger,
  onTurnOn,
}: {
  name: string;
  severity: string;
  severityLabel: string;
  severityTone: string;
  vehicles: number;
  trigger: ReactNode;
  escalation: Escalation;
  first: Recipient[];
  firstNeeded: boolean;
  ctx: AlertCtx;
  check: EscalationCheck;
  people: People;
  onChange: (e: Escalation) => void;
  onAddContact: (c: Contact) => void;
  onEditTrigger: () => void;
  onTurnOn: () => void;
}) {
  const hours = escalation.occurrenceHours ?? OCCURRENCE_HOURS;
  const setLevel = (i: number, l: Level) =>
    onChange({ ...escalation, levels: escalation.levels.map((x, j) => (j === i ? l : x)) });
  void severity;
  return (
    <div className="vm-acx__esc">
      <div className="vm-acx__banner">
        <b>{name}</b>
        <span className={`vm-acx__sevpill tone-${severityTone}`}>Severity: {severityLabel}</span>
        <span>{vehicles === 1 ? '1 vehicle' : `${vehicles} vehicles`}</span>
        <span>{trigger}</span>
        <button type="button" className="td-link" onClick={onEditTrigger}>
          Edit trigger
        </button>
      </div>
      <div className="vm-acx__lvchips" aria-label="Levels">
        <div className="vm-acx__lvchip">
          <b>Level 0</b>Initial alert ·{' '}
          {firstNeeded ? `${first.length} recipient${first.length === 1 ? '' : 's'}` : 'push only'}
        </div>
        {escalation.enabled &&
          escalation.levels.map((l, i) => (
            <span key={i} className="vm-acx__lvstep">
              <Icon name="ChevronRight" size={14} />
              <div
                className={`vm-acx__lvchip ${l.enabled ? '' : 'is-off'} ${check.levels[i]?.conditions.some(Boolean) || check.levels[i]?.messages.length ? 'is-bad' : ''}`}
              >
                <b>Level {i + 1}</b>
                {l.conditions.map((x) => describe(x, ctx, hours)).join(' · ') || 'no condition'}
              </div>
            </span>
          ))}
      </div>
      <p className="vm-acx__info" role="note">
        <Icon name="Info" size={14} />
        Escalation notifications follow the Notification period set in Settings. Notifications due
        outside it wait for the next allowed time, while the alert is still valid. The device
        Gateway sends them.
      </p>
      <div className="vm-acx__escbody">
        <div className="vm-acx__esclevels">
          {escalation.enabled ? (
            <>
              {escalation.levels.map((l, i) => (
                <LevelEditor
                  key={i}
                  level={l}
                  n={i + 1}
                  check={check.levels[i] ?? { conditions: [], messages: [] }}
                  ctx={ctx}
                  hours={hours}
                  people={people}
                  onChange={(x) => setLevel(i, x)}
                  onAddContact={onAddContact}
                  onRemove={() =>
                    onChange({ ...escalation, levels: escalation.levels.filter((_, j) => j !== i) })
                  }
                />
              ))}
              <div className="vm-acx__escfoot">
                {escalation.levels.length < MAX_LEVELS && (
                  <button
                    type="button"
                    className="td-btn td-btn--ghost"
                    onClick={() =>
                      onChange({
                        ...escalation,
                        levels: [...escalation.levels, nextLevel(escalation.levels, ctx)],
                      })
                    }
                  >
                    + Add level ({escalation.levels.length} of {MAX_LEVELS})
                  </button>
                )}
                <button
                  type="button"
                  className="td-btn td-btn--ghost"
                  onClick={() => onChange({ ...escalation, enabled: false })}
                >
                  Turn off escalation
                </button>
              </div>
            </>
          ) : (
            <section className="vm-acx__level">
              <h4>
                <Icon name="Layers" size={15} />
                Escalation is off
              </h4>
              <p className="vm-acx__hint">
                Only the first alert's people are told. Turn escalation on to tell more people when
                this alert is not handled.
              </p>
              <button type="button" className="td-btn td-btn--primary" onClick={onTurnOn}>
                Turn on escalation
              </button>
            </section>
          )}
        </div>
        <div className="vm-acx__escside">
          <section className="vm-acx__level">
            <h4>Checks</h4>
            <Checks
              checks={
                escalation.enabled
                  ? check.checks
                  : [{ state: 'ok', text: 'Escalation is off (allowed)' }]
              }
            />
            {check.warnings.map((w) => (
              <small key={w} className="vm-acx__warn">
                {w}
              </small>
            ))}
          </section>
          <section className="vm-acx__level">
            <h4>What happens</h4>
            <ol className="vm-acx__steps">
              <li>
                <b>Triggered</b>: the first alert's people are told and the alert opens.
              </li>
              <li>
                <b>Not acknowledged</b>: levels with a "not acknowledged" condition fire at their
                time. Acknowledging stops only those.
              </li>
              <li>
                <b>Acknowledged is not resolved</b>: "unresolved", threshold and duration levels
                keep running.
              </li>
              <li>
                <b>Recovered</b>: when the condition clears, the alert closes and levels not reached
                are cancelled.
              </li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
