// IT-0036. The grid tiles (live and history), the empty "Add vehicle" slots, the replay bar and the
// vehicle track card, ported from the original page (BH, uc, GH, XH, fC, FH, AC).
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../smart-track/kit';
import {
  analyse,
  clock12,
  clock24,
  hm,
  isoDay,
  longDay,
  playedPath,
  positionAt,
  dayWindow,
  type Day,
  type LatLng,
  type Summary,
} from './analysis';
import {
  historyPoints,
  sensorsOf,
  type Profile,
  type Status,
  type Telemetry,
  type TrackPoint,
} from './demo';
import type { Row } from './fleet';
import { FleetMap } from './map';
import { Empty, Img, Pill, SpeedGauge, cssVars } from './parts';

/** A picked vehicle with its colour on the grid. */
export interface Item {
  row: Row;
  tone: string;
  code?: string;
  image?: string;
}
export interface TileActions {
  onExpand?: (id: string) => void;
  onRemove: (id: string) => void;
}

export const TONES = ['blue', 'red', 'green', 'purple', 'orange', 'teal'];
/** At most this many vehicles are picked (one per grid tile). */
export const MAX_PICKED = TONES.length;

/** Map status ids to the tile marker's status words. */
export const MARKER_STATUS: Record<string, string> = {
  moving: 'running',
  stopped: 'stopped',
  idle: 'idle',
  overspeed: 'overspeed',
  towed: 'towed',
  offline: 'notrans',
  never: 'ytt',
};
const replayStatus = (speed: number, moving: boolean, limit: number) =>
  speed > limit ? 'overspeed' : moving ? 'running' : 'stopped';

export const liveChip = (stale: boolean, live: boolean) =>
  `td-trk__chip mt-live ${stale ? 'is-stale' : live ? 'is-live' : ''}`;

const SLOT_TONES: [string, string][] = [
  ['blue', 'var(--teal)'],
  ['green', 'color-mix(in srgb, var(--green) 55%, #fff)'],
  ['purple', 'var(--blue)'],
  ['teal', 'var(--blue)'],
  ['orange', 'var(--amber)'],
  ['teal', 'var(--green)'],
];

export function Slot({
  place,
  onPick,
  label = 'Add vehicle',
  hint = 'Pick a vehicle to track it here',
}: {
  place: number;
  onPick: () => void;
  label?: string;
  hint?: string;
}) {
  const [tone, tone2] = SLOT_TONES[place % SLOT_TONES.length]!;
  return (
    <button
      type="button"
      className={`mt-slot tone-${tone}`}
      style={cssVars({ '--tone-2': tone2 })}
      onClick={onPick}
    >
      <span className="mt-slot__art" aria-hidden="true">
        <Icon name="Truck" size={30} />
        <span className="mt-slot__plus">
          <Icon name="Plus" size={14} />
        </span>
      </span>
      <strong>{label}</strong>
      <small>{hint}</small>
    </button>
  );
}

function Stat({ label, value, warn }: { label: string; value: ReactNode; warn?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={warn ? 'is-warn' : ''}>{value}</dd>
    </div>
  );
}

export function Speed({ kmh, over, tone }: { kmh: number; over: boolean; tone?: string }) {
  return (
    <span className={`mt-speed ${tone ? `tone-${tone} has-tone` : ''} ${over ? 'is-over' : ''}`}>
      <b>{kmh}</b>
      <small>km/h</small>
    </span>
  );
}

