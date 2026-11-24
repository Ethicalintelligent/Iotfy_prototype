// Alerts, "Detailed View" (approved design, Desktop/vs/Alerts.html): the alerts in a grid tinted by
// alert colour, with search and a filter; beside it the chosen alert's vehicle, operator and place
// on the map. Vehicles and operators are real; the alerts are demo activity (labelled).
import { useMemo, useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  CheckTree,
  Chip,
  DataGrid,
  Dropdown,
  EmptyState,
  FieldGrid,
  HueChip,
  Icon,
  IconButton,
  IconTile,
  Loading,
  MiniStat,
  Note,
  SearchInput,
  SelectField,
  Stack,
  StreetMap,
  type GridColumn,
  type MapMarker,
} from '@iotify/ui';
import { VehiclePhoto } from '@iotify/illustrations';
import { useOperators, useVehicleDetails } from '@iotify/data';
import type { ScreenContext } from '@iotify/app-kit';
import type { AlertEvent, LiveVehicle } from '../../demo/fleet';
import { useFleet } from '../../shared/useFleet';
import { ALERT, STATUS } from '../../shared/vehicle-status';
import { km, num } from '../../shared/format';
import {
  ALL_KINDS,
  NO_FILTER,
  PERIODS,
  SEVERITIES,
  filterAlerts,
  isFiltered,
  periodAlerts,
  sortStamp,
  stampText,
  type AlertFilter,
  type Period,
} from './alerts';

const coordText = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

const COLUMNS: GridColumn<AlertEvent>[] = [
  { key: 'plate', header: 'Plate Number', value: (e) => e.plate, filter: false },
  {
    key: 'name',
    header: 'Alert Name',
    value: (e) => ALERT[e.kind].label,
    cell: (e) => (
      <Stack gap={8} wrap={false}>
        <IconTile icon={ALERT[e.kind].icon} hue={ALERT[e.kind].hue} size="sm" variant="solid" />
        <b>{ALERT[e.kind].label}</b>
      </Stack>
    ),
    filter: false,
  },
  { key: 'severity', header: 'Severity', value: (e) => ALERT[e.kind].severity, filter: false },
  { key: 'description', header: 'Description', value: (e) => e.description, filter: false },
  {
    key: 'at',
    header: 'Date & Time',
    value: (e) => sortStamp(e.at),
    cell: (e) => stampText(e.at),
    filter: false,
  },
  {
    key: 'location',
    header: 'Location',
    value: (e) => coordText(e.lat, e.lng),
    filter: false,
  },
];

