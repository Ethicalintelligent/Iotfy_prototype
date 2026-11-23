// The Dashboard's panels, as in the approved design (Desktop/vs/Dashboard.html). Vehicles and
// geofences are real; positions, statuses, timelines and alerts are demo activity (labelled).
import { useMemo, useState } from 'react';
import {
  ActivityTimeline,
  AutoGrid,
  Avatar,
  BarChart,
  BarList,
  Card,
  Chip,
  CountTile,
  EmptyState,
  HueChip,
  IconButton,
  IconTile,
  Legend,
  MetricPill,
  MiniStat,
  PagedRow,
  PillSelect,
  RankBadge,
  RankCard,
  ShareTile,
  Stack,
  StatusTile,
  StatusTileRow,
  StreetMap,
  Table,
  Tabs,
  type Hue,
  type MapMarker,
} from '@iotify/ui';
import { VehiclePhoto } from '@iotify/illustrations';
import {
  addDays,
  alertCount,
  alertTotals,
  startOfDay,
  type DayStats,
  type LiveVehicle,
} from '../../demo/fleet';
import {
  ALERT,
  STATUS,
  STATUS_ORDER,
  SUMMARY_ALERTS,
  TICKER_ALERTS,
  type VehicleStatus,
} from '../../shared/vehicle-status';
import { fenceContains, mapFence, type Fleet } from '../../shared/useFleet';
import { ago, dateText, hm, num, pct, shortDate } from '../../shared/format';

// ---------------------------------------------------------------- periods
export type Period = 'today' | 'yesterday' | '7d';
const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
];
const DAYS: Record<Period, number[]> = { today: [0], yesterday: [1], '7d': [0, 1, 2, 3, 4, 5, 6] };

function PeriodSelect({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <PillSelect
      icon="calendar"
      label="Period"
      value={value}
      onChange={onChange}
      options={PERIODS}
    />
  );
}

/** A vehicle's totals over a period. */
function periodStats(fleet: Fleet, v: LiveVehicle, p: Period): DayStats {
  const out: DayStats = {
    hours: { running: 0, stopped: 0, idle: 0, notx: 0, overspeed: 0, towed: 0, ytt: 0 },
    km: 0,
    maxSpeed: 0,
    overspeeds: 0,
  };
  for (const d of DAYS[p]) {
    const s = fleet.day(v, d).stats;
    for (const k of STATUS_ORDER) out.hours[k] += s.hours[k];
    out.km += s.km;
    out.maxSpeed = Math.max(out.maxSpeed, s.maxSpeed);
    out.overspeeds += s.overspeeds;
  }
  return out;
}

const reporting = (v: LiveVehicle) => v.status !== 'ytt';
const vehicleName = (v: LiveVehicle) => [v.make, v.model].filter(Boolean).join(' ') || '—';
const statusHue = (s: VehicleStatus) => STATUS[s].hue;

// ---------------------------------------------------------------- Today Alerts strip
/** Lead and items for the TickerStrip: today's alerts per type. */
export function tickerData(fleet: Fleet) {
  const skip = new Set(fleet.live.filter((v) => !reporting(v)).map((v) => v.id));
  const today = alertTotals(fleet.vehicles, fleet.now, 1, TICKER_ALERTS, skip);
  return {
    lead: 'Today Alerts',
    items: TICKER_ALERTS.map((k) => ({
      key: k,
      label: ALERT[k].label,
      count: today[k] ?? 0,
      icon: ALERT[k].icon,
      hue: ALERT[k].hue,
    })),
  };
}