function Tile({
  item,
  actions,
  toolbar,
  stats,
  children,
}: {
  item: Item;
  actions: TileActions;
  toolbar?: ReactNode;
  stats?: ReactNode;
  children: ReactNode;
}) {
  const { row, tone, code, image } = item;
  return (
    <article
      className={`mt-tile tone-${tone}`}
      style={cssVars({ '--st': `var(--${row.status.tone})` })}
    >
      <span className={`mt-tile__status tone-${row.status.tone}`} aria-hidden="true" />
      <header className="mt-tile__head">
        <Img
          src={image}
          alt=""
          width={36}
          height={26}
          className="td-entity-media"
          fallback={
            <span className="td-badge">
              <Icon name="Truck" size={16} />
            </span>
          }
        />
        <span className="td-gv-card__who">
          <strong>{row.name}</strong>
          <small>{code}</small>
        </span>
        <Pill tone={row.status.tone}>{row.status.label}</Pill>
        {actions.onExpand && (
          <button
            type="button"
            className="td-icon-btn td-icon-btn--sm"
            onClick={() => actions.onExpand?.(row.id)}
            aria-label={`Open ${row.name} large`}
            title="Open large"
          >
            <Icon name="Expand" size={13} />
          </button>
        )}
        <button
          type="button"
          className="td-icon-btn td-icon-btn--sm"
          onClick={() => actions.onRemove(row.id)}
          aria-label={`Remove ${row.name}`}
          title="Remove"
        >
          <Icon name="X" size={13} />
        </button>
      </header>
      {toolbar && <div className="mt-tile__bar">{toolbar}</div>}
      <div className="mt-tile__map">{children}</div>
      {stats && <dl className="mt-tile__stats">{stats}</dl>}
    </article>
  );
}

const startOfToday = () => dayWindow(isoDay(new Date())).from;

