// IT-0036. Manage › Geo Association (original `vK` + form `pK`): which vehicles are bound to which
// geofences, with the summary tiles, the grid (Speed / Height / Time from the zone, On Enter /
// On Leave, Days, Valid Till, Zone Type), the "Selected Geofences" map beside it, and the
// Associate Geofence form. Saved in proto_vehicle.vehicle_geofences (one row per vehicle and
// zone). The SMS numbers and e-mail addresses are core.notification_recipients rows (IT-0038:
// source_table 'proto_vehicle.vehicle_geofences', source_id '<asset_id>|<geofence_id>').
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import L from 'leaflet';
import {
  useAssetGroups,
  useNotificationRecipients,
  useSaveBatch,
  useVehicleGeofences,
  type Batch,
  type NotificationRecipientsRow,
} from '@iotify/data';
import { recipientsOf, saveRecipients, type RecipientRow } from '../modules/records';
import { ErrorState, Icon } from '../../smart-track/kit';
import { useVehicleAssets } from '../modules/vehicles';
import { DataGrid, EMPTY_LAYOUT, type GridColumn, type GridLayout } from '../grid/DataGrid';
import { GeoControls, ZonesMap, draftLayer, fitLayer, tip, useLeaflet } from '../map';
import {
  Banner,
  Check,
  Confirm,
  Drawer,
  FieldError,
  Select,
  ViewOnly,
  usePop,
  useToast,
} from '../ui';
import { useSearchAlign } from './GeoConfigModule';
import { hhmm, useZones, zoneTypeLabel, type Zone } from './zones';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_NAME: Record<string, string> = {
  SUN: 'Sun',
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
};
const WEEK_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const WEEKDAYS = DAYS.filter((d) => d !== 'SUN' && d !== 'SAT');
const VALID_FOR = [
  { label: 'Forever', days: null },
  { label: '1 Month', days: 30 },
  { label: '3 Months', days: 91 },
  { label: '6 Months', days: 182 },
  { label: '1 Year', days: 365 },
  { label: 'Custom Date', days: null },
];
const TONES = ['green', 'blue', 'purple', 'amber', 'teal', 'orange'];
const MAX_SMS = 10;
const EMAIL_SLOTS = 3;
const SOURCE = 'proto_vehicle.vehicle_geofences';
/** An association's saved SMS numbers and e-mail addresses. */
const listsOf = (all: NotificationRecipientsRow[] | undefined, id: string) => {
  const r = recipientsOf(all, SOURCE, id);
  return {
    smsList: r.filter((x) => x.channel === 'sms').map((x) => x.address ?? ''),
    emailList: r.filter((x) => x.channel === 'email').map((x) => x.address ?? ''),
  };
};
const HIDDEN_BY_DEFAULT: GridLayout = { ...EMPTY_LAYOUT, hidden: ['days', 'valid'] };

