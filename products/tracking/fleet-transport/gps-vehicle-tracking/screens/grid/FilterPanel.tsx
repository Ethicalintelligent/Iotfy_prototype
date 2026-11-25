// Grid View › Vehicle Filters drawer (approved design's filterPanelHtml): Operator, Sensor, Device,
// Location and Group sections, Reset / Submit. Edits a draft; Submit applies it.
import { useState, type ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import {
  DEFAULT_FILTERS,
  GRAD,
  INSTALLED_SENSORS,
  isSet,
  sameFilters,
  type FilterKey,
  type Filters,
  type InstalledSensor,
} from './model';

export interface Choice {
  value: string;
  label: string;
  count?: number;
}
export interface FilterOptions {
  managers: string[];
  supervisors: string[];
  operators: string[];
  geofences: Choice[];
  vehicleTypes: Choice[];
  groups: Choice[];
}

type SectionKey = 'operator' | 'sensor' | 'device' | 'location' | 'group';
const SECTION_ICON: Record<SectionKey, IconName> = {
  operator: 'user',
  sensor: 'sensor',
  device: 'chip',
  location: 'pin',
  group: 'grid',
};
const INSTALLED_ICON: Record<InstalledSensor, IconName> = {
  Temperature: 'temperature',
  Load: 'load',
  Door: 'door',
  AC: 'acStar',
};

type StringKey = { [K in FilterKey]: Filters[K] extends string ? K : never }[FilterKey];
type BooleanKey = 'unassigned' | 'outOfRange';

const LABEL_STYLE = { fontSize: 12, fontWeight: 700, color: '#0B1B2B' } as const;

function CheckBox({ state }: { state: boolean | 'mid' }) {
  const on = state === true || state === 'mid';
  return (
    <span
      style={{
        width: 18,
        height: 18,
        boxSizing: 'border-box',
        borderRadius: 6,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        background: on ? GRAD : '#fff',
        boxShadow: on ? 'none' : 'inset 0 0 0 1.5px #C3CAD3',
      }}
    >
      {on && (
        <span style={{ color: '#fff', display: 'grid', placeItems: 'center' }}>
          <Icon name={state === true ? 'check' : 'minus'} size={12} />
        </span>
      )}
    </span>
  );
}

interface PickItem {
  label: string;
  count: string;
  bold: boolean;
  state: boolean | 'mid';
  toggle: () => void;
}
/** "Select all" + one row per choice, with a check box and a count (vehicle type and group lists). */
function PickList({
  items,
  rowHeight,
  fontSize,
  countStyle,
  radius,
}: {
  items: PickItem[];
  rowHeight: number;
  fontSize: number;
  countStyle: { fontSize: number; fontWeight?: number; color: string };
  radius: number;
}) {
  return (
    <div
      style={{
        borderRadius: radius,
        boxShadow: 'inset 0 0 0 1px #E3E6EA',
        padding: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          className="h-opt"
          onClick={it.toggle}
          style={{
            height: rowHeight,
            border: 'none',
            borderRadius: 6,
            background: it.bold ? '#F2F4F6' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 8px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
        >
          <CheckBox state={it.state} />
          <span style={{ flex: 1, fontSize, fontWeight: it.bold ? 700 : 500, color: '#0B1B2B' }}>
            {it.label}
          </span>
          <span style={countStyle}>{it.count}</span>
        </button>
      ))}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
  height,
  fontSize,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  height: number;
  fontSize: number;
}) {
  return (
    <label
      style={{
        height,
        boxSizing: 'border-box',
        padding: '0 10px',
        borderRadius: 8,
        background: '#F9F9FB',
        boxShadow: 'inset 0 0 0 1px #D7D8DB',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: '#6B7685',
      }}
    >
      <Icon name="search" size={14} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder.replace('...', '')}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          background: 'transparent',
          fontFamily: 'inherit',
          fontSize,
          color: '#0B1B2B',
        }}
      />
    </label>
  );
}

