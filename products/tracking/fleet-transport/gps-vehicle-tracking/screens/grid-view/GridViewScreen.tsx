// Grid View of the approved GPS Vehicle Tracking design (Desktop/vs/Grid-View.html): the
// "Vehicle Filters" panel on the left; on the right the Vehicle Status Summary (a tile filters
// by status) and every vehicle as a card or a list row, with search, filters and sort.
// Vehicles, operators, people, geofences and groups are real; positions, statuses and readings
// are demo activity (labelled).
import { useMemo, useState } from 'react';
import {
  ActionIcon,
  AutoGrid,
  Button,
  Card,
  Chip,
  DataGrid,
  EmptyState,
  HueChip,
  IconButton,
  Loading,
  Note,
  Pager,
  PillSelect,
  SearchBar,
  SearchInput,
  SideLayout,
  Stack,
  StatusTile,
  StatusTileRow,
  type GridColumn,
} from '@iotify/ui';
import { VehiclePhoto } from '@iotify/illustrations';
import { useOperators, useUsers, useVehicleDetails } from '@iotify/data';
import { DemoNote, type ScreenContext } from '@iotify/app-kit';
import { fenceContains, useFleet } from '../../shared/useFleet';
import { STATUS, STATUS_ORDER, type VehicleStatus } from '../../shared/vehicle-status';
import { dateText, km, pct } from '../../shared/format';
import { telemetry } from './telemetry';
import {
  matches,
  NO_FILTERS,
  NO_GROUP,
  searchRows,
  SORTS,
  sortRows,
  type Filters,
  type GridRow,
  type SortKey,
} from './filters';
import { FilterSidebar, type FilterChoices, type Option } from './FilterSidebar';
import { Indicators, VehicleCard, speedHue } from './VehicleCard';

const PAGE = 12;
const byLabel = (a: Option, b: Option) => a.label.localeCompare(b.label);

