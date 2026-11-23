// Centralized Tracking of the approved GPS Vehicle Tracking design
// (Desktop/vs/Centralized-Tracking.html): every vehicle on one large map. Live: status chips
// with counts filter the map, "Vehicle Filters" narrows it by people, type and vehicle, and the
// vehicle cards can be shown under the map. History: pick up to 6 vehicles and a day in the last
// 7, then replay their routes together. Vehicles, people and geofences are real; positions,
// statuses and routes are demo activity (labelled).
import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  FilterChip,
  HueChip,
  IconButton,
  ListCard,
  Loading,
  MapToolButton,
  Note,
  PagedRow,
  Stack,
  StreetMap,
  Tabs,
  type MapMarker,
} from '@iotify/ui';
import { VehiclePhoto } from '@iotify/illustrations';
import { useOperators, useUsers, useVehicleDetails } from '@iotify/data';
import { DemoNote, type ScreenContext } from '@iotify/app-kit';
import { dayKey } from '../../demo/fleet';
import { mapFence, useFleet } from '../../shared/useFleet';
import { STATUS, STATUS_ORDER, type VehicleStatus } from '../../shared/vehicle-status';
import { ago } from '../../shared/format';
import {
  HistoryDrawer,
  LiveFilterModal,
  NO_LIVE_FILTER,
  liveFilterOn,
  passes,
  type HistoryPick,
  type LiveFilter,
  type Option,
  type PeopleChoices,
  type VehicleInfo,
} from './filters';
import { HistoryReplay } from './HistoryReplay';
import { MAX_REPLAY } from './replay';

/** The map fills the window below the toolbar. */
const FILL = 'calc(100vh - 150px)';
const byLabel = (a: Option, b: Option) => a.label.localeCompare(b.label);

