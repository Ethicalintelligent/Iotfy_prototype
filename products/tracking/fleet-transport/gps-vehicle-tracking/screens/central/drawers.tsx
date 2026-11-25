// IT-0036. The replay side drawers "Distance & Duration" (original: tC) and "Alerts" (original: nC).
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, usePortalRoot } from '../smart-track/kit';
import { addDays, clock12, hm, latLngText, type Day, type LatLng } from './analysis';
import { alertsOf, type Profile } from './demo';
import type { Row } from './fleet';
import { Img, Pill } from './parts';

function Drawer({
  title,
  subtitle,
  icon,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  icon: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const portal = usePortalRoot();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const all = document.querySelectorAll('.td-drawerx');
      if (all[all.length - 1] === panel.current?.parentElement) onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  useEffect(() => panel.current?.focus(), [portal]);
  if (!portal) return null;
  return createPortal(
    <div className="td-drawerx" style={{ ['--level' as string]: 0 }}>
      <div className="td-drawerx__scrim" />
      <aside
        ref={panel}
        className="td-drawerx__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="td-drawerx__head">
          <span className="td-drawerx__icon">
            <Icon name={icon} size={18} />
          </span>
          <div className="td-drawerx__titles">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button type="button" className="td-drawerx__close" onClick={onClose} aria-label="Close">
            <Icon name="X" size={18} />
          </button>
        </header>
        <div className="td-drawerx__body">{children}</div>
      </aside>
    </div>,
    portal,
  );
}

interface Common {
  row: Row;
  profile: Profile;
  image?: string;
  date: string;
  today: string;
  onDate: (d: string) => void;
  onClose: () => void;
}

function Ends({
  start,
  end,
  from,
  to,
  tone,
}: {
  start: string;
  end: string;
  from: string;
  to: string;
  tone: string;
}) {
  return (
    <div className={`td-hp__ends tone-${tone}`}>
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
          {to}
        </small>
      </div>
    </div>
  );
}

function Head({
  row,
  profile,
  image,
  date,
  today,
  onDate,
  children,
}: Omit<Common, 'onClose'> & { children?: ReactNode }) {
  const thumb = (
    <span
      className="td-vthumb"
      style={{ width: Math.round(36 * 0.8) * 1.4, height: Math.round(36 * 0.8) }}
    >
      <Icon name={profile.thumb} size={Math.round(36 * 0.8) * 0.62} strokeWidth={1.6} />
    </span>
  );
  return (
    <section className="td-hp__card td-hp__head">
      <header className="td-hp__period">
        <Icon name="CalendarDays" size={18} />
        <h3>Selected Period Summary</h3>
        <label className="td-dd">
          <input
            type="date"
            value={date}
            max={today}
            aria-label="Date"
            onChange={(e) => onDate(e.target.value)}
          />
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
        <span className="td-hp__who">
          <Img
            src={image}
            alt=""
            width={Math.round(36 * 1.4)}
            height={36}
            className="td-entity-media"
            fallback={thumb}
          />
          <strong>{row.name}</strong>
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

const SPANS = {
  running: { label: 'Running', tone: 'brand' },
  overspeed: { label: 'Overspeed', tone: 'orange' },
  stopped: { label: 'Stopped', tone: 'amber' },
} as const;
const pathKm = (pts: { at: LatLng }[]) => {
  let m = 0;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1]!.at, pts[i]!.at];
    const r = Math.PI / 180;
    const h =
      Math.sin(((b[0] - a[0]) * r) / 2) ** 2 +
      Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
    m += 2 * 6371e3 * Math.asin(Math.sqrt(h));
  }
  return Math.round(m / 10) / 100;
};

