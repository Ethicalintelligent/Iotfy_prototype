// Tracking (approved design, Desktop/vs/Tracking.html): the vehicle list on the left; on the right
// the chosen vehicle's live position with today's route (Live Track), or a past day's route with
// playback (Track History). Vehicles, operators and speed limits are real; positions, routes and
// sensors are demo activity (labelled).
import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Chip,
  Dot,
  EmptyState,
  HueChip,
  Icon,
  Loading,
  MapToolButton,
  Note,
  PillSelect,
  SideLayout,
  Stack,
  StreetMap,
  Tabs,
  ToolButton,
  type MapMarker,
  type MapRoute,
} from '@iotify/ui';
import { VehiclePhoto } from '@iotify/illustrations';
import { useOperators, useVehicleDetails } from '@iotify/data';
import type { ScreenContext } from '@iotify/app-kit';
import type { DayRoute, LiveVehicle } from '../../demo/fleet';
import { useFleet, type Fleet } from '../../shared/useFleet';
import { VehicleList } from '../../shared/VehicleList';
import { STATUS } from '../../shared/vehicle-status';
import { InfoPanel, type Sensor } from './InfoPanel';
import {
  STEP_MS,
  cumulativeKm,
  dayOptions,
  historyRoute,
  hoursUpTo,
  liveRoute,
  nextSpeed,
  odometerAt,
  type PlaySpeed,
} from './track';

type Mode = 'live' | 'history';

/** Map height: the window below the page header and the panel heading. */
const MAP_HEIGHT = 'max(520px, calc(100vh - 150px))';
const reportingNow = (v: LiveVehicle) => v.status !== 'ytt' && v.status !== 'notx';
const moving = (s: LiveVehicle['status']) => s === 'running' || s === 'overspeed';

export default function TrackingScreen(ctx: ScreenContext) {
  const fleet = useFleet(ctx);
  const [picked, setPicked] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('live');
  const [daysAgo, setDaysAgo] = useState('0');
  const operators = useOperatorInfo(ctx.companyId);

  if (fleet.error) return <Note tone="red">{fleet.error}</Note>;
  if (fleet.loading) return <Loading>Loading vehicles…</Loading>;
  if (!fleet.live.length)
    return (
      <EmptyState title="No vehicles yet" icon="vehicles">
        Vehicles appear here once your dealer adds them to {ctx.companyName}.
      </EmptyState>
    );
  const v =
    fleet.live.find((x) => x.id === picked) ?? fleet.live.find(reportingNow) ?? fleet.live[0]!;
  const op = operators(v.id);

  return (
    <SideLayout
      sideWidth={300}
      sideHeight="calc(100vh - 70px)"
      side={<VehicleList vehicles={fleet.live} selected={v.id} onSelect={setPicked} />}
    >
      <Card>
        <Stack justify="space-between" gap={10}>
          <Stack gap={10}>
            <VehiclePhoto category={v.category} size={34} />
            <b>{v.plate}</b>
            {v.category && <span className="ui-muted">{v.category}</span>}
            <HueChip hue={STATUS[v.status].hue}>{STATUS[v.status].label}</HueChip>
          </Stack>
          <Stack gap={8}>
            <Chip tone="amber">Demo activity</Chip>
            {mode === 'history' && (
              <PillSelect
                icon="calendar"
                label="Day"
                value={daysAgo}
                onChange={setDaysAgo}
                options={dayOptions(fleet.now)}
              />
            )}
            <Tabs
              label="Tracking mode"
              value={mode}
              onChange={setMode}
              tabs={[
                {
                  key: 'live',
                  label: (
                    <Stack gap={6} wrap={false}>
                      <Icon name="navigate" size={14} /> Live Track
                    </Stack>
                  ),
                },
                {
                  key: 'history',
                  label: (
                    <Stack gap={6} wrap={false}>
                      <Icon name="route" size={14} /> Track History
                    </Stack>
                  ),
                },
              ]}
            />
          </Stack>
        </Stack>
        {mode === 'live' ? (
          <LiveMap fleet={fleet} v={v} op={op} />
        ) : (
          <HistoryMap
            key={`${v.id}-${daysAgo}`}
            fleet={fleet}
            v={v}
            op={op}
            daysAgo={Number(daysAgo)}
          />
        )}
      </Card>
    </SideLayout>
  );
}

// ---------------------------------------------------------------- operator of a vehicle (real)
interface OperatorInfo {
  name: string | null;
  tag: string | null;
}