export interface FilterPanelProps {
  draft: Filters;
  applied: Filters;
  options: FilterOptions;
  onDraft: (patch: Partial<Filters>) => void;
  onReset: () => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function FilterPanel({
  draft: d,
  applied,
  options,
  onDraft,
  onReset,
  onSubmit,
  onClose,
}: FilterPanelProps) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    operator: true,
    sensor: true,
    device: true,
    location: true,
    group: true,
  });
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeQuery, setTypeQuery] = useState('');
  const [groupQuery, setGroupQuery] = useState('');
  const activeCount = (Object.keys(DEFAULT_FILTERS) as FilterKey[]).filter((k) =>
    isSet(applied, k),
  ).length;

  const segment = (label: string, key: StringKey, opts: string[]) => (
    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={LABEL_STYLE}>{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        style={{
          display: 'flex',
          height: 34,
          boxSizing: 'border-box',
          borderRadius: 8,
          background: '#fff',
          boxShadow: 'inset 0 0 0 1px #DCE1E6',
          padding: 2,
          gap: 2,
        }}
      >
        {opts.map((o) => {
          const on = d[key] === o;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onDraft({ [key]: o })}
              style={{
                flex: '1 1 0',
                minWidth: 0,
                border: 'none',
                borderRadius: 6,
                padding: '0 2px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 11.5,
                fontWeight: on ? 700 : 500,
                background: on ? GRAD : 'transparent',
                boxShadow: on ? '0 2px 6px rgba(3,173,134,.30)' : 'none',
                color: on ? '#fff' : '#3D4A5C',
                textShadow: on ? '0 1px 2px rgba(1,29,50,.30)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );

  const select = (label: string, key: StringKey, opts: [string, string][], disabled = false) => {
    const value = disabled ? '' : d[key];
    const isDefault = d[key] === DEFAULT_FILTERS[key];
    return (
      <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={LABEL_STYLE}>{label}</span>
        <span style={{ position: 'relative', display: 'block' }}>
          <select
            value={value}
            disabled={disabled}
            aria-label={label}
            onChange={(e) => onDraft({ [key]: e.target.value })}
            style={{
              width: '100%',
              height: 34,
              boxSizing: 'border-box',
              border: 'none',
              borderRadius: 8,
              padding: '0 32px 0 10px',
              appearance: 'none',
              WebkitAppearance: 'none',
              background: '#F9F9FB',
              boxShadow: 'inset 0 0 0 1px #D7D8DB',
              fontFamily: 'inherit',
              fontSize: 12.5,
              fontWeight: disabled || isDefault ? 500 : 600,
              color: disabled ? '#94A0AF' : isDefault ? '#6B7685' : '#0B1B2B',
              cursor: 'pointer',
            }}
          >
            {opts.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <span
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              width: 14,
              height: 14,
              display: 'grid',
              placeItems: 'center',
              color: '#6B7685',
            }}
          >
            <Icon name="chevDown" size={14} />
          </span>
        </span>
      </label>
    );
  };

  /** Fleet manager / supervisor / operator: names from Neon; disabled when nobody is recorded. */
  const personSelect = (
    label: string,
    key: 'manager' | 'supervisor' | 'operator',
    names: string[],
    noun: string,
  ) =>
    names.length
      ? select(label, key, [['', `Any ${noun}`], ...names.map((n): [string, string] => [n, n])])
      : select(label, key, [['', `No ${noun} recorded`]], true);

  const toggleSwitch = (label: string, sub: string, key: BooleanKey) => {
    const on = d[key];
    return (
      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: '16px' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0B1B2B' }}>{label}</span>
          <span style={{ fontSize: 11, color: '#6B7685' }}>{sub}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={label}
          onClick={() => onDraft({ [key]: !on })}
          style={{
            width: 34,
            height: 20,
            border: 'none',
            borderRadius: 999,
            padding: 0,
            position: 'relative',
            cursor: 'pointer',
            flexShrink: 0,
            background: on ? '#0E7F5E' : '#C3CAD3',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: on ? 16 : 2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,.25)',
              transition: 'left .15s ease',
            }}
          />
        </button>
      </div>
    );
  };

  const installedSensors = (
    <div key="installed" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={LABEL_STYLE}>Installed sensors</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {INSTALLED_SENSORS.map((label) => {
          const on = d.installed.includes(label);
          return (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onDraft({
                  installed: on ? d.installed.filter((x) => x !== label) : [...d.installed, label],
                })
              }
              style={{
                height: 34,
                border: 'none',
                borderRadius: 8,
                padding: '0 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 12.5,
                fontWeight: on ? 700 : 600,
                background: on ? '#E6F5EF' : '#fff',
                boxShadow: on ? 'inset 0 0 0 1.5px #12955F' : 'inset 0 0 0 1px #DCE1E6',
                color: on ? '#0A6B4B' : '#0B1B2B',
              }}
            >
              <span
                style={{ display: 'grid', placeItems: 'center', color: on ? '#0B9467' : '#3D4A5C' }}
              >
                <Icon name={INSTALLED_ICON[label]} size={14} />
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const vehicleTypes = () => {
    const all = options.vehicleTypes.map((t) => t.value);
    const allOn = all.length > 0 && d.vtypes.length === all.length;
    const q = typeQuery.trim().toLowerCase();
    const summary = !d.vtypes.length
      ? 'Any type'
      : d.vtypes.length === 1
        ? d.vtypes[0]
        : `${d.vtypes.length} types selected`;
    const items: PickItem[] = [
      {
        label: 'Select all',
        count: '',
        bold: true,
        state: allOn ? true : d.vtypes.length ? 'mid' : false,
        toggle: () => onDraft({ vtypes: allOn ? [] : all }),
      },
      ...options.vehicleTypes
        .filter((t) => !q || t.label.toLowerCase().includes(q))
        .map((t) => {
          const on = d.vtypes.includes(t.value);
          return {
            label: t.label,
            count: String(t.count ?? ''),
            bold: false,
            state: on,
            toggle: () =>
              onDraft({
                vtypes: on ? d.vtypes.filter((x) => x !== t.value) : [...d.vtypes, t.value],
              }),
          };
        }),
    ];
    return (
      <div
        key="vtypes"
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        <span style={LABEL_STYLE}>Vehicle type</span>
        <button
          type="button"
          aria-expanded={typeOpen}
          aria-label="Vehicle type"
          onClick={() => setTypeOpen(!typeOpen)}
          style={{
            width: '100%',
            height: 34,
            boxSizing: 'border-box',
            border: 'none',
            borderRadius: 8,
            padding: '0 10px',
            background: '#F9F9FB',
            boxShadow: typeOpen ? 'inset 0 0 0 1.5px #03AD86' : 'inset 0 0 0 1px #D7D8DB',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 12.5,
              fontWeight: d.vtypes.length ? 600 : 500,
              color: d.vtypes.length ? '#0B1B2B' : '#6B7685',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {summary}
          </span>
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              color: '#6B7685',
              transform: typeOpen ? 'rotate(180deg)' : 'none',
            }}
          >
            <Icon name="chevDown" size={14} />
          </span>
        </button>
        {typeOpen && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 64,
              zIndex: 5,
              background: '#fff',
              borderRadius: 10,
              boxShadow: '0 12px 28px rgba(1,29,50,.18),inset 0 0 0 1px #E9ECEF',
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <SearchBox
              value={typeQuery}
              onChange={setTypeQuery}
              placeholder="Search types..."
              height={32}
              fontSize={12}
            />
            <PickList
              items={items}
              rowHeight={28}
              fontSize={12}
              countStyle={{ fontSize: 11, color: '#8A94A3' }}
              radius={8}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 2px',
              }}
            >
              <span style={{ fontSize: 11.5, color: '#6B7685' }}>{d.vtypes.length} selected</span>
              <button
                type="button"
                onClick={() => setTypeOpen(false)}
                style={{
                  height: 28,
                  padding: '0 14px',
                  border: 'none',
                  borderRadius: 8,
                  background: GRAD,
                  boxShadow: 'inset 0 0 0 1.5px #03AD86',
                  color: '#fff',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const groups = () => {
    const names = options.groups.map((g) => g.value);
    const sel = d.groups;
    const allOn = sel != null && sel.length === names.length;
    const q = groupQuery.trim().toLowerCase();
    const items: PickItem[] = [
      {
        label: 'Select all',
        count: '',
        bold: true,
        state: allOn ? true : sel && sel.length ? 'mid' : false,
        toggle: () => onDraft({ groups: allOn ? null : names }),
      },
      ...options.groups
        .filter((g) => !q || g.label.toLowerCase().includes(q))
        .map((g) => {
          const on = sel != null && sel.includes(g.value);
          return {
            label: g.label,
            count: String(g.count ?? ''),
            bold: false,
            state: on,
            toggle: () => {
              const cur = sel ?? [];
              const next = on ? cur.filter((x) => x !== g.value) : [...cur, g.value];
              onDraft({ groups: next.length ? next : null });
            },
          };
        }),
    ];
    return (
      <div key="groups" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SearchBox
          value={groupQuery}
          onChange={setGroupQuery}
          placeholder="Search groups..."
          height={34}
          fontSize={12.5}
        />
        <PickList
          items={items}
          rowHeight={30}
          fontSize={12.5}
          countStyle={{ fontSize: 11.5, fontWeight: 600, color: '#6B7685' }}
          radius={10}
        />
      </div>
    );
  };

  const sections: { key: SectionKey; title: string; keys: FilterKey[]; body: () => ReactNode[] }[] =
    [
      {
        key: 'operator',
        title: 'Operator',
        keys: ['manager', 'supervisor', 'operator', 'unassigned'],
        body: () => [
          personSelect('Fleet Manager', 'manager', options.managers, 'fleet manager'),
          personSelect('Supervisor', 'supervisor', options.supervisors, 'supervisor'),
          personSelect('Vehicle Operator', 'operator', options.operators, 'vehicle operator'),
          toggleSwitch(
            'Unassigned operator only',
            'Vehicles with no operator assigned',
            'unassigned',
          ),
        ],
      },
      {
        key: 'sensor',
        title: 'Sensor',
        keys: ['ignition', 'installed', 'ac', 'seatbelt', 'door', 'outOfRange'],
        body: () => [
          segment('Ignition', 'ignition', ['Any', 'On', 'Off']),
          installedSensors,
          segment('AC', 'ac', ['Any', 'On', 'Off']),
          segment('Seat Belt', 'seatbelt', ['Any', 'Fastened', 'Unfastened']),
          segment('Door', 'door', ['Any', 'Open', 'Closed']),
          toggleSwitch(
            'Out-of-range readings only',
            'Sensors outside their set limits',
            'outOfRange',
          ),
        ],
      },
      {
        key: 'device',
        title: 'Device',
        keys: ['gps', 'extBat', 'watch', 'gsm', 'intBat'],
        body: () => [
          segment('GPS', 'gps', ['Any', 'Available', 'Not available']),
          segment('External Battery', 'extBat', ['Any', 'Connected', 'Disconnected']),
          segment('Watch Mode', 'watch', ['Any', 'On', 'Off']),
          select('GSM', 'gsm', [
            ['any', 'Any gsm'],
            ['strong', 'Strong signal'],
            ['weak', 'Weak signal'],
            ['none', 'No signal'],
            ['nodata', 'No data'],
          ]),
          select('Internal Battery', 'intBat', [
            ['any', 'Any internal battery'],
            ['Very High', 'Very High'],
            ['High', 'High'],
            ['Medium', 'Medium'],
            ['Low', 'Low'],
            ['No data', 'No data'],
          ]),
        ],
      },
      {
        key: 'location',
        title: 'Location',
        keys: ['geofence'],
        body: () => [
          select('Geofence', 'geofence', [
            ['any', 'Any geofence'],
            ...options.geofences.map((g): [string, string] => [g.value, g.label]),
          ]),
        ],
      },
      {
        key: 'group',
        title: 'Group',
        keys: ['vtypes', 'groups'],
        body: () => [vehicleTypes(), groups()],
      },
    ];

  const noChanges = sameFilters(d, applied);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 25 }} />
      <aside
        role="dialog"
        aria-label="Vehicle Filters"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 30,
          width: 264,
          boxSizing: 'border-box',
          background: '#fff',
          borderRadius: 14,
          boxShadow:
            '0 14px 36px rgba(1,29,50,.18),0 2px 6px rgba(1,29,50,.06),inset 0 0 0 1px #E9ECEF',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: 56,
            flexShrink: 0,
            boxSizing: 'border-box',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: 'inset 0 -1px 0 #EEF0F2',
          }}
        >
          <span
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: GRAD,
              boxShadow: '0 0 0 1.5px #03AD86,0 0 10px rgba(3,173,134,.45)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name="funnel" size={13} />
          </span>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              lineHeight: '17px',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0B1B2B' }}>Vehicle Filters</span>
            <span style={{ fontSize: 12, color: '#6B7685' }}>
              {activeCount
                ? `${activeCount} filter${activeCount > 1 ? 's' : ''} applied`
                : 'No filters applied'}
            </span>
          </div>
          <button
            type="button"
            className="h-close"
            aria-label="Close filters"
            title="Close"
            onClick={onClose}
            style={{
              width: 26,
              height: 26,
              border: 'none',
              borderRadius: 8,
              background: '#fff',
              boxShadow: '0 2px 6px rgba(1,29,50,.16),inset 0 0 0 1px #EEF0F2',
              color: '#3D4A5C',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className="vgv-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {sections.map((sec) => {
            const n = sec.keys.filter((k) => isSet(d, k)).length;
            const isOpen = open[sec.key];
            return (
              <section
                key={sec.key}
                style={{ boxShadow: 'inset 0 -1px 0 #EEF0F2', padding: '0 12px' }}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen({ ...open, [sec.key]: !isOpen })}
                  style={{
                    width: '100%',
                    height: 50,
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: '#E6F5EF',
                      color: '#0B9467',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={SECTION_ICON[sec.key]} />
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#0B1B2B' }}>
                    {sec.title}
                  </span>
                  {n > 0 && (
                    <span
                      style={{
                        minWidth: 18,
                        height: 18,
                        padding: '0 5px',
                        boxSizing: 'border-box',
                        borderRadius: 999,
                        background: GRAD,
                        color: '#fff',
                        fontSize: 10.5,
                        fontWeight: 700,
                        lineHeight: '18px',
                        textAlign: 'center',
                      }}
                    >
                      {n}
                    </span>
                  )}
                  <span
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: 14,
                      height: 14,
                      marginRight: 10,
                      color: '#6B7685',
                      transform: isOpen ? 'none' : 'rotate(-90deg)',
                      transition: 'transform .18s ease',
                    }}
                  >
                    <Icon name="chevDown" size={14} />
                  </span>
                </button>
                {isOpen && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      padding: '0 0 14px',
                    }}
                  >
                    {sec.body()}
                  </div>
                )}
              </section>
            );
          })}
        </div>
        <div
          style={{
            flexShrink: 0,
            padding: '10px 12px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            boxShadow: 'inset 0 1px 0 #EEF0F2',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTypeOpen(false);
              onReset();
            }}
            style={{
              height: 36,
              border: 'none',
              borderRadius: 8,
              background: '#fff',
              boxShadow: 'inset 0 0 0 1px #E3E6EA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 700,
              color: '#3D4A5C',
              cursor: 'pointer',
            }}
          >
            <Icon name="reset" size={14} /> Reset
          </button>
          <button
            type="button"
            disabled={noChanges}
            onClick={() => {
              if (noChanges) return;
              setTypeOpen(false);
              onSubmit();
            }}
            style={{
              height: 36,
              border: 'none',
              borderRadius: 8,
              background: GRAD,
              boxShadow: 'inset 0 0 0 1.5px #03AD86',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              cursor: noChanges ? 'default' : 'pointer',
              opacity: noChanges ? 0.5 : 1,
              textShadow: '0 1px 2px rgba(1,29,50,.35)',
            }}
          >
            Submit
          </button>
        </div>
      </aside>
    </>
  );
}