/** Running, overspeed and stopped spans of the day in time order (original: VU). */
function spansOf(day: Day, profile: Profile) {
  const over: {
    id: string;
    kind: 'overspeed';
    start: number;
    end: number;
    from: LatLng;
    to: LatLng;
    distanceKm?: number;
  }[] = [];
  if (profile.overspeed) {
    let at = -1;
    const p = day.points;
    for (let i = 0; i <= p.length; i++) {
      const fast = i < p.length && p[i]!.speed > profile.overspeedKmh;
      if (fast && at < 0) at = i;
      else if (!fast && at >= 0) {
        const seg = p.slice(at, Math.min(i + 1, p.length));
        const a = seg[0]!;
        const b = seg[seg.length - 1]!;
        if (b.t > a.t)
          over.push({
            id: `os-${a.t}`,
            kind: 'overspeed',
            start: a.t,
            end: b.t,
            from: a.at,
            to: b.at,
            distanceKm: pathKm(seg),
          });
        at = -1;
      }
    }
  }
  return [
    ...day.trips.map((t) => ({
      id: t.id,
      kind: 'running' as const,
      start: t.start,
      end: t.end,
      distanceKm: t.distanceKm as number | undefined,
      from: t.points[0]!.at,
      to: t.points[t.points.length - 1]!.at,
    })),
    ...over,
    ...day.stops.map((s) => ({
      id: s.id,
      kind: 'stopped' as const,
      start: s.start,
      end: s.end,
      distanceKm: undefined as number | undefined,
      from: s.at,
      to: s.at,
    })),
  ].sort((a, b) => a.start - b.start);
}

export function DistanceDrawer({ day, ...p }: Common & { day: Day }) {
  const s = day.summary;
  const first = day.trips[0]!;
  const last = day.trips[day.trips.length - 1]!;
  return (
    <Drawer
      title="Distance & Duration"
      subtitle="View total distance and playback duration."
      icon="Timer"
      onClose={p.onClose}
    >
      <div className="td-hp">
        <Head {...p}>
          <div className="td-hp__kpis">
            <div className="tone-brand">
              <span className="td-badge td-badge--sm">
                <Icon name="Route" size={13} />
              </span>
              <small>Distance Covered</small>
              <b>{s.distanceKm} km</b>
            </div>
            <div className="tone-blue">
              <span className="td-badge td-badge--sm">
                <Icon name="Clock" size={13} />
              </span>
              <small>Duration</small>
              <b>{hm(s.runningMin)}</b>
            </div>
            <div className="tone-orange">
              <span className="td-badge td-badge--sm">
                <Icon name="Gauge" size={13} />
              </span>
              <small>Max Speed</small>
              <b>{s.maxSpeed} km/h</b>
            </div>
          </div>
          <Ends
            tone="brand"
            start={clock12(first.start)}
            end={last.ongoing ? 'Now' : clock12(last.end)}
            from={latLngText(first.points[0]!.at)}
            to={latLngText(last.points[last.points.length - 1]!.at)}
          />
        </Head>
        <div className="td-hp__list">
          {spansOf(day, p.profile).map((x) => {
            const k = SPANS[x.kind];
            return (
              <section key={x.id} className={`td-hp__card td-hp__span tone-${k.tone}`}>
                <header className="td-hp__ribbon">
                  <strong>{k.label}</strong>
                  <span>Duration: {hm((x.end - x.start) / 6e4)}</span>
                </header>
                {x.distanceKm != null && (
                  <div className="td-hp__dist">
                    <span className="td-badge td-badge--sm">
                      <Icon name="Route" size={13} />
                    </span>
                    <small>Distance Covered</small>
                    <b>{x.distanceKm} km</b>
                  </div>
                )}
                <Ends
                  tone={k.tone}
                  start={clock12(x.start)}
                  end={clock12(x.end)}
                  from={latLngText(x.from)}
                  to={latLngText(x.to)}
                />
              </section>
            );
          })}
        </div>
      </div>
    </Drawer>
  );
}

