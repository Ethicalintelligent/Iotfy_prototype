// IT-0036. Converted from the original Tracking page (Tracking.html, removed in IT-0037 (git history)): same markup,
// class names, inline styles, texts and behaviour. Component and prop names are readable; short
// local names are kept from the original where they are plain intermediate values.
/* eslint-disable */
import { portalRoot } from '../runtime';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Loading } from '../../smart-track/kit';
import { Icon } from '../icon';
import { QueryError, useCan, useQuery } from '../runtime';
import {
  ALERT_VIEW_PERMISSION,
  MOVING_KMH,
  VEHICLE_PROFILE,
  addDays,
  alertType,
  alertsApi,
  dayKey,
  dayRange,
  distanceMeters,
  formatClock,
  formatLatLng,
  formatLongDay,
  formatMinutes,
  inRange,
  isMissingEndpoint,
} from './format';
import {
  analyzeTrack,
  ignitionAt,
  pathUntil,
  positionAt,
  odometerAt,
  timesUntil,
  useHistoryDays,
} from './history-data';
import { ALL_STATUSES, HistoryFilter } from './history-filter';
import { EntityMedia, FilterButton, SeverityPill, SidePanel, identity, usePopover } from './kit';
import { MapChips, MapHeader, MapStats, historyShare } from './live';
import { EmptyState, Kpis, LivePanel } from './live-panel';
import { MapControlRow, SHARE_POS_RIGHT, TrackMap, VehicleMarker } from './map';
import { MAX_HISTORY_DAYS } from './speedometer';
import { HistoryTimeline } from './timeline';

export const latLngText = (e?: any) => formatLatLng(e[0], e[1]);

export const SEGMENT_KINDS: any = {
  running: {
    label: 'Running',
    tone: 'brand',
  },
  overspeed: {
    label: 'Overspeed',
    tone: 'orange',
  },
  stopped: {
    label: 'Stopped',
    tone: 'amber',
  },
  // IT-0041 (bug sheet 23-11-2026, Track History #6): idle periods (engine on, not moving).
  idle: {
    label: 'Idle',
    tone: 'blue',
  },
};

/**
 * IT-0041 (Track History #6): a stop split into its Stopped (engine off) and Idle (engine on)
 * parts, from the day's status segments; a stop without segment data stays one Stopped part.
 */
export function stopParts(day?: any, stop?: any) {
  const parts: any[] = [];
  for (const seg of day.segments) {
    if (seg.status === 'moving' || seg.end <= stop.start || seg.start >= stop.end) continue;
    const kind = seg.status === 'idle' ? 'idle' : 'stopped',
      start = Math.max(seg.start, stop.start),
      end = Math.min(seg.end, stop.end),
      last = parts[parts.length - 1];
    if (last && last.kind === kind && last.end >= start) last.end = Math.max(last.end, end);
    else if (end > start) parts.push({ kind, start, end });
  }
  return parts.length ? parts : [{ kind: 'stopped', start: stop.start, end: stop.end }];
}

export const segmentKm = (e?: any) => {
  let t = 0;
  for (let n = 1; n < e.length; n++) t += distanceMeters(e[n - 1].at, e[n].at);
  return Math.round(t / 10) / 100;
};

export function overspeedRuns(e?: any, t?: any) {
  if (!t.overspeed) return [];
  const n: any = [];
  let r = -1;
  for (let i = 0; i <= e.length; i++) {
    const s = i < e.length && e[i].speed > t.overspeedKmh;
    if (s && r < 0) r = i;
    else if (!s && r >= 0) {
      const a = e.slice(r, Math.min(i + 1, e.length)),
        l = a[0],
        c = a[a.length - 1];
      if (c.t > l.t) {
        n.push({
          id: `os-${l.t}`,
          kind: 'overspeed',
          start: l.t,
          end: c.t,
          from: l.at,
          to: c.at,
          distanceKm: segmentKm(a),
        });
      }
      r = -1;
    }
  }
  return n;
}

export function timeline(e?: any, t?: any) {
  return [
    ...e.trips.map((n?: any) => ({
      id: n.id,
      kind: 'running',
      start: n.start,
      end: n.end,
      distanceKm: n.distanceKm,
      from: n.points[0].at,
      to: n.points[n.points.length - 1].at,
    })),
    ...overspeedRuns(e.points, t),
    ...e.stops.flatMap((n?: any) =>
      stopParts(e, n).map((p?: any, i?: any) => ({
        id: `${n.id}:${i}`,
        kind: p.kind,
        start: p.start,
        end: p.end,
        from: n.at,
        to: n.at,
      })),
    ),
  ].sort((n?: any, r?: any) => n.start - r.start);
}

