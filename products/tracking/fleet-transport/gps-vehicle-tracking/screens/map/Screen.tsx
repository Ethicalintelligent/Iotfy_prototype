// IT-0036. Tracking › Map View, rebuilt in React from the owner's page
// (Map-View.html, removed in IT-0037 (git history), the reference): status tiles, the vehicle list with search and
// the "Vehicle Filters" panel, and the live Leaflet map (clusters, geofences, layer picker,
// share, Nearby Vehicles). Vehicles, operators, people, groups and geofences come from Neon;
// positions, speeds and sensor states are the original's demo generator applied to those
// vehicles, labelled "Demo data" (root CLAUDE.md §8).
// IT-0053 (Heeba's approved prototype IT-0046 / IT-0051): status pills in the header instead of the
// status tiles, map left and vehicle list right, the list's heading row replaced by a search row
// with the filter button, Tracking-style AC / Belt tags on the cards, and Grid View's extra filter
// options in the filter panel.
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { HeaderSlot, type ScreenContext } from '@iotify/app-kit';
import { ErrorState, Icon, Loading, SmartTrackPage } from '../smart-track/kit';
import './map.css';
import './map.fix.css';
import '../shared/header-26.css';
import './icons';
import {
  FilterButton,
  FilterPanel,
  NO_FILTER,
  STATUS_FIELD,
  VEHICLES_FIELD,
  passes,
  type Applied,
  type FilterField,
  type FilterSection,
  type PanelBox,
} from './FilterPanel';
import { StatusPills, type PillKey } from '../shared/StatusPills';
import {
  NO_EXTRAS,
  extrasCount,
  passesExtras,
  useGridRecords,
  type Extras,
} from '../shared/gridExtras';
import { extrasWords } from './FilterExtras';
import { LiveMap, type MapMarker } from './LiveMap';
import { NearbyChip, driverText, type NearbyKind, type Row } from './Nearby';
import type { ShareInfo } from './leaflet';
import {
  MARKER_STATUS,
  PROFILE_ORDER,
  STATUSES,
  ago,
  categoryOf,
  clock,
  clock12,
  fmt,
  guessCategory,
  sensorAttrs,
  statusOf,
  type StatusId,
  type Vehicle,
} from './model';
import { useFleetLive } from './useFleetLive';
import { indicatorsOf } from '../grid/cardLook';
import { useThemedTooltips } from '../grid/useThemedTooltips';
import type { DemoRecord } from '../grid/model';

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
 * The original makes the page exactly one window high (map down to the bottom edge). IT-0053: the
 * content starts 10px under the visible header controls (26px pills and search). The page frame
 * clips above its own top edge, so the frame itself moves up (map.fix.css `[data-vt-lift]`, with
 * the frame's margin and height as variables) and still ends at the window's bottom; then the
 * content is stretched down to the usual 8px bottom spacing.
 */
function useMapFit() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [liveTop, setLiveTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    const st = el?.closest<HTMLElement>('.st-map');
    const frame = st?.parentElement;
    if (!el || !st || !frame) return;
    const fit = () => {
      const header = document.querySelector('.ui-ph');
      const tpage = el.querySelector('.td-tpage');
      const ctl = [
        header?.querySelector('[aria-label="Vehicle status"]'),
        header?.querySelector('.ui-hsearch'),
      ]
        .filter((x): x is Element => !!x)
        .map((x) => x.getBoundingClientRect().bottom);
      if (!tpage || !ctl.length) return;
      const delta = Math.max(...ctl) + 10 - tpage.getBoundingClientRect().top;
      const mt = parseFloat(getComputedStyle(frame).marginTop) || 0;
      if (Math.abs(delta) >= 0.5 || frame.dataset.vtLift === undefined) {
        const top = frame.getBoundingClientRect().top + delta;
        frame.style.setProperty('--vt-mt', `${mt + delta}px`);
        frame.style.setProperty('--vt-h', `${window.innerHeight - top}px`);
        frame.dataset.vtLift = '';
      }
      const t = Math.round(el.getBoundingClientRect().top + window.scrollY);
      setLiveTop((p) => (p === t ? p : t));
    };
    let raf = 0;
    const later = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };
    fit();
    const header = document.querySelector('.ui-ph');
    const ro = new ResizeObserver(later);
    ro.observe(st);
    if (header) ro.observe(header);
    window.addEventListener('resize', later);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', later);
      delete frame.dataset.vtLift;
      frame.style.removeProperty('--vt-mt');
      frame.style.removeProperty('--vt-h');
    };
  }, [el]);
  return { ref: setEl, top: liveTop };
}

