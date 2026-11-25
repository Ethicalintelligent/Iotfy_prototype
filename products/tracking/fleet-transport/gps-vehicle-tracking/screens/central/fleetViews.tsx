// IT-0036. The "1 Map" layout: every vehicle on one map, live (original: rJ) and replay (original: sJ).
import { useMemo, useRef, useState } from 'react';
import { Icon } from '../smart-track/kit';
import {
  analyse,
  clock12,
  hm,
  isoDay,
  longDay,
  playedPath,
  positionAt,
  replayWindow,
  type Day,
} from './analysis';
import { historyPoints, type Profile, type Telemetry } from './demo';
import type { Row } from './fleet';
import { FleetMap, type MapLine, type MapPin } from './map';
import { Empty, Img, Share } from './parts';
import { PlaybackBar, TrackCard, liveChip, Speed, type Item, type Play } from './tiles';

/** Below this many vehicles the plate labels always show; above, only from zoom 13. */
const LABELS_UP_TO = 60;
const SHAREABLE = new Set(['idle', 'stopped']);
const cardTime = (ms: number) =>
  new Date(ms)
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase();
const cardDay = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export function LiveFleet({
  rows,
  focusId,
  onFocus,
  fitKey,
  telemetryOf,
  onOverview,
}: {
  rows: Row[];
  focusId: string | null;
  onFocus: (id: string | null) => void;
  fitKey: string;
  telemetryOf: (id: string) => Telemetry | undefined;
  onOverview: (id: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [minimized, setMinimized] = useState(false);
  const [cards, setCards] = useState(false);
  const focused = focusId ? (rows.find((r) => r.id === focusId) ?? null) : null;
  const today = isoDay(new Date());
  const day = useMemo(() => {
    if (!focused) return null;
    const w = replayWindow(today);
    return analyse(historyPoints(focused.id, w.from.getTime(), w.to.getTime()), {
      rangeEnd: w.to.getTime(),
      profile: focused.vehicle.profile,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused?.id, today]);
  const pick = (id: string) => {
    onFocus(id);
    setMinimized(false);
    setCards(false);
  };
  const placed = rows.filter((r) => r.position);
  const pins: MapPin[] = placed.map((r) => {
    const p = r.position!;
    const name = r.vehicle.code || r.name;
    return {
      id: r.id,
      at: [p.lat, p.lng],
      tone: r.status.tone,
      heading: p.heading ?? null,
      moving: r.status.id === 'moving' || r.status.id === 'overspeed' || r.status.id === 'towed',
      selected: r.id === focusId,
      title: name,
      sub: `${r.status.label} · ${Math.round(p.speed ?? 0)} km/h`,
      label: name,
      image: r.vehicle.image,
      onClick: () => pick(r.id),
    };
  });
  const lines: MapLine[] =
    focused && day
      ? day.trips.map((t) => ({
          id: `trail-${t.id}`,
          tone: focused.status.tone,
          variant: 'done',
          points: t.points.map((x) => x.at),
        }))
      : [];
  const fp = focused?.position;
  const showCard = !!focused && !minimized;

  if (!placed.length)
    return (
      <div className="mt-fleet">
        <Empty
          icon="MapPinOff"
          title="No vehicle on the map"
          text="None of the vehicles in view has reported a position yet."
        />
      </div>
    );
  return (
    <div ref={box} className="mt-fleet">
      <FleetMap
        fitKey={fitKey}
        lines={lines}
        pins={pins}
        follow={fp ? [fp.lat, fp.lng] : null}
        labels={placed.length <= LABELS_UP_TO ? 'always' : 'zoom'}
        fullscreenOf={box}
        clustered
        clusterTitle={(n) => `${n.toLocaleString()} vehicles`}
      />
      {cards && !showCard && (
        <div className="mt-vstrip" role="list" aria-label="Vehicles on the map">
          {placed.map((r) => {
            const p = r.position!;
            return (
              <button
                key={r.id}
                type="button"
                role="listitem"
                className={`mt-vcard tone-${r.status.tone}`}
                onClick={() => pick(r.id)}
              >
                <Img
                  src={r.vehicle.image}
                  alt=""
                  width={52}
                  height={38}
                  className="mt-vcard__img"
                  fallback={
                    <span className="mt-vcard__img mt-vcard__img--ph">
                      <Icon name="Truck" size={18} />
                    </span>
                  }
                />
                <span className="mt-vcard__text">
                  <strong>
                    <bdi>{r.vehicle.code || r.name}</bdi>
                  </strong>
                  <span>
                    <b>Speed:</b> {Math.round(p.speed ?? 0)} km/h
                  </span>
                  <span className="mt-vcard__status">{r.status.label}</span>
                </span>
                <span className="mt-vcard__strip">
                  {cardDay(Date.parse(p.ts))} <small>{cardTime(Date.parse(p.ts))}</small>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {showCard && focused && (
        <div className="mt-tcard-dock">
          <TrackCard
            mode="live"
            name={focused.name}
            code={focused.vehicle.code}
            image={focused.vehicle.image}
            status={focused.status}
            speed={Math.round(fp?.speed ?? 0)}
            at={fp ? Date.parse(fp.ts) : null}
            odometerKm={telemetryOf(focused.id)?.odometerKm ?? focused.vehicle.odometerKm}
            telemetry={telemetryOf(focused.id)}
            ignition={fp?.ignition ?? null}
            summary={day?.summary ?? null}
            operator={focused.vehicle.operator}
            onMinimize={() => setMinimized(true)}
            actions={
              <>
                {SHAREABLE.has(focused.status.id) && (
                  <Share subject={focused.vehicle.code || focused.name} mode="live" />
                )}
                <button
                  type="button"
                  className="mt-icon-btn mt-icon-btn--sm"
                  onClick={() => onOverview(focused.id)}
                  aria-label="Vehicle overview"
                  title="Vehicle overview"
                >
                  <Icon name="Maximize2" size={12} />
                </button>
                <button
                  type="button"
                  className="mt-icon-btn mt-icon-btn--sm"
                  onClick={() => onFocus(null)}
                  aria-label="Deselect vehicle"
                  title="Deselect"
                >
                  <Icon name="X" size={12} />
                </button>
              </>
            }
          />
        </div>
      )}
      {!showCard && (
        <button
          type="button"
          className={`mt-bottom-toggle ${cards && !focused ? 'is-open' : ''}`}
          onClick={() => (focused ? setMinimized(false) : setCards((c) => !c))}
          aria-expanded={focused ? false : cards}
          aria-label={
            focused ? 'Show vehicle info' : cards ? 'Hide vehicle cards' : 'Show vehicle cards'
          }
          title={
            focused ? 'Show vehicle info' : cards ? 'Hide vehicle cards' : 'Show vehicle cards'
          }
        >
          <Icon name="ChevronUp" size={16} />
        </button>
      )}
      {/* live connection chip: the original shows "Reconnecting…" only while offline */}
    </div>
  );
}

export function HistoryFleet({
  items,
  days,
  date,
  playOf,
  focusId,
  onFocus,
  statuses,
  stopLimit,
  telemetryOf,
  actions,
}: {
  items: Item[];
  days: Map<string, Day | null>;
  date: string;
  playOf: (id: string) => Play | null;
  focusId: string | null;
  onFocus: (id: string) => void;
  statuses: string[];
  stopLimit: number;
  telemetryOf: (id: string) => Telemetry | undefined;
  actions: (item: Item) => React.ReactNode;
}) {
  const [minimized, setMinimized] = useState(false);
  const moved = items.filter((i) => (days.get(i.row.id)?.trips.length ?? 0) > 0);
  if (!moved.length)
    return (
      <div className="mt-fleet">
        <Empty
          icon="Route"
          title="No trips on this day"
          text={`None of the selected vehicles moved on ${longDay(date)}.`}
        />
      </div>
    );
  const lines: MapLine[] = [];
  const pins: MapPin[] = [];
  for (const it of moved) {
    const day = days.get(it.row.id)!;
    const t = playOf(it.row.id)?.t ?? day.trips[0]!.start;
    const at = positionAt(day, t);
    const name = it.code || it.row.name;
    day.trips.forEach((tr) =>
      lines.push({
        id: `${it.row.id}-${tr.id}`,
        tone: it.tone,
        variant: 'route',
        points: tr.points.map((x) => x.at),
      }),
    );
    lines.push({
      id: `${it.row.id}-played`,
      tone: it.tone,
      variant: 'done',
      points: playedPath(day.trips, t, at.at),
    });
    if (statuses.includes('stopped'))
      day.stops
        .filter((s) => s.durationMin - s.idleMin >= stopLimit)
        .forEach((s) =>
          pins.push({
            id: `${it.row.id}-stop-${s.id}`,
            at: s.at,
            tone: 'red',
            heading: null,
            moving: false,
            glyph: 'stop',
            size: 20,
            title: `${name} · Stopped`,
            sub: `${hm(Math.round(s.durationMin - s.idleMin))} · ${clock12(s.start)}`,
          }),
        );
    if (statuses.includes('idle'))
      day.stops
        .filter((s) => s.idleMin >= stopLimit)
        .forEach((s) =>
          pins.push({
            id: `${it.row.id}-idle-${s.id}`,
            at: s.at,
            tone: 'blue',
            heading: null,
            moving: false,
            glyph: 'dot',
            size: 20,
            title: `${name} · Idle`,
            sub: `${hm(Math.round(s.idleMin))} · ${clock12(s.start)}`,
          }),
        );
    if (statuses.includes('overspeed'))
      day.events
        .filter((e) => e.icon === 'Gauge')
        .forEach((e) =>
          pins.push({
            id: `${it.row.id}-os-${e.id}`,
            at: e.at,
            tone: 'orange',
            heading: null,
            moving: false,
            glyph: 'alert',
            size: 20,
            title: `${name} · Overspeed`,
            sub: `${e.speed ?? '—'} km/h · ${clock12(e.t)}`,
          }),
        );
    if (it.row.id === focusId) {
      const first = day.trips[0]!;
      const last = day.trips[day.trips.length - 1]!;
      pins.push({
        id: `${it.row.id}-start`,
        at: first.points[0]!.at,
        tone: 'green',
        heading: null,
        moving: false,
        glyph: 'flag',
        size: 22,
        title: `${name} · Start`,
        sub: clock12(first.start),
      });
      if (!last.ongoing)
        pins.push({
          id: `${it.row.id}-end`,
          at: last.points[last.points.length - 1]!.at,
          tone: 'dark',
          heading: null,
          moving: false,
          glyph: 'flag',
          size: 22,
          title: `${name} · End`,
          sub: clock12(last.end),
        });
    }
    pins.push({
      id: `${it.row.id}-vehicle`,
      at: at.at,
      tone: it.tone,
      heading: at.heading,
      moving: at.moving,
      selected: it.row.id === focusId,
      title: name,
      sub: at.moving ? `${at.speed} km/h` : 'Stopped',
      onClick: () => {
        onFocus(it.row.id);
        setMinimized(false);
      },
    });
  }
  const focused = moved.find((i) => i.row.id === focusId) ?? null;
  const fday = focused ? days.get(focused.row.id)! : null;
  const play = focused ? playOf(focused.row.id) : null;
  const t = play?.t ?? fday?.trips[0]?.start ?? 0;
  const at = fday ? positionAt(fday, t) : null;
  const profile: Profile | null = focused ? focused.row.vehicle.profile : null;
  const limit = profile?.overspeedKmh ?? 120;
  return (
    <div className="mt-fleet">
      {focused && play && (
        <div className="mt-fleet__pb">
          <PlaybackBar
            play={play}
            name={focused.code || focused.row.name}
            lead={
              <span className={`mt-pb__who tone-${focused.tone}`}>
                <i className="mt-swatch" aria-hidden="true" />
                <bdi>{focused.code || focused.row.name}</bdi>
              </span>
            }
          />
        </div>
      )}
      <FleetMap
        fitKey={`hist:${moved.map((i) => i.row.id).join(',')}:${date}`}
        lines={lines}
        pins={pins}
        overlay={
          <>
            <div className="td-trk__chip">
              <Icon name="History" size={14} />
              <span>Replay · {longDay(date)}</span>
            </div>
            {at && <Speed kmh={at.moving ? at.speed : 0} over={at.speed > limit} />}
            {!focused && (
              <p className="mt-fleet__hint">
                <Icon name="MousePointerClick" size={14} />
                Select a vehicle on the map to see its replay details
              </p>
            )}
          </>
        }
      />
      {focused &&
        fday &&
        at &&
        (minimized ? (
          <button
            type="button"
            className="mt-tcard-restore"
            onClick={() => setMinimized(false)}
            aria-label="Show vehicle info"
            title="Show vehicle info"
          >
            <Icon name="ChevronUp" size={16} />
          </button>
        ) : (
          <div className="mt-tcard-dock">
            <TrackCard
              mode="history"
              name={focused.row.name}
              code={focused.code}
              image={focused.image}
              status={
                at.moving
                  ? at.speed > limit
                    ? { label: 'Overspeed', tone: 'orange' }
                    : { label: 'Running', tone: 'green' }
                  : { label: 'Stopped', tone: 'red' }
              }
              speed={at.moving ? at.speed : 0}
              at={t}
              odometerKm={telemetryOf(focused.row.id)?.odometerKm ?? focused.row.vehicle.odometerKm}
              ignition={null}
              summary={fday.summary}
              operator={focused.row.vehicle.operator}
              onMinimize={() => setMinimized(true)}
              actions={actions(focused)}
            />
          </div>
        ))}
    </div>
  );
}

export { liveChip };
