// IT-0036. Dashboard, rebuilt in React from the owner's page (Dashboard.html, removed in IT-0037 (git history), the
// reference): the same 14 widgets, texts, period pickers, map, filters and pop-ups. Vehicles,
// operators, groups and geofences come from Neon (fleet.ts); positions, trips, report figures and
// alerts are the original's demo generators applied to those vehicles (demo.ts), labelled demo.
import { useEffect, useMemo, useState } from 'react';
import type { ScreenContext } from '@iotify/app-kit';
import { ErrorState, Loading, SmartTrackPage, registerIcons } from '../smart-track/kit';
import { PAGE_ICONS } from './page-icons';
import {
  ALERT_TYPES,
  DEFAULT_LIMIT,
  STATUS,
  STATUS_ORDER,
  ago,
  alertHistory,
  daySegments,
  driverBehaviour,
  executiveSummary,
  startPosition,
  statusOf,
  step,
  type Position,
  type Status,
  type StatusId,
  type SummaryRow,
} from './demo';
import { inZone, useFleet, type Vehicle } from './fleet';
import { TrackingWidget, type FilterField, type Marker } from './tracking';
import { RANK_IMAGES as RANK, UNUSED_IMAGES } from './vehicle-types';
import {
  BarChartWidget,
  BucketsWidget,
  CarouselWidget,
  DistributionWidget,
  HBarsWidget,
  HeatTableWidget,
  KpiBarsWidget,
  RankTableWidget,
  StatsWidget,
  Ticker,
  TimelineWidget,
  Unavailable,
  type CarouselItem,
  type Period,
  type RankRow,
  type TimelineRow,
  type WidgetHead,
} from './widgets';
import { fmt } from './controls';
import './dash.css';
import './dash.fix.css';

registerIcons(PAGE_ICONS);

const HOUR = 3_600_000;
const DAY = 86_400_000;

/* ------------------------------------------------------------------ dates and periods */

const midnight = (offsetDays = 0, from = new Date()) => {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.getTime();
};

interface Range {
  from: number;
  to: number;
  days: number;
}

const PERIODS = [
  { id: 'YESTERDAY', label: 'Yesterday' },
  { id: 'LAST_7', label: 'Last 7 Days' },
  { id: 'LAST_30', label: 'Last 30 Days' },
  { id: 'LAST_MONTH', label: 'Last Month' },
];
const DIST_PERIODS = [
  { id: 'TODAY', label: 'Today' },
  { id: 'YESTERDAY', label: 'Yesterday' },
  { id: 'LAST_7', label: 'Last 7 Days' },
  { id: 'LAST_30', label: 'Last 30 Days' },
];
const LIVE = 'LIVE';

function rangeOf(id: string, now = Date.now()): Range | null {
  if (id === LIVE) return null;
  const today = midnight(0);
  if (id === 'TODAY') {
    const q = 15 * 60_000;
    return { from: today, to: Math.max(today + 60_000, Math.floor(now / q) * q), days: 1 };
  }
  if (id === 'LAST_MONTH') {
    const first = new Date(today);
    first.setDate(1);
    const prev = new Date(first);
    prev.setMonth(prev.getMonth() - 1);
    return {
      from: prev.getTime(),
      to: first.getTime(),
      days: Math.round((first.getTime() - prev.getTime()) / DAY),
    };
  }
  const days = id === 'YESTERDAY' ? 1 : id === 'LAST_7' ? 7 : 30;
  return { from: midnight(-days), to: today, days };
}

/** The original's period picker: "Live" (when allowed) and the past periods. */
function usePeriod(live: boolean, initial = 'YESTERDAY', options = PERIODS) {
  const [value, setValue] = useState(initial);
  const control: Period = {
    options: [...(live ? [{ id: LIVE, label: 'Live' }] : []), ...options],
    value,
    onChange: setValue,
    liveId: live ? LIVE : undefined,
  };
  return { value, isLive: value === LIVE, range: rangeOf(value), control };
}

/* ------------------------------------------------------------------ report totals */

interface Totals {
  id: string;
  days: number;
  distanceKm: number;
  maxSpeed: number;
  odometerKm: number | null;
  runningS: number;
  idleS: number;
  stopS: number;
  towedS: number;
}
const emptyTotals = (id: string): Totals => ({
  id,
  days: 0,
  distanceKm: 0,
  maxSpeed: 0,
  odometerKm: null,
  runningS: 0,
  idleS: 0,
  stopS: 0,
  towedS: 0,
});

function totalsOf(rows: SummaryRow[]): Map<string, Totals> {
  const out = new Map<string, Totals>();
  for (const r of rows) {
    const t = out.get(r.assetId) ?? emptyTotals(r.assetId);
    t.days += 1;
    t.distanceKm += r.distanceKm;
    t.maxSpeed = Math.max(t.maxSpeed, r.maxSpeed);
    t.odometerKm = Math.max(t.odometerKm ?? 0, r.odometerKm);
    t.runningS += r.runningSeconds;
    t.idleS += r.idleSeconds;
    t.stopS += r.stopSeconds;
    t.towedS += r.towedSeconds;
    out.set(r.assetId, t);
  }
  return out;
}

/* ------------------------------------------------------------------ formatting */

