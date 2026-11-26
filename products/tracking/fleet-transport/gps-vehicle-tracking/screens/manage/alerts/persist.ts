// IT-0038. What an alert rule saves beyond its gps.alert_configs columns:
// - gps.rule_settings (source 'gps.alert_configs' / the rule's id): all type
//   parameters, the time slots per day, the "effective till" choice with its dates, the buzzer,
//   the escalation (on/off, levels with their conditions and channels) and the external contacts'
//   full details (organisation included).
// - gps.notification_recipients (same source): the initial recipients (level 0) and every
//   escalation level's recipients (levels 1–5), one row per channel; user_id for directory users,
//   name + address for external contacts.
import type { NotificationRecipientsRow } from '@iotify/data';
import type { RecipientRow } from '../modules/records';
import type { Contact, Escalation, Person, Recipient } from './escalation';

export const ALERT_SOURCE = 'gps.alert_configs';
type Slot = { from: string; to: string };

export interface AlertSettings {
  fields?: Record<string, string>;
  slots?: Record<string, Slot[]>;
  effective?: string;
  customDate?: string;
  rangeFrom?: string;
  rangeTo?: string;
  buzzer?: boolean;
  escalation?: {
    enabled: boolean;
    occurrenceHours: number;
    levels: {
      enabled: boolean;
      conditions: { type: string; value: number | null }[];
      channels: string[];
    }[];
  };
  contacts?: Contact[];
}

interface Saveable {
  fields: Record<string, string>;
  slots: Record<string, Slot[]>;
  effective: string;
  customDate: string;
  rangeFrom: string;
  rangeTo: string;
  buzzer: boolean;
  recipients: Recipient[];
  escalation: Escalation;
}

const low = (s?: string | null) => (s ?? '').trim().toLowerCase();
const contactKey = (c: Contact) => `${low(c.name)}|${low(c.email)}|${low(c.mobile)}`;

/** The rule_settings.settings value of a form's values. */
export function settingsFrom(v: Saveable): AlertSettings {
  const contacts = new Map<string, Contact>();
  for (const r of [...v.recipients, ...v.escalation.levels.flatMap((l) => l.recipients)])
    if (r.contact) contacts.set(contactKey(r.contact), r.contact);
  return {
    fields: v.fields,
    slots: v.slots,
    effective: v.effective,
    customDate: v.customDate,
    rangeFrom: v.rangeFrom,
    rangeTo: v.rangeTo,
    buzzer: v.buzzer,
    escalation: {
      enabled: v.escalation.enabled,
      occurrenceHours: v.escalation.occurrenceHours,
      levels: v.escalation.levels.map((l) => ({
        enabled: l.enabled,
        conditions: l.conditions,
        channels: l.channels,
      })),
    },
    contacts: [...contacts.values()],
  };
}

/** One row per recipient and channel (a contact's address is its e-mail or mobile). */
function rowsOf(level: number, r: Recipient, channels: string[]): RecipientRow[] {
  const out: RecipientRow[] = [];
  for (const ch of channels) {
    const channel = ch.toLowerCase() as RecipientRow['channel'];
    if (r.userId) out.push({ level, channel, user_id: r.userId });
    else if (r.contact) {
      const address =
        channel === 'sms' ? r.contact.mobile : channel === 'email' ? r.contact.email : null;
      if (address) out.push({ level, channel, name: r.contact.name, address });
    }
  }
  // A contact must keep at least one row to be found again.
  if (!out.length && r.contact && (r.contact.email || r.contact.mobile))
    out.push({
      level,
      channel: r.contact.email ? 'email' : 'sms',
      name: r.contact.name,
      address: (r.contact.email || r.contact.mobile)!,
    });
  if (!out.length && r.userId) out.push({ level, channel: 'push', user_id: r.userId });
  return out;
}

/** The notification_recipients rows of a form's values. */
export function recipientRowsFrom(v: Saveable): RecipientRow[] {
  return [
    ...v.recipients.flatMap((r) => rowsOf(0, r, r.channels ?? [])),
    ...v.escalation.levels.flatMap((l, i) =>
      l.recipients.flatMap((r) => rowsOf(i + 1, r, l.channels)),
    ),
  ];
}

/** Recipients of one level, rebuilt from their rows (channels per recipient for level 0). */
function recipientsAt(
  rows: NotificationRecipientsRow[],
  level: number,
  contacts: Contact[],
  users: Person[],
): Recipient[] {
  const out: Recipient[] = [];
  const index = new Map<string, Recipient>();
  for (const row of rows.filter((x) => (x.level ?? 0) === level)) {
    const ch = row.channel.toUpperCase();
    let key: string;
    let make: () => Recipient;
    if (row.user_id) {
      key = `u:${row.user_id}`;
      make = () => ({ userId: String(row.user_id) });
    } else {
      const known =
        contacts.find(
          (c) =>
            low(c.name) === low(row.name) &&
            (low(c.email) === low(row.address) || low(c.mobile) === low(row.address)),
        ) ?? contacts.find((c) => low(c.name) === low(row.name));
      const c: Contact = known ?? {
        name: row.name ?? row.address ?? '',
        email: row.channel === 'email' ? row.address : null,
        mobile: row.channel === 'sms' ? row.address : null,
      };
      key = `c:${contactKey(c)}`;
      make = () => ({ contact: c });
    }
    let r = index.get(key);
    if (!r) {
      r = { ...make(), channels: [] };
      index.set(key, r);
      out.push(r);
    }
    if (!r.channels!.includes(ch)) r.channels!.push(ch);
  }
  void users;
  return out;
}

/** Applies the saved settings and recipients to the values rebuilt from the alert_configs row. */
export function rebuild<V extends Saveable>(
  base: V,
  settings: AlertSettings | undefined,
  rows: NotificationRecipientsRow[],
  users: Person[],
): V {
  if (!settings && !rows.length) return base;
  const s = settings ?? {};
  const contacts = s.contacts ?? [];
  const esc = s.escalation;
  const escalation: Escalation = esc
    ? {
        enabled: esc.enabled,
        occurrenceHours: esc.occurrenceHours,
        levels: esc.levels.map((l, i) => ({
          enabled: l.enabled,
          conditions: l.conditions,
          channels: l.channels,
          recipients: recipientsAt(rows, i + 1, contacts, users).map((r) => ({
            userId: r.userId,
            contact: r.contact,
          })),
        })),
      }
    : base.escalation;
  return {
    ...base,
    fields: { ...base.fields, ...(s.fields ?? {}) },
    slots: s.slots ?? base.slots,
    effective: s.effective ?? base.effective,
    customDate: s.customDate ?? base.customDate,
    rangeFrom: s.rangeFrom ?? base.rangeFrom,
    rangeTo: s.rangeTo ?? base.rangeTo,
    buzzer: s.buzzer ?? base.buzzer,
    recipients: recipientsAt(rows, 0, contacts, users),
    escalation,
  };
}
