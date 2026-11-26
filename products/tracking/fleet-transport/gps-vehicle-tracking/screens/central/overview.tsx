// IT-0036. "Live Monitor" vehicle overview (original: nH, opened by "Open large" on a tile and
// "Vehicle overview" on the track card): header with Live Track / Track History tabs, the live
// tracker (original: TU with SU) and the history player (original: QU), each with the vehicle
// panel over the map (K7/nU), the map's share control and, for history, its filter and replay buttons.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../smart-track/kit';
import {
  addDays,
  analyse,
  clock12,
  clock24,
  dayWindow,
  hm,
  isoDay,
  latLngText,
  longDay,
  ignitionAt,
  playedPath,
  positionAt,
  replayStatusAt,
  type Day,
  type LatLng,
  type Point,
} from './analysis';
import { historyPoints, MOVING_KMH, sensorsOf, telemetryOf, type Telemetry } from './demo';
import { AlertsDrawer, DistanceDrawer } from './drawers';
import { NearbyButton } from './nearby';
import type { Row } from './fleet';
import {
  FilterPop,
  HistoryFilterForm,
  MapFilterButton,
  PlaybackControls,
  STATUSES,
  type FilterValue,
} from './historyControls';
import { SpeedHud, type PanelInfo } from './panel';
import { Empty, Img, Pill, Seg, cssVars } from './parts';
import { MARKER_STATUS, liveChip, useTodayTrack } from './tiles';
import { TrackerMap, VehicleMarkerIcon, type ShareInfo, type TrackerPin } from './trackerMap';

const TABS = [
  { id: 'live' as const, label: 'Live Track', icon: 'Navigation' },
  { id: 'history' as const, label: 'Track History', icon: 'Route' },
];
const MAX_DAYS = 7;

export function Overview({
  row,
  tab = 'live',
  date,
  operators,
  rows = [],
  onClose,
}: {
  row: Row;
  /** Every vehicle on the page, for Nearby Vehicles (IT-0056). */
  rows?: Row[];
  tab?: 'live' | 'history';
  date?: string;
  operators: string[];
  onClose: () => void;
}) {
  const [view, setView] = useState(tab);
  const titleId = `td-monitor-${row.id}`;
  useEffect(() => {
    const was = document.activeElement as HTMLElement | null;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      document.body.style.overflow = overflow;
      was?.focus?.();
    };
  }, [onClose]);
  const thumb = (
    <span className="td-vthumb" style={{ width: 32 * 1.4, height: 32 }}>
      <Icon name="Truck" size={32 * 0.62} strokeWidth={1.6} />
    </span>
  );
  return (
    <div className="td-modal">
      <div className="td-modal__scrim" onClick={onClose} />
      <section
        className="td-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="td-sr">
          Live Monitor: {row.name}
        </h2>
        <header className="td-tracker__head">
          <Img
            src={row.vehicle.image}
            alt=""
            width={56}
            height={40}
            className="td-entity-media"
            fallback={thumb}
          />
          <span className="td-gv-card__who">
            <strong>{row.name}</strong>
            <small>{row.vehicle.code}</small>
          </span>
          <Pill tone={row.status.tone}>{row.status.label}</Pill>
          <NearbyButton row={row} rows={rows} />
          <span className="td-tracker__tabs">
            <Seg label="Tracking view" size="sm" value={view} onChange={setView} options={TABS} />
          </span>
          <button
            type="button"
            className="td-icon-btn td-icon-btn--sm td-modal__close"
            onClick={onClose}
            aria-label="Close"
            autoFocus
          >
            <Icon name="X" size={15} />
          </button>
        </header>
        <div className="td-modal__body">
          {view === 'history' ? (
            <HistoryTracker key={row.id} row={row} initialDate={date} operators={operators} />
          ) : (
            <LiveTracker key={row.id} row={row} />
          )}
        </div>
      </section>
    </div>
  );
}

/** Door reading for the panel (original: Vx). */
const door = (t: Telemetry | undefined, input: string, v: boolean | null | undefined) =>
  !t || !t.inputs.includes(input)
    ? 'notconfigured'
    : v === true
      ? 'open'
      : v === false
        ? 'closed'
        : 'notconfigured';