/** The operator linked to each vehicle (vehicle_details.operator_id → operators). */
function useOperatorInfo(companyId: string) {
  const on = { enabled: !!companyId };
  // Same queries as useFleet, so they come from the cache.
  const details = useVehicleDetails(undefined, on);
  const operators = useOperators({ company_id: companyId }, on);
  return (vehicleId: string): OperatorInfo => {
    const d = details.data?.find((x) => x.asset_id === vehicleId);
    const o = d?.operator_id ? operators.data?.find((x) => x.id === d.operator_id) : undefined;
    return { name: o?.name ?? d?.operator_name ?? null, tag: o?.tag_id ?? null };
  };
}

// ---------------------------------------------------------------- shared map pieces
const mapRoute = (r: DayRoute): MapRoute => ({
  points: r.points.map((p) => [p.lat, p.lng]),
  stops: r.stops.map((p) => [p.lat, p.lng]),
});

/** Distance, idle count, stops and top speed of the route (none without a route). */
function SummaryPills({ route }: { route: DayRoute }) {
  if (!route.points.length) return null;
  return (
    <>
      <Chip>
        Distance: <b>{route.distance.toFixed(1)} km</b>
      </Chip>
      <Chip>
        Idle: <b>{route.idles}</b>
      </Chip>
      <Chip>
        Stops: <b>{route.stops.length}</b>
      </Chip>
      <Chip>
        Max speed: <b>{route.maxSpeed} km/h</b>
      </Chip>
    </>
  );
}

type SensorState = Pick<LiveVehicle, 'ignition' | 'ac' | 'belt' | 'door'> & {
  /** The tracker is reporting (GPS fix, external power, mobile signal). */
  reporting: boolean | null;
};

/** The sensor icon row (demo states). Fuel needs the Fuel add-on's sensor: shown off. */
function sensors(s: SensorState): Sensor[] {
  return [
    { key: 'gps', label: 'GPS', icon: 'crosshair', on: s.reporting, words: ['Fix', 'No fix'] },
    {
      key: 'power',
      label: 'External power',
      icon: 'zap',
      on: s.reporting,
      words: ['Connected', 'Cut'],
    },
    {
      key: 'gsm',
      label: 'Mobile signal',
      icon: 'signal',
      on: s.reporting,
      words: ['Good', 'None'],
    },
    { key: 'ign', label: 'Ignition', icon: 'key', on: s.ignition },
    { key: 'ac', label: 'AC', icon: 'snow', on: s.ac, hue: 'blue' },
    {
      key: 'belt',
      label: 'Seat belt',
      icon: 'seat',
      on: s.belt,
      words: ['Fastened', 'Unfastened'],
    },
    {
      key: 'door',
      label: 'Door',
      icon: 'door',
      on: s.door,
      hue: 'orange',
      words: ['Open', 'Closed'],
    },
    { key: 'fuel', label: 'Fuel sensor', icon: 'fuel', on: null },
  ];
}

/** The vehicle's sensors now; unknown when its tracker isn't reporting. */
const liveSensors = (v: LiveVehicle) => sensors({ ...v, reporting: reportingNow(v) || null });

/** Sensors at a moment of a past route: only the ignition follows from the status. */
const pastSensors = (status: LiveVehicle['status']) =>
  sensors({
    reporting: null,
    ignition: moving(status) || status === 'idle',
    ac: null,
    belt: null,
    door: null,
  });

// ---------------------------------------------------------------- Live Track
function LiveMap({ fleet, v, op }: { fleet: Fleet; v: LiveVehicle; op: OperatorInfo }) {
  const route = useMemo(() => liveRoute(v, fleet.now), [v, fleet.now]);
  const lines = useMemo(() => mapRoute(route), [route]);
  const markers = useMemo<MapMarker[]>(
    () =>
      v.status === 'ytt'
        ? []
        : [
            {
              id: v.id,
              lat: v.lat,
              lng: v.lng,
              label: v.plate,
              detail: `${v.speed} km/h`,
              hue: STATUS[v.status].hue,
              pulse: moving(v.status),
            },
          ],
    [v],
  );
  const h = fleet.day(v, 0).stats.hours;
  return (
    <StreetMap
      label={`Live position and today's route of ${v.plate}`}
      markers={markers}
      route={lines}
      fitKey={`live-${v.id}`}
      wheelZoom
      height={MAP_HEIGHT}
      overlay={
        <>
          <SummaryPills route={route} />
          <Chip>
            <Dot tone={reportingNow(v) ? 'green' : 'grey'} />
            {v.status === 'ytt'
              ? 'No report yet'
              : reportingNow(v)
                ? 'Live'
                : 'Last known position'}
          </Chip>
        </>
      }
      footer={
        v.status === 'ytt' ? (
          <Note tone="grey">This vehicle's tracker hasn't reported yet.</Note>
        ) : (
          <InfoPanel
            at={v.lastReport ?? fleet.now}
            operator={op.name ?? v.operator}
            operatorId={op.tag}
            lat={v.lat}
            lng={v.lng}
            speed={v.speed}
            speedLimit={v.speedLimit}
            odometer={v.odometer}
            sensors={liveSensors(v)}
            hours={{ running: h.running + h.overspeed, stopped: h.stopped, idle: h.idle }}
          />
        )
      }
    />
  );
}

