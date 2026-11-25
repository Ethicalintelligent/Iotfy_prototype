// IT-0036. Tracking › Map View, rebuilt in React from the owner's page
// (Map-View.html, removed in IT-0037 (git history), the reference): status tiles, the vehicle list with search and
// the "Vehicle Filters" panel, and the live Leaflet map (clusters, geofences, layer picker,
// share, Nearby Vehicles). Vehicles, operators, people, groups and geofences come from Neon;
// positions, speeds and sensor states are the original's demo generator applied to those
// vehicles, labelled "Demo data" (root CLAUDE.md §8).
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ScreenContext } from '@iotify/app-kit';
import { ErrorState, Icon, Loading, SmartTrackPage } from '../smart-track/kit';
import './map.css';
import './map.fix.css';
import './icons';
import {
  FilterButton,
  FilterPanel,
  NO_FILTER,
  SearchBox,
  STATUS_FIELD,
  VEHICLES_FIELD,
  passes,
  type Applied,
  type FilterField,
  type FilterSection,
} from './FilterPanel';
import { LiveMap, type MapMarker } from './LiveMap';
import { NearbyChip, driverText, type NearbyKind, type Row } from './Nearby';
import type { ShareInfo } from './leaflet';
import {
  MARKER_STATUS,
  PROFILE_ORDER,
  STATUSES,
  TILE_ORDER,
  ago,
  categoryOf,
  clock,
  clock12,
  fmt,
  guessCategory,
  sensorAttrs,
  sensorChips,
  statusOf,
  type StatusId,
  type Vehicle,
} from './model';
import { useFleetLive } from './useFleetLive';

/* ------------------------------------------------------------------ pictures */

function Img({
  src,
  alt,
  width,
  height,
  className,
  fallback,
}: {
  src?: string;
  alt: string;
  width: number;
  height: number;
  className: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return !src || failed === src ? (
    <>{fallback}</>
  ) : (
    <img
      className={`td-img ${className}`}
      src={src}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      onError={() => setFailed(src)}
    />
  );
}

/** The guessed vehicle picture, or a truck outline when there is none. */
function EntityMedia({ v, size }: { v: Vehicle | undefined; size: number }) {
  const thumb = (
    <span
      className="td-vthumb"
      style={{ width: Math.round(size * 0.8) * 1.4, height: Math.round(size * 0.8) }}
    >
      <Icon name="Truck" size={Math.round(size * 0.8) * 0.62} strokeWidth={1.6} />
    </span>
  );
  return (
    <Img
      src={guessCategory(v).image}
      alt=""
      width={Math.round(size * 1.4)}
      height={size}
      className="td-entity-media"
      fallback={thumb}
    />
  );
}

/**
 * The original makes the page exactly one window high (map down to the bottom edge). Inside
 * the IoTIFY shell the header sits above it, so the height is measured from where the page
 * really starts.
 */
function useLiveTop() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [top, setTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!el) return;
    const measure = () => setTop(Math.round(el.getBoundingClientRect().top + window.scrollY));
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [el]);
  return { ref: setEl, top };
}

/* ------------------------------------------------------------------ status tiles */

interface Tile {
  id: string;
  label: string;
  value: number;
  icon: string;
  tone: string;
  selectable: boolean;
}