/** "Every day", "Mon–Fri", "Mon, Wed" (original `$N`). */
function daysText(days: string[]) {
  const ix = days
    .map((d) => DAYS.indexOf(d))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (ix.length === 7) return 'Every day';
  if (!ix.length) return '—';
  if (ix.length > 2 && ix.every((n, i) => i === 0 || n === ix[i - 1]! + 1))
    return `${DAY_NAME[DAYS[ix[0]!]!]}–${DAY_NAME[DAYS[ix[ix.length - 1]!]!]}`;
  return ix.map((i) => DAY_NAME[DAYS[i]!]).join(', ');
}
const showDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Forever';
function validUntil(validFor: string, custom: string) {
  if (validFor === 'Custom Date')
    return custom ? new Date(`${custom}T23:59:59`).toISOString() : null;
  const d = VALID_FOR.find((x) => x.label === validFor)?.days;
  return d ? new Date(Date.now() + d * 864e5).toISOString() : null;
}
const isoDay = (iso: string | null) => {
  const t = iso ? new Date(iso) : null;
  return !t || Number.isNaN(t.getTime())
    ? ''
    : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

interface Assoc {
  id: string;
  vehicleId: string;
  plateNo: string;
  geofenceId: string;
  geofenceName: string;
  zoneType: string;
  onEnter: boolean;
  onLeave: boolean;
  days: string[];
  validUntil: string | null;
  push: boolean;
  sms: boolean;
  smsList: string[];
  emailList: string[];
  email: boolean;
}

function Flag({ on, detail }: { on: boolean; detail?: string | null }) {
  const text = on ? (detail ? `Yes: ${detail}` : 'Yes') : 'No';
  return (
    <span className={`vm-flag ${on ? 'is-on' : ''}`} role="img" aria-label={text} title={text}>
      <Icon name={on ? 'Check' : 'Minus'} size={12} />
    </span>
  );
}
const yesNo = (b: boolean) => (b ? 'Yes' : 'No');

function columnsFor(zoneOf: (r: Assoc) => Zone | undefined): GridColumn<Assoc>[] {
  const speed = (r: Assoc) =>
    zoneOf(r)?.speedLimitKmh ? `${zoneOf(r)!.speedLimitKmh} km/h` : null;
  const height = (r: Assoc) => (zoneOf(r)?.heightM ? `${zoneOf(r)!.heightM} m` : null);
  const time = (r: Assoc) =>
    zoneOf(r)
      ?.intervals.map((t) => `${hhmm(t.from)} – ${hhmm(t.to)}`)
      .join(', ') || null;
  const flag = (
    key: string,
    label: string,
    width: number,
    f: (r: Assoc) => string | null,
  ): GridColumn<Assoc> => ({
    key,
    label,
    width,
    value: (r) => yesNo(f(r) !== null),
    render: (r) => <Flag on={f(r) !== null} detail={f(r)} />,
  });
  return [
    { key: 'plate', label: 'Plate No.', width: 88, strong: true, value: (r) => r.plateNo },
    { key: 'zone', label: 'Geozone Name', width: 112, value: (r) => r.geofenceName },
    flag('speed', 'Speed', 56, speed),
    flag('height', 'Height', 58, height),
    flag('time', 'Time', 50, time),
    {
      key: 'enter',
      label: 'On Enter',
      width: 64,
      value: (r) => yesNo(r.onEnter),
      render: (r) => <Flag on={r.onEnter} />,
    },
    {
      key: 'leave',
      label: 'On Leave',
      width: 66,
      value: (r) => yesNo(r.onLeave),
      render: (r) => <Flag on={r.onLeave} />,
    },
    { key: 'days', label: 'Days', width: 130, value: (r) => daysText(r.days) },
    {
      key: 'valid',
      label: 'Valid Till',
      width: 130,
      value: (r) => showDate(r.validUntil),
      sortValue: (r) => r.validUntil ?? '9999',
    },
    {
      key: 'type',
      label: 'Zone Type',
      width: 82,
      value: (r) => zoneTypeLabel(zoneOf(r)?.category ?? r.zoneType),
    },
  ];
}

export function GeoAssocModule({
  companyId,
  readOnly,
  picker,
}: {
  companyId: string;
  readOnly: boolean;
  picker: ReactNode;
  layout?: GridLayout;
  onLayout?: (l: GridLayout) => void;
}) {
  const canEdit = !readOnly;
  const assets = useVehicleAssets(companyId);
  const groups = useAssetGroups({ company_id: companyId });
  const links = useVehicleGeofences();
  const recipients = useNotificationRecipients({ source_table: SOURCE });
  const zonesQ = useZones(companyId);
  const save = useSaveBatch();
  const toast = useToast();
  const [layout, setLayout] = useState<GridLayout>(HIDDEN_BY_DEFAULT);
  const [editing, setEditing] = useState<Assoc | 'new' | null>(null);
  // IT-0039: View shows the zone on the map (as before) and opens the record read-only.
  const [viewing, setViewing] = useState(false);
  const [removing, setRemoving] = useState<Assoc | null>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [focus, setFocus] = useState<string | null>(null);
  const plate = useMemo(
    () => new Map((assets.data ?? []).map((a) => [a.id, a.plate_serial ?? a.name ?? a.id])),
    [assets.data],
  );
  const rows: Assoc[] = useMemo(
    () =>
      (links.data ?? [])
        .filter((l) => plate.has(l.asset_id) && zonesQ.byId.has(l.geofence_id))
        .map((l) => {
          const z = zonesQ.byId.get(l.geofence_id)!;
          return {
            id: `${l.asset_id}|${l.geofence_id}`,
            vehicleId: l.asset_id,
            plateNo: plate.get(l.asset_id)!,
            geofenceId: l.geofence_id,
            geofenceName: z.name,
            zoneType: z.category,
            onEnter: l.on_enter !== false,
            onLeave: l.on_leave !== false,
            days: (l.days ?? []).map((d) => d.toUpperCase()),
            validUntil: l.valid_till ?? null,
            push: l.notify_push !== false,
            sms: !!l.notify_sms,
            email: !!l.notify_email,
            ...listsOf(recipients.data, `${l.asset_id}|${l.geofence_id}`),
          };
        }),
    [links.data, plate, zonesQ.byId, recipients.data],
  );
  const zoneOf = (r: Assoc) => zonesQ.byId.get(r.geofenceId);
  const columns = useMemo(() => columnsFor((r) => zonesQ.byId.get(r.geofenceId)), [zonesQ.byId]);
  const selectedRows = rows.filter((r) => picked.has(r.id));
  const plotted = new Set(selectedRows.map((r) => r.geofenceId));
  const vehicleIds = assets.data ? new Set(assets.data.map((a) => a.id)) : null;
  const remove = (r: Assoc) =>
    save.mutate(
      {
        deletes: [
          {
            table: 'vehicle_geofences',
            keys: [{ asset_id: r.vehicleId, geofence_id: r.geofenceId }],
          },
          ...(recipientsOf(recipients.data, SOURCE, r.id).length
            ? [
                {
                  table: 'notification_recipients' as const,
                  keys: recipientsOf(recipients.data, SOURCE, r.id).map((x) => ({ id: x.id })),
                },
              ]
            : []),
        ],
      },
      {
        onSuccess: () => {
          toast.show('Association removed.');
          setRemoving(null);
        },
      },
    );
  return (
    <DataGrid
      picker={picker}
      rows={rows}
      rowKey={(r) => r.id}
      rowLabel={(r) => `${r.plateNo} · ${r.geofenceName}`}
      columns={columns}
      plural="Geo Associations"
      searchPlaceholder="Search plate or geozone..."
      addLabel="Associate Geofence"
      layout={layout}
      onLayout={setLayout}
      selection={{ selected: new Set(selectedRows.map((r) => r.id)), onChange: setPicked }}
      onView={(r) => {
        setPicked((s) => new Set(s).add(r.id));
        setFocus(r.geofenceId);
        setViewing(true);
        setEditing(r);
      }}
      viewTitle="View"
      onAdd={
        canEdit
          ? () => {
              setViewing(false);
              setEditing('new');
            }
          : undefined
      }
      onEdit={
        canEdit
          ? (r) => {
              setViewing(false);
              setEditing(r);
            }
          : undefined
      }
      onDelete={canEdit ? (r) => setRemoving(r) : undefined}
      loading={links.isPending || assets.isPending}
      error={links.error ?? assets.error}
      onRetry={() => void links.refetch()}
    >
      <AssocStats
        rows={links.isSuccess ? rows : null}
        vehicleIds={vehicleIds}
        categoryOf={(r) => zoneOf(r)?.category ?? r.zoneType}
      />
      <SelectedMap
        zones={zonesQ.zones}
        ids={plotted}
        focusId={focus && plotted.has(focus) ? focus : null}
        error={zonesQ.error}
        onRetry={() => void zonesQ.refetch()}
        pending={zonesQ.isPending}
        onFocus={(id) => setFocus((f) => (f === id ? null : id))}
        onRemove={(id) =>
          setPicked(
            (s) => new Set([...s].filter((k) => rows.find((r) => r.id === k)?.geofenceId !== id)),
          )
        }
      />
      {editing && (
        <ViewOnly title={viewing ? 'View Association' : null}>
        <AssocForm
          key={`${editing === 'new' ? 'new' : editing.id}:${viewing}`}
          companyId={companyId}
          recipients={recipients.data}
          row={editing === 'new' ? null : editing}
          zones={zonesQ.zones}
          zoneOf={zoneOf}
          vehicles={(assets.data ?? []).map((a) => ({
            id: a.id,
            plate: a.plate_serial ?? a.name ?? a.id,
            group: a.asset_group ?? null,
          }))}
          groups={(groups.data ?? []).map((g) => ({
            id: g.id,
            name: g.name,
            parentId: g.parent_id ?? null,
          }))}
          existing={rows}
          onClose={() => setEditing(null)}
          onSaved={(n, added) => {
            setEditing(null);
            toast.show(
              added ? `${n} association${n === 1 ? '' : 's'} saved.` : 'Association updated.',
            );
          }}
        />
        </ViewOnly>
      )}
      {removing && (
        <Confirm
          title="Remove this association?"
          confirmLabel="Remove"
          busyLabel="Removing…"
          busy={save.isPending}
          error={save.error ? save.error.message : null}
          message={`${removing.plateNo} is unbound from ${removing.geofenceName}; entering and leaving it no longer raises alerts.`}
          onCancel={() => {
            setRemoving(null);
            save.reset();
          }}
          onConfirm={() => remove(removing)}
        />
      )}
      {toast.node}
    </DataGrid>
  );
}

/** Summary tiles (original `F8` / `X8`). */
function AssocStats({
  rows,
  vehicleIds,
  categoryOf,
}: {
  rows: Assoc[] | null;
  vehicleIds: Set<string> | null;
  categoryOf: (r: Assoc) => string;
}) {
  const row = useRef<HTMLDivElement>(null);
  useSearchAlign(row, 0);
  const mapped =
    rows && vehicleIds
      ? new Set(rows.map((r) => r.vehicleId).filter((v) => vehicleIds.has(v))).size
      : null;
  const of = (c: string) => (rows ? rows.filter((r) => categoryOf(r) === c).length : null);
  const groups = [
    [
      { label: 'Total Vehicles', value: vehicleIds?.size ?? null, icon: 'Truck', tone: 'blue' },
      { label: 'Mapped Vehicles', value: mapped, icon: 'Link', tone: 'green' },
      {
        label: 'Unmapped Vehicles',
        value: mapped === null || !vehicleIds ? null : vehicleIds.size - mapped,
        icon: 'Unlink',
        tone: 'amber',
      },
    ],
    [
      {
        label: 'Preferred Zone Associations',
        value: of('PREFERRED'),
        icon: 'Hexagon',
        tone: 'purple',
      },
      { label: 'Restricted Zone Associations', value: of('RESTRICTED'), icon: 'Ban', tone: 'red' },
    ],
  ];
  return (
    <div
      ref={row}
      className="td-geo__stats vm-geo-stats vm-assoc-stats"
      role="group"
      aria-label="Association summary"
    >
      {groups.map((g) => (
        <section key={g[0]!.label} className={`td-geo__stat td-geo__stat--${g.length}`}>
          <div>
            {g.map((t) => (
              <div key={t.label} className="td-geo__tile">
                <span className={`td-geo__tile-icon tone-${t.tone}`}>
                  <Icon name={t.icon} size={20} />
                </span>
                <span>
                  <b>{t.label}</b>
                  <strong>{t.value ?? '—'}</strong>
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** "Selected Geofences" map beside the grid (original `aK`). */
function SelectedMap({
  zones,
  ids,
  focusId,
  error,
  pending,
  onRetry,
  onFocus,
  onRemove,
}: {
  zones: Zone[];
  ids: Set<string>;
  focusId: string | null;
  error: Error | null;
  pending: boolean;
  onRetry: () => void;
  onFocus: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const shown = useMemo(
    () =>
      zones.flatMap((z, i) => (ids.has(z.id) ? [{ ...z, tone: TONES[i % TONES.length]! }] : [])),
    [zones, ids],
  );
  const el = useRef<HTMLDivElement>(null);
  const { map, ready } = useLeaflet(el);
  const all = useRef<L.FeatureGroup | null>(null);
  const one = useRef<L.FeatureGroup | null>(null);
  const fitted = useRef<string | null>(null);
  const sig = shown.map((z) => z.id).join(',');
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !el.current) return;
    all.current?.remove();
    one.current = null;
    const css = getComputedStyle(el.current);
    const g = L.featureGroup();
    for (const z of shown) {
      const layer = draftLayer(z.shape, {
        tone: css.getPropertyValue(`--${z.tone}`).trim() || undefined,
        weak: focusId !== null && z.id !== focusId,
      });
      layer.bindTooltip(tip(z.name), { sticky: true }).addTo(g);
      if (z.id === focusId) one.current = layer;
    }
    all.current = g.addTo(m);
    const key = shown.length ? (focusId ?? sig) : null;
    if (key && key !== fitted.current) fitLayer(m, one.current ?? g);
    fitted.current = key;
  }, [sig, focusId, ready, map]); // eslint-disable-line react-hooks/exhaustive-deps
  const empty = error ? null : pending && ids.size ? (
    'Loading geofences…'
  ) : shown.length ? null : (
    <>
      <b>No geofence selected</b>Tick rows or use the eye button to plot their geofences
    </>
  );
  return (
    <section className="vm-geo-side" aria-label="Selected geofences">
      <header className="vm-geo-side__head">
        <h2>Selected Geofences</h2>
        <small>
          {shown.length} geofence{shown.length === 1 ? '' : 's'} plotted
        </small>
      </header>
      <div className="gp-mapbox vm-geo-side__map">
        <div ref={el} className="gp-mapbox__leaflet" />
        <GeoControls
          map={map}
          onFit={() =>
            map.current &&
            (one.current ?? all.current) &&
            fitLayer(map.current, one.current ?? all.current)
          }
        />
        {error && (
          <div className="vm-geo-side__error">
            <ErrorState message={error.message} onRetry={onRetry} />
          </div>
        )}
        {empty && <p className="vm-assoc__map-empty">{empty}</p>}
      </div>
      <div className="vm-geo-side__chips">
        {shown.length > 0 && (
          <ul aria-label="Plotted geofences">
            {shown.map((z) => (
              <li
                key={z.id}
                className={`vm-geo-side__chip tone-${z.tone} ${z.id === focusId ? 'is-on' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => onFocus(z.id)}
                  aria-pressed={z.id === focusId}
                  title={z.id === focusId ? 'Show all plotted geofences' : 'Zoom to this geofence'}
                >
                  <i aria-hidden="true" />
                  {z.name}
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(z.id)}
                  title="Remove from the map"
                  aria-label={`Remove ${z.name} from the map`}
                >
                  <Icon name="X" size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ vehicle picker (original `KD`) */

export interface GroupNode {
  id: string;
  name: string;
  children: GroupNode[];
  vehicles: { id: string; plate: string }[];
}
export function vehicleTree(
  vehicles: { id: string; plate: string; group: string | null }[],
  groups: { id: string; name: string; parentId: string | null }[],
): GroupNode[] {
  const byId = new Map<string, GroupNode>(
    groups.map((g) => [g.id, { id: g.id, name: g.name, children: [], vehicles: [] }]),
  );
  const byName = new Map(groups.map((g) => [g.name, g.id]));
  const loose: { id: string; plate: string }[] = [];
  for (const v of vehicles) {
    const gid = v.group ? byName.get(v.group) : undefined;
    (gid ? byId.get(gid)!.vehicles : loose).push({ id: v.id, plate: v.plate });
  }
  const roots: GroupNode[] = [];
  for (const g of groups)
    ((g.parentId ? byId.get(g.parentId)?.children : undefined) ?? roots).push(byId.get(g.id)!);
  if (loose.length)
    roots.push({
      id: '~none',
      name: byId.size ? 'Ungrouped' : 'All vehicles',
      children: [],
      vehicles: loose,
    });
  const sort = (l: GroupNode[]): GroupNode[] =>
    l
      .map((n) => ({
        ...n,
        children: sort(n.children),
        vehicles: [...n.vehicles].sort((a, b) =>
          a.plate.localeCompare(b.plate, undefined, { numeric: true }),
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  const prune = (l: GroupNode[]): GroupNode[] =>
    l
      .map((n) => ({ ...n, children: prune(n.children) }))
      .filter((n) => n.vehicles.length || n.children.length);
  return prune(sort(roots));
}
const squash = (s: string) => s.toLowerCase().replace(/\s/g, '');
const allIds = (n: GroupNode): string[] => [
  ...n.vehicles.map((v) => v.id),
  ...n.children.flatMap(allIds),
];
function filterTree(l: GroupNode[], q: string): GroupNode[] {
  if (!q) return l;
  return l
    .map((n) =>
      squash(n.name).includes(q)
        ? n
        : {
            ...n,
            children: filterTree(n.children, q),
            vehicles: n.vehicles.filter((v) => squash(v.plate).includes(q)),
          },
    )
    .filter((n) => n.vehicles.length || n.children.length);
}

export function VehiclePicker({
  groups,
  selected,
  onChange,
  disabled,
  placeholder = 'Search Plate Number',
}: {
  groups: GroupNode[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const [toggled, setToggled] = useState<Set<string>>(() => new Set());
  const query = squash(q.trim());
  const shown = filterTree(groups, query);
  const set = (ids: string[], on: boolean) => {
    const s = new Set(selected);
    ids.forEach((i) => (on ? s.add(i) : s.delete(i)));
    onChange(s);
  };
  const toggle = (id: string) =>
    setToggled((t) => {
      const n = new Set(t);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const node = (g: GroupNode, depth: number): ReactNode => {
    const ids = allIds(g);
    const on = ids.filter((i) => selected.has(i)).length;
    const open = query !== '' || depth <= 1 !== toggled.has(g.id);
    return (
      <div key={g.id} className="vm-pick__group" role="group" aria-label={g.name}>
        <div
          className={`vm-pick__node depth-${Math.min(depth, 2)}`}
          style={{ '--indent': `${depth * 14}px` } as React.CSSProperties}
        >
          <button
            type="button"
            className="vm-pick__chev"
            aria-expanded={open}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${g.name}`}
            onClick={() => toggle(g.id)}
          >
            <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={14} />
          </button>
          <label>
            <input
              type="checkbox"
              checked={on === ids.length}
              disabled={disabled}
              ref={(el) => {
                if (el) el.indeterminate = on > 0 && on < ids.length;
              }}
              onChange={() => set(ids, on !== ids.length)}
            />
            <b>{g.name}</b>
          </label>
          {on > 0 && (
            <small>
              {on}/{ids.length}
            </small>
          )}
        </div>
        {open && (
          <>
            {g.children.map((c) => node(c, depth + 1))}
            {g.vehicles.map((v) => (
              <label
                key={v.id}
                className={`vm-pick__leaf ${selected.has(v.id) ? 'is-on' : ''}`}
                style={{ '--indent': `${(depth + 1) * 14 + 22}px` } as React.CSSProperties}
              >
                <input
                  type="checkbox"
                  checked={selected.has(v.id)}
                  disabled={disabled}
                  onChange={(e) => set([v.id], e.target.checked)}
                />
                {v.plate}
              </label>
            ))}
          </>
        )}
      </div>
    );
  };
  return (
    <div className="vm-pick">
      <label className="vm-pick__search">
        <Icon name="Search" size={15} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label="Search vehicles"
        />
      </label>
      <small className="vm-pick__count">
        {selected.size === 1 ? '1 vehicle selected' : `${selected.size} vehicles selected`}
      </small>
      <div className="vm-pick__list vm-pick__tree" aria-label="Vehicles">
        {!shown.length && (
          <p className="vm-pick__empty">
            {q ? (
              <>
                <b>No matching plate</b>Try a different plate number.
              </>
            ) : (
              'No vehicles yet.'
            )}
          </p>
        )}
        {shown.map((g) => node(g, 0))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ form */

function CardHead({ icon, title, count }: { icon: string; title: string; count?: string }) {
  return (
    <header className="vm-assoc__head">
      <Icon name={icon} size={15} />
      <h3>{title}</h3>
      {count && <small>{count}</small>}
    </header>
  );
}
function Row({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <>
      <span className="vm-assoc__label">{label}</span>
      <div className="td-fx vm-assoc__value">
        {children}
        {error && <FieldError>{error}</FieldError>}
      </div>
    </>
  );
}
function DaysPicker({
  value,
  onChange,
  invalid,
}: {
  value: string[];
  onChange: (d: string[]) => void;
  invalid: boolean;
}) {
  const pop = usePop();
  const label =
    value.length === DAYS.length
      ? 'Every day'
      : value.length
        ? WEEK_ORDER.filter((d) => value.includes(d))
            .map((d) => DAY_NAME[d])
            .join(', ')
        : 'Select days';
  return (
    <div
      ref={pop.ref}
      className="vm-days"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && pop.open) {
          e.stopPropagation();
          pop.setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className={`td-ddl td-ddl--block ${value.length ? '' : 'is-placeholder'} ${pop.open ? 'is-open' : ''}`}
        aria-label="Days"
        aria-haspopup="true"
        aria-expanded={pop.open}
        aria-invalid={invalid}
        onClick={() => pop.setOpen(!pop.open)}
      >
        <span className="td-ddl__label">{label}</span>
        <Icon name="ChevronDown" size={15} className="td-ddl__chev" />
      </button>
      {pop.open && (
        <div className="vm-days__menu" role="group" aria-label="Days">
          {WEEK_ORDER.map((d) => (
            <Check
              key={d}
              checked={value.includes(d)}
              onChange={(on) => onChange(DAYS.filter((x) => (x === d ? on : value.includes(x))))}
            >
              {DAY_NAME[d]}
            </Check>
          ))}
        </div>
      )}
    </div>
  );
}

const SHAPES = [
  { value: 'all', label: 'All Shapes' },
  { value: 'CIRCLE', label: 'Circle' },
  { value: 'POLYGON', label: 'Freeform' },
];
const TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'PREFERRED', label: 'Preferred' },
  { value: 'RESTRICTED', label: 'Restricted' },
  { value: 'GENERAL', label: 'General' },
];
const STATUSES = [
  { value: 'all', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

function AssocForm({
  companyId,
  recipients,
  row,
  zones,
  zoneOf,
  vehicles,
  groups,
  existing,
  onClose,
  onSaved,
}: {
  companyId: string;
  recipients: NotificationRecipientsRow[] | undefined;
  row: Assoc | null;
  zones: Zone[];
  zoneOf: (r: Assoc) => Zone | undefined;
  vehicles: { id: string; plate: string; group: string | null }[];
  groups: { id: string; name: string; parentId: string | null }[];
  existing: Assoc[];
  onClose: () => void;
  onSaved: (n: number, added: boolean) => void;
}) {
  const save = useSaveBatch();
  const start = {
    zones: new Set(row ? [row.geofenceId] : []),
    vehicles: new Set(row ? [row.vehicleId] : []),
    validFor: row ? (row.validUntil ? 'Custom Date' : 'Forever') : 'Forever',
    customDate: row ? isoDay(row.validUntil) : '',
    days: row?.days ?? WEEKDAYS,
    onEnter: row?.onEnter ?? true,
    onLeave: row?.onLeave ?? true,
    push: row?.push ?? true,
    smsOn: !!row?.sms,
    sms: row?.smsList ?? ([] as string[]),
    smsDraft: '',
    emailOn: !!row?.email,
    emails: Array.from({ length: EMAIL_SLOTS }, (_, i) => row?.emailList[i] ?? ''),
  };
  const [v, setV] = useState(start);
  const [q, setQ] = useState('');
  const [shape, setShape] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const put = <K extends keyof typeof start>(k: K, val: (typeof start)[K]) =>
    setV((x) => ({ ...x, [k]: val }));
  const text = q.trim().toLowerCase();
  const list = zones.filter(
    (z) =>
      (!text || z.name.toLowerCase().includes(text)) &&
      (shape === 'all' || z.shape.kind === shape) &&
      (type === 'all' || z.category === type) &&
      (status === 'all' || z.status === status),
  );
  const onMap = useMemo(
    () =>
      zones
        .filter((z) => v.zones.has(z.id))
        .map((z) => ({ id: z.id, shape: z.shape, label: z.name })),
    [zones, v.zones],
  );
  const tree = useMemo(() => vehicleTree(vehicles, groups), [vehicles, groups]);
  const addSms = () => {
    const n = v.smsDraft.trim();
    if (!n) return;
    if (!/^\+?[0-9 ()-]{6,30}$/.test(n))
      return setErrors((e) => ({ ...e, sms: 'A phone number, e.g. +91 98400 11220' }));
    setErrors((e) => {
      const x = { ...e };
      delete x.sms;
      return x;
    });
    setV((x) => ({
      ...x,
      sms: x.sms.includes(n) ? x.sms : [...x.sms, n].slice(0, MAX_SMS),
      smsDraft: '',
    }));
  };
  const onSmsKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSms();
    }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!row && !v.zones.size) err.zones = 'Select at least one geofence zone.';
    if (!row && !v.vehicles.size) err.vehicles = 'Select at least one vehicle.';
    if (!v.days.length) err.days = 'Select at least one day.';
    if (v.validFor === 'Custom Date' && !v.customDate) err.validFor = 'Pick the last day';
    const mails = v.emailOn ? v.emails.map((m) => m.trim()).filter(Boolean) : [];
    if (mails.some((m) => !/^\S+@\S+\.\S+$/.test(m)))
      err.emails = 'A valid e-mail address, e.g. name@company.com';
    if (v.smsOn && !v.sms.length && !v.smsDraft.trim()) err.sms = 'Add at least one mobile number';
    setErrors(err);
    setBanner(null);
    if (Object.keys(err).length) return;
    const until = validUntil(v.validFor, v.customDate);
    const base = {
      valid_till: until ? until.slice(0, 10) : null,
      days: DAYS.filter((d) => v.days.includes(d)).map((d) => DAY_NAME[d]!),
      on_enter: v.onEnter,
      on_leave: v.onLeave,
      notify_push: v.push,
      notify_sms: v.smsOn,
      notify_email: v.emailOn,
      updated_at: new Date().toISOString(),
    };
    const pairs = row
      ? [[row.vehicleId, row.geofenceId]]
      : [...v.vehicles].flatMap((a) => [...v.zones].map((g) => [a, g]));
    // SMS numbers and e-mail addresses of each association (replaced, same transaction).
    const draft = v.smsDraft.trim();
    const numbers = v.smsOn ? [...v.sms, ...(draft && !v.sms.includes(draft) ? [draft] : [])] : [];
    const list: RecipientRow[] = [
      ...numbers.map((n): RecipientRow => ({ level: 0, channel: 'sms', address: n })),
      ...mails.map((m): RecipientRow => ({ level: 0, channel: 'email', address: m })),
    ];
    const batch: Batch = {
      upserts: [
        {
          table: 'vehicle_geofences',
          rows: pairs.map(([a, g]) => ({ asset_id: a, geofence_id: g, ...base })),
        },
      ],
    };
    pairs.forEach(([a, g]) =>
      saveRecipients(batch, recipients, {
        companyId,
        sourceTable: SOURCE,
        sourceId: `${a}|${g}`,
        rows: list,
      }),
    );
    try {
      await save.mutateAsync(batch);
      onSaved(pairs.length, !row || !existing.some((x) => x.id === row.id));
    } catch (x) {
      setBanner(x instanceof Error ? x.message : 'Request failed.');
    }
  };
  const zone = row ? zoneOf(row) : undefined;
  return (
    <Drawer
      title={row ? 'Edit Association' : 'Associate Geofence'}
      icon={row ? 'Pencil' : 'Plus'}
      subtitle={
        row
          ? `${row.plateNo} · ${row.geofenceName}`
          : 'Associate vehicles with existing geofences and configure their zone settings'
      }
      onClose={onClose}
      onReset={() => {
        setV(start);
        setErrors({});
        save.reset();
      }}
      submitLabel={row ? 'Save Changes' : 'Save Association'}
      submitting={save.isPending}
      formId="vm-assoc-form"
    >
      <div className="td-form__scroll">
        <form id="vm-assoc-form" className="vm-assoc" onSubmit={(e) => void submit(e)} noValidate>
          {banner && <Banner>{banner}</Banner>}
          <div className="vm-assoc__pick">
            {row ? (
              <section className="vm-assoc__card vm-assoc__info" aria-label="Association">
                <CardHead icon="Link" title="Association" />
                <dl className="vm-assoc__facts">
                  <dt>Plate No</dt>
                  <dd>{row.plateNo}</dd>
                  <dt>Geozone</dt>
                  <dd>{row.geofenceName}</dd>
                  <dt>Zone Type</dt>
                  <dd>{zoneTypeLabel(zone?.category ?? row.zoneType)}</dd>
                </dl>
              </section>
            ) : (
              <>
                <section className="vm-assoc__card vm-assoc__zones" aria-label="Geofences">
                  <CardHead icon="Hexagon" title="Geofences" count={`${v.zones.size} selected`} />
                  {errors.zones && <FieldError>{errors.zones}</FieldError>}
                  <div className="vm-assoc__filters">
                    <Select
                      small
                      value={shape}
                      onChange={setShape}
                      aria-label="Zone shape"
                      options={SHAPES}
                    />
                    <Select
                      small
                      value={type}
                      onChange={setType}
                      aria-label="Zone type"
                      options={TYPES}
                    />
                    <Select
                      small
                      value={status}
                      onChange={setStatus}
                      aria-label="Zone status"
                      options={STATUSES}
                    />
                  </div>
                  <label className="vm-pick__search">
                    <Icon name="Search" size={15} />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search zone…"
                      aria-label="Search zone"
                    />
                  </label>
                  <div className="vm-pick__list" role="group" aria-label="Geofences">
                    {!list.length && <p className="vm-pick__empty">No matching geofence.</p>}
                    {list.map((z) => (
                      <label
                        key={z.id}
                        className={`vm-pick__leaf ${v.zones.has(z.id) ? 'is-on' : ''}`}
                        title={z.name}
                      >
                        <input
                          type="checkbox"
                          checked={v.zones.has(z.id)}
                          onChange={(e) => {
                            const s = new Set(v.zones);
                            if (e.target.checked) s.add(z.id);
                            else s.delete(z.id);
                            put('zones', s);
                          }}
                        />
                        <span>{z.name}</span>
                      </label>
                    ))}
                  </div>
                </section>
                <section className="vm-assoc__card vm-assoc__veh" aria-label="Vehicles">
                  <CardHead icon="Truck" title="Vehicles" count={`${v.vehicles.size} selected`} />
                  {errors.vehicles && <FieldError>{errors.vehicles}</FieldError>}
                  <VehiclePicker
                    groups={tree}
                    selected={v.vehicles}
                    onChange={(s) => put('vehicles', s)}
                    placeholder="Search plate or group…"
                  />
                </section>
              </>
            )}
            <div className="vm-assoc__side">
              <section className="vm-assoc__card vm-assoc__mapcard" aria-label="Selected geofences">
                <CardHead
                  icon="Layers"
                  title="Selected Geofences"
                  count={`${onMap.length} geofence${onMap.length === 1 ? '' : 's'} plotted`}
                />
                <div className="vm-assoc__map">
                  <ZonesMap zones={onMap} selectedId={null} height="100%" />
                  {!onMap.length && (
                    <p className="vm-assoc__map-empty">
                      <b>No geofence selected</b>Pick zones above to plot them
                    </p>
                  )}
                </div>
              </section>
              <section className="vm-assoc__card vm-assoc__cfg" aria-label="Configuration">
                <CardHead icon="SlidersHorizontal" title="Configuration" />
                <div className="vm-assoc__rows">
                  <Row label="Valid For" error={errors.validFor}>
                    <Select
                      value={v.validFor}
                      onChange={(x) => put('validFor', x)}
                      options={VALID_FOR.map((x) => ({ value: x.label, label: x.label }))}
                      aria-label="Valid for"
                    />
                  </Row>
                  {v.validFor === 'Custom Date' && (
                    <Row label="Valid Till">
                      <input
                        type="date"
                        value={v.customDate}
                        min={new Date().toISOString().slice(0, 10)}
                        aria-label="Valid till"
                        aria-invalid={!!errors.validFor}
                        onChange={(e) => put('customDate', e.target.value)}
                      />
                    </Row>
                  )}
                  <Row label="Days" error={errors.days}>
                    <DaysPicker
                      value={v.days}
                      onChange={(d) => put('days', d)}
                      invalid={!!errors.days}
                    />
                  </Row>
                  <Row label="Alert">
                    <div className="vm-checks">
                      <Check checked={v.onEnter} onChange={(b) => put('onEnter', b)}>
                        On Enter
                      </Check>
                      <Check checked={v.onLeave} onChange={(b) => put('onLeave', b)}>
                        On Leave
                      </Check>
                    </div>
                  </Row>
                  <Row label="Notifications">
                    <div className="vm-checks">
                      <Check
                        className="vm-assoc__push"
                        checked={v.push}
                        onChange={(b) => put('push', b)}
                      >
                        Push
                      </Check>
                      <Check checked={v.smsOn} onChange={(b) => put('smsOn', b)}>
                        SMS
                      </Check>
                      <Check checked={v.emailOn} onChange={(b) => put('emailOn', b)}>
                        Email
                      </Check>
                    </div>
                    {(v.smsOn || v.emailOn) && (
                      <div className="vm-assoc__sub">
                        {v.smsOn && (
                          <>
                            <span>Mobile</span>
                            <div>
                              <div className="vm-chips">
                                {v.sms.map((n) => (
                                  <span key={n} className="vm-chip">
                                    {n}
                                    <button
                                      type="button"
                                      title="Remove"
                                      aria-label={`Remove ${n}`}
                                      onClick={() =>
                                        put(
                                          'sms',
                                          v.sms.filter((x) => x !== n),
                                        )
                                      }
                                    >
                                      <Icon name="X" size={12} />
                                    </button>
                                  </span>
                                ))}
                                <input
                                  type="tel"
                                  value={v.smsDraft}
                                  onChange={(e) => put('smsDraft', e.target.value)}
                                  onKeyDown={onSmsKey}
                                  onBlur={addSms}
                                  placeholder={
                                    v.sms.length ? 'Add another…' : 'e.g. +91 98400 11220'
                                  }
                                  aria-label="Mobile number"
                                />
                              </div>
                              {errors.sms ? (
                                <FieldError>{errors.sms}</FieldError>
                              ) : (
                                <small className="gp-hint">Press Enter after each number</small>
                              )}
                            </div>
                          </>
                        )}
                        {v.emailOn && (
                          <>
                            <span>Email</span>
                            <div>
                              <div className="vm-emails">
                                {v.emails.map((m, i) => (
                                  <input
                                    key={i}
                                    type="email"
                                    value={m}
                                    placeholder="name@company.com"
                                    aria-label={`Email ${i + 1}`}
                                    onChange={(e) =>
                                      put(
                                        'emails',
                                        v.emails.map((x, j) => (j === i ? e.target.value : x)),
                                      )
                                    }
                                  />
                                ))}
                              </div>
                              {errors.emails && <FieldError>{errors.emails}</FieldError>}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </Row>
                </div>
              </section>
            </div>
          </div>
        </form>
      </div>
    </Drawer>
  );
}
