// IT-0036. Converted from the original Tracking page (Tracking.html, removed in IT-0037 (git history)): same markup,
// class names, inline styles, texts and behaviour. Component and prop names are readable; short
// local names are kept from the original where they are plain intermediate values.
/* eslint-disable */
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { Loading } from '../../smart-track/kit';
import { Icon } from '../icon';
import { QueryError, useLiveChannels, useLiveFeed, useOnline } from '../runtime';
import {
  MOVING_KMH,
  VEHICLE_PROFILE,
  compassPoint,
  formatClock,
  formatClockSeconds,
  formatLatLng,
  formatMinutes,
  placeName,
  todayStart,
} from './format';
import { analyzeTrack, useHistory } from './history-data';
import { Pill, Segmented } from './kit';
import { EmptyState, Kpis, LivePanel, panelStatus } from './live-panel';
import { TrackMap, VehicleMarker } from './map';

export const HEAD_STEPS: any = ['full', 'compact', 'notype'];

export const HEAD_CLASSES: any = {
  full: [],
  compact: ['is-compact'],
  notype: ['is-compact', 'is-notype'],
  tight: ['is-compact', 'is-notype', 'is-tight'],
};

export const HEAD_ALL_CLASSES: any = ['is-compact', 'is-notype', 'is-tight'];

export function MapHeader({ asset }: any) {
  const [t, n] = useState<any>('full'),
    r = useRef<any>(null),
    i = `${asset.title}|${asset.status}|${asset.type ?? ''}`;
  useLayoutEffect(() => {
    const s = r.current;
    if (!s) return;
    const a = (p?: any) => {
        s.classList.add(...HEAD_CLASSES[p]);
        const h = s.scrollWidth <= s.clientWidth;
        s.classList.remove(...HEAD_CLASSES[p]);
        return h;
      },
      l = () => {
        s.classList.remove(...HEAD_ALL_CLASSES);
        s.classList.add('is-measuring');
        const p = HEAD_STEPS.find(a) ?? 'tight';
        s.classList.remove('is-measuring');
        s.classList.add(...HEAD_CLASSES[p]);
        n(p);
      };
    l();
    const c = document.fonts;
    if (!(c == null)) {
      c.ready.then(l);
    }
    if (!(c == null)) {
      c.addEventListener('loadingdone', l);
    }
    const f = typeof ResizeObserver > 'u' ? null : new ResizeObserver(l);
    if (!(f == null)) {
      f.observe(s);
    }
    return () => {
      if (!(c == null)) {
        c.removeEventListener('loadingdone', l);
      }
      if (!(f == null)) {
        f.disconnect();
      }
    };
  }, [i]);
  return (
    <header ref={r} className={['td-mhead', ...HEAD_CLASSES[t]].join(' ')}>
      <span className="td-mhead__media">{asset.media}</span>
      <strong className="td-mhead__title">{asset.title}</strong>
      {asset.type && <span className="td-mhead__type">{asset.type}</span>}
      <Pill tone={asset.tone}>{asset.status}</Pill>
      <span className="td-mhead__tabs">
        <Segmented
          label="Tracking view"
          value={asset.tab}
          onChange={asset.onTab}
          options={asset.tabs}
        />
      </span>
    </header>
  );
}

export function sideOverlap(e?: any, t?: any) {
  const n = e.getBoundingClientRect();
  let r = 0;
  const i = (s?: any) => {
    if (s === t || !(s instanceof HTMLElement)) return;
    if (getComputedStyle(s).display === 'contents') {
      [...s.children].forEach(i);
      return;
    }
    const a = s.getBoundingClientRect();
    if (!(!a.width || a.height >= n.height - 16 || a.top - n.top > 48)) {
      r = Math.max(r, Math.min(a.right - n.left, n.right - a.left));
    }
  };
  [...e.children].forEach(i);
  return r;
}