export default function AlertsScreen(ctx: ScreenContext) {
  const fleet = useFleet(ctx);
  const on = { enabled: !!ctx.companyId };
  // Same queries as useFleet, so they come from the cache.
  const details = useVehicleDetails(undefined, on);
  const operators = useOperators({ company_id: ctx.companyId }, on);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<AlertFilter>(NO_FILTER);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [current, setCurrent] = useState<string | null>(null);

  const all = useMemo(
    () => periodAlerts(fleet.live, fleet.now, filter.period),
    [fleet.live, fleet.now, filter.period],
  );
  const byId = useMemo(() => new Map(fleet.live.map((v) => [v.id, v])), [fleet.live]);
  const shown = useMemo(
    () => filterAlerts(all, filter, q, (id) => byId.get(id)?.operator ?? null),
    [all, filter, q, byId],
  );

  if (fleet.error) return <Note tone="red">{fleet.error}</Note>;
  if (fleet.loading) return <Loading>Loading vehicles…</Loading>;
  if (!fleet.live.length)
    return (
      <EmptyState title="No vehicles yet" icon="bell">
        Alerts appear here once your dealer adds vehicles to {ctx.companyName}.
      </EmptyState>
    );

  // The chosen alert; the newest one at first (or when the chosen one is filtered out).
  const alert = shown.find((e) => e.id === current) ?? shown[0] ?? null;
  const vehicle = alert ? (byId.get(alert.vehicleId) ?? null) : null;
  const detail = vehicle ? details.data?.find((d) => d.asset_id === vehicle.id) : undefined;
  const operator = detail?.operator_id
    ? operators.data?.find((o) => o.id === detail.operator_id)
    : undefined;
  const title = `${filter.period === 'today' ? 'Live Alerts' : PERIODS.find((p) => p.value === filter.period)!.label} (${shown.length})`;

  return (
    <Stack gap={12} align="flex-start">
      <div style={{ flex: '999 1 620px', minWidth: 0 }}>
        <Card
          icon="bell"
          title={title}
          actions={
            <>
              <Chip tone="amber">Demo activity</Chip>
              <div style={{ width: 300, maxWidth: '100%' }}>
                <SearchInput
                  value={q}
                  onChange={setQ}
                  placeholder="Search plate, operator, type…"
                />
              </div>
              <IconButton
                icon="filter"
                label="Filter alerts"
                outlined
                active={isFiltered(filter)}
                onClick={(e) => setMenu(menu ? null : e.currentTarget)}
              />
            </>
          }
        >
          {menu && (
            <AlertFilterMenu
              anchor={menu}
              onClose={() => setMenu(null)}
              value={filter}
              onApply={(f) => {
                setFilter(f);
                setMenu(null);
              }}
              vehicles={fleet.live}
            />
          )}
          <DataGrid
            label="Alerts"
            rows={shown}
            rowKey={(e) => e.id}
            columns={COLUMNS}
            rowHue={(e) => ALERT[e.kind].hue}
            current={alert?.id ?? null}
            onRowClick={(e) => setCurrent(e.id)}
            pageSize={20}
            noGrouping
            freeze
            empty={isFiltered(filter) || q ? 'No alerts match.' : 'No alerts yet today.'}
          />
        </Card>
      </div>
      <div style={{ flex: '1 1 310px', minWidth: 0, maxWidth: 480 }}>
        {alert && vehicle ? (
          <Stack dir="col" gap={12} align="stretch">
            <VehicleCard
              v={vehicle}
              type={detail?.vehicle_type ?? null}
              operator={operator?.name ?? vehicle.operator}
              operatorId={operator?.tag_id ?? null}
              contact={operator?.contact_no ?? null}
            />
            <AlertCard alert={alert} />
          </Stack>
        ) : (
          <Card>
            <EmptyState title="No alert chosen" icon="bell">
              Alerts that match show here with their vehicle and place.
            </EmptyState>
          </Card>
        )}
      </div>
    </Stack>
  );
}

// ---------------------------------------------------------------- filter
function AlertFilterMenu({
  anchor,
  onClose,
  value,
  onApply,
  vehicles,
}: {
  anchor: HTMLElement;
  onClose: () => void;
  value: AlertFilter;
  onApply: (f: AlertFilter) => void;
  vehicles: LiveVehicle[];
}) {
  // Shown only while open, so each opening starts from the applied filter.
  const [draft, setDraft] = useState(value);
  const groups = useMemo(() => {
    const by = new Map<string, LiveVehicle[]>();
    for (const v of vehicles)
      by.set(v.group ?? 'No group', [...(by.get(v.group ?? 'No group') ?? []), v]);
    return [...by].map(([g, vs]) => ({
      key: g,
      label: g,
      items: vs.map((v) => ({ key: v.id, label: v.plate, detail: v.callSign })),
    }));
  }, [vehicles]);
  const allVehicles = vehicles.map((v) => v.id);
  const pick = <T extends string>(all: T[], hidden: T[]) =>
    new Set(all.filter((x) => !hidden.includes(x)));
  return (
    <Dropdown
      anchor={anchor}
      open
      onClose={onClose}
      align="right"
      width={560}
      label="Filter alerts"
    >
      <Stack dir="col" gap={10} align="stretch" style={{ padding: 6 }}>
        <FieldGrid>
          <SelectField
            label="Date"
            value={draft.period}
            options={PERIODS}
            onChange={(p) => setDraft({ ...draft, period: p as Period })}
          />
          <SelectField
            label="Severity"
            value={draft.severity}
            options={[
              { value: 'all', label: 'All severities' },
              ...SEVERITIES.map((s) => ({ value: s, label: s })),
            ]}
            onChange={(s) => setDraft({ ...draft, severity: s as AlertFilter['severity'] })}
          />
        </FieldGrid>
        <FieldGrid>
          <div style={{ height: 190, display: 'flex', flexDirection: 'column' }}>
            <CheckTree
              label="Vehicles"
              searchPlaceholder="Search vehicle or group…"
              groups={groups}
              selected={pick(allVehicles, draft.hiddenVehicles)}
              onChange={(sel) =>
                setDraft({ ...draft, hiddenVehicles: allVehicles.filter((id) => !sel.has(id)) })
              }
            />
          </div>
          <div style={{ height: 190, display: 'flex', flexDirection: 'column' }}>
            <CheckTree
              label="Alert names"
              searchPlaceholder="Search alert name…"
              groups={[
                {
                  key: 'all',
                  label: 'All alerts',
                  items: ALL_KINDS.map((k) => ({ key: k, label: ALERT[k].label })),
                },
              ]}
              selected={pick(ALL_KINDS, draft.hiddenKinds)}
              onChange={(sel) =>
                setDraft({ ...draft, hiddenKinds: ALL_KINDS.filter((k) => !sel.has(k)) })
              }
            />
          </div>
        </FieldGrid>
        <Stack justify="space-between" wrap={false}>
          <Button onClick={() => setDraft(NO_FILTER)}>Reset</Button>
          <Button variant="primary" onClick={() => onApply(draft)}>
            Apply Filters
          </Button>
        </Stack>
      </Stack>
    </Dropdown>
  );
}