// ---------------------------------------------------------------- Vehicle Status Summary
export function StatusSummary({ fleet }: { fleet: Fleet }) {
  const n = fleet.live.length;
  const count = (s: VehicleStatus) => fleet.live.filter((v) => v.status === s).length;
  return (
    <Card
      icon="vehicles"
      title="Vehicle Status Summary"
      actions={
        <>
          <Chip tone="amber">Demo activity</Chip>
          <Chip>Today, {dateText(fleet.now)}</Chip>
        </>
      }
    >
      <StatusTileRow min={128}>
        <StatusTile label="All" value={n} sub="Total Vehicles" icon="vehicles" hue="slate" />
        {STATUS_ORDER.map((s) => (
          <StatusTile
            key={s}
            label={STATUS[s].label}
            value={count(s)}
            sub={`${pct(count(s), n)} of total`}
            icon={STATUS[s].icon}
            hue={STATUS[s].hue}
          />
        ))}
      </StatusTileRow>
    </Card>
  );
}

// ---------------------------------------------------------------- Real-Time Vehicle Tracking
export function LiveMapPanel({ fleet, onOpen }: { fleet: Fleet; onOpen?: () => void }) {
  const [view, setView] = useState<'map' | 'list'>('map');
  const [status, setStatus] = useState<'all' | VehicleStatus>('all');
  const shown = fleet.live.filter((v) => reporting(v) && (status === 'all' || v.status === status));
  const markers: MapMarker[] = shown.map((v) => ({
    id: v.id,
    lat: v.lat,
    lng: v.lng,
    label: v.plate,
    detail: `${v.speed} km/h`,
    hue: statusHue(v.status),
    pulse: v.status === 'running' || v.status === 'overspeed',
  }));
  const fences = useMemo(() => fleet.fences.map(mapFence), [fleet.fences]);
  const filter = (
    <PillSelect
      icon="filter"
      label="Show vehicles"
      value={status}
      onChange={setStatus}
      options={[
        { value: 'all', label: 'All vehicles' },
        ...STATUS_ORDER.filter((s) => s !== 'ytt').map((s) => ({
          value: s,
          label: STATUS[s].label,
        })),
      ]}
    />
  );
  return (
    <Card
      icon="navigate"
      title="Real-Time Vehicle Tracking"
      subtitle="Track vehicle movements and status"
      actions={
        <>
          <IconButton
            icon="map"
            label="Map"
            active={view === 'map'}
            outlined
            onClick={() => setView('map')}
          />
          <IconButton
            icon="list"
            label="List"
            active={view === 'list'}
            outlined
            onClick={() => setView('list')}
          />
        </>
      }
    >
      {view === 'map' ? (
        <StreetMap
          label={`Live map of ${markers.length} vehicles`}
          markers={markers}
          fences={fences}
          height={320}
          overlay={filter}
          onSelect={onOpen ? () => onOpen() : undefined}
        />
      ) : (
        <>
          <Stack justify="flex-end">{filter}</Stack>
          <Table
            bare
            label="Vehicles now"
            rows={shown}
            onRowClick={onOpen ? () => onOpen() : undefined}
            columns={[
              {
                header: 'Vehicle',
                cell: (v) => (
                  <Stack gap={8} wrap={false}>
                    <VehiclePhoto category={v.category} size={30} />
                    <span>
                      <b>{v.callSign}</b>
                      <br />
                      {v.plate}
                    </span>
                  </Stack>
                ),
              },
              {
                header: 'Status',
                cell: (v) => <HueChip hue={statusHue(v.status)}>{STATUS[v.status].label}</HueChip>,
              },
              { header: 'Speed', cell: (v) => `${v.speed} km/h`, align: 'right' },
              { header: 'Location', cell: 'area' },
              { header: 'Updated', cell: (v) => ago(v.lastReport, fleet.now) },
            ]}
          />
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- Geofence Monitoring (Today)
export function GeofencePanel({ fleet }: { fleet: Fleet }) {
  const live = fleet.live.filter(reporting);
  const byId = new Map(live.map((v) => [v.id, v]));
  const zones = (t: string) => fleet.fences.filter((f) => f.zoneType === t);
  const pref = zones('Preferred');
  const restr = zones('Restricted');
  const mapped = (fs: typeof pref) =>
    [...new Set(fs.flatMap((f) => f.vehicleIds))]
      .map((id) => byId.get(id))
      .filter((v): v is LiveVehicle => !!v);
  const prefMapped = mapped(pref);
  const restrMapped = mapped(restr);
  const outsidePref = prefMapped.filter(
    (v) => !pref.some((f) => f.vehicleIds.includes(v.id) && fenceContains(f, v.lat, v.lng)),
  );
  const insideRestr = live.filter((v) => restr.some((f) => fenceContains(f, v.lat, v.lng)));
  const moves = (vs: LiveVehicle[], kind: 'geofence_entry' | 'geofence_exit') =>
    vs.reduce((n, v) => n + alertCount(v, fleet.now, kind), 0);
  const rows = [
    {
      key: 'pe',
      label: 'Preferred Zone Entries',
      icon: 'enter' as const,
      value: moves(prefMapped, 'geofence_entry'),
      hue: 'green' as Hue,
    },
    {
      key: 'px',
      label: 'Preferred Zone Exits',
      icon: 'out' as const,
      value: moves(prefMapped, 'geofence_exit'),
      hue: 'green' as Hue,
    },
    {
      key: 're',
      label: 'Restricted Zone Entries',
      icon: 'ban' as const,
      value: moves(restrMapped, 'geofence_entry'),
      hue: 'red' as Hue,
    },
    {
      key: 'rx',
      label: 'Restricted Zone Exits',
      icon: 'ban' as const,
      value: moves(restrMapped, 'geofence_exit'),
      hue: 'red' as Hue,
    },
  ];
  return (
    <Card
      icon="target"
      iconHue="purple"
      title="Geofence Monitoring (Today)"
      subtitle="Track vehicle movements across zones"
      actions={<Chip tone="green">Active Geofences - {fleet.fences.length}</Chip>}
    >
      <Stack gap={6} justify="flex-end">
        <Chip tone="blue">Preferred Zone - {pref.length}</Chip>
        <Chip tone="red">Restricted Zone - {restr.length}</Chip>
      </Stack>
      <AutoGrid min={120}>
        <CountTile
          icon="target"
          hue="purple"
          label="Preferred Zone Mapped Vehicles"
          value={prefMapped.length}
        />
        <CountTile
          icon="target"
          hue="red"
          label="Vehicle Outside Preferred Zone"
          value={outsidePref.length}
        />
        <CountTile
          icon="target"
          hue="purple"
          label="Restricted Zone Mapped Vehicles"
          value={restrMapped.length}
        />
        <CountTile
          icon="target"
          hue="red"
          label="Vehicle Inside Restricted Zone"
          value={insideRestr.length}
        />
      </AutoGrid>
      <BarList label="Zone entries and exits today" rows={rows} labelWidth={200} />
    </Card>
  );
}

// ---------------------------------------------------------------- Alert Summary
const PILL_HUES: Hue[] = ['green', 'blue', 'amber', 'teal', 'red', 'blue', 'amber', 'red'];

export function AlertSummaryPanel({ fleet }: { fleet: Fleet }) {
  const skip = new Set(fleet.live.filter((v) => !reporting(v)).map((v) => v.id));
  const yesterday = addDays(startOfDay(fleet.now), -1);
  const totals = (days: number) =>
    alertTotals(fleet.vehicles, yesterday, days, SUMMARY_ALERTS, skip);
  const [d1, d7, d30] = [totals(1), totals(7), totals(30)];
  const sum = (t: Record<string, number>) => SUMMARY_ALERTS.reduce((n, k) => n + (t[k] ?? 0), 0);
  type Row = { key: string; hue: Hue; y: number; w: number; m: number; total?: boolean };
  const rows: Row[] = [
    ...SUMMARY_ALERTS.map((k, i) => ({
      key: k,
      hue: PILL_HUES[i % PILL_HUES.length]!,
      y: d1[k] ?? 0,
      w: d7[k] ?? 0,
      m: d30[k] ?? 0,
    })),
    { key: 'total', hue: 'green', y: sum(d1), w: sum(d7), m: sum(d30), total: true },
  ];
  const cell = (pick: (r: Row) => number) => (r: Row) =>
    r.total ? <b>{num(pick(r))}</b> : <MetricPill hue={r.hue}>{num(pick(r))}</MetricPill>;
  return (
    <Card icon="warn" iconHue="red" title="Alert Summary" subtitle="Alerts over time by category">
      <Table
        bare
        label="Alerts by category"
        rows={rows}
        rowKey={(r) => r.key}
        columns={[
          {
            header: 'Category',
            cell: (r) =>
              r.total ? (
                <b>Total Alerts</b>
              ) : (
                <Stack gap={8} wrap={false}>
                  <IconTile
                    icon={ALERT[r.key as keyof typeof ALERT].icon}
                    hue={ALERT[r.key as keyof typeof ALERT].hue}
                    size="sm"
                  />
                  <b>{ALERT[r.key as keyof typeof ALERT].label}</b>
                </Stack>
              ),
          },
          { header: 'Yesterday', cell: cell((r) => r.y), width: '22%' },
          { header: 'Last 7 days', cell: cell((r) => r.w), width: '22%' },
          { header: 'Last 30 days', cell: cell((r) => r.m), width: '22%' },
        ]}
      />
    </Card>
  );
}

// ---------------------------------------------------------------- Vehicle Activity Overview
const PAGE = 8;
const hhmm = (h: number) =>
  `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;

export function ActivityPanel({ fleet }: { fleet: Fleet }) {
  const [daysAgo, setDaysAgo] = useState('1');
  const [group, setGroup] = useState('all');
  const [page, setPage] = useState(0);
  const groups = [...new Set(fleet.live.map((v) => v.group).filter((g): g is string => !!g))];
  const vehicles = fleet.live.filter((v) => group === 'all' || v.group === group);
  const pages = Math.max(1, Math.ceil(vehicles.length / PAGE));
  const p = Math.min(page, pages - 1);
  const start = startOfDay(fleet.now);
  const tabs = [0, 1, 2, 3, 4].map((d) => ({
    key: String(d),
    label: d === 0 ? 'Today' : d === 1 ? 'Yesterday' : shortDate(addDays(start, -d)),
  }));
  const rows = vehicles.slice(p * PAGE, p * PAGE + PAGE).map((v) => ({
    key: v.id,
    title: v.callSign,
    subtitle: v.plate,
    lead: <VehiclePhoto category={v.category} size={28} />,
    segments: fleet.day(v, Number(daysAgo)).segments.map((s) => ({
      from: s.from,
      to: s.to,
      hue: statusHue(s.status),
      title: `${STATUS[s.status].label} ${hhmm(s.from)}–${hhmm(s.to)}`,
    })),
  }));
  return (
    <Card
      icon="pulse"
      iconHue="blue"
      title="Vehicle Activity Overview"
      subtitle="Track vehicle movement and status"
      actions={
        <PillSelect
          icon="vehicles"
          label="Vehicles"
          value={group}
          onChange={(g) => {
            setGroup(g);
            setPage(0);
          }}
          options={[
            { value: 'all', label: 'All Vehicles' },
            ...groups.map((g) => ({ value: g, label: g })),
          ]}
        />
      }
    >
      <Stack justify="space-between" wrap>
        <Tabs label="Day" tabs={tabs} value={daysAgo} onChange={setDaysAgo} />
        <Legend items={STATUS_ORDER.map((s) => ({ label: STATUS[s].label, hue: STATUS[s].hue }))} />
      </Stack>
      {vehicles.length ? (
        <ActivityTimeline
          label="Vehicle activity by hour"
          rows={rows}
          ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]}
        />
      ) : (
        <EmptyState title="No vehicles in this group" />
      )}
      <Stack justify="space-between">
        <Stack gap={6}>
          <IconButton
            icon="up"
            label="Previous vehicles"
            disabled={p === 0}
            onClick={() => setPage(p - 1)}
          />
          <IconButton
            icon="down"
            label="More vehicles"
            disabled={p >= pages - 1}
            onClick={() => setPage(p + 1)}
          />
        </Stack>
        <Chip>
          Showing {vehicles.length ? p * PAGE + 1 : 0}–{Math.min(vehicles.length, (p + 1) * PAGE)}{' '}
          of {vehicles.length}
        </Chip>
      </Stack>
    </Card>
  );
}

// ---------------------------------------------------------------- Odometer Summary
export function OdometerPanel({ fleet }: { fleet: Fleet }) {
  const live = fleet.live;
  const odo = live.map((v) => v.odometer);
  const max = Math.max(0, ...odo);
  const step = Math.max(10_000, Math.ceil(max / 6 / 10_000) * 10_000);
  const buckets = Math.max(1, Math.ceil((max + 1) / step));
  const values = [...Array(buckets)].map(
    (_, i) => odo.filter((o) => o >= i * step && o < (i + 1) * step).length,
  );
  const labels = values.map((_, i) => `${(i * step) / 1000}k–${((i + 1) * step) / 1000}k`);
  const ytt = live.filter((v) => !reporting(v)).length;
  return (
    <Card
      icon="gauge"
      title="Odometer Summary"
      subtitle="Distribution of vehicles by odometer reading"
      actions={<Chip>Yet to Transmit: {ytt}</Chip>}
    >
      <AutoGrid min={140}>
        <MiniStat icon="vehicles" value={live.length} label="Total Vehicles" />
        <MiniStat
          icon="gauge"
          value={num(odo.length ? odo.reduce((a, b) => a + b, 0) / odo.length : 0)}
          unit="km"
          label="Avg. Odometer"
        />
        <MiniStat
          icon="arrowdown"
          hue="blue"
          value={num(odo.length ? Math.min(...odo) : 0)}
          unit="km"
          label="Lowest"
        />
        <MiniStat icon="arrowup" hue="orange" value={num(max)} unit="km" label="Highest" />
      </AutoGrid>
      <BarChart
        values={values}
        labels={labels}
        label="Vehicles by odometer range (km)"
        highlight={values.indexOf(Math.max(...values))}
      />
    </Card>
  );
}

// ---------------------------------------------------------------- Speedometer Summary
const SPEED_BANDS: [number, number][] = [
  [0, 20],
  [20, 40],
  [40, 60],
  [60, 80],
  [80, 100],
  [100, 120],
  [120, Infinity],
];

export function SpeedPanel({ fleet }: { fleet: Fleet }) {
  const [period, setPeriod] = useState<Period>('yesterday');
  const speeds = fleet.live
    .filter(reporting)
    .map((v) => periodStats(fleet, v, period).maxSpeed)
    .filter((s) => s > 0);
  return (
    <Card
      icon="gauge"
      iconHue="orange"
      title="Speedometer Summary"
      subtitle="Vehicles by highest recorded speed (km/h)"
      actions={<PeriodSelect value={period} onChange={setPeriod} />}
    >
      <BarList
        label="Vehicles by highest recorded speed"
        labelWidth={110}
        max={Math.max(1, speeds.length)}
        rows={SPEED_BANDS.map(([a, b]) => ({
          key: String(a),
          icon: 'gauge' as const,
          label: b === Infinity ? `${a}+` : `${a}–${b}`,
          value: speeds.filter((s) => s >= a && s < b).length,
          hue: (a >= 80 ? 'red' : 'orange') as Hue,
        }))}
      />
    </Card>
  );
}

// ---------------------------------------------------------------- Distribution Summary
export function DistributionPanel({ fleet }: { fleet: Fleet }) {
  const [period, setPeriod] = useState<Period>('yesterday');
  const live = fleet.live.filter(reporting);
  const totals = { running: 0, idle: 0, stopped: 0, towed: 0 };
  for (const v of live) {
    const h = periodStats(fleet, v, period).hours;
    totals.running += h.running + h.overspeed;
    totals.idle += h.idle;
    totals.stopped += h.stopped;
    totals.towed += h.towed;
  }
  const all = totals.running + totals.idle + totals.stopped + totals.towed;
  const tiles: { key: keyof typeof totals; status: VehicleStatus }[] = [
    { key: 'running', status: 'running' },
    { key: 'idle', status: 'idle' },
    { key: 'stopped', status: 'stopped' },
    { key: 'towed', status: 'towed' },
  ];
  return (
    <Card
      icon="pie"
      iconHue="amber"
      title="Distribution Summary"
      subtitle="Time spent in each status"
      actions={<PeriodSelect value={period} onChange={setPeriod} />}
    >
      <Stack gap={16} wrap>
        <MiniStat icon="clock" value={hm(all)} label="Total tracked time" />
        <MiniStat icon="vehicles" value={live.length} label="Vehicles reporting" />
      </Stack>
      <AutoGrid min={110}>
        {tiles.map((t) => (
          <ShareTile
            key={t.key}
            label={STATUS[t.status].label}
            icon={STATUS[t.status].icon}
            hue={STATUS[t.status].hue}
            chip={hm(totals[t.key])}
            percent={all ? (totals[t.key] / all) * 100 : 0}
          />
        ))}
      </AutoGrid>
    </Card>
  );
}

// ---------------------------------------------------------------- Unused Vehicle Summary
const UNUSED_BANDS: [number, number, string, Hue][] = [
  [48, Infinity, '48+ hrs', 'red'],
  [24, 48, '24–48 hrs', 'red'],
  [20, 24, '20–24 hrs', 'orange'],
  [16, 20, '16–20 hrs', 'orange'],
  [12, 16, '12–16 hrs', 'purple'],
  [8, 12, '8–12 hrs', 'blue'],
  [4, 8, '4–8 hrs', 'teal'],
  [1, 4, '1–4 hrs', 'amber'],
];

export function UnusedPanel({ fleet }: { fleet: Fleet }) {
  const hours = fleet.live.map((v) => v.unusedHours).filter((h): h is number => h != null);
  return (
    <Card
      icon="clock"
      iconHue="red"
      title="Unused Vehicle Summary"
      subtitle="Time since each vehicle last moved"
    >
      <AutoGrid min={110}>
        {UNUSED_BANDS.map(([a, b, label, hue]) => (
          <CountTile
            key={label}
            icon="clock"
            hue={hue}
            label={label}
            value={hours.filter((h) => h >= a && h < b).length}
            unit="Vehicles"
          />
        ))}
      </AutoGrid>
    </Card>
  );
}

// ---------------------------------------------------------------- Top 10 lists
export function TopDistancePanel({ fleet }: { fleet: Fleet }) {
  const [period, setPeriod] = useState<Period>('yesterday');
  const top = fleet.live
    .filter(reporting)
    .map((v) => ({ v, s: periodStats(fleet, v, period) }))
    .filter((x) => x.s.km > 0)
    .sort((a, b) => b.s.km - a.s.km)
    .slice(0, 10);
  return (
    <Card
      icon="trophy"
      title="Top 10 Distance Vehicles"
      subtitle="Vehicles that drove the furthest"
      actions={<PeriodSelect value={period} onChange={setPeriod} />}
    >
      {top.length ? (
        <PagedRow
          label="Vehicles that drove the furthest"
          items={top.map(({ v, s }, i) => (
            <RankCard
              key={v.id}
              rank={i + 1}
              value={num(s.km)}
              unit="km"
              picture={<VehiclePhoto category={v.category} size={72} />}
              title={v.plate}
              subtitle={vehicleName(v)}
              hue="blue"
            />
          ))}
        />
      ) : (
        <EmptyState title="No trips in this period" />
      )}
    </Card>
  );
}

export function TopOverspeedPanel({ fleet }: { fleet: Fleet }) {
  const [period, setPeriod] = useState<Period>('yesterday');
  const top = fleet.live
    .filter(reporting)
    .map((v) => ({ v, s: periodStats(fleet, v, period) }))
    .filter((x) => x.s.overspeeds > 0)
    .sort((a, b) => b.s.maxSpeed - a.s.maxSpeed)
    .slice(0, 10);
  return (
    <Card
      icon="gauge"
      iconHue="red"
      title="Top 10 Overspeed Vehicles"
      subtitle="Vehicles with the highest speed over their limit"
      actions={<PeriodSelect value={period} onChange={setPeriod} />}
    >
      {top.length ? (
        <PagedRow
          label="Vehicles with the highest overspeed"
          items={top.map(({ v, s }, i) => (
            <RankCard
              key={v.id}
              rank={i + 1}
              caption="Max speed"
              value={s.maxSpeed}
              unit="km/h"
              picture={<VehiclePhoto category={v.category} size={72} />}
              title={v.plate}
              subtitle={`Limit ${v.speedLimit} km/h`}
              footer={`Occurrences: ${s.overspeeds}`}
              hue="red"
            />
          ))}
        />
      ) : (
        <EmptyState title="No overspeeding in this period" />
      )}
    </Card>
  );
}

export function TopUnusedPanel({ fleet }: { fleet: Fleet }) {
  const top = [...fleet.live]
    .filter((v) => v.unusedHours == null || v.unusedHours > 0)
    .sort((a, b) => (b.unusedHours ?? Infinity) - (a.unusedHours ?? Infinity))
    .slice(0, 10);
  return (
    <Card
      icon="clock"
      iconHue="blue"
      title="Top 10 Unused Vehicles"
      subtitle="Vehicles that haven't moved for the longest time"
    >
      {top.length ? (
        <PagedRow
          label="Vehicles unused for the longest time"
          items={top.map((v, i) => (
            <RankCard
              key={v.id}
              rank={i + 1}
              caption="Unused for"
              value={v.unusedHours == null ? '—' : hm(v.unusedHours)}
              picture={<VehiclePhoto category={v.category} size={72} />}
              title={v.plate}
              subtitle={vehicleName(v)}
              footer={`Last report: ${ago(v.lastReport, fleet.now)}`}
              hue="blue"
            />
          ))}
        />
      ) : (
        <EmptyState title="Every vehicle is moving" />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- Top Drivers
const scoreLabel = (s: number): [string, 'green' | 'blue' | 'amber' | 'red'] =>
  s >= 90
    ? ['Very Good', 'green']
    : s >= 80
      ? ['Good', 'blue']
      : s >= 70
        ? ['Fair', 'amber']
        : ['Needs coaching', 'red'];

export function TopDriversPanel({ fleet }: { fleet: Fleet }) {
  const [period, setPeriod] = useState<Period>('yesterday');
  const drivers = new Map<string, { hours: number; braking: number; overspeed: number }>();
  for (const v of fleet.live.filter((x) => reporting(x) && x.operator)) {
    const s = periodStats(fleet, v, period);
    const d = drivers.get(v.operator!) ?? { hours: 0, braking: 0, overspeed: 0 };
    d.hours += s.hours.running + s.hours.overspeed;
    d.overspeed += s.overspeeds;
    for (const n of DAYS[period])
      d.braking += alertCount(v, addDays(startOfDay(fleet.now), -n), 'harsh_braking');
    drivers.set(v.operator!, d);
  }
  const rows = [...drivers]
    .map(([name, d]) => ({
      name,
      ...d,
      score: Math.max(0, Math.min(100, Math.round(100 - d.braking * 2 - d.overspeed * 3))),
    }))
    .sort((a, b) => b.score - a.score || b.hours - a.hours);
  return (
    <Card
      icon="users"
      iconHue="blue"
      title="Top Drivers"
      subtitle="Ranked by safety score"
      actions={<PeriodSelect value={period} onChange={setPeriod} />}
    >
      <Table
        bare
        label="Drivers by safety score"
        rows={rows}
        rowKey={(r) => r.name}
        empty="No operators assigned to vehicles yet."
        columns={[
          {
            header: 'Rank',
            cell: (r) => <RankBadge rank={rows.indexOf(r) + 1} size={24} />,
            width: 56,
          },
          {
            header: 'Driver',
            cell: (r) => (
              <Stack gap={8} wrap={false}>
                <Avatar name={r.name} size={28} />
                <b>{r.name}</b>
              </Stack>
            ),
          },
          { header: 'Driving hours', cell: (r) => hm(r.hours), align: 'right' },
          { header: 'Harsh braking', cell: 'braking', align: 'right' },
          { header: 'Overspeed', cell: 'overspeed', align: 'right' },
          {
            header: 'Safety score',
            align: 'right',
            cell: (r) => {
              const [label, hue] = scoreLabel(r.score);
              return (
                <Stack gap={6} justify="flex-end" wrap={false}>
                  <b>{r.score}%</b>
                  <HueChip hue={hue}>{label}</HueChip>
                </Stack>
              );
            },
          },
        ]}
      />
    </Card>
  );
}

// ---------------------------------------------------------------- Top Performing Vehicles
const utilLabel = (s: number): [string, 'green' | 'blue' | 'amber' | 'red'] =>
  s >= 75
    ? ['Very Good', 'green']
    : s >= 60
      ? ['Good', 'blue']
      : s >= 40
        ? ['Fair', 'amber']
        : ['Low', 'red'];

export function TopPerformingPanel({ fleet }: { fleet: Fleet }) {
  const [period, setPeriod] = useState<Period>('yesterday');
  const rows = fleet.live
    .filter(reporting)
    .map((v) => {
      const h = periodStats(fleet, v, period).hours;
      const running = h.running + h.overspeed;
      const used = running + h.idle + h.stopped;
      return {
        v,
        running,
        idle: h.idle,
        stopped: h.stopped,
        towed: h.towed,
        score: used ? (running / used) * 100 : 0,
      };
    })
    .filter((r) => r.running > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  return (
    <Card
      icon="trophy"
      iconHue="blue"
      title="Top Performing Vehicles"
      subtitle="Ranked by utilisation (time running ÷ time in use)"
      actions={<PeriodSelect value={period} onChange={setPeriod} />}
    >
      <Table
        bare
        label="Vehicles by utilisation"
        rows={rows}
        rowKey={(r) => r.v.id}
        empty="No vehicle drove in this period."
        columns={[
          {
            header: 'Rank',
            cell: (r) => <RankBadge rank={rows.indexOf(r) + 1} size={24} />,
            width: 56,
          },
          {
            header: 'Vehicle',
            cell: (r) => (
              <Stack gap={8} wrap={false}>
                <VehiclePhoto category={r.v.category} size={32} />
                <span>
                  <b>{r.v.plate}</b>
                  <br />
                  {vehicleName(r.v)}
                </span>
              </Stack>
            ),
          },
          { header: 'Running', cell: (r) => hm(r.running), align: 'right' },
          { header: 'Idle', cell: (r) => hm(r.idle), align: 'right' },
          { header: 'Stopped', cell: (r) => hm(r.stopped), align: 'right' },
          { header: 'Towed', cell: (r) => hm(r.towed), align: 'right' },
          {
            header: 'Utilisation',
            align: 'right',
            cell: (r) => {
              const s = Math.round(r.score);
              const [label, hue] = utilLabel(s);
              return (
                <Stack gap={6} justify="flex-end" wrap={false}>
                  <b>{s}%</b>
                  <HueChip hue={hue}>{label}</HueChip>
                </Stack>
              );
            },
          },
        ]}
      />
    </Card>
  );
}