/** IT-0055: durations as "3h 34m" / "0h 39m". */
export const hpDur = (min?: any) => {
  const t = Math.max(0, Math.round(min)),
    h = Math.floor(t / 60),
    m = t % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

/** IT-0055: "27 Nov 2026" for a YYYY-MM-DD day. */
const hpDay = (d?: any) => {
  if (!d) return '—';
  const [y = 1970, m = 1, dd = 1] = String(d).split('-').map(Number);
  return `${String(dd).padStart(2, '0')} ${DAY_MONTHS[m - 1]} ${y}`;
};

/** IT-0055: alert card colours by alert type (others by their tone). */
const HP_ALERT: any = {
  'woke up': 'teal',
  'power cut': 'red',
  drift: 'orange',
  overspeed: 'orange',
  sos: 'red',
  towed: 'teal',
};

export function SegmentEnds({ start, end, from, to: r, tone, same }: any) {
  return (
    // IT-0055: `same` (Stopped / Idle at one place): the place is shown once across the card.
    <div className={`td-hp__ends tone-${tone} ${same && from === r ? 'hp-same' : ''}`}>
      <div>
        <span className="td-hp__chip">
          <b>Start:</b> {start}
        </span>
        <small>
          <Icon name="MapPin" size={13} />
          {from}
        </small>
      </div>
      <div>
        <span className="td-hp__chip">
          <b>End:</b> {end}
        </span>
        <small>
          <Icon name="MapPin" size={13} />
          {r}
        </small>
      </div>
    </div>
  );
}

export function HistoryCard({ row, profile, image, date, today, onDate, plate, children }: any) {
  return (
    <section className="td-hp__card td-hp__head">
      <header className="td-hp__period">
        <Icon name="CalendarDays" size={18} />
        <h3>Selected Period Summary</h3>
        {/* IT-0055: the date as a "27 Nov 2026 ⌄" button that opens the date picker */}
        <label
          className="td-dd hp-dd"
          onClick={(ev?: any) => {
            const inp = ev.currentTarget.querySelector('input');
            if (!inp || ev.target === inp) return;
            ev.preventDefault();
            try {
              inp.showPicker();
            } catch {
              inp.focus();
            }
          }}
        >
          <input
            type="date"
            value={date}
            max={today}
            aria-label="Date"
            onChange={(l?: any) => onDate(l.target.value)}
          />
          <span className="hp-date">{hpDay(date)}</span>
          <Icon name="ChevronDown" size={13} />
        </label>
      </header>
      <div className="td-hp__asset">
        <button
          type="button"
          className="td-icon-btn td-icon-btn--sm td-hp__step"
          aria-label="Previous day"
          onClick={() => onDate(addDays(date, -1))}
        >
          <Icon name="ChevronLeft" size={14} />
        </button>
        <span className="td-hp__who" title={row.name}>
          <EntityMedia
            row={{
              name: row.name,
              thumb: profile.thumb,
              image,
            }}
            tone={row.status.tone}
            size={36}
          />
          <strong>{row.name}</strong>
          {/* IT-0055: the plate number instead of the vehicle name */}
          <b className="hp-plate">{plate ?? row.name}</b>
        </span>
        <button
          type="button"
          className="td-icon-btn td-icon-btn--sm td-hp__step"
          aria-label="Next day"
          disabled={date >= today}
          onClick={() => onDate(addDays(date, 1))}
        >
          <Icon name="ChevronRight" size={14} />
        </button>
      </div>
      {children}
    </section>
  );
}

export function DaySummaryPanel({ day, ...t }: any) {
  const n = day.summary,
    r = day.trips[0],
    i = day.trips[day.trips.length - 1];
  return (
    <SidePanel
      title="Distance & Duration"
      subtitle="View total distance and playback duration."
      icon="Timer"
      footer={null}
      onClose={t.onClose}
    >
      <div className="td-hp">
        <HistoryCard {...t}>
          {/* IT-0055: three boxes only (no Idle); durations as "3h 34m" */}
          <div className="td-hp__kpis">
            <div className="tone-brand">
              <span className="td-badge td-badge--sm">
                <Icon name="Route" size={13} />
              </span>
              <small>Distance Covered</small>
              <b>
                {n.distanceKm}
                {' km'}
              </b>
            </div>
            <div className="tone-blue">
              <span className="td-badge td-badge--sm">
                <Icon name="Clock" size={13} />
              </span>
              <small>Duration</small>
              <b>{hpDur(n.runningMin)}</b>
            </div>
            <div className="tone-orange">
              <span className="td-badge td-badge--sm">
                <Icon name="Gauge" size={13} />
              </span>
              <small>Max Speed</small>
              <b>
                {n.maxSpeed}
                {' km/h'}
              </b>
            </div>
          </div>
          <SegmentEnds
            tone="brand"
            start={formatClock(r.start)}
            end={i.ongoing ? 'Now' : formatClock(i.end)}
            from={latLngText(r.points[0].at)}
            to={latLngText(i.points[i.points.length - 1].at)}
          />
        </HistoryCard>
        <div className="td-hp__list">
          {timeline(day, t.profile).map((s?: any) => {
            const a = SEGMENT_KINDS[s.kind];
            return (
              <section key={s.id} className={`td-hp__card td-hp__span tone-${a.tone}`}>
                <header className="td-hp__ribbon">
                  <strong>{a.label}</strong>
                  <span>
                    {'Duration: '}
                    {hpDur((s.end - s.start) / 6e4)}
                  </span>
                </header>
                {s.distanceKm != null && (
                  <div className="td-hp__dist">
                    <span className="td-badge td-badge--sm">
                      <Icon name="Route" size={13} />
                    </span>
                    <small>Distance Covered</small>
                    <b>
                      {s.distanceKm}
                      {' km'}
                    </b>
                  </div>
                )}
                <SegmentEnds
                  tone={a.tone}
                  start={formatClock(s.start)}
                  end={formatClock(s.end)}
                  from={latLngText(s.from)}
                  to={latLngText(s.to)}
                  same={s.kind === 'stopped' || s.kind === 'idle'}
                />
              </section>
            );
          })}
        </div>
      </div>
    </SidePanel>
  );
}

export function AlertsPanel({ assetType, from, to: n, operator, ...r }: any) {
  const i = useQuery({
      queryKey: ['tracking', 'alerts', 'asset', r.row.id, from.toISOString(), n.toISOString()],
      queryFn: () =>
        alertsApi.list({
          assetType,
          from,
          to: n,
          assetIds: [r.row.id],
          size: 200,
        }),
      staleTime: 1 / 0,
      meta: {
        liveAlert: (c?: any) => c.assetId === r.row.id && inRange(c.ts, from, n),
      },
    }),
    s = i.data?.items ?? [];
  let a: any;
  if (i.isPending) {
    a = <Loading label="Loading alerts…" />;
  } else {
    if (i.isError) {
      a = isMissingEndpoint(i.error) ? (
        <p className="td-trk__none">Alerts are not available on this server yet.</p>
      ) : (
        <QueryError error={i.error} onRetry={() => i.refetch()} />
      );
    } else {
      if (s.length) {
        a = s.map((c?: any) => {
          const f = alertType(c.type),
            hp = HP_ALERT[String(f.label).trim().toLowerCase()];
          // IT-0055: coloured icon tile and title by alert type, the operator row, no speed line,
          // no severity pill, the time in a gradient tab in the bottom-right corner.
          return (
            <article
              key={c.id}
              className={`td-hp__card td-hp__alert tone-${f.tone}`}
              data-hp={hp}
            >
              <header>
                <span className="td-badge td-badge--solid">
                  <Icon name={f.icon} size={16} />
                </span>
                <strong>{f.label}</strong>
              </header>
              <p>{c.message || f.about}</p>
              <div className="hp-op">
                <Icon name="IdCard" size={15} />
                <span>{operator?.name || 'Not Assigned'}</span>
                <b>
                  <i>ID:</i> {operator?.id || '—'}
                </b>
              </div>
              <footer>
                {c.lat != null && c.lng != null && (
                  <small>
                    <Icon name="MapPin" size={13} />
                    {formatLatLng(c.lat, c.lng)}
                  </small>
                )}
              </footer>
              <time dateTime={c.ts}>{formatClock(Date.parse(c.ts))}</time>
            </article>
          );
        });
      } else {
        a = <p className="td-trk__none">No alerts on this day.</p>;
      }
    }
  }
  return (
    <SidePanel
      title={`Alerts${i.data ? ` (${i.data.total ?? s.length})` : ''}`}
      subtitle="View alerts triggered during playback."
      icon="Bell"
      footer={null}
      onClose={r.onClose}
    >
      <div className="td-hp">
        <HistoryCard {...r} />
        <div className="td-hp__list">{a}</div>
      </div>
    </SidePanel>
  );
}

export const DEFAULT_STOP_LIMIT = 3;

export const DEFAULT_FILTER: any = {
  window: null,
  stopLimit: DEFAULT_STOP_LIMIT,
  statuses: [...ALL_STATUSES],
};

export const minutesOf = (e?: any) => {
  const [t = 0, n = 0] = e.split(':').map(Number);
  return t * 60 + n;
};

export function windowRange(e?: any, t?: any) {
  const n = dayRange(e);
  if (!t) return n;
  const r = (i?: any) => new Date(Math.min(n.to.getTime(), n.from.getTime() + i * 6e4));
  return {
    from: r(minutesOf(t.from)),
    to: r(minutesOf(t.to) + 1),
  };
}

export function rangeDays({ first, last }: any, n?: any) {
  const r: any = [];
  for (let i = first; i <= last; i = addDays(i, 1)) {
    const s = i === first ? (n?.from ?? '00:00') : '00:00',
      a = i === last ? (n?.to ?? '23:59') : '23:59';
    r.push({
      day: i,
      fromTime: s,
      toTime: a,
      ...windowRange(i, {
        from: s,
        to: a,
      }),
    });
  }
  return r;
}

export const DAY_MONTHS: any = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const dayLabel = (e?: any) => {
  const [t = 1970, n = 1, r = 1] = e.split('-').map(Number);
  return `${String(r).padStart(2, '0')} ${DAY_MONTHS[n - 1]} ${t}`;
};

export const clockLabel = (e?: any) => {
  const [t = 0, n = 0] = e.split(':').map(Number);
  return `${String(t % 12 || 12).padStart(2, '0')}:${String(n).padStart(2, '0')} ${t < 12 ? 'AM' : 'PM'}`;
};

export const rangeChip = (e?: any, t?: any) => ({
  day: dayLabel(e.day),
  range: `${clockLabel(e.fromTime)} – ${clockLabel(e.toTime)}`,
  noData: !t,
});

export const allStatuses = (e?: any) => ALL_STATUSES.every((t?: any) => e.includes(t));

export function stepStatus(e?: any, t?: any, n?: any) {
  const r = Math.max(e.speed, t.speed);
  return r >= MOVING_KMH
    ? r > n
      ? 'Overspeed'
      : e.ignition === false
        ? 'Towed'
        : 'Running'
    : e.ignition === true
      ? 'Idle'
      : 'Stopped';
}

export function statusRuns(e?: any, t?: any, n?: any) {
  const r: any = [];
  let i: any = null;
  for (let s = 1; s < e.length; s++) {
    const a = e[s - 1],
      l = e[s];
    if (t.has(stepStatus(a, l, n))) {
      {
        if (!i) {
          r.push((i = [a.at]));
        }
        i.push(l.at);
      }
    } else {
      i = null;
    }
  }
  return r;
}

export const filterCount = (e?: any) =>
  (e.window ? 1 : 0) +
  (e.stopLimit !== DEFAULT_STOP_LIMIT ? 1 : 0) +
  (allStatuses(e.statuses) ? 0 : 1);

/** The current time as HH:MM. */
export const nowClock = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export function filterValue({ first, last }: any, n?: any, r?: any) {
  const i = !r.window && first === last,
    // IT-0041 (bug sheet 23-11-2026, Track History #4): a period that ends today ends now (the
    // current date and time), not at 11:59 PM; `toNow` keeps it "up to now" until changed.
    toNow = !r.window && last === n;
  return {
    // IT-0041 round 4: "Last 7 days" (today and the 6 days before, up to now) is a quick choice too.
    mode:
      i && first === n
        ? 'today'
        : i && first === addDays(n, -1)
          ? 'yesterday'
          : toNow && first === addDays(n, -(MAX_HISTORY_DAYS - 1))
            ? 'last7'
            : 'custom',
    from: `${first}T${r.window?.from ?? '00:00'}`,
    to: `${last}T${r.window?.to ?? (toNow ? nowClock() : '23:59')}`,
    toNow,
    stopLimit: String(r.stopLimit),
    statuses: r.statuses,
    trip: '',
  };
}

export function parseFilter(e?: any) {
  const t = e.from.slice(0, 10),
    n = e.to.slice(0, 10) > t ? e.to.slice(0, 10) : t,
    r = e.from.slice(11, 16) || '00:00',
    i = e.to.slice(11, 16) || '23:59';
  return {
    span: {
      first: t,
      last: n,
    },
    settings: {
      window:
        r === '00:00' && (i === '23:59' || e.toNow)
          ? null
          : {
              from: r,
              to: i,
            },
      stopLimit: Number(e.stopLimit) || DEFAULT_STOP_LIMIT,
      statuses: e.statuses,
    },
  };
}

export const dayFilter = (e?: any) =>
  filterValue(
    {
      first: e,
      last: e,
    },
    e,
    DEFAULT_FILTER,
  );

export function Popover({ anchor, onClose, children }: any) {
  const r = usePopover({
    open: true,
    anchor,
    onClose,
  });
  return createPortal(
    <div ref={r.ref} className="td-hfilter-pop" style={r.style as any}>
      {children}
    </div>,
    portalRoot(),
  );
}

/**
 * IT-0041 round 5 (the developer's choice, 25 Nov 2026): 1x plays in real time (one second of the
 * trip per second) and each step doubles it; up to 128x (about 2 minutes of the trip per second,
 * the old 1x) so long trips can still be watched in a few minutes.
 * IT-0059 (the developer's request, 26 Nov 2026): every step plays faster. 1x now plays 30 seconds
 * of the trip per second, so 4x = 2 minutes and 8x = 4 minutes of the trip per second.
 */
export const SPEEDS: any = [1, 2, 4, 8, 16, 32, 64, 128];
/** Trip seconds per real second at 1x (the label stays "1x"). */
export const BASE_RATE = 30;

export function usePlayback(e?: any, t?: any) {
  const [n, r] = useState<any>(e),
    [i, s] = useState<any>(false),
    [a, l] = useState<any>(SPEEDS[0]),
    c = useRef<any>(e),
    f = (p?: any) => {
      c.current = p;
      r(p);
    };
  useEffect(() => {
    c.current = e;
    r(e);
    s(false);
  }, [e, t]);
  useEffect(() => {
    if (!i) return;
    let p = performance.now(),
      h = 0;
    const A = (v?: any) => {
      // Trip time moves `rate` × BASE_RATE times as fast as the clock: 1x = 30 s of the trip per second.
      const y = Math.min(t, c.current + (v - p) * a * BASE_RATE);
      p = v;
      c.current = y;
      r(y);
      if (y >= t) {
        s(false);
      } else {
        h = requestAnimationFrame(A);
      }
    };
    h = requestAnimationFrame(A);
    return () => cancelAnimationFrame(h);
  }, [i, a, t]);
  return {
    t: n,
    playing: i,
    rate: a,
    setRate: l,
    seek: (p?: any) => f(Math.min(t, Math.max(e, p))),
    restart: () => {
      f(e);
      s(false);
    },
    toggle: () => {
      if (!i && c.current >= t) {
        f(e);
      }
      s((p?: any) => !p);
    },
    play: () => {
      if (c.current >= t) {
        f(e);
      }
      s(true);
    },
  };
}

export const pinText = (e?: any) => formatLatLng(e[0], e[1]);

export function EndPin() {
  return (
    <svg className="td-endpin__svg" viewBox="0 0 24 30" width="28" height="35" aria-hidden="true">
      <path d="M12 29s9-9.2 9-16A9 9 0 0 0 3 13c0 6.8 9 16 9 16Z" />
      <circle cx="12" cy="12.5" r="4.6" fill="#fff" />
      <circle className="td-endpin__dot" cx="12" cy="12.5" r="2.2" />
    </svg>
  );
}

/**
 * IT-0041 (bug sheet 23-11-2026, Track History #7/#8): the vehicle's state at the playback moment,
 * in the live map's words and colours. Moving: Overspeed, Towed (ignition off) or Running; parked:
 * Idle (ignition on) or Stopped. (The page's pointStatus knew only running / overspeed / stopped,
 * so an idling vehicle showed as Stopped and a towed one as Running.)
 * IT-0041 round 5: below walking pace (MOVING_KMH, the live map's limit) a trip point counts as
 * parked too, e.g. the first point of a trip at 0 km/h, where the icon was green "Running" while the
 * speedometer showed 0. The map icon, speedometer and time badge all take this status.
 */
export const playbackStatus = (pos?: any, ignition?: any, limit?: any) =>
  pos.moving && pos.speed >= MOVING_KMH
    ? pos.speed > limit
      ? 'overspeed'
      : ignition === false
        ? 'towed'
        : 'running'
    : ignition === true
      ? 'idle'
      : 'stopped';

export const PLAYBACK_WORD: any = {
  running: 'Running',
  overspeed: 'Overspeed',
  towed: 'Towed',
  idle: 'Idle',
  stopped: 'Stopped',
};

/** IT-0041 (Track History #5): a trip driven mostly with the ignition off was towed. */
export const isTowedTrip = (trip?: any) =>
  trip.points.filter((p?: any) => p.ignition === false).length > trip.points.length / 2;

export function TrackHistory({
  row,
  profile = VEHICLE_PROFILE,
  initialDate,
  assetType = ((p?: any) => row.asset?.assetType)(),
  image,
  marker,
  info,
  head,
  operators,
  operatorLog,
}: any) {
  var vl: any;
  const h = dayKey(new Date()),
    [A, v] = useState<any>(() => {
      const ve = initialDate && initialDate <= h ? initialDate : h;
      return {
        first: ve,
        last: ve,
      };
    }),
    [y, g] = useState<any>(null),
    [E, b] = useState<any>(false),
    [w, x] = useState<any>(null),
    [S, W] = useState<any>(DEFAULT_FILTER),
    [O, C] = useState<any>([]),
    [k, z] = useState<any>(false),
    B = useRef<any>(null),
    J = useCan(ALERT_VIEW_PERMISSION) && !!assetType,
    G = useMemo<any>(
      () =>
        rangeDays(A, S.window).map((ve?: any) =>
          ve.day === h
            ? {
                ...ve,
                to: new Date(
                  Math.max(ve.from.getTime() + 1, Math.min(ve.to.getTime(), Date.now())),
                ),
              }
            : ve,
        ),
      [A, S.window],
    ),
    $ = useHistoryDays(row.id, G),
    Z = useMemo<any>(
      () =>
        G.map((ve?: any, nt?: any) => {
          const vi = $.data[nt];
          return vi
            ? analyzeTrack(vi.points, {
                rangeEnd: ve.to.getTime(),
                profile,
              })
            : null;
        }),
      [G, $.data, profile],
    ),
    Q = G[0].from,
    P = G[G.length - 1].to,
    H = useQuery({
      queryKey: ['tracking', 'operator-log', row.id, Q.toISOString(), P.toISOString()],
      queryFn: () => operatorLog(row.id, Q, P),
      enabled: !!(operatorLog && marker),
      staleTime: 6e4,
    }),
    Y = useMemo<any>(
      () =>
        [
          ...new Set<any>([...(operators ?? []), ...(H.data ?? []).map((ve?: any) => ve.operator)]),
        ].sort((ve?: any, nt?: any) => ve.localeCompare(nt)),
      [operators, H.data],
    ),
    te = useMemo<any>(
      () => (O.length && H.data ? H.data.filter((ve?: any) => O.includes(ve.operator)) : null),
      [O, H.data],
    ),
    j = useCallback(
      (ve?: any, nt?: any) => !te || te.some((vi?: any) => vi.from < nt && (vi.to ?? 1 / 0) > ve),
      [te],
    ),
    fe = useMemo<any>(
      () => Z.map((ve?: any) => (ve ? ve.trips.filter((nt?: any) => j(nt.start, nt.end)) : [])),
      [Z, j],
    ),
    Ee = G.length > 1,
    Ge = fe.map((ve?: any) => ve.length > 0),
    ze = Math.min(G.length - 1, y ?? Math.max(0, Ge.indexOf(true))),
    se = Z[ze] ?? null,
    R = G[ze].day,
    ue = G[ze],
    Ce = !!((vl = $.data[ze]) != null && vl.truncated),
    bt = (ve?: any) => {
      if (ve && ve <= h) {
        {
          v({
            first: ve,
            last: ve,
          });
          g(null);
          W((nt?: any) => ({
            ...nt,
            window: null,
          }));
        }
      }
    },
    q = (ve?: any) => {
      const nt = parseFilter(ve);
      if (nt.span.first <= h) {
        v({
          first: nt.span.first,
          last: nt.span.last <= h ? nt.span.last : h,
        });
      }
      g(null);
      W(nt.settings);
      C(ve.operators ?? []);
      z(false);
    },
    De = (ve?: any) => {
      if (Ge[ve]) {
        g(ve);
      }
    },
    Ue = (ve?: any) => {
      if (Ge[ve]) {
        {
          g(ve);
          b(true);
        }
      }
    },
    lt = useMemo<any>(() => fe[ze] ?? [], [fe, ze]),
    // IT-0061 (the developer's request, 26 Nov 2026): playback starts at the day's first history
    // event, not at the start of trip 1, so parked time before the first trip plays too. With an
    // operator filter it still starts at that operator's first trip.
    _t = (() => {
      const tripStart = lt[0]?.start;
      if (tripStart == null) return 0;
      const first = !te ? se?.points?.[0]?.t : null;
      return first != null && first < tripStart ? first : tripStart;
    })(),
    Qe = lt[lt.length - 1]?.end ?? 0,
    F = usePlayback(_t, Qe);
  useEffect(() => {
    if (E) {
      {
        if (Qe > _t) {
          F.play();
        }
        b(false);
      }
    }
  }, [E, _t, Qe]);
  const _ = allStatuses(S.statuses),
    oe = useMemo<any>(() => {
      const ve = new Set<any>(S.statuses);
      return lt.flatMap((nt?: any) =>
        _
          ? [
              {
                id: nt.id,
                className: 'is-route',
                points: nt.points.map((vi?: any) => vi.at),
              },
            ]
          : statusRuns(nt.points, ve, profile.overspeedKmh).map((vi?: any, xf?: any) => ({
              id: `${nt.id}:${xf}`,
              className: 'is-route',
              points: vi,
            })),
      );
    }, [lt, S.statuses, _, profile.overspeedKmh]),
    Ae = useMemo<any>(() => lt.flatMap((ve?: any) => ve.points.map((nt?: any) => nt.at)), [lt]),
    ye = () => z((ve?: any) => !ve),
    re = k && (
      <Popover anchor={B} onClose={() => z(false)}>
        <HistoryFilter
          value={{
            ...filterValue(A, h, S),
            operators: O,
          }}
          today={h}
          maxDays={MAX_HISTORY_DAYS}
          defaultValue={{
            ...dayFilter(h),
            operators: [],
          }}
          showTrips={false}
          operators={marker ? Y : undefined}
          onApply={q}
          onDismiss={() => z(false)}
        />
      </Popover>
    ),
    ce = (
      <span ref={B} className="td-trk__filteraction">
        <button type="button" className="td-btn td-btn--ghost" aria-pressed={k} onClick={ye}>
          <Icon name="Funnel" size={14} />
          History Filter
        </button>
      </span>
    ),
    we = se?.summary,
    be = se ? se.stops.filter((ve?: any) => j(ve.start, ve.end)) : [],
    Pe = [
      {
        label: 'Distance',
        value: we
          ? `${te ? Math.round(lt.reduce((ve?: any, nt?: any) => ve + nt.distanceKm, 0) * 10) / 10 : we.distanceKm} km`
          : '—',
      },
      {
        label: 'Idle',
        value: se
          ? se.segments.filter((ve?: any) => ve.status === 'idle' && j(ve.start, ve.end)).length
          : '—',
      },
      {
        label: 'Stops',
        value: se ? be.length : '—',
      },
      {
        label: 'Max speed',
        value: we
          ? `${te ? Math.max(0, ...lt.map((ve?: any) => ve.maxSpeed)) : we.maxSpeed} km/h`
          : '—',
      },
    ],
    // IT-0055: the header timeline (Tracking with header controls) drives the playback.
    tlReady = !$.isPending && !$.isError && !!se && lt.length > 0 && Qe > _t,
    tlEl = head?.bare && (
      <HistoryTimeline
        playing={F.playing}
        t={tlReady ? F.t : 0}
        start={tlReady ? _t : 0}
        end={tlReady ? Qe : 0}
        rate={F.rate}
        now={tlReady ? formatClock(F.t) : '—'}
        endText={tlReady ? formatClock(Qe) : '—'}
        onToggle={F.toggle}
        onRestart={F.restart}
        onSeek={F.seek}
        onRate={F.setRate}
      />
    ),
    ge = (ve?: any, nt?: any) => (
      <div className={`td-trk td-trk--history ${head?.bare ? "is-bare" : ""}`}>
        {tlEl}
        {head ? (
          <>
            {!head.bare && <MapHeader asset={head} />}
            <div className="td-trk__card">{ve}</div>
          </>
        ) : (
          ve
        )}
        {nt}
      </div>
    );
  if ($.isPending)
    return ge(<Loading label={Ee ? "Loading the days' routes…" : "Loading the day's route…"} />);
  if ($.isError)
    return ge(
      <>
        <QueryError error={$.error} onRetry={() => $.refetch()} />
        <div className="td-trk__filterline">{ce}</div>
        {re}
      </>,
    );
  if (!se || !lt.length) {
    const ve = !!te && Z.some((nt?: any) => nt?.trips.length);
    return ge(
      <>
        <EmptyState
          icon="Route"
          title={
            ve
              ? 'No trips by the selected operators'
              : Ee
                ? 'No trips on these days'
                : 'No trips on this day'
          }
          text={
            ve
              ? `${O.join(', ')} did not drive ${row.name} ${Ee ? `from ${formatLongDay(A.first)} to ${formatLongDay(A.last)}` : `on ${formatLongDay(R)}`}. Change the operators in the History Filter.`
              : Ee
                ? `${row.name} did not move from ${formatLongDay(A.first)} to ${formatLongDay(A.last)}. Pick other days in the History Filter.`
                : `${row.name} did not move on ${formatLongDay(R)}. Pick another day in the History Filter.`
          }
        >
          {ce}
        </EmptyState>
        {re}
      </>,
    );
  }
  const Ne = se.summary,
    xe = positionAt(se, F.t),
    ign = ignitionAt(se, F.t),
    st = playbackStatus(xe, ign, profile.overspeedKmh),
    // IT-0060: the operator signed in to the vehicle at the playback time (from the operator log;
    // nobody signed in = Not Assigned), and the odometer at that time.
    opAt = H.data
      ? H.data.find((ve?: any) => ve.from <= F.t && (ve.to ?? 1 / 0) > F.t)?.operator
      : undefined,
    odoAt = odometerAt(se, F.t),
    bn = pathUntil(lt, F.t, xe.at),
    lo = lt[0],
    Er = lt[lt.length - 1],
    la = row.status.tone,
    Al = [
      {
        id: 'start',
        at: lo.points[0].at,
        className: 'td-marker--sm tone-green',
        children: (
          <>
            <Icon name="Flag" size={11} />
            <span className="td-marker__tip">
              <strong>
                {'Start · '}
                {formatClock(lo.start)}
              </strong>
              {pinText(lo.points[0].at)}
            </span>
          </>
        ),
      },
      // IT-0041 (bug sheet 23-11-2026, Track History #5): stop pins in the vehicle status colours:
      // red Stopped (engine off), blue Idle (engine on, the longer part decides; with only one of
      // the two picked in the History Filter, that one), teal Towed at the start of a towed trip.
      ...be.flatMap((ve?: any) => {
        if (ve.durationMin < S.stopLimit) return [];
        const showStop = (_ || S.statuses.includes('Stopped')) && ve.durationMin > ve.idleMin,
          showIdle = (_ || S.statuses.includes('Idle')) && ve.idleMin > 0;
        if (!showStop && !showIdle) return [];
        const idle = showIdle && (!showStop || ve.idleMin >= ve.durationMin / 2);
        return [
          {
            id: ve.id,
            at: ve.at,
            className: `td-marker--sm ${idle ? 'is-idle' : 'is-stop'}`,
            children: (
              <>
                <Icon name={idle ? 'Hourglass' : 'SquareParking'} size={11} />
                <span className="td-marker__tip">
                  <strong>
                    {idle ? 'Idle · ' : 'Stop · '}
                    {formatMinutes(idle ? ve.idleMin : ve.durationMin)}
                    {ve.ongoing ? ' (ongoing)' : ''}
                  </strong>
                  {formatClock(ve.start)}
                  {' – '}
                  {formatClock(ve.end)}
                  {!idle && ve.idleMin > 0 ? ` · Idle ${formatMinutes(ve.idleMin)}` : ''}
                  {' · '}
                  {pinText(ve.at)}
                </span>
              </>
            ),
          },
        ];
      }),
      ...(_ || S.statuses.includes('Towed') ? lt.filter(isTowedTrip) : []).map((tr?: any) => ({
        id: `towed-${tr.id}`,
        at: tr.points[0].at,
        className: 'td-marker--sm is-towed',
        children: (
          <>
            <Icon name="Truck" size={11} />
            <span className="td-marker__tip">
              <strong>
                {'Towed · '}
                {formatMinutes(tr.durationMin)}
              </strong>
              {formatClock(tr.start)}
              {' – '}
              {formatClock(tr.end)}
              {' · '}
              {tr.distanceKm}
              {' km'}
            </span>
          </>
        ),
      })),
      ...(Er.ongoing
        ? []
        : [
            {
              id: 'end',
              at: Er.points[Er.points.length - 1].at,
              className: 'td-endpin',
              children: (
                <>
                  <EndPin />
                  <span className="td-marker__tip">
                    <strong>
                      {'End · '}
                      {formatClock(Er.end)}
                    </strong>
                    {pinText(Er.points[Er.points.length - 1].at)}
                  </span>
                </>
              ),
            },
          ]),
      {
        id: 'vehicle',
        at: xe.at,
        top: true,
        className: marker
          ? `td-marker--vehicle tone-${la}`
          : `td-vpin tone-${la} ${xe.moving ? 'is-moving' : ''}`,
        children: (
          <>
            {marker ? (
              <VehicleMarker
                plate={marker.plate}
                status={st}
                speed={xe.speed}
                img={marker.img}
                ripple={!!head?.bare}
              />
            ) : xe.moving ? (
              <Icon
                name="Navigation2"
                size={16}
                style={
                  {
                    transform: `rotate(${xe.heading ?? 0}deg)`,
                  } as any
                }
              />
            ) : (
              <Icon name="CarFront" size={15} />
            )}
            <span className="td-marker__tip">
              <strong>
                {row.name}
                {' · '}
                {formatClock(F.t)}
              </strong>
              {PLAYBACK_WORD[st]}
              {xe.moving ? ` · ${xe.speed} km/h` : ''}
            </span>
          </>
        ),
      },
    ];
  return ge(
    <>
      {Ce && (
        <p className="gp-note tone-amber">
          <Icon name="TriangleAlert" size={15} />
          <span>This day has more points than one request returns; the route ends early.</span>
        </p>
      )}
      {!head && (
        <Kpis
          items={[
            {
              label: 'Distance',
              value: `${Ne.distanceKm} km`,
              icon: 'Milestone',
              tone: 'blue',
            },
            {
              label: 'Trips',
              value: Ne.trips,
              icon: 'Route',
              tone: 'purple',
            },
            {
              label: 'Running',
              value: formatMinutes(Ne.runningMin),
              icon: 'Play',
              tone: 'green',
            },
            {
              label: 'Idle',
              value: formatMinutes(Ne.idleMin),
              icon: 'Clock',
              tone: 'blue',
            },
            {
              label: 'Stopped',
              value: formatMinutes(Ne.stopMin),
              icon: 'Square',
              tone: 'red',
            },
            {
              label: 'Max speed',
              value: `${Ne.maxSpeed} km/h`,
              icon: 'Gauge',
              tone: 'orange',
            },
            {
              label: 'Avg speed',
              value: `${Ne.avgSpeed} km/h`,
              icon: 'Activity',
              tone: 'teal',
            },
            {
              label: 'Overspeed',
              value: Ne.overspeed,
              icon: 'TriangleAlert',
              tone: Ne.overspeed ? 'red' : 'gray',
            },
          ]}
        />
      )}
      <div className="td-trk__main">
        <TrackMap
          className="td-tmap"
          fitKey={`${row.id}:${R}`}
          fit={Ae}
          maxFitZoom={16}
          lines={oe}
          progress={bn}
          pins={Al}
          share={
            marker && !F.playing
              ? historyShare(marker.plate, xe.at, dayKey(new Date(F.t)), F.t)
              : null
          }
          overlay={
            <>
              <MapControlRow
                style={SHARE_POS_RIGHT as any}
                hidePlayback={!!head?.bare}
                playing={F.playing}
                onTogglePlay={F.toggle}
                onStop={F.restart}
                speed={F.rate}
                onSpeed={() => F.setRate(SPEEDS[(SPEEDS.indexOf(F.rate) + 1) % SPEEDS.length])}
                distanceOn={w === 'distance'}
                onDistance={() => x((ve?: any) => (ve === 'distance' ? null : 'distance'))}
                alertsOn={w === 'alerts'}
                onAlerts={
                  J ? () => x((ve?: any) => (ve === 'alerts' ? null : 'alerts')) : undefined
                }
                filterButton={
                  <span
                    ref={B}
                    style={
                      {
                        display: 'block',
                      } as any
                    }
                  >
                    <FilterButton
                      size={32}
                      title="History Filter"
                      open={k}
                      count={filterCount(S) + (O.length ? 1 : 0)}
                      onClick={ye}
                    />
                  </span>
                }
              />
              {re}
              {head && !head.bare && <MapStats stats={Pe} />}
              {head?.bare && <MapChips stats={Pe} />}
              <LivePanel
                tone={xe.speed > profile.overspeedKmh ? 'red' : xe.moving ? 'green' : 'gray'}
                speed={xe.speed}
                limit={profile.overspeedKmh}
                status={st}
                panel={
                  marker && {
                    plate: marker.plate,
                    img: marker.img,
                    model: info?.model,
                    operator: H.data ? (opAt ?? 'Not Assigned') : info?.operator,
                    operatorId: H.data
                      ? opAt && opAt === info?.operator
                        ? info?.operatorId
                        : undefined
                      : info?.operatorId,
                    mode: 'history',
                    date: F.t,
                    status: st,
                    speed: xe.speed,
                    ignition: ign ?? undefined,
                    // IT-0041 (Track History #3): the vehicle's latest odometer, as in Live Track;
                    // IT-0060: the odometer at the playback time when the history has readings.
                    odometerKm: odoAt ?? info?.odometerKm,
                    ...timesUntil(se, F.t),
                    noVehicle: !!head,
                    location: xe.at,
                    ...(Ee
                      ? {
                          historyDates: G.map((ve?: any, nt?: any) =>
                            rangeChip(ve, Ge[nt] ?? false),
                          ),
                          activeDateIndex: ze,
                          onSelectDate: De,
                          onPlayDate: Ue,
                        }
                      : {}),
                  }
                }
              >
                <div className="td-trk__state">
                  <strong>{formatClock(F.t)}</strong>
                  <small>
                    {xe.trip ? `Trip ${xe.trip.index}` : xe.stop ? PLAYBACK_WORD[st] : '—'}
                  </small>
                  <small>
                    <Icon name="Milestone" size={12} />
                    {Ne.distanceKm}
                    {' km · '}
                    {Ne.trips}
                    {' trip'}
                    {Ne.trips === 1 ? '' : 's'}
                  </small>
                </div>
              </LivePanel>
            </>
          }
        />
        {!head && (
          <div className="td-play">
            <span className="td-play__time">{formatClock(F.t)}</span>
            <input
              className="td-play__bar"
              type="range"
              min={_t}
              max={Qe}
              step={15e3}
              value={F.t}
              aria-label="Playback position"
              onChange={(ve?: any) => F.seek(Number(ve.target.value))}
              style={
                identity({
                  '--pct': `${Qe > _t ? ((F.t - _t) / (Qe - _t)) * 100 : 0}%`,
                }) as any
              }
            />
            <span className="td-play__time is-end">{formatClock(Qe)}</span>
          </div>
        )}
      </div>
    </>,
    <>
      {w === 'distance' && (
        <DaySummaryPanel
          day={se}
          row={row}
          plate={marker?.plate}
          profile={profile}
          image={image}
          date={R}
          today={h}
          onDate={bt}
          onClose={() => x(null)}
        />
      )}
      {w === 'alerts' && assetType && (
        <AlertsPanel
          assetType={assetType}
          from={ue.from}
          to={ue.to}
          row={row}
          plate={marker?.plate}
          // IT-0055: the operator at the playback time, as on the info card
          operator={{
            name: (H.data ? opAt : info?.operator) || 'Not Assigned',
            id:
              (H.data ? (opAt && opAt === info?.operator ? info?.operatorId : undefined) : info?.operatorId) ||
              '—',
          }}
          profile={profile}
          image={image}
          date={R}
          today={h}
          onDate={bt}
          onClose={() => x(null)}
        />
      )}
    </>,
  );
}