export default function GridViewScreen(ctx: ScreenContext) {
  const fleet = useFleet(ctx);
  const on = { enabled: !!ctx.companyId };
  const details = useVehicleDetails(undefined, on);
  const users = useUsers({ account_id: ctx.companyId }, on);
  const operators = useOperators({ company_id: ctx.companyId }, on);

  // On phones the filters start closed, so the vehicles come first.
  const [panelOpen, setPanelOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 900,
  );
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('vehicle');
  const [status, setStatus] = useState<'all' | VehicleStatus>('all');
  const [draft, setDraft] = useState<Filters>(NO_FILTERS);
  const [applied, setApplied] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(0);
  const [flipped, setFlipped] = useState<string | null>(null);

  // Every vehicle with its demo readings and its real people and geofences.
  const rows = useMemo<GridRow[]>(() => {
    const byId = new Map((details.data ?? []).map((d) => [d.asset_id, d]));
    return fleet.live.map((v) => {
      const d = byId.get(v.id);
      return {
        v,
        t: telemetry(v, fleet.now),
        fleetManagerId: d?.fleet_manager_id ?? null,
        supervisorId: d?.supervisor_id ?? null,
        operatorId: d?.operator_id ?? null,
        vehicleType: d?.vehicle_type ?? null,
        fenceIds:
          v.status === 'ytt'
            ? []
            : fleet.fences.filter((f) => fenceContains(f, v.lat, v.lng)).map((f) => f.id),
      };
    });
  }, [fleet.live, fleet.now, fleet.fences, details.data]);

  const choices = useMemo<FilterChoices>(() => {
    const userName = new Map((users.data ?? []).map((u) => [u.id, u.name ?? u.id]));
    const opName = new Map((operators.data ?? []).map((o) => [o.id, o.name]));
    const people = (ids: (string | null)[], names: Map<string, string>): Option[] =>
      [...new Set(ids.filter((x): x is string => !!x))]
        .map((id) => ({ value: id, label: names.get(id) ?? id }))
        .sort(byLabel);
    const groups = new Map<string, number>();
    for (const r of rows)
      groups.set(r.v.group ?? NO_GROUP, (groups.get(r.v.group ?? NO_GROUP) ?? 0) + 1);
    return {
      fleetManagers: people(
        rows.map((r) => r.fleetManagerId),
        userName,
      ),
      supervisors: people(
        rows.map((r) => r.supervisorId),
        userName,
      ),
      operators: people(
        rows.map((r) => r.operatorId),
        opName,
      ),
      geofences: fleet.fences
        .map((f) => ({ value: f.id, label: `${f.name} · ${f.zoneType}` }))
        .sort(byLabel),
      vehicleTypes: [...new Set(rows.map((r) => r.vehicleType).filter((x): x is string => !!x))]
        .sort()
        .map((t) => ({ value: t, label: t })),
      groups: [...groups]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [rows, users.data, operators.data, fleet.fences]);

  const error =
    fleet.error ??
    ((details.error ?? users.error ?? operators.error)
      ? String(((details.error ?? users.error ?? operators.error) as Error).message)
      : null);
  if (error) return <Note tone="red">{error}</Note>;
  if (fleet.loading || !details.data || !users.data || !operators.data)
    return <Loading>Loading vehicles…</Loading>;
  if (!fleet.live.length)
    return (
      <EmptyState title="No vehicles yet" icon="vehicles">
        Vehicles appear here once your dealer adds them to {ctx.companyName}.
      </EmptyState>
    );

  const filtered = rows.filter((r) => matches(r, applied));
  const shown = sortRows(
    searchRows(filtered, q).filter((r) => status === 'all' || r.v.status === status),
    sort,
  );
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const p = Math.min(page, pages - 1);
  const go = ctx.onNavigate;
  const reset = () => {
    setDraft(NO_FILTERS);
    setApplied(NO_FILTERS);
    setPage(0);
  };
  const n = filtered.length;
  const count = (s: VehicleStatus) => filtered.filter((r) => r.v.status === s).length;
  const pickStatus = (s: 'all' | VehicleStatus) => {
    setStatus(status === s ? 'all' : s);
    setPage(0);
  };

  const columns: GridColumn<GridRow>[] = [
    {
      key: 'vehicle',
      header: 'Vehicle',
      value: (r) => `${r.v.callSign} ${r.v.plate}`,
      width: 170,
      cell: (r) => (
        <Stack gap={8} wrap={false}>
          <VehiclePhoto category={r.v.category} size={30} />
          <span>
            <b>{r.v.callSign}</b>
            <br />
            {r.v.plate}
          </span>
        </Stack>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      value: (r) => STATUS[r.v.status].label,
      cell: (r) => (
        <HueChip hue={STATUS[r.v.status].hue} solid>
          {STATUS[r.v.status].label}
        </HueChip>
      ),
    },
    {
      key: 'ind',
      header: 'Indicators',
      value: () => '',
      filter: false,
      width: 250,
      cell: (r) => <Indicators v={r.v} t={r.t} bare />,
    },
    { key: 'op', header: 'Operator', value: (r) => r.v.operator ?? 'Not Assigned' },
    {
      key: 'speed',
      header: 'Speed',
      value: (r) => (r.v.status === 'ytt' ? null : r.v.speed),
      align: 'right',
      cell: (r) =>
        r.v.status === 'ytt' ? (
          '—'
        ) : speedHue(r.v) ? (
          <HueChip hue={speedHue(r.v)!}>{r.v.speed} km/h</HueChip>
        ) : (
          `${r.v.speed} km/h`
        ),
    },
    { key: 'loc', header: 'Location', value: (r) => (r.v.status === 'ytt' ? null : r.v.area) },
    {
      key: 'odo',
      header: 'Odometer',
      value: (r) => r.v.odometer,
      align: 'right',
      cell: (r) => km(r.v.odometer),
    },
  ];

  return (
    <Stack dir="col" gap={12} align="stretch">
      <SideLayout
        sticky
        sideWidth={300}
        side={
          <FilterSidebar
            draft={draft}
            onDraft={setDraft}
            applied={applied}
            choices={choices}
            collapsed={!panelOpen}
            onCollapsedChange={(c) => setPanelOpen(!c)}
            onReset={reset}
            onSubmit={() => {
              setApplied(draft);
              setPage(0);
            }}
          />
        }
      >
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
            <StatusTile
              label="All"
              value={n}
              sub="Total Vehicles"
              icon="vehicles"
              hue="slate"
              active={status === 'all'}
              onClick={() => pickStatus('all')}
            />
            {STATUS_ORDER.map((s) => (
              <StatusTile
                key={s}
                label={STATUS[s].label}
                value={count(s)}
                sub={`${pct(count(s), n)} of total`}
                icon={STATUS[s].icon}
                hue={STATUS[s].hue}
                active={status === s}
                onClick={() => pickStatus(s)}
              />
            ))}
          </StatusTileRow>
        </Card>
        <Card
          icon="vehicles"
          title="Vehicles"
          subtitle="Live status, location and telemetry of every vehicle"
          actions={
            <>
              <IconButton
                icon="grid"
                label="Grid"
                outlined
                active={view === 'grid'}
                onClick={() => setView('grid')}
              />
              <IconButton
                icon="list"
                label="List"
                outlined
                active={view === 'list'}
                onClick={() => setView('list')}
              />
            </>
          }
        >
          <SearchBar
            search={
              <SearchInput
                value={q}
                onChange={(x) => {
                  setQ(x);
                  setPage(0);
                }}
                placeholder="Search vehicles…"
              />
            }
          >
            <Button
              icon="filter"
              variant={panelOpen ? 'primary' : 'default'}
              aria-pressed={panelOpen}
              onClick={() => setPanelOpen(!panelOpen)}
            >
              Filters
            </Button>
            <PillSelect
              icon="sliders"
              label="Sort by"
              value={sort}
              onChange={setSort}
              options={SORTS}
            />
          </SearchBar>
          {status !== 'all' && (
            <Stack gap={6}>
              <HueChip hue={STATUS[status].hue}>Showing {STATUS[status].label} only</HueChip>
              <Button size="sm" variant="ghost" icon="close" onClick={() => setStatus('all')}>
                Show all
              </Button>
            </Stack>
          )}
          {view === 'grid' ? (
            shown.length ? (
              <>
                <AutoGrid min={290} gap={14}>
                  {shown.slice(p * PAGE, p * PAGE + PAGE).map((r) => (
                    <VehicleCard
                      key={r.v.id}
                      v={r.v}
                      t={r.t}
                      now={fleet.now}
                      flipped={flipped === r.v.id}
                      onFlip={(f) => setFlipped(f ? r.v.id : null)}
                      go={go}
                      readOnly={ctx.readOnly}
                    />
                  ))}
                </AutoGrid>
                <Pager
                  page={p}
                  pageSize={PAGE}
                  total={shown.length}
                  onPage={setPage}
                  label="Vehicle pages"
                />
              </>
            ) : (
              <EmptyState
                title="No vehicles match"
                icon="search"
                action={
                  <Button
                    icon="refresh"
                    onClick={() => {
                      reset();
                      setQ('');
                      setStatus('all');
                    }}
                  >
                    Clear filters
                  </Button>
                }
              >
                Change the search or the filters to see more vehicles.
              </EmptyState>
            )
          ) : (
            <DataGrid
              label="Vehicles"
              rows={shown}
              rowKey={(r) => r.v.id}
              columns={columns}
              freeze
              noGrouping
              pageSize={20}
              empty="No vehicles match the search or the filters."
              actions={(r) => (
                <ActionIcon
                  icon="eye"
                  hue="slate"
                  label={`Vehicle details: ${r.v.callSign} (Tracking)`}
                  onClick={go ? () => go('tracking') : undefined}
                />
              )}
            />
          )}
        </Card>
      </SideLayout>
      <DemoNote companyName={ctx.companyName} count={fleet.live.length} />
    </Stack>
  );
}