export default function CentralizedTrackingScreen(ctx: ScreenContext) {
  const fleet = useFleet(ctx);
  const on = { enabled: !!ctx.companyId };
  const details = useVehicleDetails(undefined, on);
  const users = useUsers({ account_id: ctx.companyId }, on);
  const operators = useOperators({ company_id: ctx.companyId }, on);

  const [mode, setMode] = useState<'live' | 'history'>('live');
  const [status, setStatus] = useState<'all' | VehicleStatus>('all');
  const [filter, setFilter] = useState<LiveFilter>(NO_LIVE_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [cards, setCards] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [pick, setPick] = useState<HistoryPick>(() => ({
    vehicles: [],
    day: dayKey(new Date()),
  }));
  const [historyOpen, setHistoryOpen] = useState(false);
  const fences = useMemo(() => fleet.fences.map(mapFence), [fleet.fences]);

  const info = useMemo(
    () =>
      new Map<string, VehicleInfo>(
        (details.data ?? []).map((d) => [
          d.asset_id,
          {
            fleetManagerId: d.fleet_manager_id ?? null,
            supervisorId: d.supervisor_id ?? null,
            operatorId: d.operator_id ?? null,
            vehicleType: d.vehicle_type ?? null,
          },
        ]),
      ),
    [details.data],
  );
  const choices = useMemo<PeopleChoices>(() => {
    const mine = fleet.vehicles.map((v) => info.get(v.id)).filter((x): x is VehicleInfo => !!x);
    const userName = new Map((users.data ?? []).map((u) => [u.id, u.name ?? u.id]));
    const opName = new Map((operators.data ?? []).map((o) => [o.id, o.name]));
    const people = (ids: (string | null)[], names: Map<string, string>) =>
      [...new Set(ids.filter((x): x is string => !!x))]
        .map((id) => ({ value: id, label: names.get(id) ?? id }))
        .sort(byLabel);
    return {
      fleetManagers: people(
        mine.map((m) => m.fleetManagerId),
        userName,
      ),
      supervisors: people(
        mine.map((m) => m.supervisorId),
        userName,
      ),
      operators: people(
        mine.map((m) => m.operatorId),
        opName,
      ),
      vehicleTypes: [...new Set(mine.map((m) => m.vehicleType).filter((x): x is string => !!x))]
        .sort()
        .map((t) => ({ value: t, label: t })),
    };
  }, [fleet.vehicles, info, users.data, operators.data]);

  const loadError = details.error ?? users.error ?? operators.error;
  if (fleet.error || loadError)
    return <Note tone="red">{fleet.error ?? String((loadError as Error).message)}</Note>;
  if (fleet.loading || !details.data || !users.data || !operators.data)
    return <Loading>Loading vehicles…</Loading>;
  if (!fleet.live.length)
    return (
      <EmptyState title="No vehicles yet" icon="vehicles">
        Vehicles appear here once your dealer adds them to {ctx.companyName}.
      </EmptyState>
    );

  const inFilter = fleet.live.filter((v) => passes(v, info.get(v.id), filter));
  const count = (s: VehicleStatus) => inFilter.filter((v) => v.status === s).length;
  const shown = inFilter.filter((v) => status === 'all' || v.status === status);
  const onMap = shown.filter((v) => v.status !== 'ytt');
  const markers: MapMarker[] = onMap.map((v) => ({
    id: v.id,
    lat: v.lat,
    lng: v.lng,
    label: v.plate,
    detail: `${v.speed} km/h`,
    hue: STATUS[v.status].hue,
    pulse: v.status === 'running' || v.status === 'overspeed',
  }));
  const reported = fleet.live.filter((v) => v.status !== 'ytt');
  const filtersOn = liveFilterOn(filter);
  const clear = () => {
    if (mode === 'live') {
      setStatus('all');
      setFilter(NO_LIVE_FILTER);
      setSelected(null);
    } else setPick({ vehicles: [], day: dayKey(fleet.now) });
  };
  const nothingToClear =
    mode === 'live' ? status === 'all' && !filtersOn && !selected : !pick.vehicles.length;

  return (
    <Stack dir="col" gap={10} align="stretch">
      <Card>
        <Stack justify="space-between" gap={10} wrap>
          <Stack gap={8} wrap>
            <Tabs
              label="Live or history"
              value={mode}
              onChange={setMode}
              tabs={[
                { key: 'live', label: 'Live' },
                { key: 'history', label: 'History' },
              ]}
            />
            {mode === 'live' && (
              <>
                <FilterChip
                  label="All"
                  count={inFilter.length}
                  hue="slate"
                  active={status === 'all'}
                  onClick={() => setStatus('all')}
                />
                {STATUS_ORDER.map((s) => (
                  <FilterChip
                    key={s}
                    label={STATUS[s].short}
                    count={count(s)}
                    hue={STATUS[s].hue}
                    title={`${STATUS[s].label}: ${STATUS[s].hint}`}
                    active={status === s}
                    onClick={() => setStatus(status === s ? 'all' : s)}
                  />
                ))}
              </>
            )}
            {mode === 'history' && pick.vehicles.length > 0 && (
              <HueChip hue="green" icon="vehicles">
                {pick.vehicles.length} of {MAX_REPLAY} vehicles
              </HueChip>
            )}
          </Stack>
          <Stack gap={8}>
            {mode === 'live' && (
              <IconButton
                icon="list"
                label={cards ? 'Hide vehicle cards' : 'Show vehicle cards'}
                outlined
                active={cards}
                onClick={() => setCards(!cards)}
              />
            )}
            <IconButton
              icon="filter"
              label={mode === 'live' ? 'Vehicle filters' : 'History filter'}
              outlined
              active={mode === 'live' ? filtersOn : pick.vehicles.length > 0}
              onClick={() => (mode === 'live' ? setFilterOpen(true) : setHistoryOpen(true))}
            />
            <Button icon="refresh" variant="ghost" onClick={clear} disabled={nothingToClear}>
              Clear
            </Button>
          </Stack>
        </Stack>
      </Card>

      {mode === 'live' ? (
        <StreetMap
          label={`Live map of ${markers.length} vehicles`}
          markers={markers}
          fences={fences}
          labels
          wheelZoom
          selected={selected}
          onSelect={(id) => setSelected(id === selected ? null : id)}
          fitKey={`${status}|${JSON.stringify(filter)}`}
          height={FILL}
          overlay={
            <>
              <Chip tone="amber">Demo activity</Chip>
              {filtersOn && <Chip tone="green">Filtered: {inFilter.length} vehicles</Chip>}
            </>
          }
          tools={
            <MapToolButton
              icon={cards ? 'down' : 'up'}
              label={cards ? 'Hide vehicle cards' : 'Show vehicle cards'}
              active={cards}
              onClick={() => setCards(!cards)}
            />
          }
          footer={
            cards ? (
              <Card>
                {shown.length ? (
                  <PagedRow
                    label="Vehicle cards"
                    perPage={5}
                    items={shown.map((v) => (
                      <ListCard
                        key={v.id}
                        selected={v.id === selected}
                        onClick={() => setSelected(v.id === selected ? null : v.id)}
                        lead={<VehiclePhoto category={v.category} size={40} />}
                        title={v.plate}
                        subtitle={
                          v.status === 'ytt'
                            ? 'No report yet'
                            : `Speed: ${v.speed} km/h · ${ago(v.lastReport, fleet.now)}`
                        }
                        chips={
                          <HueChip hue={STATUS[v.status].hue} solid>
                            {STATUS[v.status].label}
                          </HueChip>
                        }
                      />
                    ))}
                  />
                ) : (
                  <span>No vehicles match.</span>
                )}
              </Card>
            ) : undefined
          }
        />
      ) : pick.vehicles.length ? (
        <HistoryReplay fleet={fleet} pick={pick} height={FILL} />
      ) : (
        <Card>
          <EmptyState
            icon="clock"
            title="Pick vehicles to replay their history"
            action={
              <Button variant="primary" icon="filter" onClick={() => setHistoryOpen(true)}>
                Open history filter
              </Button>
            }
          >
            Choose up to {MAX_REPLAY} vehicles and a day in the last 7 days in the History filter.
          </EmptyState>
        </Card>
      )}

      <DemoNote companyName={ctx.companyName} count={fleet.live.length} />

      <LiveFilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filter}
        onApply={(f) => {
          setFilter(f);
          setSelected(null);
        }}
        vehicles={fleet.live}
        info={info}
        choices={choices}
      />
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        value={pick}
        onApply={setPick}
        vehicles={reported}
        now={fleet.now}
      />
    </Stack>
  );
}