/* ------------------------------------------------------------------ header status pills */

/** Pill → the page's status filter (the one the former status tiles set). */
const PILL_STATUS: Partial<Record<PillKey, StatusId>> = {
  running: 'moving',
  stopped: 'stopped',
  idle: 'idle',
  notrans: 'offline',
  over: 'overspeed',
  towed: 'towed',
};

/** The header controls carry the page scope; its page rules must not apply to them. */
const HEADER_BOX = {
  lineHeight: 'normal',
  fontSize: 16,
  fontWeight: 400,
  fontVariantNumeric: 'normal',
  position: 'relative',
  height: 'auto',
  overflow: 'visible',
  background: 'transparent',
  alignItems: 'center',
  zIndex: 20,
  display: 'flex',
} as const;

/* ------------------------------------------------------------------ AC / belt tags */

/** Tracking's card tags (same colours, icons and words), built from the Grid View record. */
const TAG_LOOK = {
  blue: ['#E8F1FF', '#0363FF'],
  gray: ['#EEF0F2', '#4B5563'],
  green: ['#E9F7F0', '#009863'],
  red: ['#FDECEC', '#F90507'],
} as const;
function cardTags(r: DemoRecord | undefined) {
  if (!r) return [];
  const tags: { key: string; icon: string; text: string; tone: keyof typeof TAG_LOOK; title: string }[] = [];
  if (r.ac === 'On') tags.push({ key: 'ac', icon: 'Snowflake', text: 'AC On', tone: 'blue', title: 'AC: On' });
  else if (r.ac === 'Off')
    tags.push({ key: 'ac', icon: 'Snowflake', text: 'AC Off', tone: 'gray', title: 'AC: Off' });
  if (r.seatbelt === 'Fastened')
    tags.push({ key: 'belt', icon: 'Armchair', text: 'Belt Fastened', tone: 'green', title: 'Seatbelt: Fastened' });
  else if (r.seatbelt === 'Unfastened')
    tags.push({ key: 'belt', icon: 'Armchair', text: 'Belt Unfastened', tone: 'red', title: 'Seatbelt: Unfastened' });
  return tags;
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
  // IT-0044: the indicator icons (marker tooltips) show Grid View's dark tooltip.
  useThemedTooltips('.st-map .vh-mapview__ind');
  const { vehicles, positions, telemetry, now } = live;
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState<Applied>(NO_FILTER);
  const [status, setStatus] = useState<string>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const filterAnchor = useRef<HTMLSpanElement>(null);
  const liveTop = useMapFit();
  // IT-0053: Grid View's added filter options, matched on each vehicle's Grid View record.
  const [extras, setExtras] = useState<Extras>(NO_EXTRAS);
  const grid = useGridRecords(companyId, assetGroup);
  const gridByName = useMemo(
    () => new Map([...grid.byId.values()].map((r) => [r.name, r])),
    [grid.byId],
  );
  const gridRecord = (id: string, name: string) => grid.byId.get(id) ?? gridByName.get(name);

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
    passes({ id: r.id, name: r.name, attrs: attrs(r), status: r.status.id }, applied) &&
    passesExtras(gridRecord(r.id, r.name), extras);

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
    (applied.picked !== null ? 1 : 0) +
    extrasCount(extras);
  const filtered = filterCount > 0;
  const words = [...filterWords(fields, applied, status), ...extrasWords(extras, grid.geofences)];
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

  // Header pills: the former tiles' counts (vehicles passing search and filters, before status).
  const pillCounts: Partial<Record<PillKey, number>> = {
    all: matching.length + neverCount,
    ytt: neverCount,
  };
  (Object.keys(PILL_STATUS) as PillKey[]).forEach(
    (k) => (pillCounts[k] = counts[PILL_STATUS[k]!] ?? 0),
  );
  const activePill =
    (Object.keys(PILL_STATUS) as PillKey[]).find((k) => PILL_STATUS[k] === statusFilter) ?? 'all';
  // Same as the tiles: All and Yet to Transmit clear the status, a picked status toggles.
  const pickPill = (k: PillKey) => {
    const id = PILL_STATUS[k];
    setStatus(!id || status === id ? 'all' : id);
  };
  // IT-0055 (Heeba's approved prototype): the panel opens to the left of the filter button, its
  // top level with the button's, 8px from it, and ends 12px above the window's bottom.
  const placePanel = (): PanelBox | null => {
    const a = filterAnchor.current;
    const b = a?.querySelector('button') ?? a;
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const top = Math.round(r.top);
    return {
      right: Math.round(r.left - 8),
      top,
      height: Math.round(document.documentElement.clientHeight - top - 12),
    };
  };

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
      indicators: deviceIndicators(live.records.get(r.id)),
      vehicle: {
        plate: plate(r.id) ?? byId.get(r.id)?.name ?? '',
        img: categoryOf(byId.get(r.id))?.image,
        status: MARKER_STATUS[r.status.id],
        speed,
        label: true,
        selected: selected === r.id,
        statusLabel: r.status.label,
        ripple: true,
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
      <HeaderSlot side="left">
        <section aria-label="Status filter" className="st-map" data-st="" style={HEADER_BOX}>
          <StatusPills page="map" active={activePill} counts={pillCounts} onPick={pickPill} />
        </section>
      </HeaderSlot>
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
          <div className="td-tpage">
            <section className="td-card  td-tpage__list has-cfilter ">
              <div className="td-card__body ">
                {/* IT-0053: no heading row; search (with the demo label, §8) and the filter button */}
                <div className="vt-map-searchrow">
                  <label className="td-gv__search">
                    <Icon name="Search" size={15} />
                    <input
                      id="gp-live-VEHICLE-q"
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search…"
                      title="Search vehicles"
                      aria-label="Search vehicles"
                    />
                    <span
                      className="vt-map-demo"
                      title="Positions, trips and readings on this page are generated demo activity"
                    >
                      Demo data
                    </span>
                  </label>
                  <span ref={filterAnchor} className="vt-map-filter">
                    <FilterButton
                      count={filterCount}
                      open={filterOpen}
                      onClick={() => setFilterOpen((o) => !o)}
                      title="Vehicle Filters"
                      height={34}
                      iconSize={14}
                      showCount={false}
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
                      placeAt={placePanel}
                      extras={{ applied: extras, geofences: grid.geofences }}
                      onApply={(f, s, x) => {
                        setApplied(f);
                        setStatus(s);
                        setExtras(x);
                        setFilterOpen(false);
                      }}
                      onReset={() => {
                        setApplied(NO_FILTER);
                        setStatus('all');
                        setExtras(NO_EXTRAS);
                        setFilterOpen(false);
                      }}
                      onClose={() => setFilterOpen(false)}
                    />
                  )}
                </div>
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
                        record={live.records.get(r.id)}
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

