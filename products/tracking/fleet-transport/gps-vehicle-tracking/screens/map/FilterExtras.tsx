// IT-0053 (Heeba's approved prototype IT-0051): Grid View's filter options that the Map View
// "Vehicle Filters" panel lacked, drawn in the panel's own style (toggle bars, dropdown rows).
// Values, defaults and matching are Grid View's (screens/shared/gridExtras.ts); the panel keeps a
// draft while it is open, like its other options.
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

/* the prototype's lucide icons, 14px */
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
  >
    {children}
  </svg>
);
const ICONS = {
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
};
const CHEVRON = svg(<path d="m6 9 6 6 6-6" />);

type Set = (next: Extras) => void;

/** A toggle bar (the panel's td-trkf__seg). `full` spans both columns. */
function Seg<V extends string | boolean>({
  id,
  label,
  icon,
  options,
  isOn,
  onPick,
  full,
  multi,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  options: [V, string][];
  isOn: (v: V) => boolean;
  onPick: (v: V) => void;
  full?: boolean;
  multi?: boolean;
}) {
  return (
    <div className="td-trkf__toggle" style={full ? { gridColumn: '1/-1' } : undefined}>
      <span className="td-trkf__tlabel" id={id}>
        <span className="td-trkf__ticon tone-brand" aria-hidden="true">
          {icon}
        </span>
        {label}
      </span>
      <div className="td-trkf__seg" role={multi ? 'group' : 'radiogroup'} aria-labelledby={id}>
        {options.map(([v, text]) => {
          const on = isOn(v);
          return (
            <button
              key={String(v)}
              type="button"
              role={multi ? 'checkbox' : 'radio'}
              aria-checked={on}
              className={on ? 'is-on' : ''}
              onClick={() => onPick(v)}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A single-choice dropdown row (the panel's td-trkf__row, with Grid View's texts). */
function Select({
  id,
  label,
  icon,
  value,
  placeholder,
  options,
  onPick,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  placeholder: string;
  options: [string, string][];
  onPick: (v: string) => void;
}) {
  return (
    <div className="td-trkf__row">
      <span className="td-badge tone-brand" aria-hidden="true">
        {icon}
      </span>
      <label htmlFor={id}>{label}</label>
      <span style={{ position: 'relative', display: 'block', minWidth: 0 }}>
        <select
          id={id}
          className={`td-ddl td-ddl--block${value === placeholder ? ' is-placeholder' : ''}`}
          aria-label={label}
          value={value}
          onChange={(e) => onPick(e.target.value)}
          style={{
            width: '100%',
            appearance: 'none',
            WebkitAppearance: 'none',
            paddingRight: 28,
            cursor: 'pointer',
          }}
        >
          {options.map(([v, text]) => (
            <option key={v} value={v}>
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
          {CHEVRON}
        </span>
      </span>
    </div>
  );
}

const pickInstalled = (x: Extras, v: string): Extras['installed'] =>
  v === ''
    ? []
    : x.installed.includes(v as Extras['installed'][number])
      ? x.installed.filter((s) => s !== v)
      : [...x.installed, v as Extras['installed'][number]];

/** People section: "Unassigned operator only" (half width). */
export function PeopleExtras({ id, x, set }: { id: string; x: Extras; set: Set }) {
  return (
    <div className="td-trkf__toggles">
      <Seg
        id={`${id}-unassigned`}
        label="Unassigned operator only"
        icon={ICONS.user}
        options={ON_OFF}
        isOn={(v) => x.unassigned === v}
        onPick={(v) => set({ ...x, unassigned: v })}
      />
    </div>
  );
}

/** Sensors section (inside its toggle grid): installed sensors (several, All = none) and out-of-range. */
export function SensorExtras({ id, x, set }: { id: string; x: Extras; set: Set }) {
  return (
    <>
      <Seg
        id={`${id}-installed`}
        label="Installed sensors"
        icon={ICONS.sensor}
        options={[['', 'All'], ...INSTALLED_CHOICES.map((s): [string, string] => [s, s])]}
        isOn={(v) => (v === '' ? !x.installed.length : x.installed.includes(v as never))}
        onPick={(v) => set({ ...x, installed: pickInstalled(x, v) })}
        full
        multi
      />
      <Seg
        id={`${id}-outOfRange`}
        label="Out-of-range readings only"
        icon={ICONS.range}
        options={ON_OFF}
        isOn={(v) => x.outOfRange === v}
        onPick={(v) => set({ ...x, outOfRange: v })}
      />
    </>
  );
}

/** New sections after Sensors: Device and Location. */
export function DeviceLocationExtras({
  id,
  x,
  set,
  geofences,
}: {
  id: string;
  x: Extras;
  set: Set;
  geofences: [string, string][];
}) {
  return (
    <>
      <section className="td-trkf__sec" aria-label="Device">
        <h4 className="td-trkf__sechead">Device</h4>
        <div className="td-trkf__toggles">
          <Seg
            id={`${id}-gps`}
            label="GPS"
            icon={ICONS.gps}
            options={GPS_CHOICES}
            isOn={(v) => x.gps === v}
            onPick={(v) => set({ ...x, gps: v })}
            full
          />
          <Seg
            id={`${id}-extBat`}
            label="External Battery"
            icon={ICONS.plug}
            options={EXTBAT_CHOICES}
            isOn={(v) => x.extBat === v}
            onPick={(v) => set({ ...x, extBat: v })}
            full
          />
          <Seg
            id={`${id}-watch`}
            label="Watch Mode"
            icon={ICONS.watch}
            options={WATCH_CHOICES}
            isOn={(v) => x.watch === v}
            onPick={(v) => set({ ...x, watch: v })}
          />
        </div>
        <Select
          id={`${id}-gsm`}
          label="GSM"
          icon={ICONS.gsm}
          value={x.gsm}
          placeholder={NO_EXTRAS.gsm}
          options={GSM_CHOICES}
          onPick={(v) => set({ ...x, gsm: v })}
        />
        <Select
          id={`${id}-intBat`}
          label="Internal Battery"
          icon={ICONS.battery}
          value={x.intBat}
          placeholder={NO_EXTRAS.intBat}
          options={INTBAT_CHOICES}
          onPick={(v) => set({ ...x, intBat: v })}
        />
      </section>
      <section className="td-trkf__sec" aria-label="Location">
        <h4 className="td-trkf__sechead">Location</h4>
        <Select
          id={`${id}-geofence`}
          label="Geofence"
          icon={ICONS.fence}
          value={x.geofence}
          placeholder={NO_EXTRAS.geofence}
          options={geofences}
          onPick={(v) => set({ ...x, geofence: v })}
        />
      </section>
    </>
  );
}

/** The added options in words, for the list's "Filtered:" line. */
export function extrasWords(x: Extras, geofences: [string, string][]): string[] {
  const label = (list: [string, string][], v: string) => list.find(([k]) => k === v)?.[1] ?? v;
  return [
    ...(x.unassigned ? ['Unassigned operator'] : []),
    ...x.installed.map((s) => `${s} sensor`),
    ...(x.outOfRange ? ['Out-of-range readings'] : []),
    ...(x.gps !== NO_EXTRAS.gps ? [`GPS ${label(GPS_CHOICES, x.gps)}`] : []),
    ...(x.extBat !== NO_EXTRAS.extBat
      ? [`External Battery ${label(EXTBAT_CHOICES, x.extBat)}`]
      : []),
    ...(x.watch !== NO_EXTRAS.watch ? [`Watch Mode ${x.watch}`] : []),
    ...(x.gsm !== NO_EXTRAS.gsm ? [`GSM ${label(GSM_CHOICES, x.gsm)}`] : []),
    ...(x.intBat !== NO_EXTRAS.intBat ? [`Internal Battery ${x.intBat}`] : []),
    ...(x.geofence !== NO_EXTRAS.geofence ? [label(geofences, x.geofence)] : []),
  ];
}