/** "5h 51m" / "24m" */
const duration = (s: number) => {
  const m = Math.round(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
};
/** "1d 17h" / "5h" */
const sinceHours = (h: number) => {
  const d = Math.floor(h / 24);
  return d ? `${d}d ${h % 24}h` : `${h}h`;
};
const thousands = (n: number) => (n >= 1000 ? `${Number((n / 1000).toFixed(1))}k` : String(n));
const pct = (part: number, total: number) => (total ? Math.round((part / total) * 1000) / 10 : 0);
const shareOf = (n: number, total: number) =>
  total ? `${Math.round((n / total) * 1000) / 10}% of total` : '0% of total';
const utilisation = (s: number) =>
  s >= 90 ? 'Excellent' : s >= 75 ? 'Very Good' : s >= 50 ? 'Good' : s >= 25 ? 'Fair' : 'Low';
const safety = (s: number) =>
  s >= 95 ? 'Excellent' : s >= 90 ? 'Very Good' : s >= 80 ? 'Good' : 'Needs Review';
const dateMeta = () =>
  `Today, ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}`;
const dayLabel = (t: number) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(t));

function axisStep(max: number, parts: number) {
  const n = Math.max(1, max / parts);
  const p = 10 ** Math.floor(Math.log10(n));
  const s = n / p;
  return (s <= 1 ? 1 : s <= 2 ? 2 : s <= 2.5 ? 2.5 : s <= 5 ? 5 : 10) * p;
}
/** Vehicles without a figure are counted in the first bucket (as in the original). */
const withMissing = (counts: number[], missing: number) =>
  counts.map((c, i) => (i === 0 ? c + Math.max(0, missing) : c));

/** "Yet to Transmit: 5 · No reading: 3 (in 0 - 10k)" */
function missingNote(
  rows: Row[],
  have: Set<string>,
  words: { offline: string | null; other: string },
  where: string,
) {
  const n = { never: 0, offline: 0, other: 0 };
  for (const r of rows)
    if (!have.has(r.v.id)) {
      if (r.status.id === 'never') n.never++;
      else if (r.status.id === 'offline') n.offline++;
      else n.other++;
    }
  if (!(n.never + n.offline + n.other)) return undefined;
  const other = words.offline ? n.other : n.other + n.offline;
  const parts = [`Yet to Transmit: ${n.never}`];
  if (words.offline && n.offline) parts.push(`${words.offline}: ${n.offline}`);
  if (other) parts.push(`${words.other}: ${other}`);
  return `${parts.join(' · ')} (in ${where})`;
}

/* ------------------------------------------------------------------ constants of the original */

const SIZES = { tracking: 318, alerts: 460, ranked: 400, summary: 400, top: 380 };
const PER_PAGE = 5;
const UNUSED_BUCKETS: [string, number, number][] = [
  ['48+ hrs', 48, Infinity],
  ['24-48 hrs', 24, 48],
  ['20-24 hrs', 20, 24],
  ['16-20 hrs', 16, 20],
  ['12-16 hrs', 12, 16],
  ['8-12 hrs', 8, 12],
  ['4-8 hrs', 4, 8],
  ['1-4 hrs', 1, 4],
];
const UNUSED_TONES = ['pink', 'pink', 'orange', 'red', 'purple', 'blue', 'teal', 'amber'];
const SPEED_BUCKETS: [string, number, number][] = [
  ['0-10', 0, 10],
  ['10-20', 10, 20],
  ['20-30', 20, 30],
  ['30-40', 30, 40],
  ['40-50', 40, 50],
  ['50-60', 50, 60],
  ['60+', 60, Infinity],
];
const TICKER_TYPES = [
  'IDLE',
  'HARSH_ACCELERATION',
  'HARSH_BRAKING',
  'POWER_CUT',
  'OVERSPEED',
  'TOWED',
  'SOS',
];
const SENSOR_FIELDS: FilterField[] = [
  { id: 'ac', label: 'AC', icon: 'Snowflake', options: ['On', 'Off'] },
  { id: 'seatbelt', label: 'Seat Belt', icon: 'Armchair', options: ['Fastened', 'Unfastened'] },
  { id: 'door', label: 'Door', icon: 'DoorOpen', options: ['Open', 'Closed'] },
];

/* ------------------------------------------------------------------ live demo positions */

interface Row {
  v: Vehicle;
  position: Position | null;
  status: Status;
}

function useLive(vehicles: Vehicle[]) {
  const key = vehicles.map((v) => `${v.id}:${v.hasTracker ? 1 : 0}`).join('|');
  const [positions, setPositions] = useState(new Map<string, Position>());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    // Without trackers in Neon at all, every vehicle reports (so the demo has something to show).
    const anyTracker = vehicles.some((v) => v.hasTracker);
    const start = Date.now();
    setPositions(
      new Map(
        vehicles
          .filter((v, i) => (anyTracker ? v.hasTracker : i % 11 !== 10))
          .map((v) => [v.id, startPosition(v.id, start)] as const),
      ),
    );
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const feed = setInterval(() => setPositions((p) => step(p)), 3000);
    const clock = setInterval(() => setNow(Date.now()), 5000);
    return () => {
      clearInterval(feed);
      clearInterval(clock);
    };
  }, []);
  const rows = useMemo(
    () =>
      vehicles.map((v): Row => {
        const position = positions.get(v.id) ?? null;
        return { v, position, status: statusOf(position, now, v.limitKmh) };
      }),
    [vehicles, positions, now],
  );
  return { rows, now };
}

/* ------------------------------------------------------------------ screen */

export default function DashboardScreen({ companyId, assetGroup, onNavigate }: ScreenContext) {
  const fleet = useFleet(companyId, assetGroup);
  return (
    <SmartTrackPage scope="st-dash" scroll>
      {fleet.isPending ? (
        <Loading label="Loading the fleet…" />
      ) : fleet.error ? (
        <ErrorState message={fleet.error.message} onRetry={fleet.refetch} />
      ) : (
        <Dashboard fleet={fleet} onNavigate={onNavigate} />
      )}
    </SmartTrackPage>
  );
}