// ---------------------------------------------------------------- vehicle and operator
function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span>
      <span className="ui-muted">{label}:</span> <b>{children}</b>
    </span>
  );
}

function VehicleCard({
  v,
  type,
  operator,
  operatorId,
  contact,
}: {
  v: LiveVehicle;
  type: string | null;
  operator: string | null;
  operatorId: string | null;
  contact: string | null;
}) {
  const s = STATUS[v.status];
  return (
    <Card
      icon="vehicles"
      title="Vehicle Info"
      actions={
        <HueChip hue={s.hue} solid>
          {s.label}
        </HueChip>
      }
    >
      <Stack gap={14} align="flex-start">
        <VehiclePhoto category={v.category} size={84} />
        <Stack dir="col" gap={6} align="flex-start" style={{ flex: '1 1 150px' }}>
          <Line label="Plate Number">{v.plate}</Line>
          <Line label="Vehicle Model">{[v.make, v.model].filter(Boolean).join(' ') || '—'}</Line>
          <Line label="Vehicle Type">{type ?? v.category ?? '—'}</Line>
          <Line label="Total Odometer">{km(v.odometer)}</Line>
        </Stack>
        <Stack dir="col" gap={8} align="stretch">
          <MiniStat
            icon="gauge"
            hue={s.hue}
            value={v.status === 'ytt' ? '—' : v.speed}
            unit="km/h"
            label="Speed"
          />
          <MiniStat
            icon="route"
            hue={s.hue}
            value={num(v.todayKm)}
            unit="km"
            label="Today's Distance"
          />
        </Stack>
      </Stack>
      <Stack gap={8}>
        <IconTile icon="user" size="sm" />
        <b>Operator Info</b>
      </Stack>
      <Stack justify="space-between" gap={6}>
        <Line label="Operator Name">{operator ?? '—'}</Line>
        <Line label="ID">{operatorId ?? '—'}</Line>
      </Stack>
      <Line label="Contact Number">{contact ?? '—'}</Line>
    </Card>
  );
}

// ---------------------------------------------------------------- the alert on the map
function AlertCard({ alert }: { alert: AlertEvent }) {
  const info = ALERT[alert.kind];
  const markers = useMemo<MapMarker[]>(
    () => [
      {
        id: alert.id,
        lat: alert.lat,
        lng: alert.lng,
        label: alert.plate,
        hue: info.hue,
        icon: info.icon,
        pulse: true,
      },
    ],
    [alert, info],
  );
  return (
    <Card
      icon={info.icon}
      iconHue={info.hue}
      title={info.label}
      subtitle={alert.description}
      actions={<Chip>{info.severity}</Chip>}
    >
      <StreetMap
        label={`Where ${alert.plate} raised ${info.label}`}
        markers={markers}
        fitKey={alert.id}
        wheelZoom
        height={380}
      />
      <Stack gap={6} justify="space-between">
        <Stack gap={6} wrap={false}>
          <Icon name="geofence" size={15} />
          <b>{coordText(alert.lat, alert.lng)}</b>
        </Stack>
        <span className="ui-muted">{stampText(alert.at)}</span>
      </Stack>
    </Card>
  );
}
