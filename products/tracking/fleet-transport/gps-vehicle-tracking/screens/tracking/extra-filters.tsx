// IT-0053 (Heeba's approved prototype IT-0051): Grid View's filter options that Tracking's
// "Vehicle Filters" panel lacked, drawn in the panel's own style (toggle bars, dropdown rows).
// Values and matching come from screens/shared/gridExtras.ts (Grid View's own rule).
import type { ReactNode } from 'react';
import {
  EXTBAT_CHOICES,
  GPS_CHOICES,
  GSM_CHOICES,
  INSTALLED_CHOICES,
  INTBAT_CHOICES,
  NO_EXTRAS,
  ON_OFF,
  WATCH_CHOICES,
  type Extras,
} from '../shared/gridExtras';

export interface ExtrasDraft {
  value: Extras;
  set: (next: Extras) => void;
  /** [value, label] pairs, "Any geofence" first. */
  geofences: [string, string][];
}

/* lucide shapes (14px, as in the prototype) */
const svg = (children: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block' }}
    aria-hidden="true"
  >
    {children}
  </svg>
);
const ICON = {
  user: svg(
    <>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </>,
  ),
  sensor: svg(
    <>
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
      <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
    </>,
  ),
  range: svg(
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>,
  ),
  gps: svg(
    <>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </>,
  ),
  plug: svg(
    <>
      <path d="M12 22v-5" />
      <path d="M9 8V2" />
      <path d="M15 8V2" />
      <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
    </>,
  ),
  watch: svg(
    <>
      <circle cx="12" cy="12" r="6" />
      <polyline points="12 10 12 12 13 13" />
      <path d="m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05" />
      <path d="m7.88 16.36.8 4a2 2 0 0 0 2 1.61h2.72a2 2 0 0 0 2-1.61l.81-4.05" />
    </>,
  ),
  gsm: svg(
    <>
      <path d="M2 20h.01" />
      <path d="M7 20v-4" />
      <path d="M12 20v-8" />
      <path d="M17 20V8" />
      <path d="M22 4v16" />
    </>,
  ),
  battery: svg(
    <>
      <rect width="16" height="10" x="2" y="7" rx="2" ry="2" />
      <line x1="22" x2="22" y1="11" y2="13" />
      <line x1="6" x2="6" y1="11" y2="13" />
      <line x1="10" x2="10" y1="11" y2="13" />
    </>,
  ),
  fence: svg(
    <>
      <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
      <path d="M15 5.764v15" />
      <path d="M9 3.236v15" />
    </>,
  ),
  chevron: svg(<path d="m6 9 6 6 6-6" />),
};

type Key = keyof Extras;