function Dashboard({
  fleet,
  onNavigate,
}: {
  fleet: ReturnType<typeof useFleet>;
  onNavigate?: (key: string) => void;
}) {
  const { vehicles, zones, zoneLinks, hasGroups } = fleet;
  const { rows, now } = useLive(vehicles);
  const [statusFilter, setStatusFilter] = useState('all');

  // Period pickers (Live allowed where the original allows it).
  const topVehiclesP = usePeriod(false);
  const driversP = usePeriod(false);
  const unusedTopP = usePeriod(true);
  const overspeedP = usePeriod(true);
  const odoTopP = usePeriod(true);
  const distP = usePeriod(false, 'YESTERDAY', DIST_PERIODS);
  const odoP = usePeriod(true);
  const speedP = usePeriod(true);

  const all = vehicles.map((v) => v.id);
  const today = midnight(0);
  const summaryCache = useMemo(() => new Map<string, Map<string, Totals>>(), [vehicles]);
  const totalsFor = (r: Range | null) => {
    if (!r) return new Map<string, Totals>();
    const k = `${r.from}|${r.to}`;
    let t = summaryCache.get(k);
    if (!t) summaryCache.set(k, (t = totalsOf(executiveSummary(all, r.from, r.to))));
    return t;
  };
  const listOf = (t: Map<string, Totals>) => vehicles.map((v) => t.get(v.id) ?? emptyTotals(v.id));
  const message = (r: Range | null) => (r && !vehicles.length ? 'No vehicles.' : null);

  // Demo alert history (vehicles that report), regenerated each day.
  const reporting = rows.filter((r) => r.position).map((r) => r.v.id);
  const alerts = useMemo(() => alertHistory(reporting, today), [reporting.join('|'), today]); // eslint-disable-line react-hooks/exhaustive-deps
  const countIn = (from: number, to: number) => {
    const c: Record<string, number> = {};
    for (const a of alerts) if (a.ts >= from && a.ts < to) c[a.type] = (c[a.type] ?? 0) + 1;
    return c;
  };
  const todayCounts = countIn(today, now + 1);

  const plateOf = (id: string) => vehicles.find((v) => v.id === id)?.plate ?? id;
  const byId = new Map(vehicles.map((v) => [v.id, v]));
  const lines = (id: string): string[] => {
    const v = byId.get(id);
    return [[v?.make, v?.model].filter(Boolean).join(' ') || '--', v?.kind || '--'];
  };
  const count = (s: StatusId) => rows.filter((r) => r.status.id === s).length;
  const reportingNow = rows.filter((r) => r.position && r.status.id !== 'offline');
  const never = new Set(rows.filter((r) => r.status.id === 'never').map((r) => r.v.id));
  const hoursSince = (r: Row | undefined) =>
    r?.position ? (now - Date.parse(r.position.ts)) / HOUR : Infinity;

  /* ---------- 1. status tiles */
  const tile = (s: StatusId, filter?: string) => ({
    label: STATUS[s].label,
    value: count(s),
    caption: shareOf(count(s), rows.length),
    tone: STATUS[s].tone,
    icon: STATUS[s].icon,
    filter,
  });
  const statusW: WidgetHead = {
    id: 'vehicle-status',
    className: 'vs-status',
    icon: 'ClipboardList',
    title: 'Vehicle Status Summary',
    meta: `${dateMeta()} · Demo data`,
  };

  /* ---------- 2. tracking map */
  const markers: Marker[] = rows
    .filter((r) => r.position)
    .map((r) => ({
      id: r.v.id,
      name: r.v.name,
      code: r.v.plate,
      status: r.status.id,
      lat: r.position!.lat,
      lng: r.position!.lng,
      location:
        r.position!.locationName || `${r.position!.lat.toFixed(5)}, ${r.position!.lng.toFixed(5)}`,
      metric: `${Math.round(r.position!.speed)} km/h`,
      updated: ago(r.position!.ts, now),
      group: hasGroups ? r.v.group || 'Ungrouped' : undefined,
      attrs: {
        manager: r.v.manager,
        supervisor: r.v.supervisor,
        operator: r.v.operator?.name ?? '',
        type: r.v.typeLabel,
      },
    }));
  const options = (pick: (v: Vehicle) => string) =>
    [...new Set(vehicles.map(pick).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  const field = (
    id: string,
    label: string,
    icon: string,
    opts: string[],
    placeholder: string,
  ): FilterField => ({
    id,
    label,
    icon,
    options: opts,
    placeholder: opts.length ? placeholder : 'None assigned yet',
  });
  const filterFields: FilterField[] = [
    field(
      'manager',
      'Fleet Manager',
      'Network',
      options((v) => v.manager),
      'Select Fleet Manager',
    ),
    field(
      'supervisor',
      'Supervisor',
      'Users',
      options((v) => v.supervisor),
      'Select Supervisor',
    ),
    field(
      'operator',
      'Vehicle Operator',
      'UserRound',
      options((v) => v.operator?.name ?? ''),
      'Select vehicle Operator',
    ),
    {
      id: 'type',
      label: 'Vehicle Type',
      icon: 'Box',
      options: [...new Set(vehicles.map((v) => v.typeLabel))].sort(),
    },
    ...SENSOR_FIELDS,
  ];
  const trackStatuses = STATUS_ORDER.filter((s) => s !== 'never').map((s) => ({
    id: s,
    label: STATUS[s].label,
    tone: STATUS[s].tone,
  }));

  /* ---------- 3. geofences */
  const activeZones = zones.filter((z) => z.active);
  const restricted = activeZones.filter((z) => z.type === 'Restricted');
  const preferred = activeZones.filter((z) => z.type === 'Preferred');
  const zoneType = new Map(zones.map((z) => [z.id, z.type]));
  const linksOf = (type: string) => zoneLinks.filter((l) => zoneType.get(l.zoneId) === type);
  const prefLinks = linksOf('Preferred');
  const at = (r: Row): [number, number] => [r.position!.lat, r.position!.lng];
  const outsidePreferred = reportingNow.filter((r) => {
    const mine = activeZones.filter((z) =>
      prefLinks.some((l) => l.vehicleId === r.v.id && l.zoneId === z.id),
    );
    return mine.length > 0 && !mine.some((z) => inZone(z, at(r)));
  }).length;
  const insideRestricted = reportingNow.filter((r) =>
    restricted.some((z) => inZone(z, at(r))),
  ).length;
  // The demo alerts carry no geofence, so zone entries and exits stay at 0 (as in the original).
  const zoneEvents = (type: string, ids: Set<string>) =>
    alerts.filter((a) => a.ts >= today && a.type === type && a.geofenceId && ids.has(a.geofenceId))
      .length;
  const prefIds = new Set(preferred.map((z) => z.id));
  const restrIds = new Set(zones.filter((z) => z.type === 'Restricted').map((z) => z.id));
  const zoneBars = [
    {
      label: 'Preferred Zone Entries',
      value: zoneEvents('GEOFENCE_ENTER', prefIds),
      icon: 'LogIn',
    },
    { label: 'Preferred Zone Exits', value: zoneEvents('GEOFENCE_EXIT', prefIds), icon: 'LogOut' },
    {
      label: 'Restricted Zone Entries',
      value: zoneEvents('GEOFENCE_ENTER', restrIds),
      icon: 'Ban',
    },
    { label: 'Restricted Zone Exits', value: zoneEvents('GEOFENCE_EXIT', restrIds), icon: 'Ban' },
  ];

  /* ---------- 4. alert summary */
  const heatPeriods: [string, number, number][] = [
    ['Yesterday', midnight(-1), today],
    ['Last 7 days', midnight(-6), now + 1],
    ['Last 30 days', midnight(-29), now + 1],
  ];
  const heat = heatPeriods.map(([, f, t]) => countIn(f, t));

  /* ---------- 5. activity timeline */
  const [day, setDay] = useState('Yesterday');
  const [who, setWho] = useState('all');
  const days = useMemo(
    () => [
      { id: 'Yesterday', label: 'Yesterday' },
      ...Array.from({ length: 28 }, (_, i) => {
        const t = midnight(-(i + 2));
        return { id: String(t), label: dayLabel(t) };
      }),
    ],
    [today], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const dayFrom = day === 'Yesterday' ? midnight(-1) : Number(day);
  const dayTo = day === 'Yesterday' ? today : dayFrom + DAY;
  const timelineRows: TimelineRow[] = useMemo(() => {
    const picked =
      who !== 'all'
        ? rows.filter((r) => r.v.id === who)
        : [...rows.filter((r) => r.position), ...rows.filter((r) => !r.position)];
    return picked.map((r) => ({
      id: r.v.id,
      name: r.v.name,
      code: r.v.plate,
      image: r.v.image,
      segments: daySegments(r.v.id, dayFrom, dayTo).map((s) => ({
        status: s.status,
        start: (s.start - dayFrom) / HOUR,
        end: (s.end - dayFrom) / HOUR,
      })),
    }));
  }, [who, dayFrom, dayTo, rows.map((r) => `${r.v.id}${r.position ? 1 : 0}`).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- 6. odometer */
  const total = rows.length;
  const odoTotals = totalsFor(odoP.range);
  const odoReadings = (
    odoP.isLive
      ? vehicles
          .filter((v) => v.odometerKm != null && v.odometerKm > 0)
          .map((v) => ({ id: v.id, km: v.odometerKm! }))
      : listOf(odoTotals)
          .filter((t) => t.odometerKm != null)
          .map((t) => ({ id: t.id, km: t.odometerKm! }))
  ).filter((r) => !never.has(r.id));
  const kms = odoReadings.map((r) => r.km);
  const highest = Math.max(0, ...kms);
  const odoStep = axisStep(highest || 80000, 8);
  const odoBuckets = Array.from({ length: 8 }, (_, i) => ({
    from: i * odoStep,
    to: (i + 1) * odoStep,
  }));
  const bucketLabel = (b: { from: number; to: number }) =>
    `${thousands(b.from)} - ${thousands(b.to)}`;
  const odoW: WidgetHead = {
    id: 'odometer',
    className: 'vs-odo',
    icon: 'Gauge',
    title: 'Odometer Summary',
    subtitle: 'Distribution of vehicles by odometer reading',
    meta: missingNote(
      rows,
      new Set(odoReadings.map((r) => r.id)),
      { offline: null, other: 'No reading' },
      bucketLabel(odoBuckets[0]!),
    ),
    period: odoP.control,
    fixedHeight: SIZES.summary,
  };

  /* ---------- 7. speedometer */
  const speedTotals = totalsFor(speedP.range);
  const speeds = (
    speedP.isLive
      ? reportingNow.map((r) => ({ id: r.v.id, speed: r.position!.speed }))
      : listOf(speedTotals)
          .filter((t) => t.days > 0)
          .map((t) => ({ id: t.id, speed: t.maxSpeed }))
  ).filter((s) => !never.has(s.id));
  const speedW: WidgetHead = {
    id: 'speedometer',
    className: 'vs-speed',
    tone: 'orange',
    icon: 'Gauge',
    title: 'Speedometer Summary',
    subtitle: 'Distribution of vehicles by speed ranges',
    meta: missingNote(
      rows,
      new Set(speeds.map((s) => s.id)),
      speedP.isLive
        ? { offline: 'No Transmit', other: 'Not reporting' }
        : { offline: null, other: 'No report in period' },
      SPEED_BUCKETS[0]![0],
    ),
    period: speedP.control,
    fixedHeight: SIZES.summary,
  };
  const speedCounts = withMissing(
    SPEED_BUCKETS.map(([, lo, hi]) => speeds.filter((s) => s.speed >= lo && s.speed < hi).length),
    total - speeds.length,
  );

  /* ---------- 8. distribution */
  const distList = listOf(totalsFor(distP.range));
  const run = distList.reduce((s, t) => s + t.runningS, 0);
  const idle = distList.reduce((s, t) => s + t.idleS, 0);
  const stop = distList.reduce((s, t) => s + t.stopS, 0);
  const towed = distList.reduce((s, t) => s + t.towedS, 0);
  const all4 = run + idle + stop + towed;
  const hrs = (s: number) => `${fmt(Math.round(s / 3600))} hrs`;

  /* ---------- 9. unused buckets */
  const unusedItems = UNUSED_BUCKETS.map(([range, lo, hi], i) => ({
    range,
    value: rows.filter((r) => hoursSince(r) >= lo && hoursSince(r) < hi).length,
    tone: UNUSED_TONES[i]!,
    image: UNUSED_IMAGES[i]!,
  }));

  /* ---------- 10. top odometer */
  const odoTop = (
    odoTopP.isLive
      ? vehicles
          .filter((v) => v.odometerKm != null && v.odometerKm > 0)
          .map((v) => ({ id: v.id, km: v.odometerKm! }))
      : listOf(totalsFor(odoTopP.range))
          .filter((t) => t.distanceKm > 0)
          .map((t) => ({ id: t.id, km: t.distanceKm }))
  )
    .sort((a, b) => b.km - a.km)
    .slice(0, 10);

  /* ---------- 11. top overspeed */
  const limitOf = (id: string) => byId.get(id)?.limitKmh ?? DEFAULT_LIMIT;
  const osRange = overspeedP.range ?? rangeOf('TODAY')!;
  const overspeed = new Map<string, { n: number; max: number; now: boolean }>();
  for (const a of alerts)
    if (
      a.type === 'OVERSPEED' &&
      a.ts >= osRange.from &&
      a.ts < (overspeedP.range ? osRange.to : now + 1)
    ) {
      const o = overspeed.get(a.assetId) ?? { n: 0, max: 0, now: false };
      overspeed.set(a.assetId, { ...o, n: o.n + 1, max: Math.max(o.max, a.speed) });
    }
  if (overspeedP.isLive)
    for (const r of reportingNow) {
      const s = r.position!.speed;
      if (s <= limitOf(r.v.id)) continue;
      const o = overspeed.get(r.v.id) ?? { n: 0, max: 0, now: false };
      overspeed.set(r.v.id, { ...o, max: Math.max(o.max, s), now: true });
    }
  const osTotals = totalsFor(overspeedP.range ?? rangeOf('TODAY'));
  for (const [id, o] of overspeed) {
    const m = osTotals.get(id)?.maxSpeed ?? 0;
    if (m > o.max) overspeed.set(id, { ...o, max: m });
  }
  const osTop = [...overspeed.entries()]
    .sort((a, b) => b[1].max - a[1].max || b[1].n - a[1].n)
    .slice(0, 10);

  /* ---------- 12. top unused */
  const rowById = new Map(rows.map((r) => [r.v.id, r]));
  const inactiveSince = (id: string) => {
    const h = hoursSince(rowById.get(id));
    return Number.isFinite(h) ? (h < 1 ? 'Just now' : sinceHours(Math.floor(h))) : 'No report yet';
  };
  let unusedTop: CarouselItem[];
  if (unusedTopP.isLive) {
    unusedTop = rows
      .filter((r) => r.status.id === 'offline' || r.status.id === 'never')
      .sort((a, b) => hoursSince(b) - hoursSince(a))
      .slice(0, 10)
      .map((r) => {
        const h = hoursSince(r);
        const whole = Math.floor(h);
        const mins = Math.floor((h - whole) * 60);
        return {
          name: r.v.plate,
          image: r.v.image,
          highlight: Number.isFinite(h)
            ? {
                label: 'Unused for',
                icon: 'Clock',
                value: whole,
                unit: 'hrs',
                ...(mins ? { value2: mins, unit2: 'mins' } : {}),
              }
            : { label: 'Unused for', icon: 'Clock', value: 'Never', unit: '' },
          footer: {
            label: 'Inactive since',
            value: Number.isFinite(h) ? sinceHours(whole) : 'No report yet',
            icon: 'CalendarDays',
          },
        };
      });
  } else {
    const span = (unusedTopP.range?.days ?? 1) * 24 * 3600;
    unusedTop = listOf(totalsFor(unusedTopP.range))
      .map((t) => ({ t, unusedS: Math.max(0, span - t.runningS) }))
      .sort((a, b) => b.unusedS - a.unusedS || a.t.distanceKm - b.t.distanceKm)
      .slice(0, 10)
      .map(({ t, unusedS }) => {
        const h = Math.floor(unusedS / 3600);
        const m = Math.floor((unusedS % 3600) / 60);
        return {
          name: plateOf(t.id),
          image: byId.get(t.id)?.image,
          highlight: {
            label: 'Unused for',
            icon: 'Clock',
            value: h,
            unit: 'hrs',
            ...(m ? { value2: m, unit2: 'mins' } : {}),
          },
          footer: { label: 'Inactive since', value: inactiveSince(t.id), icon: 'CalendarDays' },
        };
      });
  }

  /* ---------- 13. top drivers */
  const driverRows: RankRow[] = useMemo(() => {
    const r = driversP.range!;
    const per = new Map<
      string,
      { name: string; days: number; runningS: number; harsh: number; over: number; score: number }
    >();
    for (const d of driverBehaviour(
      vehicles.map((v) => ({ id: v.id, operator: v.operator?.name ?? null })),
      r.from,
      r.to,
    )) {
      if (!d.operator) continue;
      const k = d.operator.toLowerCase();
      const p = per.get(k) ?? {
        name: d.operator,
        days: 0,
        runningS: 0,
        harsh: 0,
        over: 0,
        score: 0,
      };
      p.days += 1;
      p.runningS += d.runningSeconds;
      p.harsh += d.harshBraking;
      p.over += d.overspeed;
      p.score += d.score;
      per.set(k, p);
    }
    const contact = (name: string) => {
      const op = vehicles.find(
        (v) => v.operator?.name.toLowerCase() === name.toLowerCase(),
      )?.operator;
      const bits = [
        op?.tagId?.trim() ? `ID: ${op.tagId.trim()}` : null,
        op?.contact?.trim() || null,
      ].filter(Boolean);
      return bits.length ? bits.join(' · ') : undefined;
    };
    return [...per.values()]
      .map((p) => ({ ...p, score: p.days ? p.score / p.days : 0 }))
      .sort((a, b) => b.score - a.score || a.harsh - b.harsh || a.name.localeCompare(b.name))
      .map((p, i) => {
        const s = Math.round(p.score);
        return {
          rank: i + 1,
          name: p.name,
          sub: contact(p.name),
          person: true,
          cells: {
            hours: duration(p.runningS),
            harsh: p.harsh,
            over: p.over,
            score: { v: s, badge: safety(s) },
          },
        };
      });
  }, [vehicles, driversP.value]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- 14. top performing vehicles */
  const scored = listOf(totalsFor(topVehiclesP.range))
    .filter((t) => t.runningS + t.idleS + t.stopS > 0)
    .map((t) => ({ t, score: Math.round((t.runningS / (t.runningS + t.idleS + t.stopS)) * 100) }))
    .sort((a, b) => b.score - a.score || b.t.distanceKm - a.t.distanceKm);
  const ranks: number[] = [];
  scored.forEach((s, i) =>
    ranks.push(i === 0 ? 1 : s.score === scored[i - 1]!.score ? ranks[i - 1]! : ranks[i - 1]! + 1),
  );
  const vehicleRows: RankRow[] = scored.map(({ t, score }, i) => ({
    rank: ranks[i]!,
    name: plateOf(t.id),
    sub:
      lines(t.id)
        .filter((l) => l !== '--')
        .join(' · ') || undefined,
    image: byId.get(t.id)?.image,
    cells: {
      running: { v: duration(t.runningS), tone: 'green' },
      idle: { v: duration(t.idleS), tone: 'orange' },
      stopped: { v: duration(t.stopS), tone: 'red' },
      towed: { v: duration(t.towedS), tone: 'teal' },
      score: { v: score, badge: utilisation(score) },
    },
  }));

  /* ---------- heads */
  const head = {
    geofence: {
      id: 'geofence',
      className: 'vs-geo',
      tone: 'purple',
      icon: 'LocateFixed',
      title: 'Geofence Monitoring (Today)',
      subtitle: 'Track vehicle movements across zones',
      fixedHeight: SIZES.tracking,
    },
    alerts: {
      id: 'alerts',
      className: 'vs-alerts',
      tone: 'red',
      icon: 'TriangleAlert',
      title: 'Alert Summary',
      subtitle: 'Alerts over time by category',
      fixedHeight: SIZES.alerts,
    },
    activity: {
      id: 'activity',
      className: 'vs-act',
      tone: 'blue',
      icon: 'Activity',
      title: 'Vehicle Activity Overview',
      subtitle: 'Track vehicle movement and status',
      fixedHeight: SIZES.alerts,
    },
    dist: {
      id: 'distribution',
      className: 'vs-dist',
      tone: 'amber',
      icon: 'ChartPie',
      title: 'Distribution Summary',
      subtitle: 'Vehicle status distribution overview',
      period: distP.control,
    },
    unused: {
      id: 'unused',
      className: 'vs-unused',
      tone: 'orange',
      icon: 'TimerOff',
      title: 'Unused Vehicle Summary',
      subtitle: 'Time since the last report, grouped by hours',
    },
    odoTop: {
      id: 'top-odometer',
      className: 'vs-top vs-top--odo',
      icon: 'Trophy',
      title: 'Top 10 Odometer Vehicles',
      subtitle: 'Vehicles with the highest odometer readings',
      period: odoTopP.control,
      fixedHeight: SIZES.top,
    },
    osTop: {
      id: 'top-overspeed',
      className: 'vs-top vs-top--over',
      tone: 'red',
      icon: 'Gauge',
      title: 'Top 10 Overspeed Vehicles',
      subtitle: 'Vehicles with the highest overspeed recorded',
      period: overspeedP.control,
      fixedHeight: SIZES.top,
    },
    unusedTop: {
      id: 'top-unused',
      className: 'vs-top vs-top--unused',
      tone: 'blue',
      icon: 'Trophy',
      title: 'Top 10 Unused Vehicles',
      subtitle: 'Vehicles silent for the longest time',
      period: unusedTopP.control,
      fixedHeight: SIZES.top,
    },
    drivers: {
      id: 'top-drivers',
      className: 'vs-rank',
      tone: 'blue',
      icon: 'Trophy',
      title: 'Top Drivers',
      subtitle: 'Ranked by safety score',
      period: driversP.control,
      fixedHeight: SIZES.top,
    },
    vehicles: {
      id: 'top-vehicles',
      className: 'vs-rank',
      tone: 'blue',
      icon: 'Trophy',
      title: 'Top Performing Vehicles',
      subtitle: 'Vehicles ranked by utilization and operational efficiency',
      period: topVehiclesP.control,
      fixedHeight: SIZES.ranked,
    },
  } satisfies Record<string, WidgetHead>;

  const cell = (key: string, span: number, body: React.ReactNode) => (
    <div
      key={key}
      className="td-grid__cell"
      style={{ '--span-lg': span, '--span-md': 12 } as React.CSSProperties}
    >
      {body}
    </div>
  );
  const odoMsg = message(odoP.range);
  const speedMsg = message(speedP.range);
  const distMsg = message(distP.range);

  return (
    <>
      <Ticker
        label="Today Alerts"
        items={TICKER_TYPES.map((id) => {
          const t = ALERT_TYPES.find((a) => a.id === id)!;
          return { label: t.label, value: todayCounts[id] ?? 0, tone: t.tone, icon: t.icon };
        })}
        onPick={() => onNavigate?.('alerts')}
      />
      <div className="td-grid">
        {cell(
          'vehicle-status',
          12,
          <StatsWidget
            w={statusW}
            minTile={124}
            statusFilter={statusFilter}
            onFilter={setStatusFilter}
            tiles={[
              {
                label: 'All',
                value: Math.max(vehicles.length, rows.length),
                caption: 'Total Vehicles',
                tone: 'gray',
                icon: 'Truck',
                filter: 'all',
              },
              tile('moving', 'moving'),
              tile('stopped', 'stopped'),
              tile('idle', 'idle'),
              tile('offline', 'offline'),
              tile('overspeed', 'overspeed'),
              tile('towed', 'towed'),
              tile('never'),
            ]}
          />,
        )}
        {cell(
          'tracking',
          6,
          <TrackingWidget
            w={{
              id: 'tracking',
              className: 'vs-track',
              icon: 'Navigation',
              title: 'Real-Time Vehicle Tracking',
              subtitle: 'Track vehicle movements and status',
              fixedHeight: SIZES.tracking,
            }}
            markers={markers}
            statuses={trackStatuses}
            filterTitle="Vehicle Filters"
            filterFields={filterFields}
            statusFilter={statusFilter}
            onFilter={setStatusFilter}
          />,
        )}
        {cell(
          'geofence',
          6,
          <KpiBarsWidget
            w={head.geofence}
            headline={`Active Geofences - ${activeZones.length}`}
            badges={[
              `Preferred Zone - ${preferred.length}`,
              `Restricted Zone - ${restricted.length}`,
            ]}
            kpis={[
              {
                label: 'Preferred Zone Mapped Vehicles',
                value: new Set(prefLinks.map((l) => l.vehicleId)).size,
                tone: 'purple',
                icon: 'Truck',
              },
              {
                label: 'Vehicle Outside Preferred Zone',
                value: outsidePreferred,
                tone: 'red',
                icon: 'Truck',
              },
              {
                label: 'Restricted Zone Mapped Vehicles',
                value: new Set(linksOf('Restricted').map((l) => l.vehicleId)).size,
                tone: 'purple',
                icon: 'Truck',
              },
              {
                label: 'Vehicle Inside Restricted Zone',
                value: insideRestricted,
                tone: 'red',
                icon: 'Truck',
              },
            ]}
            bars={zoneBars}
            max={Math.max(1, ...zoneBars.map((b) => b.value))}
          />,
        )}
        {cell(
          'alerts',
          6,
          <HeatTableWidget
            w={head.alerts}
            periods={heatPeriods.map(([l]) => l)}
            rows={ALERT_TYPES.map((t) => ({
              label: t.label,
              icon: t.icon,
              tone: t.tone,
              values: heat.map((c) => c[t.id] ?? 0),
            }))}
          />,
        )}
        {cell(
          'activity',
          6,
          <TimelineWidget
            w={head.activity}
            days={days}
            day={day}
            onDay={setDay}
            picker={{
              label: 'Vehicle',
              value: who,
              onChange: setWho,
              options: [
                { value: 'all', label: 'All Vehicles' },
                ...vehicles.map((v) => ({
                  value: v.id,
                  label: v.plate && v.plate !== v.name ? `${v.name} · ${v.plate}` : v.name,
                })),
              ],
            }}
            statuses={STATUS_ORDER.map((s) => ({
              id: s,
              label: STATUS[s].label,
              tone: STATUS[s].tone,
            }))}
            rows={timelineRows}
            pageSize={7}
            entity="Vehicle"
            note="No vehicles reported on this day."
            onVisible={() => undefined}
          />,
        )}
        {cell(
          'odometer',
          6,
          odoMsg ? (
            <Unavailable w={odoW} message={odoMsg} />
          ) : (
            <BarChartWidget
              w={odoW}
              kpis={[
                { label: 'Total Vehicles', value: total, icon: 'Truck' },
                {
                  label: 'Avg. Odometer (km)',
                  value: kms.length ? Math.round(kms.reduce((s, k) => s + k, 0) / kms.length) : '—',
                  unit: 'Km',
                  icon: 'Gauge',
                },
                {
                  label: 'Lowest Range',
                  value: kms.length ? Math.round(Math.min(...kms)) : '—',
                  unit: 'Km',
                  icon: 'ArrowDown',
                },
                {
                  label: 'Highest Range',
                  value: kms.length ? Math.round(highest) : '—',
                  unit: 'Km',
                  icon: 'ArrowUp',
                },
              ]}
              edges={['Highest Odometer', 'Lowest Odometer']}
              markerIcon="Truck"
              height={244}
              tip={{ unit: 'km', one: 'vehicle', other: 'vehicles' }}
              xTitle="Vehicles by Odometer Range (km)"
              categories={odoBuckets.map((b) => ({
                label: bucketLabel(b),
                short: thousands(b.from),
              }))}
              values={withMissing(
                odoBuckets.map(
                  (b, i) =>
                    kms.filter((k) => k >= b.from && (k < b.to || (i === 7 && k <= b.to))).length,
                ),
                total - odoReadings.length,
              )}
              tone="green"
            />
          ),
        )}
        {cell(
          'speedometer',
          6,
          speedMsg ? (
            <Unavailable w={speedW} message={speedMsg} />
          ) : (
            <HBarsWidget
              w={speedW}
              heading={
                speedP.isLive
                  ? 'Vehicles by Current Speed (km/h)'
                  : 'Vehicles by Highest Recorded Speed (km/h)'
              }
              axis={['Lower Speed', 'Higher Speed']}
              rowIcon="Gauge"
              rows={SPEED_BUCKETS.map(([label], i) => ({ label, value: speedCounts[i]! }))}
            />
          ),
        )}
        {cell(
          'distribution',
          6,
          distMsg ? (
            <Unavailable w={head.dist} message={distMsg} />
          ) : (
            <DistributionWidget
              w={head.dist}
              summary={[
                { label: 'Total Hours', value: hrs(all4), icon: 'Clock' },
                {
                  label: 'Total Vehicles',
                  value: `${distList.filter((t) => t.days > 0).length}`,
                  icon: 'Users',
                },
              ]}
              note="Total tracked time across all vehicle statuses."
              items={[
                {
                  label: 'Running',
                  sub: hrs(run),
                  pct: pct(run, all4),
                  tone: STATUS.moving.tone,
                  icon: 'Play',
                },
                {
                  label: 'Idle',
                  sub: hrs(idle),
                  pct: pct(idle, all4),
                  tone: STATUS.idle.tone,
                  icon: 'Clock',
                },
                {
                  label: 'Stopped',
                  sub: hrs(stop),
                  pct: pct(stop, all4),
                  tone: STATUS.stopped.tone,
                  icon: 'Square',
                },
                {
                  label: 'Towed',
                  sub: hrs(towed),
                  pct: pct(towed, all4),
                  tone: STATUS.towed.tone,
                  icon: 'Truck',
                },
              ]}
            />
          ),
        )}
        {cell(
          'unused',
          6,
          <BucketsWidget w={head.unused} unit="Vehicles" columns={4} items={unusedItems} />,
        )}
        {cell(
          'top-odometer',
          6,
          message(odoTopP.range) ? (
            <Unavailable w={head.odoTop} message={message(odoTopP.range)!} />
          ) : (
            <CarouselWidget
              w={head.odoTop}
              accent="blue"
              medal
              rankImages={RANK}
              perPage={PER_PAGE}
              parts={['highlight', 'media', 'title']}
              items={odoTop.map(({ id, km }) => ({
                name: plateOf(id),
                image: byId.get(id)?.image,
                highlight: { value: Math.round(km).toLocaleString('en-IN'), unit: 'km' },
                lines: lines(id),
              }))}
            />
          ),
        )}
        {cell(
          'top-overspeed',
          6,
          <CarouselWidget
            w={head.osTop}
            accent="red"
            highlightFirst
            perPage={PER_PAGE}
            parts={['highlight', 'media', 'title', 'footer']}
            items={osTop.map(([id, o]) => ({
              name: plateOf(id),
              image: byId.get(id)?.image,
              highlight: {
                label: 'Max Speed',
                icon: 'TriangleAlert',
                value: Math.round(o.max),
                unit: 'Kmph',
                caption: `Limit ${limitOf(id)} km/h`,
              },
              footer:
                o.n || !o.now
                  ? { label: 'Occurrences', value: o.n, icon: 'ChartColumn' }
                  : { label: 'Overspeeding', value: 'Now', icon: 'ChartColumn' },
            }))}
          />,
        )}
        {cell(
          'top-unused',
          6,
          <CarouselWidget
            w={head.unusedTop}
            accent="blue"
            highlightFirst
            perPage={PER_PAGE}
            parts={['highlight', 'media', 'title', 'footer']}
            items={unusedTop}
          />,
        )}
        {cell(
          'top-drivers',
          6,
          driverRows.length ? (
            <RankTableWidget
              w={head.drivers}
              topRanks={3}
              columns={[
                { key: 'rank', label: 'Rank', type: 'rank' },
                { key: 'driver', label: 'Driver Details', type: 'entity' },
                { key: 'hours', label: 'Driving Hours' },
                { key: 'harsh', label: 'Harsh Braking' },
                { key: 'over', label: 'Overspeed' },
                { key: 'score', label: 'Safety Score', type: 'score' },
              ]}
              rows={driverRows}
            />
          ) : (
            <Unavailable
              w={head.drivers}
              message={
                vehicles.length
                  ? 'No operator was recorded on the vehicles in this period.'
                  : 'No driver activity in this period.'
              }
            />
          ),
        )}
        {cell(
          'top-vehicles',
          6,
          vehicleRows.length ? (
            <RankTableWidget
              w={head.vehicles}
              topRanks={3}
              columns={[
                { key: 'rank', label: 'Rank', type: 'rank' },
                { key: 'vehicle', label: 'Vehicle details', type: 'entity' },
                { key: 'running', label: 'Running Time' },
                { key: 'idle', label: 'Idle Time' },
                { key: 'stopped', label: 'Stopped Time' },
                { key: 'towed', label: 'Towed Time' },
                { key: 'score', label: 'Utilization Score', type: 'score' },
              ]}
              rows={vehicleRows}
            />
          ) : (
            <Unavailable w={head.vehicles} message="No vehicle activity in this period." />
          ),
        )}
      </div>
    </>
  );
}