// ---------------------------------------------------------------- Track History
function HistoryMap({
  fleet,
  v,
  op,
  daysAgo,
}: {
  fleet: Fleet;
  v: LiveVehicle;
  op: OperatorInfo;
  daysAgo: number;
}) {
  const route = useMemo(() => historyRoute(v, fleet.now, daysAgo), [v, fleet.now, daysAgo]);
  const lines = useMemo(() => mapRoute(route), [route]);
  const cum = useMemo(() => cumulativeKm(route.points), [route]);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaySpeed>(1);
  const last = route.points.length - 1;
  const i = Math.min(at, Math.max(0, last));
  const p = route.points[i];

  // Move along the route while playing; stop at the end.
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setAt((n) => {
        if (n >= last) {
          setPlaying(false);
          return n;
        }
        return n + 1;
      });
    }, STEP_MS / speed);
    return () => clearInterval(t);
  }, [playing, speed, last]);

  const markers = useMemo<MapMarker[]>(
    () =>
      p
        ? [
            {
              id: v.id,
              lat: p.lat,
              lng: p.lng,
              label: v.plate,
              detail: `${p.speed} km/h`,
              hue: STATUS[p.status].hue,
              pulse: playing && moving(p.status),
            },
          ]
        : [],
    [p, v.id, v.plate, playing],
  );

  // Odometer at the end of the chosen day: now, minus what was driven on the days after it.
  let dayEndOdo = v.odometer;
  for (let d = 0; d < daysAgo; d++) dayEndOdo -= fleet.day(v, d).stats.km;
  const segments = fleet.day(v, daysAgo).segments;

  const controls = (
    <Stack dir="col" gap={8} align="center">
      <MapToolButton
        icon="play"
        label={playing ? 'Pause' : at >= last && last > 0 ? 'Play again' : 'Play'}
        active={playing}
        onClick={() => {
          if (!playing && at >= last) setAt(0);
          setPlaying(!playing);
        }}
      />
      <MapToolButton
        icon="stop"
        label="Stop (back to the start)"
        onClick={() => {
          setPlaying(false);
          setAt(0);
        }}
      />
      <ToolButton
        icon="gauge"
        label={`Playback speed ${speed}x: change`}
        onClick={() => setSpeed(nextSpeed)}
      >
        {speed}x
      </ToolButton>
    </Stack>
  );
  return (
    <StreetMap
      label={`Route of ${v.plate} on the chosen day`}
      markers={markers}
      route={lines}
      fitKey={`history-${v.id}-${daysAgo}`}
      wheelZoom
      height={MAP_HEIGHT}
      overlay={
        <Stack gap={8} align="flex-start" wrap={false}>
          <Stack gap={6} justify="flex-end">
            <SummaryPills route={route} />
          </Stack>
          {p && controls}
        </Stack>
      }
      footer={
        p ? (
          <InfoPanel
            at={p.at}
            operator={op.name ?? v.operator}
            operatorId={op.tag}
            lat={p.lat}
            lng={p.lng}
            speed={p.speed}
            speedLimit={v.speedLimit}
            odometer={odometerAt(dayEndOdo, cum, i)}
            sensors={pastSensors(p.status)}
            hours={hoursUpTo(segments, p.at)}
          />
        ) : (
          <Note tone="grey">
            {v.status === 'ytt'
              ? "This vehicle's tracker hasn't reported yet."
              : 'No trips on this day.'}
          </Note>
        )
      }
    />
  );
}