/** The vehicle facts the panel shows (original: kind.vehicleInfo). */
function vehicleInfo(row: Row, tel: Telemetry | undefined) {
  const v = row.vehicle;
  return {
    model: [v.make, v.model].filter(Boolean).join(' ') || undefined,
    operator: v.operator?.name ?? 'Not Assigned',
    operatorId: v.operator?.tagId || undefined,
    odometerKm: tel?.odometerKm ?? v.odometerKm ?? undefined,
    gpsSatellites: tel?.gps === false ? 0 : (tel?.satellites ?? undefined),
    batteryLevel: tel?.internalBattery ?? undefined,
    vehicleBatteryV: tel?.externalPowerV ?? undefined,
    externalPower: tel?.externalPower ?? undefined,
    ac: tel?.inputs.includes('AC') ? (tel.ac ?? undefined) : undefined,
    frontDoor: door(tel, 'FRONT_DOOR', tel?.frontDoor),
    backDoor: door(tel, 'BACK_DOOR', tel?.backDoor),
  };
}

/** The live share text (original: wU). */
function liveShare(
  plate: string,
  at: LatLng,
  statusId: string,
  label: string,
  kmh: number,
  ts: number,
  since: number | null,
): ShareInfo | null {
  if (statusId === 'never') return null;
  const moving = statusId === 'moving' || statusId === 'overspeed' || statusId === 'towed';
  const line = moving
    ? `${label} · ${kmh} km/h · at ${clock12(ts)}`
    : statusId === 'offline'
      ? `Last seen at ${clock12(ts)}`
      : since != null
        ? `${label} since ${clock12(since)}`
        : `${label} · at ${clock12(ts)}`;
  return { plate, lat: at[0], lng: at[1], statusLine: line };
}
/** When the vehicle stopped moving (original: EU). */
function stoppedSince(points: Point[], fallback: number) {
  let i = points.length - 1;
  while (i >= 0 && points[i]!.speed < MOVING_KMH) i--;
  return points[i + 1]?.t ?? fallback;
}