/** A toggle bar (the panel's td-trkf__toggle). `multi`: several can be on; '' = All (none). */
function Toggle({
  id,
  k,
  label,
  icon,
  options,
  full,
  multi,
  d,
}: {
  id: string;
  k: Key;
  label: string;
  icon: ReactNode;
  options: [string | boolean, string][];
  full?: boolean;
  multi?: boolean;
  d: ExtrasDraft;
}) {
  const v = d.value[k];
  const labelId = `td-trkf-${id}-x-${k}`;
  return (
    <div className="td-trkf__toggle" style={full ? { gridColumn: '1/-1' } : undefined}>
      <span className="td-trkf__tlabel" id={labelId}>
        <span className="td-trkf__ticon tone-brand" aria-hidden="true">
          {icon}
        </span>
        {label}
      </span>
      <div
        className="td-trkf__seg"
        role={multi ? 'group' : 'radiogroup'}
        aria-labelledby={labelId}
      >
        {options.map(([val, text]) => {
          const list = v as string[];
          const on = multi ? (val === '' ? !list.length : list.includes(val as string)) : v === val;
          return (
            <button
              key={String(val)}
              type="button"
              role={multi ? 'checkbox' : 'radio'}
              aria-checked={on}
              className={on ? 'is-on' : ''}
              onClick={() => {
                let next: Extras[Key];
                if (!multi) next = val as never;
                else if (val === '') next = [] as never;
                else
                  next = (
                    list.includes(val as string)
                      ? list.filter((x) => x !== val)
                      : [...list, val as string]
                  ) as never;
                d.set({ ...d.value, [k]: next });
              }}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A dropdown row (the panel's td-trkf__row with a native select in the td-ddl look). */
function Select({
  id,
  k,
  label,
  icon,
  options,
  d,
}: {
  id: string;
  k: 'gsm' | 'intBat' | 'geofence';
  label: string;
  icon: ReactNode;
  options: [string, string][];
  d: ExtrasDraft;
}) {
  const v = d.value[k];
  const htmlId = `td-trkf-${id}-x-${k}`;
  return (
    <div className="td-trkf__row">
      <span className="td-badge tone-brand" aria-hidden="true">
        {icon}
      </span>
      <label htmlFor={htmlId}>{label}</label>
      <span style={{ position: 'relative', display: 'block', minWidth: 0 }}>
        <select
          id={htmlId}
          className={`td-ddl td-ddl--block ${v === NO_EXTRAS[k] ? 'is-placeholder' : ''}`}
          aria-label={label}
          value={v}
          onChange={(e) => d.set({ ...d.value, [k]: e.target.value })}
          style={{
            width: '100%',
            appearance: 'none',
            WebkitAppearance: 'none',
            paddingRight: 28,
            cursor: 'pointer',
          }}
        >
          {options.map(([val, text]) => (
            <option key={val} value={val}>
              {text}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 9,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: '#6B7685',
          }}
        >
          {ICON.chevron}
        </span>
      </span>
    </div>
  );
}

const INSTALLED: [string, string][] = [['', 'All'], ...INSTALLED_CHOICES.map((s): [string, string] => [s, s])];

/** People: "Unassigned operator only" (half width), after the section's own rows. */
export function PeopleExtras({ id, d }: { id: string; d: ExtrasDraft }) {
  return (
    <div className="td-trkf__toggles">
      <Toggle id={id} k="unassigned" label="Unassigned operator only" icon={ICON.user} options={ON_OFF} d={d} />
    </div>
  );
}

/** Sensors: inside the section's toggle grid, after its own toggles. */
export function SensorExtras({ id, d }: { id: string; d: ExtrasDraft }) {
  return (
    <>
      <Toggle id={id} k="installed" label="Installed sensors" icon={ICON.sensor} options={INSTALLED} full multi d={d} />
      <Toggle id={id} k="outOfRange" label="Out-of-range readings only" icon={ICON.range} options={ON_OFF} d={d} />
    </>
  );
}

/** The added Device and Location sections (after Sensors). */
export function DeviceLocationExtras({ id, d }: { id: string; d: ExtrasDraft }) {
  return (
    <>
      <section className="td-trkf__sec" aria-label="Device">
        <h4 className="td-trkf__sechead">Device</h4>
        <div className="td-trkf__toggles">
          <Toggle id={id} k="gps" label="GPS" icon={ICON.gps} options={GPS_CHOICES} full d={d} />
          <Toggle id={id} k="extBat" label="External Battery" icon={ICON.plug} options={EXTBAT_CHOICES} full d={d} />
          <Toggle id={id} k="watch" label="Watch Mode" icon={ICON.watch} options={WATCH_CHOICES} d={d} />
        </div>
        <Select id={id} k="gsm" label="GSM" icon={ICON.gsm} options={GSM_CHOICES} d={d} />
        <Select id={id} k="intBat" label="Internal Battery" icon={ICON.battery} options={INTBAT_CHOICES} d={d} />
      </section>
      <section className="td-trkf__sec" aria-label="Location">
        <h4 className="td-trkf__sechead">Location</h4>
        <Select id={id} k="geofence" label="Geofence" icon={ICON.fence} options={d.geofences} d={d} />
      </section>
    </>
  );
}

/** Short texts of the added options for the list's "Filtered:" line. */
export function extrasValues(x: Extras, geofences: [string, string][]): string[] {
  const label = (list: [string | boolean, string][], v: unknown) => list.find(([k]) => k === v)?.[1] ?? String(v);
  const out: string[] = [];
  if (x.unassigned) out.push('Unassigned operator');
  if (x.installed.length) out.push(`Sensors: ${x.installed.join(', ')}`);
  if (x.outOfRange) out.push('Out-of-range readings');
  if (x.gps !== NO_EXTRAS.gps) out.push(`GPS ${label(GPS_CHOICES, x.gps)}`);
  if (x.extBat !== NO_EXTRAS.extBat) out.push(`External Battery ${label(EXTBAT_CHOICES, x.extBat)}`);
  if (x.watch !== NO_EXTRAS.watch) out.push(`Watch Mode ${label(WATCH_CHOICES, x.watch)}`);
  if (x.gsm !== NO_EXTRAS.gsm) out.push(`GSM ${label(GSM_CHOICES, x.gsm)}`);
  if (x.intBat !== NO_EXTRAS.intBat) out.push(`Internal Battery ${label(INTBAT_CHOICES, x.intBat)}`);
  if (x.geofence !== NO_EXTRAS.geofence) out.push(label(geofences, x.geofence));
  return out;
}