/**
 * IT-0044 (was GPS / GSM / battery only, IT-0041): the Grid View card's indicator icons for a
 * vehicle (GPS, battery, external power, GSM, ignition, AC, seat belt, front and back door), with
 * its colour rules and texts, from the same demo record as its Grid View card. The card's alert
 * bell is left out, as the developer asked.
 */
function deviceIndicators(r: DemoRecord | undefined) {
  return r ? indicatorsOf(r).filter((i) => i.key !== 'alert') : [];
}

/** One vehicle in the list: picture, name, operator, state and the AC / belt tags. */
function VehicleItem({
  row,
  vehicle,
  driver,
  record,
  active,
  onSelect,
  now,
}: {
  row: Row;
  vehicle: Vehicle | undefined;
  driver: string;
  record: DemoRecord | undefined;
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
  const tags = cardTags(record);
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
      {/* IT-0053 (owner's request, reverses IT-0044's icon row): Tracking's AC / Belt tags */}
      {tags.length > 0 && (
        <span className="td-tpage__extra">
          {tags.map((t) => (
            <span
              key={t.key}
              className="vt-mini"
              title={t.title}
              style={{ background: TAG_LOOK[t.tone][0], color: TAG_LOOK[t.tone][1] }}
            >
              <Icon name={t.icon} size={11} />
              {t.text}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