function Tiles({
  tiles,
  selected,
  onSelect,
}: {
  tiles: Tile[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div
      className="td-tiles td-tiles--fixed td-tiles--compact"
      style={{ ['--cols' as string]: tiles.length, ['--min' as string]: '118px' }}
    >
      {tiles.map((t) => {
        const active = selected === t.id;
        const body = (
          <>
            <span className={`td-badge td-badge--solid td-badge--lg tone-${t.tone}`}>
              <Icon name={t.icon} size={20} />
            </span>
            <span className="td-tile__label">{t.label}</span>
            <span className="td-tile__value">{fmt(t.value)}</span>
          </>
        );
        return t.selectable ? (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            className={`td-tile tone-${t.tone} is-clickable ${active ? 'is-active' : ''}`}
            onClick={() => onSelect(active ? null : t.id)}
          >
            {body}
          </button>
        ) : (
          <button
            key={t.id}
            type="button"
            className={`td-tile tone-${t.tone} is-clickable`}
            onClick={() => onSelect(null)}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ filters */

const NONE_YET = 'None assigned yet';
const ON_OFF_LABELS = new Set(['On', 'Off', 'Open', 'Closed', 'Not reported']);
const SECTIONS: FilterSection[] = [
  { title: 'People', fields: ['manager', 'supervisor', 'operator'] },
  { title: 'Vehicle', fields: ['type', STATUS_FIELD] },
  { title: 'Sensors', fields: ['ac', 'ignition', 'seatbelt', 'door'], toggles: true },
];

const sortedUnique = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

/** The applied filters in words, for the "Filtered:" line. */
function filterWords(fields: FilterField[], f: Applied, status: string) {
  const byId = new Map(fields.map((x) => [x.id, x]));
  const order = [
    ...SECTIONS.flatMap((s) => s.fields),
    ...fields.map((x) => x.id).filter((id) => !SECTIONS.some((s) => s.fields.includes(id))),
  ];
  const picked = f.picked ? [`${f.picked.length} vehicle${f.picked.length === 1 ? '' : 's'}`] : [];
  return [
    ...order.flatMap((k) => {
      if (k === STATUS_FIELD)
        return (status !== 'all' ? [status] : (f.statuses ?? [])).map(
          (s) => STATUSES[s as StatusId].label,
        );
      if (k === VEHICLES_FIELD) return picked;
      const field = byId.get(k);
      return field
        ? (f.fields[field.id] ?? []).map((v) => (ON_OFF_LABELS.has(v) ? `${field.label} ${v}` : v))
        : [];
    }),
    ...picked,
  ];
}

/* ------------------------------------------------------------------ page */

export default function MapViewScreen({ companyId, assetGroup }: ScreenContext) {
  const live = useFleetLive(companyId, assetGroup);
  const { vehicles, positions, telemetry, now } = live;
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState<Applied>(NO_FILTER);
  const [status, setStatus] = useState<string>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const filterAnchor = useRef<HTMLSpanElement>(null);
  const liveTop = useLiveTop();

  const byId = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const rows = useMemo<Row[]>(
    () =>
      positions.map((p) => {
        const v = byId.get(p.assetId);
        return {
          id: p.assetId,
          name: v?.name ?? `Vehicle ${p.assetId.slice(0, 8)}`,
          position: p,
          status: statusOf(p, now, v?.speedLimitKmh),
        };
      }),
    [positions, byId, now],
  );
  const rowById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const plate = (id: string) => byId.get(id)?.plateNo ?? undefined;
  const driverOf = (id: string) => {
    const op = byId.get(id)?.operator;
    return {
      name: op?.name || undefined,
      id: op?.tagId || undefined,
      phone: op?.phone || undefined,
    };
  };

  /* ---- filter fields and each vehicle's values */
  const fields = useMemo<FilterField[]>(() => {
    const person = (
      id: string,
      label: string,
      icon: string,
      values: string[],
      placeholder: string,
    ): FilterField => ({
      id,
      label,
      icon,
      options: values,
      placeholder: values.length ? placeholder : NONE_YET,
    });
    return [
      person(
        'manager',
        'Fleet Manager',
        'Network',
        sortedUnique(vehicles.map((v) => v.fleetManager)),
        'Select Fleet Manager',
      ),
      person(
        'supervisor',
        'Supervisor',
        'Users',
        sortedUnique(vehicles.map((v) => v.supervisor)),
        'Select Supervisor',
      ),
      person(
        'operator',
        'Vehicle Operator',
        'UserRound',
        sortedUnique(vehicles.map((v) => v.operator?.name.trim() ?? '')),
        'Select vehicle Operator',
      ),
      {
        id: 'type',
        label: 'Vehicle Type',
        icon: 'Box',
        options: [...new Set(vehicles.map((v) => guessCategory(v).label))].sort(),
      },
      { id: 'ac', label: 'AC', icon: 'Snowflake', options: ['On', 'Off'] },
      { id: 'seatbelt', label: 'Seat Belt', icon: 'Armchair', options: ['Fastened', 'Unfastened'] },
      { id: 'door', label: 'Door', icon: 'DoorOpen', options: ['Open', 'Closed'] },
      {
        id: 'ignition',
        label: 'Ignition',
        icon: 'KeyRound',
        options: ['On', 'Off', 'Not reported'],
      },
    ];
  }, [vehicles]);

  const attrs = (r: Row): Record<string, string> => {
    const v = byId.get(r.id);
    const ign = r.position?.ignition;
    return {
      ignition: ign == null ? 'Not reported' : ign ? 'On' : 'Off',
      manager: v?.fleetManager ?? '',
      supervisor: v?.supervisor ?? '',
      operator: v?.operator?.name.trim() ?? '',
      type: v ? guessCategory(v).label : '',
      ...sensorAttrs(telemetry.get(r.id)),
    };
  };
  const groupOf = (id: string) => (live.hasGroups ? byId.get(id)?.group || 'Ungrouped' : undefined);

  const q = search.trim().toLowerCase();
  const keep = (r: Row) =>
    (!q ||
      `${r.name} ${plate(r.id) ?? ''} ${driverText(driverOf(r.id))}`.toLowerCase().includes(q)) &&
    passes({ id: r.id, name: r.name, attrs: attrs(r), status: r.status.id }, applied);

  const matching = rows.filter(keep);
  const reporting = new Set(positions.map((p) => p.assetId));
  const neverCount = vehicles.filter(
    (v) =>
      !reporting.has(v.id) &&
      keep({ id: v.id, name: v.name, position: null, status: STATUSES.never }),
  ).length;
  const statusFilter = status === 'all' ? null : status;
  const shown = matching
    .filter((r) => !statusFilter || r.status.id === statusFilter)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const counts = { moving: 0, stopped: 0, idle: 0, overspeed: 0, towed: 0, offline: 0 } as Record<
    string,
    number
  >;
  matching.forEach((r) => (counts[r.status.id] = (counts[r.status.id] ?? 0) + 1));

  const filterCount =
    (status !== 'all' || applied.statuses?.length ? 1 : 0) +
    Object.values(applied.fields).filter((v) => v.length > 0).length +
    (applied.picked !== null ? 1 : 0);
  const filtered = filterCount > 0;
  const words = filterWords(fields, applied, status);
  const statusOptions = PROFILE_ORDER.map((id) => ({
    id,
    label: `${STATUSES[id].label} (${fmt(rows.filter((r) => r.status.id === id).length)})`,
  }));

  if (live.loading)
    return (
      <SmartTrackPage scope="st-map">
        <Loading label="Loading live vehicles…" />
      </SmartTrackPage>
    );
  if (live.error)
    return (
      <SmartTrackPage scope="st-map">
        <ErrorState message={live.error.message} onRetry={live.refetch} />
      </SmartTrackPage>
    );

  const tiles: Tile[] = [
    {
      id: 'all',
      label: 'All',
      value: matching.length + neverCount,
      icon: 'Truck',
      tone: 'gray',
      selectable: false,
    },
    ...TILE_ORDER.map((id) => ({
      id,
      label: STATUSES[id].label,
      value: id === 'never' ? neverCount : (counts[id] ?? 0),
      icon: STATUSES[id].icon,
      tone: STATUSES[id].tone,
      selectable: id !== 'never',
    })),
  ];

  const kind: NearbyKind = {
    code: (r) => plate(r.id),
    driverOf,
    marker: (id) => ({
      plate: plate(id) ?? byId.get(id)?.name ?? '',
      img: categoryOf(byId.get(id))?.image,
    }),
    media: (id, size) => {
      const v = byId.get(id);
      const cat = categoryOf(v);
      const fallback = <EntityMedia v={v} size={size} />;
      return cat ? (
        <Img
          src={cat.image}
          alt={cat.label}
          width={33}
          height={33}
          className="vh-nearby__img"
          fallback={fallback}
        />
      ) : (
        fallback
      );
    },
  };

  const markers: MapMarker[] = shown.map((r) => {
    const p = r.position!;
    const speed = Math.round(p.speed ?? 0);
    return {
      id: r.id,
      lat: p.lat,
      lng: p.lng,
      tone: r.status.tone,
      title: r.name,
      sub: `${r.status.label} · ${fmt(speed)} km/h · ${ago(p.ts, now)}`,
      vehicle: {
        plate: plate(r.id) ?? byId.get(r.id)?.name ?? '',
        img: categoryOf(byId.get(r.id))?.image,
        status: MARKER_STATUS[r.status.id],
        speed,
        label: true,
      },
    };
  });

  const picked = selected ? rowById.get(selected) : undefined;
  let share: ShareInfo | null = null;
  if (picked?.position) {
    const p = picked.position;
    const speed = Math.round(p.speed ?? 0);
    const at = Date.parse(p.ts);
    const s = picked.status;
    const statusLine =
      s.id === 'moving' || s.id === 'overspeed' || s.id === 'towed'
        ? `${s.label} · ${speed} km/h · at ${clock12(at)}`
        : s.id === 'offline'
          ? `Last seen at ${clock12(at)}`
          : `${s.label} · at ${clock12(at)}`;
    share = {
      plate: plate(picked.id) ?? byId.get(picked.id)?.name ?? '',
      lat: p.lat,
      lng: p.lng,
      statusLine,
    };
  }
  const updated = live.updatedAt ? clock(live.updatedAt) : '—';

  return (
    <SmartTrackPage scope="st-map">
      <div className="vh-mapview">
        <div
          className="gp-live"
          ref={liveTop.ref}
          // window px → page px: the page frame may be zoomed (--st-unzoom = 1 / zoom)
          style={
            liveTop.top == null
              ? undefined
              : {
                  minHeight: `calc((100dvh - ${liveTop.top}px) * var(--st-unzoom, 1) - var(--vh-space-section))`,
                }
          }
        >
          <Tiles
            tiles={tiles}
            selected={statusFilter}
            onSelect={(id) => setStatus(id === null || id === 'all' || id === 'never' ? 'all' : id)}
          />
          <div className="td-tpage">
            <section className="td-card  td-tpage__list has-cfilter ">
              <header className="td-card__head">
                <span className="td-badge td-badge--solid tone-brand">
                  <Icon name="Truck" size={16} />
                </span>
                <div className="td-card__titles">
                  <h2 className="td-card__title ">Vehicles</h2>
                </div>
                <div className="td-card__right">
                  <span
                    className="td-card__meta"
                    title="Positions, speeds and sensor states are generated demo activity"
                  >
                    Demo data
                  </span>
                  <span className="td-card__meta">
                    {filtered ? `${fmt(shown.length)} / ${fmt(rows.length)}` : fmt(rows.length)}
                  </span>
                  <span ref={filterAnchor} className="td-tpage__cfbtn">
                    <FilterButton
                      count={filterCount}
                      open={filterOpen}
                      onClick={() => setFilterOpen((o) => !o)}
                      title="Vehicle Filters"
                    />
                  </span>
                  {filterOpen && (
                    <FilterPanel
                      id="gp-live-VEHICLE"
                      title="Vehicle Filters"
                      entity="Vehicle"
                      fields={fields}
                      statuses={statusOptions}
                      markers={rows.map((r) => ({
                        id: r.id,
                        name: r.name,
                        code: plate(r.id),
                        group: groupOf(r.id),
                      }))}
                      applied={applied}
                      status={status}
                      sections={SECTIONS}
                      anchor={filterAnchor}
                      section={() => filterAnchor.current?.closest('.td-tpage__list')}
                      onApply={(f, s) => {
                        setApplied(f);
                        setStatus(s);
                        setFilterOpen(false);
                      }}
                      onReset={() => {
                        setApplied(NO_FILTER);
                        setStatus('all');
                        setFilterOpen(false);
                      }}
                      onClose={() => setFilterOpen(false)}
                    />
                  )}
                </div>
              </header>
              <div className="td-card__body ">
                <SearchBox
                  id="gp-live-VEHICLE-q"
                  value={search}
                  onChange={setSearch}
                  placeholder="Search vehicles…"
                />
                {filtered && (
                  <p
                    className="td-tpage__filtered"
                    title={`Filtered: ${words.join(', ')} · ${fmt(shown.length)} shown`}
                  >
                    <span>Filtered:</span>
                    <b>{words.join(', ')}</b>
                    <span>· {fmt(shown.length)} shown</span>
                  </p>
                )}
                <ul className="td-tpage__items">
                  {shown.map((r) => (
                    <li key={r.id}>
                      <VehicleItem
                        row={r}
                        vehicle={byId.get(r.id)}
                        driver={driverText(driverOf(r.id))}
                        chips={sensorChips(telemetry.get(r.id), r.position?.ignition ?? null)}
                        active={selected === r.id}
                        onSelect={() => setSelected(r.id)}
                        now={now}
                      />
                    </li>
                  ))}
                  {!shown.length && (
                    <li className="td-trk__none">
                      {positions.length
                        ? 'No vehicles match the search or filters.'
                        : 'No vehicles reporting yet.'}
                    </li>
                  )}
                </ul>
              </div>
            </section>
            <section className="td-card gp-mapcard">
              <LiveMap
                markers={markers}
                selectedId={selected}
                onSelect={setSelected}
                height="calc(100dvh - 300px)"
                label="Live vehicles map"
                share={share}
                zones={live.zones}
                clusterTitle={(n) => `${fmt(n)} vehicles`}
                overlay={
                  <div className="td-live__top">
                    {picked && (
                      <NearbyChip key={picked.id} kind={kind} row={picked} rows={rows} now={now} />
                    )}
                    <div
                      className="td-trk__chip"
                      title="Receiving live updates; the map refreshes every 5 seconds"
                    >
                      <i className="td-live-dot" />
                      <span>Live · Updated {updated}</span>
                      <button
                        type="button"
                        className="td-trk__chipbtn"
                        onClick={live.flush}
                        aria-label="Refresh"
                        title="Show the positions received since the last refresh"
                      >
                        <Icon name="RotateCcw" size={13} />
                      </button>
                    </div>
                  </div>
                }
              />
            </section>
          </div>
        </div>
      </div>
    </SmartTrackPage>
  );
}

/** One vehicle in the list: picture, name, operator, state and sensor chips. */
function VehicleItem({
  row,
  vehicle,
  driver,
  chips,
  active,
  onSelect,
  now,
}: {
  row: Row;
  vehicle: Vehicle | undefined;
  driver: string;
  chips: ReturnType<typeof sensorChips>;
  active: boolean;
  onSelect: () => void;
  now: number;
}) {
  const p = row.position;
  const last =
    p &&
    `Last update: ${ago(p.ts, now)}${row.status.id === 'offline' ? '' : ` · ${fmt(Math.round(p.speed ?? 0))} km/h`}`;
  const cat = categoryOf(vehicle);
  const fallback = <EntityMedia v={vehicle} size={30} />;
  const s = Math.round(30 * 0.8);
  return (
    <button
      type="button"
      className={`td-tpage__item tone-${row.status.tone} ${active ? 'is-active' : ''}`}
      aria-pressed={active}
      onClick={onSelect}
    >
      {cat ? (
        <Img
          src={cat.image}
          alt={cat.label}
          width={s * 1.4}
          height={s}
          className="vh-tracking__img"
          fallback={fallback}
        />
      ) : (
        fallback
      )}
      <span className="td-gv-card__who">
        <strong>{row.name}</strong>
        <small title={driver}>{driver}</small>
      </span>
      <span className="td-tpage__state" title={last || undefined}>
        <i className="td-dot" />
        {row.status.label}
      </span>
      <span className="td-tpage__extra">
        {chips.map((c) => (
          <span key={c.key} className={`vt-mini tone-${c.tone}`} title={c.title}>
            <Icon name={c.icon} size={11} />
            {c.text}
          </span>
        ))}
      </span>
    </button>
  );
}