function LiveTracker({ row }: { row: Row }) {
  const profile = row.vehicle.profile;
  const day = useTodayTrack(row, profile);
  const p = row.position;
  if (!p)
    return (
      <div className="td-trk td-trk--live">
        <Empty
          icon="Hourglass"
          title="No live position yet"
          text={`${row.name} has not transmitted any location today.`}
        />
      </div>
    );
  const st = row.status;
  const stale = st.id === 'offline';
  const kmh = Math.round(p.speed ?? 0);
  const ts = Date.parse(p.ts);
  const moving = st.id === 'moving' || st.id === 'overspeed' || st.id === 'towed';
  const last = day.trips[day.trips.length - 1];
  const since = moving ? (last?.ongoing ? last.start : ts) : stoppedSince(day.points, ts);
  const sinceLabel = moving ? 'Moving since' : st.id === 'idle' ? 'Idle since' : 'Stopped since';
  const s = day.summary;
  const tel = telemetryOf(row.id, row.vehicle.index, row.vehicle.odometerKm);
  const info = vehicleInfo(row, tel);
  const plate = row.vehicle.code ?? row.name;
  const first = day.points[0];
  const pins: TrackerPin[] = [
    ...(first
      ? [
          {
            id: 'start',
            at: first.at,
            className: 'td-marker--sm tone-green',
            children: (
              <>
                <Icon name="Flag" size={11} />
                <span className="td-marker__tip">
                  {/* IT-0056 (Live track #69): no trip count on the live map. */}
                  <strong>Start of day</strong>
                  {clock12(first.t)}
                </span>
              </>
            ),
          },
        ]
      : []),
    ...day.stops
      .filter((x) => !x.ongoing)
      .map((x) => ({
        id: x.id,
        at: x.at,
        className: 'td-marker--sm tone-amber',
        children: (
          <>
            <Icon name="SquareParking" size={11} />
            <span className="td-marker__tip">
              <strong>Stopped {hm(x.durationMin)}</strong>
              {clock12(x.start)} · {latLngText(x.at)}
            </span>
          </>
        ),
      })),
    {
      id: 'vehicle',
      at: [p.lat, p.lng],
      top: true,
      className: `td-marker--vehicle tone-${st.tone}`,
      children: (
        <>
          <VehicleMarkerIcon
            plate={plate}
            status={MARKER_STATUS[st.id]!}
            speed={kmh}
            img={row.vehicle.image}
          />
          <span className="td-marker__tip">
            <strong>{row.name}</strong>
            {st.label} · {kmh} km/h
          </span>
        </>
      ),
    },
  ];
  // Side facts (original: SU with kind.details; heading, running and idle are hidden for vehicles).
  const doors = tel
    ? sensorsOf(tel, p.ignition)
        .filter((x) => x.key === 'frontDoor' || x.key === 'backDoor')
        .map((x) => {
          const warn = x.state === 'inactive' && x.tone === 'red';
          const tone =
            x.state === 'unavailable' ? 'gray' : x.state === 'active' || warn ? x.tone : undefined;
          return { label: x.label, icon: x.icon, value: x.value, tone, warn };
        })
    : [];
  const odo = tel?.odometerKm ?? row.vehicle.odometerKm;
  const fields: { label: string; icon: string; value: string; tone?: string; warn?: boolean }[] = [
    { label: 'Operator', icon: 'UserRound', value: row.vehicle.operator?.name || 'Not Assigned' },
    { label: 'Operator ID', icon: 'IdCard', value: row.vehicle.operator?.tagId || '—' },
    {
      label: 'Odometer',
      icon: 'Milestone',
      value: odo == null ? '—' : `${Math.round(odo).toLocaleString('en-IN')} km`,
    },
    { label: 'Fuel', icon: 'Fuel', value: '—' },
    ...doors,
  ];
  const kpis = [
    { label: 'Distance', value: `${s.distanceKm} km`, icon: 'Milestone', tone: 'blue' },
    // IT-0056 (Live track #69): no Trips figure in live tracking.
    { label: 'Stops', value: day.stops.length, icon: 'SquareParking', tone: 'amber' },
    {
      label: 'Max speed',
      value: `${s.maxSpeed} km/h`,
      icon: 'Gauge',
      tone: s.maxSpeed > profile.overspeedKmh ? 'red' : 'orange',
    },
  ];
  const panel: PanelInfo = {
    ...info,
    plate,
    img: row.vehicle.image,
    mode: 'live',
    date: p.ts,
    status: MARKER_STATUS[st.id]!,
    speed: kmh,
    ignition: p.ignition ?? undefined,
    runningMin: s.runningMin,
    stoppedMin: s.stopMin,
    idleMin: s.idleMin,
    noVehicle: false,
    location: [p.lat, p.lng],
  };
  return (
    <div className="td-trk td-trk--live">
      <section className="td-trk__side td-live__details">
        <dl className="td-gv-card__fields">
          <div>
            <dt>
              <Icon name="MapPin" size={13} />
              Location
            </dt>
            <dd title={latLngText([p.lat, p.lng])}>
              {p.locationName?.trim() || latLngText([p.lat, p.lng])}
            </dd>
          </div>
          <div>
            <dt>
              <Icon name="KeyRound" size={13} />
              Ignition
            </dt>
            <dd className={p.ignition ? 'is-on' : ''}>
              {p.ignition == null ? '—' : p.ignition ? 'On' : 'Off'}
            </dd>
          </div>
          {fields.map((f) => (
            <div key={f.label} className={f.tone ? `is-toned tone-${f.tone}` : undefined}>
              <dt>
                <Icon name={f.icon} size={13} />
                {f.label}
              </dt>
              <dd title={f.value}>
                {f.value}
                {f.warn && <Icon name="TriangleAlert" size={12} />}
              </dd>
            </div>
          ))}
        </dl>
        <div className="td-live__today">
          <h3 className="td-trk__h">Today</h3>
          <div className="td-trk__kpis">
            {kpis.map((k) => (
              <div key={k.label} className={`td-trk__kpi tone-${k.tone}`}>
                <span className="td-badge td-badge--sm">
                  <Icon name={k.icon} size={13} />
                </span>
                <small>{k.label}</small>
                <b>{k.value}</b>
              </div>
            ))}
          </div>
        </div>
      </section>
      <TrackerMap
        className="td-tmap"
        fitKey={`live:${row.id}`}
        follow={[p.lat, p.lng]}
        maxFitZoom={16}
        share={liveShare(plate, [p.lat, p.lng], st.id, st.label, kmh, ts, since)}
        lines={[{ id: 'trail', className: 'is-done', points: day.points.map((x) => x.at) }]}
        pins={pins}
        overlay={
          <>
            <div className="td-live__top">
              <div className={liveChip(stale, true)}>
                {stale ? <Icon name="WifiOff" size={14} /> : <i className="td-live-dot" />}
                <span>{stale ? 'Last known position' : 'Live'}</span>
              </div>
            </div>
            <SpeedHud
              tone={st.tone}
              speed={kmh}
              limit={profile.overspeedKmh}
              status={MARKER_STATUS[st.id]!}
              panel={panel}
            >
              <div className="td-trk__state">
                <Pill tone={st.tone}>{st.label}</Pill>
                {/* IT-0056 (Live track #71/#72): how long, not since when. */}
                {!stale && (
                  <small title={`${sinceLabel} ${clock12(since)}`}>
                    {st.id === 'moving' ? 'Running' : st.label} for {hm(Math.max(0, Date.now() - since) / 6e4)}
                  </small>
                )}
                <small className={stale ? 'is-warn' : ''}>
                  <Icon name="Clock" size={12} />
                  Updated {clock24(ts)}
                </small>
              </div>
            </SpeedHud>
          </>
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Track History (original: QU) */

interface Settings {
  window: { from: string; to: string } | null;
  stopLimit: number;
  statuses: string[];
}
const DEFAULT_STOP = 3;
const START_SETTINGS: Settings = { window: null, stopLimit: DEFAULT_STOP, statuses: [...STATUSES] };
const minutesOf = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
function dayRange(day: string, w: { from: string; to: string } | null) {
  const d = dayWindow(day);
  if (!w) return d;
  const at = (min: number) => new Date(Math.min(d.to.getTime(), d.from.getTime() + min * 6e4));
  return { from: at(minutesOf(w.from)), to: at(minutesOf(w.to) + 1) };
}
function daysOf(span: { first: string; last: string }, w: Settings['window']) {
  const out: { day: string; fromTime: string; toTime: string; from: Date; to: Date }[] = [];
  for (let d = span.first; d <= span.last; d = addDays(d, 1)) {
    const fromTime = d === span.first ? (w?.from ?? '00:00') : '00:00';
    const toTime = d === span.last ? (w?.to ?? '23:59') : '23:59';
    out.push({ day: d, fromTime, toTime, ...dayRange(d, { from: fromTime, to: toTime }) });
  }
  return out;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDay = (d: string) => {
  const [y = 1970, m = 1, dd = 1] = d.split('-').map(Number);
  return `${String(dd).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
};
const ampm = (t: string) => {
  const [h = 0, m = 0] = t.split(':').map(Number);
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
const allStatuses = (s: string[]) => STATUSES.every((x) => s.includes(x));
function segStatus(a: Point, b: Point, limit: number) {
  const v = Math.max(a.speed, b.speed);
  return v >= MOVING_KMH
    ? v > limit
      ? 'Overspeed'
      : a.ignition === false
        ? 'Towed'
        : 'Running'
    : a.ignition === true
      ? 'Idle'
      : 'Stopped';
}
function routeParts(points: Point[], keep: Set<string>, limit: number) {
  const out: LatLng[][] = [];
  let cur: LatLng[] | null = null;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (keep.has(segStatus(a, b, limit))) {
      if (!cur) out.push((cur = [a.at]));
      cur.push(b.at);
    } else cur = null;
  }
  return out;
}
const changedCount = (s: Settings) =>
  (s.window ? 1 : 0) + (s.stopLimit !== DEFAULT_STOP ? 1 : 0) + (allStatuses(s.statuses) ? 0 : 1);
function toForm(span: { first: string; last: string }, today: string, s: Settings): FilterValue {
  const one = !s.window && span.first === span.last;
  return {
    mode:
      one && span.first === today
        ? 'today'
        : one && span.first === addDays(today, -1)
          ? 'yesterday'
          : 'custom',
    from: `${span.first}T${s.window?.from ?? '00:00'}`,
    to: `${span.last}T${s.window?.to ?? '23:59'}`,
    stopLimit: String(s.stopLimit),
    statuses: s.statuses,
    trip: '',
  };
}
function fromForm(v: FilterValue) {
  const first = v.from.slice(0, 10);
  const last = v.to.slice(0, 10) > first ? v.to.slice(0, 10) : first;
  const f = v.from.slice(11, 16) || '00:00';
  const t = v.to.slice(11, 16) || '23:59';
  return {
    span: { first, last },
    settings: {
      window: f === '00:00' && t === '23:59' ? null : { from: f, to: t },
      stopLimit: Number(v.stopLimit) || DEFAULT_STOP,
      statuses: v.statuses,
    },
  };
}
const RATES = [1, 2, 4, 8];
const MS_PER_S = 2 * 6e4;

/** Replay clock of the history player (original: JU). */
function usePlayer(start: number, end: number) {
  const [t, setT] = useState(start);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(RATES[0]!);
  const ref = useRef(start);
  const set = (v: number) => {
    ref.current = v;
    setT(v);
  };
  useEffect(() => {
    ref.current = start;
    setT(start);
    setPlaying(false);
  }, [start, end]);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const v = Math.min(end, ref.current + ((now - last) / 1e3) * rate * MS_PER_S);
      last = now;
      ref.current = v;
      setT(v);
      if (v >= end) setPlaying(false);
      else raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, rate, end]);
  return {
    t,
    playing,
    rate,
    setRate,
    seek: (v: number) => set(Math.min(end, Math.max(start, v))),
    restart: () => {
      set(start);
      setPlaying(false);
    },
    toggle: () => {
      if (!playing && ref.current >= end) set(start);
      setPlaying((x) => !x);
    },
    play: () => {
      if (ref.current >= end) set(start);
      setPlaying(true);
    },
  };
}
/** Running / stopped / idle minutes up to time t (original: hU). */
function minutesUpTo(day: Day, t: number) {
  const cut = (a: number, b: number) => Math.max(0, Math.min(b, t) - a);
  let run = 0;
  let stop = 0;
  for (const x of day.trips) run += cut(x.start, x.end);
  for (const x of day.stops) stop += cut(x.start, x.end);
  let idle = 0;
  let k = 0;
  for (let i = 1; i < day.points.length; i++) {
    const a = day.points[i - 1]!;
    const b = day.points[i]!;
    if (a.t >= t) break;
    while (k < day.stops.length && day.stops[k]!.end < a.t) k++;
    const s = day.stops[k];
    if (!s) break;
    if (a.t >= s.start && b.t <= s.end && b.t - a.t <= 10 * 6e4 && a.ignition === true)
      idle += Math.min(b.t, t) - a.t;
  }
  return { runningMin: run / 6e4, stoppedMin: Math.max(0, stop - idle) / 6e4, idleMin: idle / 6e4 };
}
function EndPin() {
  return (
    <svg className="td-endpin__svg" viewBox="0 0 24 30" width="28" height="35" aria-hidden="true">
      <path d="M12 29s9-9.2 9-16A9 9 0 0 0 3 13c0 6.8 9 16 9 16Z" />
      <circle cx="12" cy="12.5" r="4.6" fill="#fff" />
      <circle className="td-endpin__dot" cx="12" cy="12.5" r="2.2" />
    </svg>
  );
}

function HistoryTracker({
  row,
  initialDate,
  operators,
}: {
  row: Row;
  initialDate?: string;
  operators: string[];
}) {
  const profile = row.vehicle.profile;
  const today = isoDay(new Date());
  const [span, setSpan] = useState(() => {
    const d = initialDate && initialDate <= today ? initialDate : today;
    return { first: d, last: d };
  });
  const [picked, setPicked] = useState<number | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [drawer, setDrawer] = useState<'distance' | 'alerts' | null>(null);
  const [settings, setSettings] = useState<Settings>(START_SETTINGS);
  const [ops, setOps] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  const days = useMemo(
    () =>
      daysOf(span, settings.window).map((d) =>
        d.day === today
          ? {
              ...d,
              to: new Date(Math.max(d.from.getTime() + 1, Math.min(d.to.getTime(), Date.now()))),
            }
          : d,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [span, settings.window],
  );
  const analysed = useMemo(
    () =>
      days.map((d) =>
        analyse(historyPoints(row.id, d.from.getTime(), d.to.getTime()), {
          rangeEnd: d.to.getTime(),
          profile,
        }),
      ),
    [days, row.id, profile],
  );
  // Demo operator log: the vehicle's Neon operator drove it the whole period (the original reads a report).
  const from = days[0]!.from;
  const to = days[days.length - 1]!.to;
  const log = useMemo(
    () =>
      row.vehicle.operator
        ? [{ operator: row.vehicle.operator.name, from: from.getTime(), to: null as number | null }]
        : [],
    [row.vehicle.operator, from, to],
  );
  const opList = useMemo(
    () =>
      [...new Set([...operators, ...log.map((l) => l.operator)])].sort((a, b) =>
        a.localeCompare(b),
      ),
    [operators, log],
  );
  const opLog = useMemo(
    () => (ops.length ? log.filter((l) => ops.includes(l.operator)) : null),
    [ops, log],
  );
  const byOps = useCallback(
    (a: number, b: number) => !opLog || opLog.some((l) => l.from < b && (l.to ?? Infinity) > a),
    [opLog],
  );
  const tripsPerDay = useMemo(
    () => analysed.map((d) => d.trips.filter((t) => byOps(t.start, t.end))),
    [analysed, byOps],
  );
  const multi = days.length > 1;
  const hasTrips = tripsPerDay.map((t) => t.length > 0);
  const idx = Math.min(days.length - 1, picked ?? Math.max(0, hasTrips.indexOf(true)));
  const day = analysed[idx] ?? null;
  const dayKey = days[idx]!.day;
  const dayRangeNow = days[idx]!;
  const jumpTo = (d: string) => {
    if (!d || d > today) return;
    setSpan({ first: d, last: d });
    setPicked(null);
    setSettings((s) => ({ ...s, window: null }));
  };
  const apply = (v: FilterValue) => {
    const f = fromForm(v);
    if (f.span.first <= today)
      setSpan({ first: f.span.first, last: f.span.last <= today ? f.span.last : today });
    setPicked(null);
    setSettings(f.settings);
    setOps(v.operators ?? []);
    setFilterOpen(false);
  };
  const trips = useMemo(() => tripsPerDay[idx] ?? [], [tripsPerDay, idx]);
  const start = trips[0]?.start ?? 0;
  const end = trips[trips.length - 1]?.end ?? 0;
  const player = usePlayer(start, end);
  useEffect(() => {
    if (autoPlay) {
      if (end > start) player.play();
      setAutoPlay(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, start, end]);
  const every = allStatuses(settings.statuses);
  const lines = useMemo(() => {
    const keep = new Set(settings.statuses);
    return trips.flatMap((t) =>
      every
        ? [{ id: t.id, className: 'is-route', points: t.points.map((x) => x.at) }]
        : routeParts(t.points, keep, profile.overspeedKmh).map((pts, i) => ({
            id: `${t.id}:${i}`,
            className: 'is-route',
            points: pts,
          })),
    );
  }, [trips, settings.statuses, every, profile.overspeedKmh]);
  const fit = useMemo(() => trips.flatMap((t) => t.points.map((x) => x.at)), [trips]);
  const filterPop = filterOpen && (
    <FilterPop anchor={anchor} onClose={() => setFilterOpen(false)}>
      <HistoryFilterForm
        value={{ ...toForm(span, today, settings), operators: ops }}
        today={today}
        maxDays={MAX_DAYS}
        defaultValue={{
          ...toForm({ first: today, last: today }, today, START_SETTINGS),
          operators: [],
        }}
        operators={opList}
        onApply={apply}
        onDismiss={() => setFilterOpen(false)}
      />
    </FilterPop>
  );
  const filterAction = (
    <span ref={anchor} className="td-trk__filteraction">
      <button
        type="button"
        className="td-btn td-btn--ghost"
        aria-pressed={filterOpen}
        onClick={() => setFilterOpen((o) => !o)}
      >
        <Icon name="Funnel" size={14} />
        History Filter
      </button>
    </span>
  );
  const drawers = (
    <>
      {drawer === 'distance' && day && (
        <DistanceDrawer
          day={day}
          row={row}
          profile={profile}
          image={row.vehicle.image}
          date={dayKey}
          today={today}
          onDate={jumpTo}
          onClose={() => setDrawer(null)}
        />
      )}
      {drawer === 'alerts' && (
        <AlertsDrawer
          from={dayRangeNow.from}
          to={dayRangeNow.to}
          row={row}
          profile={profile}
          image={row.vehicle.image}
          date={dayKey}
          today={today}
          onDate={jumpTo}
          onClose={() => setDrawer(null)}
        />
      )}
    </>
  );
  if (!day || !trips.length) {
    const byOperator = !!opLog && analysed.some((d) => d.trips.length);
    return (
      <div className="td-trk td-trk--history">
        <Empty
          icon="Route"
          title={
            byOperator
              ? 'No trips by the selected operators'
              : multi
                ? 'No trips on these days'
                : 'No trips on this day'
          }
          text={
            byOperator
              ? `${ops.join(', ')} did not drive ${row.name} ${multi ? `from ${longDay(span.first)} to ${longDay(span.last)}` : `on ${longDay(dayKey)}`}. Change the operators in the History Filter.`
              : multi
                ? `${row.name} did not move from ${longDay(span.first)} to ${longDay(span.last)}. Pick other days in the History Filter.`
                : `${row.name} did not move on ${longDay(dayKey)}. Pick another day in the History Filter.`
          }
        >
          {filterAction}
        </Empty>
        {filterPop}
        {drawers}
      </div>
    );
  }
  const s = day.summary;
  const at = positionAt(day, player.t);
  const progress = playedPath(trips, player.t, at.at);
  const first = trips[0]!;
  const last = trips[trips.length - 1]!;
  const tone = row.status.tone;
  const plate = row.vehicle.code ?? row.name;
  const stops = day.stops.filter((x) => byOps(x.start, x.end));
  const status = replayStatusAt(day, at, player.t, profile.overspeedKmh);
  const tripNow = at.moving
    ? trips.find((t) => player.t >= t.start && player.t <= t.end)
    : undefined;
  const stopNow = !at.moving
    ? day.stops.find((x) => player.t >= x.start && player.t <= x.end)
    : undefined;
  const pins: TrackerPin[] = [
    {
      id: 'start',
      at: first.points[0]!.at,
      className: 'td-marker--sm tone-green',
      children: (
        <>
          <Icon name="Flag" size={11} />
          <span className="td-marker__tip">
            <strong>Start · {clock12(first.start)}</strong>
            {latLngText(first.points[0]!.at)}
          </span>
        </>
      ),
    },
    ...stops
      .filter(
        (x) =>
          x.durationMin >= settings.stopLimit &&
          (every ||
            (settings.statuses.includes('Stopped') && x.durationMin > x.idleMin) ||
            (settings.statuses.includes('Idle') && x.idleMin > 0)),
      )
      .map((x) => ({
        id: x.id,
        at: x.at,
        className: 'td-marker--sm tone-amber',
        children: (
          <>
            <Icon name="SquareParking" size={11} />
            <span className="td-marker__tip">
              <strong>
                Stop · {hm(x.durationMin)}
                {x.ongoing ? ' (ongoing)' : ''}
              </strong>
              {clock12(x.start)} – {clock12(x.end)} · {latLngText(x.at)}
            </span>
          </>
        ),
      })),
    ...(last.ongoing
      ? []
      : [
          {
            id: 'end',
            at: last.points[last.points.length - 1]!.at,
            className: 'td-endpin',
            children: (
              <>
                <EndPin />
                <span className="td-marker__tip">
                  <strong>End · {clock12(last.end)}</strong>
                  {latLngText(last.points[last.points.length - 1]!.at)}
                </span>
              </>
            ),
          },
        ]),
    {
      id: 'vehicle',
      at: at.at,
      top: true,
      className: `td-marker--vehicle tone-${tone}`,
      children: (
        <>
          <VehicleMarkerIcon
            plate={plate}
            status={status}
            speed={at.speed}
            img={row.vehicle.image}
          />
          <span className="td-marker__tip">
            <strong>
              {row.name} · {clock12(player.t)}
            </strong>
            {at.moving ? `${at.speed} km/h` : 'Stopped'}
          </span>
        </>
      ),
    },
  ];
  const tel = telemetryOf(row.id, row.vehicle.index, row.vehicle.odometerKm);
  const info = vehicleInfo(row, tel);
  const share: ShareInfo | null = !player.playing
    ? {
        plate,
        lat: at.at[0],
        lng: at.at[1],
        statusLine: `History · ${shortDay(isoDay(new Date(player.t))).replace(/^0/, '')} · at ${clock12(player.t)}`,
      }
    : null;
  const panel: PanelInfo = {
    plate,
    img: row.vehicle.image,
    model: info.model,
    operator: info.operator,
    operatorId: info.operatorId,
    mode: 'history',
    date: player.t,
    status,
    speed: at.speed,
    ignition: ignitionAt(day, player.t) ?? undefined,
    ...minutesUpTo(day, player.t),
    noVehicle: false,
    location: at.at,
    ...(multi
      ? {
          historyDates: days.map((d, i) => ({
            day: shortDay(d.day),
            range: `${ampm(d.fromTime)} – ${ampm(d.toTime)}`,
            noData: !hasTrips[i],
          })),
          activeDateIndex: idx,
          onSelectDate: (i: number) => hasTrips[i] && setPicked(i),
          onPlayDate: (i: number) => {
            if (hasTrips[i]) {
              setPicked(i);
              setAutoPlay(true);
            }
          },
        }
      : {}),
  };
  const kpis = [
    { label: 'Distance', value: `${s.distanceKm} km`, icon: 'Milestone', tone: 'blue' },
    { label: 'Trips', value: s.trips, icon: 'Route', tone: 'purple' },
    { label: 'Running', value: hm(s.runningMin), icon: 'Play', tone: 'green' },
    { label: 'Idle', value: hm(s.idleMin), icon: 'Clock', tone: 'blue' },
    { label: 'Stopped', value: hm(s.stopMin), icon: 'Square', tone: 'red' },
    { label: 'Max speed', value: `${s.maxSpeed} km/h`, icon: 'Gauge', tone: 'orange' },
    { label: 'Avg speed', value: `${s.avgSpeed} km/h`, icon: 'Activity', tone: 'teal' },
    {
      label: 'Overspeed',
      value: s.overspeed,
      icon: 'TriangleAlert',
      tone: s.overspeed ? 'red' : 'gray',
    },
  ];
  return (
    <div className="td-trk td-trk--history">
      <div className="td-trk__kpis">
        {kpis.map((k) => (
          <div key={k.label} className={`td-trk__kpi tone-${k.tone}`}>
            <span className="td-badge td-badge--sm">
              <Icon name={k.icon} size={13} />
            </span>
            <small>{k.label}</small>
            <b>{k.value}</b>
          </div>
        ))}
      </div>
      <div className="td-trk__main">
        <TrackerMap
          className="td-tmap"
          fitKey={`${row.id}:${dayKey}`}
          fit={fit}
          maxFitZoom={16}
          lines={lines}
          progress={progress}
          pins={pins}
          share={share}
          overlay={
            <>
              <PlaybackControls
                playing={player.playing}
                onTogglePlay={player.toggle}
                onStop={player.restart}
                speed={player.rate}
                onSpeed={() =>
                  player.setRate(RATES[(RATES.indexOf(player.rate) + 1) % RATES.length]!)
                }
                distanceOn={drawer === 'distance'}
                onDistance={() => setDrawer((d) => (d === 'distance' ? null : 'distance'))}
                alertsOn={drawer === 'alerts'}
                onAlerts={() => setDrawer((d) => (d === 'alerts' ? null : 'alerts'))}
                filterButton={
                  <span ref={anchor} style={{ display: 'block' }}>
                    <MapFilterButton
                      size={32}
                      title="History Filter"
                      open={filterOpen}
                      count={changedCount(settings) + (ops.length ? 1 : 0)}
                      onClick={() => setFilterOpen((o) => !o)}
                    />
                  </span>
                }
              />
              {filterPop}
              <SpeedHud
                tone={at.speed > profile.overspeedKmh ? 'red' : at.moving ? 'green' : 'gray'}
                speed={at.speed}
                limit={profile.overspeedKmh}
                status={status}
                panel={panel}
              >
                <div className="td-trk__state">
                  <strong>{clock12(player.t)}</strong>
                  <small>{tripNow ? `Trip ${tripNow.index}` : stopNow ? 'Stopped' : '—'}</small>
                  <small>
                    <Icon name="Milestone" size={12} />
                    {s.distanceKm} km · {s.trips} trip{s.trips === 1 ? '' : 's'}
                  </small>
                </div>
              </SpeedHud>
            </>
          }
        />
        <div className="td-play">
          <span className="td-play__time">{clock12(player.t)}</span>
          <input
            className="td-play__bar"
            type="range"
            min={start}
            max={end}
            step={15e3}
            value={player.t}
            aria-label="Playback position"
            onChange={(e) => player.seek(Number(e.target.value))}
            style={cssVars({
              '--pct': `${end > start ? ((player.t - start) / (end - start)) * 100 : 0}%`,
            })}
          />
          <span className="td-play__time is-end">{clock12(end)}</span>
        </div>
      </div>
      {drawers}
    </div>
  );
}
