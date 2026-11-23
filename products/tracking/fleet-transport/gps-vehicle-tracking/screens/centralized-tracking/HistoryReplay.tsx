// Centralized Tracking > History: each chosen vehicle's route on the chosen day, in its own
// colour, with a time slider and play / pause that move the vehicles along their routes. The
// routes are demo activity (generated from the real vehicles; labelled). Built from @iotify/ui.
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Chip,
  Legend,
  MapToolButton,
  PillSelect,
  RangeField,
  Stack,
  StreetMap,
  type MapMarker,
  type MapRoute,
} from '@iotify/ui';
import { dayKey, dayRoute, type LiveVehicle } from '../../demo/fleet';
import { dateText } from '../../shared/format';
import { mapFence, type Fleet } from '../../shared/useFleet';
import { REPLAY_HUES, hhmm, positionAt, span } from './replay';
import type { HistoryPick } from './filters';

/** Replay speeds: minutes of the day per tick (a tick is 0.2 s). */
const SPEEDS = [
  { value: '1', label: '1×' },
  { value: '4', label: '4×' },
  { value: '12', label: '12×' },
];

/** yyyy-mm-dd → local midnight. */
const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
};

export function HistoryReplay({
  fleet,
  pick,
  height,
}: {
  fleet: Fleet;
  pick: HistoryPick;
  height: string;
}) {
  const day = parseDay(pick.day);
  const isToday = pick.day === dayKey(fleet.now);
  const vehicles = pick.vehicles
    .map((id) => fleet.live.find((v) => v.id === id))
    .filter((v): v is LiveVehicle => !!v);
  // Today's route runs up to now, so it is redrawn as the clock moves (every 15 s).
  const clock = isToday ? fleet.now.getTime() : 0;
  const ids = vehicles.map((v) => v.id).join(',');
  const tracks = useMemo(
    () =>
      vehicles.map((v, i) => ({
        v,
        hue: REPLAY_HUES[i % REPLAY_HUES.length]!,
        route: isToday ? dayRoute(v, fleet.now, v.status) : dayRoute(v, day),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, pick.day, clock],
  );
  const routes = useMemo<MapRoute[]>(
    () =>
      tracks.map((t) => ({
        points: t.route.points.map((p) => [p.lat, p.lng] as [number, number]),
        stops: t.route.stops.map((p) => [p.lat, p.lng] as [number, number]),
        hue: t.hue,
      })),
    [tracks],
  );
  const fences = useMemo(() => fleet.fences.map(mapFence), [fleet.fences]);
  const bounds = span(tracks.map((t) => t.route.points));

  const [t, setT] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState('4');
  // A new choice starts at the beginning of the day's driving.
  useEffect(() => {
    setT(null);
    setPlaying(false);
  }, [ids, pick.day]);
  const time = bounds ? Math.min(Math.max(t ?? bounds[0], bounds[0]), bounds[1]) : 0;

  useEffect(() => {
    if (!playing || !bounds) return;
    const id = setInterval(() => {
      setT((cur) => {
        const next = (cur ?? bounds[0]) + Number(speed) * 60_000;
        if (next >= bounds[1]) {
          setPlaying(false);
          return bounds[1];
        }
        return next;
      });
    }, 200);
    return () => clearInterval(id);
  }, [playing, speed, bounds?.[0], bounds?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const markers: MapMarker[] = tracks.flatMap((tr) => {
    const p = positionAt(tr.route.points, time);
    return p
      ? [
          {
            id: tr.v.id,
            lat: p.lat,
            lng: p.lng,
            label: tr.v.plate,
            detail: p.outside ? 'parked' : `${p.speed} km/h`,
            hue: tr.hue,
            pulse: !p.outside && p.speed > 0,
          },
        ]
      : [];
  });
  const noDrive = tracks.filter((tr) => !tr.route.points.length).map((tr) => tr.v.plate);
  const toggle = () => {
    if (!bounds) return;
    if (!playing && time >= bounds[1]) setT(bounds[0]);
    setPlaying(!playing);
  };

  return (
    <StreetMap
      label={`History of ${vehicles.length} vehicles on ${dateText(day)}`}
      markers={markers}
      routes={routes}
      fences={fences}
      labels
      cluster={false}
      wheelZoom
      fitKey={`${ids}|${pick.day}`}
      height={height}
      overlay={
        <>
          <Chip tone="amber">Demo activity</Chip>
          <Chip>{dateText(day)}</Chip>
        </>
      }
      tools={
        bounds ? (
          <MapToolButton
            icon="refresh"
            label="Back to the start"
            onClick={() => {
              setPlaying(false);
              setT(bounds[0]);
            }}
          />
        ) : undefined
      }
      footer={
        <Card>
          {bounds ? (
            <>
              <Stack gap={14} wrap align="center">
                <Button
                  size="sm"
                  variant="primary"
                  icon={playing ? 'stop' : 'play'}
                  onClick={toggle}
                >
                  {playing ? 'Pause' : 'Play'}
                </Button>
                <PillSelect
                  icon="gauge"
                  label="Replay speed"
                  value={speed}
                  onChange={setSpeed}
                  options={SPEEDS}
                />
                <Legend items={tracks.map((tr) => ({ label: tr.v.plate, hue: tr.hue }))} />
              </Stack>
              <RangeField
                label={`Replay time · ${dateText(day)} · ${hhmm(bounds[0])}–${hhmm(bounds[1])}`}
                min={bounds[0]}
                max={bounds[1]}
                step={60_000}
                value={time}
                onChange={(x) => {
                  setPlaying(false);
                  setT(x);
                }}
                format={hhmm}
              />
            </>
          ) : (
            <span>None of these vehicles drove on {dateText(day)}.</span>
          )}
          {bounds && noDrive.length > 0 && (
            <span>No driving on this day: {noDrive.join(', ')}.</span>
          )}
        </Card>
      }
    />
  );
}