const ALERT_KIND: Record<string, { label: string; icon: string; tone: string; about: string }> = {
  OVERSPEED: {
    label: 'Overspeed',
    icon: 'Gauge',
    tone: 'red',
    about: 'Faster than the speed limit',
  },
  HARSH_BRAKING: {
    label: 'Harsh Braking',
    icon: 'OctagonX',
    tone: 'red',
    about: 'Sudden deceleration',
  },
  HARSH_ACCELERATION: {
    label: 'Harsh Driving',
    icon: 'TriangleAlert',
    tone: 'orange',
    about: 'Sudden acceleration',
  },
  HARSH_CORNERING: {
    label: 'Harsh Cornering',
    icon: 'TriangleAlert',
    tone: 'amber',
    about: 'Took a turn too sharply',
  },
  IDLE: {
    label: 'Idle',
    icon: 'Clock',
    tone: 'blue',
    about: 'Engine on without moving for too long',
  },
  GEOFENCE_ENTER: {
    label: 'Geofence Entry',
    icon: 'MapPinned',
    tone: 'teal',
    about: 'Entered a geofence',
  },
  GEOFENCE_EXIT: {
    label: 'Geofence Exit',
    icon: 'MapPinned',
    tone: 'orange',
    about: 'Left a geofence',
  },
  POWER_CUT: {
    label: 'Power Cut',
    icon: 'Zap',
    tone: 'amber',
    about: 'Tracker lost external power',
  },
  TOWED: { label: 'Towed', icon: 'Truck', tone: 'teal', about: 'Moved with the ignition off' },
  SOS: { label: 'SOS', icon: 'Siren', tone: 'red', about: 'Panic button pressed' },
  LOW_BATTERY: {
    label: 'Low Battery',
    icon: 'BatteryLow',
    tone: 'amber',
    about: 'Device battery is low',
  },
  DEVICE_OFFLINE: {
    label: 'Device Offline',
    icon: 'WifiOff',
    tone: 'dark',
    about: 'No report for a long time',
  },
  MOCK_LOCATION: {
    label: 'Fake Location',
    icon: 'ShieldAlert',
    tone: 'purple',
    about: 'The phone reported a mock location',
  },
};
const SEVERITY: Record<string, [string, string]> = {
  CRITICAL: ['red', 'Critical'],
  HIGH: ['orange', 'High'],
  MEDIUM: ['amber', 'Medium'],
  LOW: ['blue', 'Low'],
};

export function AlertsDrawer({ from, to, ...p }: Common & { from: Date; to: Date }) {
  const list = alertsOf(p.row.id).filter(
    (a) => Date.parse(a.ts) >= from.getTime() && Date.parse(a.ts) < to.getTime(),
  );
  return (
    <Drawer
      title={`Alerts (${list.length})`}
      subtitle="View alerts triggered during playback."
      icon="Bell"
      onClose={p.onClose}
    >
      <div className="td-hp">
        <Head {...p} />
        <div className="td-hp__list">
          {list.length ? (
            list.map((a) => {
              const k = ALERT_KIND[a.type] ?? {
                label: a.type,
                icon: 'Bell',
                tone: 'blue',
                about: '',
              };
              const sev = a.severity ? SEVERITY[a.severity.trim().toUpperCase()] : undefined;
              return (
                <article key={a.id} className={`td-hp__card td-hp__alert tone-${k.tone}`}>
                  <header>
                    <span className="td-badge td-badge--solid">
                      <Icon name={k.icon} size={16} />
                    </span>
                    <strong>{k.label}</strong>
                    {sev && (
                      <Pill tone={sev[0]} dot={false}>
                        {sev[1]}
                      </Pill>
                    )}
                  </header>
                  <p>{a.message || k.about}</p>
                  <footer>
                    {a.speed != null && (
                      <small>
                        <Icon name="Gauge" size={13} />
                        {Math.round(a.speed)} km/h
                      </small>
                    )}
                    <small>
                      <Icon name="MapPin" size={13} />
                      {latLngText([a.lat, a.lng])}
                    </small>
                  </footer>
                  <time dateTime={a.ts}>{clock12(Date.parse(a.ts))}</time>
                </article>
              );
            })
          ) : (
            <p className="td-trk__none">No alerts on this day.</p>
          )}
        </div>
      </div>
    </Drawer>
  );
}