/** Today's track so far plus the live reports received since the page opened (original: GH / TU). */
export function useTodayTrack(row: Row, profile: Profile) {
  const [to] = useState(() => new Date());
  const base = useMemo(
    () => historyPoints(row.id, startOfToday().getTime(), to.getTime()),
    [row.id, to],
  );
  const extra = useRef<TrackPoint[]>([]);
  const [n, setN] = useState(0);
  const p = row.position;
  useEffect(() => {
    if (!p) return;
    const last = extra.current[extra.current.length - 1];
    if (Date.parse(p.ts) <= to.getTime() || (last && last.ts >= p.ts)) return;
    extra.current = [
      ...extra.current,
      {
        ts: p.ts,
        lat: p.lat,
        lng: p.lng,
        speed: p.speed ?? 0,
        heading: p.heading,
        ignition: p.ignition ?? false,
        flags: 0,
      },
    ];
    setN((x) => x + 1);
  }, [p, to]);
  return useMemo(() => {
    const now = Date.now();
    return analyse([...base, ...extra.current], { now, rangeEnd: now, profile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, n, profile]);
}

export function LiveTile({
  item,
  profile,
  actions,
  small,
}: {
  item: Item;
  profile: Profile;
  actions: TileActions;
  small: boolean;
}) {
  const { row, tone } = item;
  const day = useTodayTrack(row, profile);
  const p = row.position;
  if (!p)
    return (
      <Tile item={item} actions={actions}>
        <Empty
          icon="Hourglass"
          title="No live position yet"
          text={`${row.name} has not transmitted any location today.`}
        />
      </Tile>
    );
  const st = row.status;
  const stale = st.id === 'offline';
  const kmh = Math.round(p.speed ?? 0);
  const at: LatLng = [p.lat, p.lng];
  const live = true;
  return (
    <Tile
      item={item}
      actions={actions}
      stats={
        <>
          <Stat label="Today" value={`${day.summary.distanceKm} km`} />
          <Stat label="Trips" value={day.summary.trips} />
          <Stat label="Ignition" value={p.ignition == null ? '—' : p.ignition ? 'On' : 'Off'} />
          <Stat label="Updated" value={clock24(Date.parse(p.ts))} warn={stale} />
        </>
      }
    >
      <FleetMap
        fitKey={`live:${row.id}`}
        follow={at}
        small={small}
        lines={[{ id: 'trail', tone, variant: 'done', points: day.points.map((x) => x.at) }]}
        firstFitPins
        pins={[
          {
            id: 'vehicle',
            at,
            plate: item.code ?? row.name,
            status: MARKER_STATUS[st.id],
            speed: kmh,
            img: item.image,
            title: row.name,
            sub: `${st.label} · ${kmh} km/h`,
          },
        ]}
        overlay={
          <>
            <div className={liveChip(stale, live)}>
              {stale || !live ? <Icon name="WifiOff" size={14} /> : <i className="td-live-dot" />}
              <span>{stale ? 'Last known position' : live ? 'Live' : 'Reconnecting…'}</span>
            </div>
            <Speed kmh={kmh} over={kmh > profile.overspeedKmh} tone={st.tone} />
          </>
        }
      />
    </Tile>
  );
}

/* ------------------------------------------------------------------ replay */

const RATES = [1, 4, 16];
/** Replay runs 2 minutes of the day per second at 1×. */
const REPLAY_MS_PER_S = 2 * 6e4;

export interface Span {
  start: number;
  end: number;
}
export interface Play {
  t: number;
  playing: boolean;
  rate: number;
  start: number;
  end: number;
  toggle: () => void;
  stop: () => void;
  seek: (t: number) => void;
  setRate: (r: number) => void;
}
interface PlayState {
  t: number;
  playing: boolean;
  rate: number;
  span: Span;
}
const same = (a: Span, b: Span) => a.start === b.start && a.end === b.end;
const fresh = (span: Span): PlayState => ({ t: span.start, playing: false, rate: RATES[1]!, span });

/** Replay state per vehicle (original: FH). */
export function usePlayback(spans: Map<string, Span>) {
  const [state, setState] = useState(() => new Map<string, PlayState>());
  const spansRef = useRef(spans);
  spansRef.current = spans;
  const key = [...spans].map(([id, s]) => `${id}:${s.start}:${s.end}`).join('|');
  useEffect(() => {
    setState((prev) => {
      const next = new Map<string, PlayState>();
      spansRef.current.forEach((s, id) => {
        const p = prev.get(id);
        if (p && same(p.span, s)) next.set(id, p);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [key]);
  const anyPlaying = [...state.values()].some((p) => p.playing);
  useEffect(() => {
    if (!anyPlaying) return;
    let last = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const dt = (now - last) / 1e3;
      last = now;
      setState((prev) => {
        let changed = false;
        const next = new Map(prev);
        prev.forEach((p, id) => {
          if (!p.playing) return;
          const t = Math.min(p.span.end, p.t + dt * p.rate * REPLAY_MS_PER_S);
          next.set(id, { ...p, t, playing: t < p.span.end });
          changed = true;
        });
        return changed ? next : prev;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [anyPlaying]);
  const update = useCallback((id: string, f: (p: PlayState) => PlayState) => {
    setState((prev) => {
      const span = spansRef.current.get(id);
      if (!span) return prev;
      const p = prev.get(id);
      const next = new Map(prev);
      next.set(id, f(p && same(p.span, span) ? p : fresh(span)));
      return next;
    });
  }, []);
  return useCallback(
    (id: string): Play | null => {
      const span = spans.get(id);
      if (!span) return null;
      const p0 = state.get(id);
      const p = p0 && same(p0.span, span) ? p0 : fresh(span);
      return {
        t: p.t,
        playing: p.playing,
        rate: p.rate,
        start: span.start,
        end: span.end,
        toggle: () =>
          update(id, (x) => ({
            ...x,
            t: !x.playing && x.t >= x.span.end ? x.span.start : x.t,
            playing: !x.playing,
          })),
        stop: () => update(id, (x) => ({ ...x, t: x.span.start, playing: false })),
        seek: (t) =>
          update(id, (x) => ({ ...x, t: Math.min(x.span.end, Math.max(x.span.start, t)) })),
        setRate: (r) => update(id, (x) => ({ ...x, rate: r })),
      };
    },
    [spans, state, update],
  );
}

export function PlaybackBar({ play, name, lead }: { play: Play; name: string; lead?: ReactNode }) {
  const len = play.end - play.start;
  const pct = len > 0 ? ((play.t - play.start) / len) * 100 : 0;
  const atStart = play.t <= play.start;
  return (
    <div
      className={`mt-pb ${play.playing ? 'is-playing' : ''}`}
      role="group"
      aria-label={`${name} playback`}
    >
      {lead}
      <button
        type="button"
        className="mt-pb__btn is-main"
        onClick={play.toggle}
        aria-label={play.playing ? `Pause ${name}` : `Play ${name}`}
        title={play.playing ? 'Pause' : 'Play'}
      >
        <Icon name={play.playing ? 'Pause' : 'Play'} size={13} />
      </button>
      <button
        type="button"
        className="mt-pb__btn"
        onClick={play.stop}
        disabled={atStart && !play.playing}
        aria-label={`Stop ${name}`}
        title="Stop"
      >
        <Icon name="Square" size={11} />
      </button>
      <span className="mt-pb__time">{clock12(play.t)}</span>
      <input
        className="td-play__bar mt-pb__bar"
        type="range"
        min={play.start}
        max={play.end}
        step={15e3}
        value={play.t}
        aria-label={`${name} playback time`}
        onChange={(e) => play.seek(Number(e.target.value))}
        style={cssVars({ '--pct': `${pct}%` })}
      />
      <span className="mt-pb__time is-end">{clock12(play.end)}</span>
      <span className="mt-pb__rates" role="group" aria-label={`${name} playback speed`}>
        {RATES.map((r) => (
          <button
            key={r}
            type="button"
            className={r === play.rate ? 'is-on' : ''}
            aria-pressed={r === play.rate}
            onClick={() => play.setRate(r)}
          >
            {r}×
          </button>
        ))}
      </span>
    </div>
  );
}

export function HistoryTile({
  item,
  profile,
  date,
  day,
  play,
  actions,
  small,
}: {
  item: Item;
  profile: Profile;
  date: string;
  day: Day | null;
  play: Play | null;
  actions: TileActions;
  small: boolean;
}) {
  const { row, tone } = item;
  if (!day || !day.trips.length)
    return (
      <Tile item={item} actions={actions}>
        <Empty
          icon="Route"
          title="No trips on this day"
          text={`${row.name} did not move on ${longDay(date)}.`}
        />
      </Tile>
    );
  const s = day.summary;
  const t = play?.t ?? day.trips[0]!.start;
  const at = positionAt(day, t);
  const name = item.code || row.name;
  const label = play?.playing
    ? `Playing · ${play.rate}×`
    : play && play.t > play.start
      ? 'Paused'
      : 'Replay';
  const lines = [
    ...day.trips.map((tr) => ({
      id: tr.id,
      tone,
      variant: 'route' as const,
      points: tr.points.map((x) => x.at),
    })),
    { id: 'played', tone, variant: 'done' as const, points: playedPath(day.trips, t, at.at) },
  ];
  return (
    <Tile
      item={item}
      actions={actions}
      toolbar={play && <PlaybackBar play={play} name={name} />}
      stats={
        <>
          <Stat label="Distance" value={`${s.distanceKm} km`} />
          <Stat label="Trips" value={s.trips} />
          <Stat
            label="Max speed"
            value={`${s.maxSpeed} km/h`}
            warn={s.maxSpeed > profile.overspeedKmh}
          />
          <Stat label="Running" value={hm(s.runningMin)} />
        </>
      }
    >
      <FleetMap
        fitKey={`hist:${row.id}:${date}`}
        lines={lines}
        small={small}
        pins={[
          {
            id: 'vehicle',
            at: at.at,
            plate: item.code ?? row.name,
            status: replayStatus(at.speed, at.moving, profile.overspeedKmh),
            speed: at.speed,
            img: item.image,
            title: row.name,
            sub: at.moving ? `${at.speed} km/h` : 'Stopped',
          },
        ]}
        overlay={
          <>
            <div className="td-trk__chip">
              <span>{label}</span>
            </div>
            <Speed kmh={at.moving ? at.speed : 0} over={at.speed > profile.overspeedKmh} />
          </>
        }
      />
    </Tile>
  );
}

/* ------------------------------------------------------------------ track card (original: AC) */

const CARD_SENSORS = ['gps', 'gsm', 'internalBattery', 'externalBattery', 'engine'];
function stamp(ms: number | null) {
  if (ms == null) return { day: '—', time: '' };
  return {
    day: new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(ms),
    time: new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
      .format(ms)
      .toUpperCase(),
  };
}

export function TrackCard(p: {
  mode: 'live' | 'history';
  name: string;
  code?: string;
  image?: string;
  status: Pick<Status, 'label' | 'tone'>;
  speed: number;
  at: number | null;
  odometerKm: number | null;
  telemetry?: Telemetry;
  ignition: boolean | null;
  summary: Summary | null;
  operator?: { name: string; tagId: string } | null;
  onMinimize: () => void;
  actions?: ReactNode;
}) {
  const t = stamp(p.at);
  const sensors = p.telemetry
    ? sensorsOf(p.telemetry, p.ignition).filter((s) => CARD_SENSORS.includes(s.key))
    : [];
  const times = [
    { key: 'running', label: 'Running', tone: 'green', min: p.summary?.runningMin },
    { key: 'stopped', label: 'Stopped', tone: 'red', min: p.summary?.stopMin },
    { key: 'idle', label: 'Idle', tone: 'blue', min: p.summary?.idleMin },
  ];
  return (
    <section className={`mt-tcard tone-${p.status.tone}`} aria-label={`${p.name} details`}>
      <div className="mt-tcard__id">
        <Img
          src={p.image}
          alt=""
          width={64}
          height={44}
          className="mt-tcard__img"
          fallback={
            <span className="mt-tcard__img mt-tcard__img--ph">
              <Icon name="Truck" size={22} />
            </span>
          }
        />
        <div className="mt-tcard__field">
          <small>{p.mode === 'live' ? 'Last update' : 'Replay time'}</small>
          <strong>
            {t.day} <span>{t.time}</span>
          </strong>
        </div>
        <div className="mt-tcard__field">
          <small>Plate Number</small>
          <strong>
            <bdi>{p.code || p.name}</bdi>
          </strong>
        </div>
        <div className="mt-tcard__field">
          <small>Operator</small>
          {/* The original always shows "—" here (no operator wired); the Neon operator is shown when assigned. */}
          <strong className={p.operator ? '' : 'is-muted'}>{p.operator?.name || '—'}</strong>
          <small>
            <b>ID:</b> {p.operator?.tagId || '—'}
          </small>
        </div>
      </div>
      <div className="mt-tcard__gauge" title={`${p.status.label} · ${p.speed} km/h`}>
        <SpeedGauge speed={p.speed} status={p.status.label} width={108} />
        <Pill tone={p.status.tone} solid>
          {p.status.label}
        </Pill>
      </div>
      <div className="mt-tcard__right">
        <div className="mt-tcard__top">
          <div className="mt-tcard__field">
            <small>Odometer</small>
            <strong>
              {p.odometerKm != null
                ? `${Math.round(p.odometerKm).toLocaleString('en-US')} km`
                : '—'}
            </strong>
          </div>
          <span className="mt-tcard__sep" aria-hidden="true" />
          <div className="mt-tcard__field">
            <small>Vehicle Sensors</small>
            {sensors.length ? (
              <span className="mt-tcard__sensors">
                {sensors.map((s) => (
                  <span
                    key={s.key}
                    className={`mt-tcard__sensor tone-${s.tone} is-${s.state}`}
                    role="img"
                    aria-label={`${s.label}: ${s.value}`}
                    title={`${s.label}: ${s.value}`}
                  >
                    <Icon name={s.icon} size={13} />
                  </span>
                ))}
              </span>
            ) : (
              <strong className="is-muted">{p.mode === 'live' ? 'No reading' : '—'}</strong>
            )}
          </div>
        </div>
        <div className="mt-tcard__times">
          {times.map((x) => (
            <div
              key={x.key}
              className={`mt-tcard__time tone-${x.tone}`}
              title={`${x.label}: ${x.min != null ? hm(x.min) : '—'}`}
            >
              <b>{x.min != null ? hm(x.min) : '—'}</b>
              <small>{x.label}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-tcard__acts">
        {p.actions}
        <button
          type="button"
          className="mt-icon-btn mt-icon-btn--sm"
          onClick={p.onMinimize}
          aria-label="Minimize details"
          title="Minimize"
        >
          <Icon name="Minus" size={12} />
        </button>
      </div>
    </section>
  );
}