export function MapStats({ stats }: any) {
  const t = useRef<any>(null),
    n = stats.map((r?: any) => `${r.label}=${r.value}`).join('|');
  useLayoutEffect(() => {
    const r = t.current,
      i = r?.parentElement;
    if (!r || !i) return;
    const s = () => {
      r.style.setProperty('--mapstats-side', `${sideOverlap(i, r) + 8}px`);
      r.classList.remove('is-bare');
      const c = r.firstElementChild;
      if (c && c.offsetWidth > r.clientWidth) {
        r.classList.add('is-bare');
      }
    };
    s();
    const a = document.fonts;
    if (!(a == null)) {
      a.ready.then(s);
    }
    if (!(a == null)) {
      a.addEventListener('loadingdone', s);
    }
    const l = typeof ResizeObserver > 'u' ? null : new ResizeObserver(s);
    if (!(l == null)) {
      l.observe(i);
    }
    [...i.children].forEach((c?: any) => c !== r && l?.observe(c));
    return () => {
      if (!(a == null)) {
        a.removeEventListener('loadingdone', s);
      }
      if (!(l == null)) {
        l.disconnect();
      }
    };
  }, [n]);
  return (
    <div ref={t} className="td-mapstats">
      <div className="td-mapstats__row" role="group" aria-label="The day's figures">
        {stats.map((r?: any) => (
          <span key={r.label} className="td-mapstats__chip" title={`${r.label}: ${r.value}`}>
            <span>{r.label}:</span>
            <b>{r.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/** IT-0055: the day's figures as small chips on the map (Distance, Idle, Stops, Max speed),
 * used when the map has no figures strip (Tracking with header controls). Styles: .td-mchips in
 * tracking.fix.css. */
export function MapChips({ stats }: any) {
  return (
    <div className="td-mchips" role="group" aria-label="The day's figures">
      {stats.map((r?: any) => (
        <span key={r.label} title={`${r.label}: ${r.value}`}>
          <em>{r.label}:</em> <b>{r.value}</b>
        </span>
      ))}
    </div>
  );
}

export const MOVING_STATES = new Set<any>(['moving', 'overspeed', 'towed']);

export const MONTHS: any = [
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

export const shortDay = (e?: any) => {
  const [t, n, r] = e.split('-').map(Number);
  return `${r} ${MONTHS[(n ?? 1) - 1]} ${t}`;
};

export function liveShare(e?: any, t?: any, n?: any, r?: any, i?: any, s?: any, a?: any) {
  if (n === 'never') return null;
  const l = MOVING_STATES.has(n)
    ? `${r} · ${i} km/h · at ${formatClock(s)}`
    : n === 'offline'
      ? `Last seen at ${formatClock(s)}`
      : a != null
        ? `${r} since ${formatClock(a)}`
        : `${r} · at ${formatClock(s)}`;
  return {
    plate: e,
    lat: t[0],
    lng: t[1],
    statusLine: l,
  };
}

export const historyShare = (e?: any, t?: any, n?: any, r?: any) => ({
  plate: e,
  lat: t[0],
  lng: t[1],
  statusLine: `History · ${shortDay(n)} · at ${formatClock(r)}`,
});

export function stoppedSince(e?: any, t?: any) {
  let n = e.length - 1;
  for (; n >= 0 && e[n].speed < MOVING_KMH;) n--;
  return e[n + 1]?.t ?? t;
}

export function LiveTrack({
  row,
  fields = [],
  profile = VEHICLE_PROFILE,
  marker,
  info,
  hidden = [],
  head,
}: any) {
  const l = useOnline(),
    [c, f] = useState<any>(() => ({
      from: todayStart(),
      to: new Date(),
    })),
    p = useHistory(row.id, c.from, c.to, true, true),
    h = useRef<any>([]),
    [A, v] = useState<any>(0),
    y = useRef<any>(l ? 'up' : 'never');
  useEffect(() => {
    if (l && y.current === 'down') {
      f((j?: any) => ({
        from: j.from,
        to: new Date(),
      }));
    }
    if (l) {
      y.current = 'up';
    } else {
      if (y.current === 'up') {
        y.current = 'down';
      }
    }
  }, [l]);
  const g = (j?: any) => {
      const fe = h.current[h.current.length - 1];
      if (!(Date.parse(j.ts) <= c.to.getTime() || (fe && fe.ts >= j.ts))) {
        h.current = [
          ...h.current,
          {
            ts: j.ts,
            lat: j.lat,
            lng: j.lng,
            speed: j.speed,
            heading: j.heading,
            ignition: j.ignition,
            flags: 0,
          },
        ];
      }
    },
    E = useLiveChannels();
  useLiveFeed(E.data?.positions, (j?: any) => {
    const fe = j;
    if (fe?.assetId === row.id) {
      g(fe);
    }
  });
  const b = row.position;
  useEffect(() => {
    if (b) {
      {
        g(b);
        v((j?: any) => j + 1);
      }
    }
  }, [b, c.to]);
  const w = Date.now(),
    x = useMemo<any>(() => {
      return analyzeTrack([...(p.data?.points ?? []), ...h.current], {
        now: w,
        rangeEnd: w,
        profile,
      });
    }, [p.data, A, profile]),
    S = !p.isPending,
    W = [
      {
        label: 'Distance',
        value: S ? `${x.summary.distanceKm} km` : '—',
      },
      {
        label: 'Idle',
        value: S ? x.segments.filter((j?: any) => j.status === 'idle').length : '—',
      },
      {
        label: 'Stops',
        value: S ? x.stops.length : '—',
      },
      {
        label: 'Max speed',
        value: S ? `${x.summary.maxSpeed} km/h` : '—',
      },
    ],
    O = (j?: any) =>
      head ? (
        <div className={`td-trk td-trk--live ${head.bare ? "is-bare" : ""}`}>
          {!head.bare && <MapHeader asset={head} />}
          <div className="td-trk__card">{j}</div>
        </div>
      ) : (
        j
      );
  if (!b)
    return O(
      <EmptyState
        icon="Hourglass"
        title="No live position yet"
        text={`${row.name} has not transmitted any location today.`}
      />,
    );
  if (p.isPending) return O(<Loading label="Loading today's route…" />);
  const C = row.status,
    k = x.trips[x.trips.length - 1],
    z = C.id === 'moving' || C.id === 'overspeed' || C.id === 'towed',
    B = z
      ? k != null && k.ongoing
        ? k.start
        : Date.parse(b.ts)
      : stoppedSince(x.points, Date.parse(b.ts)),
    J = z ? 'Moving since' : C.id === 'idle' ? 'Idle since' : 'Stopped since',
    G = C.id === 'offline',
    $ = Math.round(b.speed ?? 0),
    Z = x.summary,
    Q = x.points[0],
    P = [
      ...(Q
        ? [
            {
              id: 'start',
              at: Q.at,
              className: 'td-marker--sm tone-green',
              children: (
                <>
                  <Icon name="Flag" size={11} />
                  <span className="td-marker__tip">
                    <strong>Start of day</strong>
                    {Z.trips}
                    {' trip'}
                    {Z.trips === 1 ? '' : 's'}
                    {' today'}
                  </span>
                </>
              ),
            },
          ]
        : []),
      ...x.stops
        .filter((j?: any) => !j.ongoing)
        .map((j?: any) => ({
          id: j.id,
          at: j.at,
          className: 'td-marker--sm tone-amber',
          children: (
            <>
              <Icon name="SquareParking" size={11} />
              <span className="td-marker__tip">
                <strong>
                  {'Stopped '}
                  {formatMinutes(j.durationMin)}
                </strong>
                {formatClock(j.start)}
                {' · '}
                {formatLatLng(j.at[0], j.at[1])}
              </span>
            </>
          ),
        })),
      {
        id: 'vehicle',
        at: [b.lat, b.lng],
        top: true,
        className: marker
          ? `td-marker--vehicle tone-${C.tone}`
          : `td-vpin tone-${C.tone} ${z ? 'is-moving' : ''}`,
        children: (
          <>
            {marker ? (
              <VehicleMarker
                plate={marker.plate}
                status={panelStatus(C.id)}
                speed={$}
                img={marker.img}
                ripple={!!head?.bare}
              />
            ) : z ? (
              <Icon
                name="Navigation2"
                size={16}
                style={
                  {
                    transform: `rotate(${b.heading ?? 0}deg)`,
                  } as any
                }
              />
            ) : (
              <Icon name="CarFront" size={15} />
            )}
            <span className="td-marker__tip">
              <strong>{row.name}</strong>
              {C.label}
              {' · '}
              {$}
              {' km/h'}
            </span>
          </>
        ),
      },
    ],
    H = p.isError && <QueryError error={p.error} onRetry={() => p.refetch()} />,
    Y = (
      <TrackMap
        className="td-tmap"
        fitKey={`live:${row.id}`}
        follow={[b.lat, b.lng]}
        maxFitZoom={16}
        share={
          marker
            ? liveShare(marker.plate, [b.lat, b.lng], C.id, C.label, $, Date.parse(b.ts), B)
            : null
        }
        lines={[
          {
            id: 'trail',
            className: 'is-done',
            points: x.points.map((j?: any) => j.at),
          },
        ]}
        pins={P}
        overlay={
          <>
            <div className="td-live__top">
              <div className="td-trk__chip">
                {G || !l ? <Icon name="WifiOff" size={14} /> : <i className="td-live-dot" />}
                <span>{G ? 'Last known position' : l ? 'Live' : 'Reconnecting…'}</span>
              </div>
            </div>
            {head && !head.bare && <MapStats stats={W} />}
            {head?.bare && <MapChips stats={W} />}
            <LivePanel
              tone={C.tone}
              speed={$}
              limit={profile.overspeedKmh}
              status={panelStatus(C.id)}
              panel={
                marker && {
                  ...info,
                  plate: marker.plate,
                  img: marker.img,
                  mode: 'live',
                  date: b.ts,
                  status: panelStatus(C.id),
                  speed: $,
                  ignition: b.ignition ?? undefined,
                  runningMin: Z.runningMin,
                  stoppedMin: Z.stopMin,
                  idleMin: Z.idleMin,
                  noVehicle: !!head,
                  location: [b.lat, b.lng],
                }
              }
            >
              <div className="td-trk__state">
                <Pill tone={C.tone}>{C.label}</Pill>
                {B != null && (
                  <small>
                    {J} {formatClock(B)}
                  </small>
                )}
                <small className={G ? 'is-warn' : ''}>
                  <Icon name="Clock" size={12} />
                  {'Updated '}
                  {formatClockSeconds(Date.parse(b.ts))}
                </small>
              </div>
            </LivePanel>
          </>
        }
      />
    );
  return head ? (
    O(
      <>
        {H}
        {Y}
      </>,
    )
  ) : (
    <div className="td-trk td-trk--live">
      {H}
      <LiveDetails
        p={b}
        moving={z}
        fields={fields}
        today={Z}
        stops={x.stops.length}
        profile={profile}
        hidden={hidden}
      />
      {Y}
    </div>
  );
}

export function LiveDetails({ p, moving, fields, today, stops, profile, hidden }: any) {
  const l = (c?: any) => !hidden.includes(c);
  return (
    <section className="td-trk__side td-live__details">
      <dl className="td-gv-card__fields">
        <div>
          <dt>
            <Icon name="MapPin" size={13} />
            Location
          </dt>
          <dd title={formatLatLng(p.lat, p.lng)}>{placeName(p)}</dd>
        </div>
        {l('ignition') && (
          <div>
            <dt>
              <Icon name="KeyRound" size={13} />
              Ignition
            </dt>
            <dd className={p.ignition ? 'is-on' : ''}>
              {p.ignition == null ? '—' : p.ignition ? 'On' : 'Off'}
            </dd>
          </div>
        )}
        {l('heading') && (
          <div>
            <dt>
              <Icon name="Compass" size={13} />
              Heading
            </dt>
            <dd>
              {moving && p.heading != null
                ? `${compassPoint(p.heading)} · ${Math.round(p.heading)}°`
                : '—'}
            </dd>
          </div>
        )}
        {fields.map((c?: any) => (
          <div key={c.label} className={c.tone ? `is-toned tone-${c.tone}` : undefined}>
            <dt>
              <Icon name={c.icon} size={13} />
              {c.label}
            </dt>
            <dd title={c.value}>
              {c.value}
              {c.warn && <Icon name="TriangleAlert" size={12} />}
            </dd>
          </div>
        ))}
      </dl>
      <div className="td-live__today">
        <h3 className="td-trk__h">Today</h3>
        <Kpis
          items={[
            {
              label: 'Distance',
              value: `${today.distanceKm} km`,
              icon: 'Milestone',
              tone: 'blue',
            },
            {
              label: 'Trips',
              value: today.trips,
              icon: 'Route',
              tone: 'purple',
            },
            ...(l('running')
              ? [
                  {
                    label: 'Running',
                    value: formatMinutes(today.runningMin),
                    icon: 'Play',
                    tone: 'green',
                  },
                ]
              : []),
            ...(l('idle')
              ? [
                  {
                    label: 'Idle',
                    value: formatMinutes(today.idleMin),
                    icon: 'Clock',
                    tone: 'blue',
                  },
                ]
              : []),
            {
              label: 'Stops',
              value: stops,
              icon: 'SquareParking',
              tone: 'amber',
            },
            {
              label: 'Max speed',
              value: `${today.maxSpeed} km/h`,
              icon: 'Gauge',
              tone: today.maxSpeed > profile.overspeedKmh ? 'red' : 'orange',
            },
          ]}
        />
      </div>
    </section>
  );
}
