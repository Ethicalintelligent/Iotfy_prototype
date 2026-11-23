// Reports (approved design, Desktop/vs/Reports.html): pick a report, set its filters (vehicles,
// a day or up to 31 days, its own conditions, 12- or 24-hour times), then read, search, group,
// download or print it. The chosen report is kept in the address (?report=trip). Vehicles,
// operators, users, devices, geofences and add-ons are real; the activity in the reports is demo
// activity (labelled) until devices report.
import { useMemo, useState, type ReactNode } from 'react';
import {
  Card,
  Chip,
  ColumnChooser,
  DataGrid,
  EmptyState,
  HueChip,
  Loading,
  MenuSelect,
  MetricPill,
  Note,
  SearchInput,
  Stack,
  ToolButton,
  downloadCsv,
  type GridColumn,
} from '@iotify/ui';
import {
  useConnectivity,
  useDeviceDetails,
  useDeviceModels,
  useDeviceUnits,
  useOperators,
  useRoles,
  useSubscriptions,
  useUserProfiles,
  useUsers,
  useVehicleDetails,
} from '@iotify/data';
import type { ScreenContext } from '@iotify/app-kit';
import { startOfDay } from '../../demo/fleet';
import { useFleet } from '../../shared/useFleet';
import { REPORTS, reportByKey } from './catalogue';
import { dayCache, formatter, periodDays, periodText } from './data';
import {
  ReportFilters,
  changedFilters,
  initialConditions,
  initialFilter,
  type ReportFilter,
} from './ReportFilters';
import type {
  DeviceInfo,
  ReportDef,
  ReportInput,
  ReportRow,
  ReportUser,
  VehicleExtra,
} from './types';

const fromUrl = () => reportByKey(new URLSearchParams(window.location.search).get('report')).key;

/** The grid's columns for a report: chips, pills and bold names as the definition says. */
function gridColumns(def: ReportDef): GridColumn<ReportRow>[] {
  return def.columns.map((c) => {
    const show = (r: ReportRow): ReactNode => {
      const v = r[c.key];
      if (v == null || v === '' || v === '—') return '—';
      if (c.chip) return <HueChip hue={c.chip(r)}>{v}</HueChip>;
      if (c.pill) return <MetricPill hue={c.pill(r)}>{v}</MetricPill>;
      if (c.strong) return <b>{v}</b>;
      return v;
    };
    return {
      key: c.key,
      header: c.header,
      width: c.width,
      align: c.align,
      value: (r) => r[c.key],
      cell: show,
    };
  });
}

export default function ReportsScreen(ctx: ScreenContext) {
  const { companyId, companyName } = ctx;
  // Reports are a snapshot: the demo activity moves on once a minute.
  const fleet = useFleet(ctx, 60_000);
  const on = { enabled: !!companyId };
  const users = useUsers({ account_id: companyId }, on);
  const profiles = useUserProfiles(undefined, on);
  const roles = useRoles(undefined, on);
  const operators = useOperators({ company_id: companyId }, on);
  const units = useDeviceUnits({ company_id: companyId }, on);
  const models = useDeviceModels(undefined, on);
  const unitDetails = useDeviceDetails(undefined, on);
  const sims = useConnectivity(undefined, on);
  const details = useVehicleDetails(undefined, on);
  const subs = useSubscriptions({ buyer_id: companyId }, on);

  const [key, setKey] = useState(fromUrl);
  const def = reportByKey(key);
  const [filter, setFilter] = useState<ReportFilter>(() => initialFilter(def, new Date()));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [q, setQ] = useState('');
  const [freeze, setFreeze] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);

  const choose = (k: string) => {
    const next = reportByKey(k);
    setKey(next.key);
    setFilter((f) => ({ ...f, cond: initialConditions(next) }));
    setHidden([]);
    setQ('');
    const url = new URL(window.location.href);
    url.searchParams.set('report', next.key);
    window.history.replaceState(window.history.state, '', url);
  };

  // ---------------------------------------------------------------- real records
  const reportUsers = useMemo<ReportUser[]>(() => {
    const roleName = new Map((roles.data ?? []).map((r) => [r.id, r.name]));
    const profile = new Map((profiles.data ?? []).map((p) => [p.user_id, p]));
    return (users.data ?? [])
      .map((u) => ({
        id: u.id,
        name: u.name ?? u.id,
        role: (u.role_id && roleName.get(u.role_id)) || '—',
        email: u.email ?? null,
        userName: profile.get(u.id)?.user_name ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users.data, roles.data, profiles.data]);

  const companyRoles = useMemo(
    () => [
      ...new Set(
        (roles.data ?? [])
          .filter((r) => r.level === 'User' || r.level === 'Company')
          .map((r) => r.name)
          .filter((n): n is string => !!n),
      ),
    ],
    [roles.data],
  );

  const devices = useMemo(() => {
    const model = new Map((models.data ?? []).map((m) => [m.id, m]));
    const extra = new Map((unitDetails.data ?? []).map((d) => [d.device_unit_id, d]));
    const sim = new Map(
      (sims.data ?? []).filter((c) => c.device_unit_id).map((c) => [c.device_unit_id!, c]),
    );
    const out = new Map<string, DeviceInfo>();
    for (const u of units.data ?? []) {
      if (!u.asset_id || out.has(u.asset_id)) continue;
      const m = u.device_model_id ? model.get(u.device_model_id) : undefined;
      const s = sim.get(u.id);
      out.set(u.asset_id, {
        make: m?.maker ?? null,
        model: m?.model ?? null,
        imei: u.imei ?? null,
        sim: s?.number ?? s?.identifier ?? null,
        purchase: extra.get(u.id)?.purchase_date ?? null,
        associated: u.created_at ?? null,
      });
    }
    return out;
  }, [units.data, models.data, unitDetails.data, sims.data]);

  const extra = useMemo(
    () =>
      new Map<string, VehicleExtra>(
        (details.data ?? []).map((d) => [
          d.asset_id,
          {
            tankL: d.tank_capacity_l != null ? Number(d.tank_capacity_l) : null,
            mileageKmL: d.mileage_km_l != null ? Number(d.mileage_km_l) : null,
          },
        ]),
      ),
    [details.data],
  );

  /** Active subscriptions of each add-on: the vehicles it covers (null = all), or undefined. */
  const addonCover = useMemo(() => {
    const out = new Map<string, Set<string> | null>();
    for (const s of subs.data ?? []) {
      if (s.status !== 'Active' || !s.product_id) continue;
      const cur = out.get(s.product_id);
      if (!s.asset_id || cur === null) out.set(s.product_id, null);
      else out.set(s.product_id, new Set([...(cur ?? []), s.asset_id]));
    }
    return out;
  }, [subs.data]);
  const bought = !def.addon || addonCover.has(def.addon.id);
  const covered = def.addon ? (addonCover.get(def.addon.id) ?? null) : null;

  // ---------------------------------------------------------------- the report
  const { live, now, fences } = fleet;
  const fmt = useMemo(() => formatter(filter.hour12), [filter.hour12]);
  const rows = useMemo<ReportRow[]>(() => {
    if (!bought) return [];
    const chosen = filter.vehicles ? new Set(filter.vehicles) : null;
    const input: ReportInput = {
      companyId,
      vehicles: live.filter((v) => !chosen || chosen.has(v.id)),
      days: def.current ? [startOfDay(now)] : periodDays(filter.period),
      now,
      fmt,
      cond: filter.cond,
      day: dayCache(now),
      fences,
      operators: operators.data ?? [],
      users: reportUsers,
      roles: companyRoles,
      devices,
      extra,
      covered,
    };
    return def.build(input);
  }, [
    def,
    filter,
    fmt,
    live,
    now,
    fences,
    operators.data,
    reportUsers,
    companyRoles,
    devices,
    extra,
    covered,
    bought,
    companyId,
  ]);

  const columns = useMemo(() => gridColumns(def), [def]);
  const loading =
    fleet.loading || !users.data || !roles.data || !operators.data || !units.data || !subs.data;
  const error =
    fleet.error ??
    [users, profiles, roles, operators, units, models, unitDetails, sims, details, subs]
      .map((x) => x.error?.message)
      .find(Boolean) ??
    null;

  const showing = def.current ? `now, ${fmt.dateTime(now)}` : periodText(filter.period);
  const shownCols = def.columns.filter((c) => !hidden.includes(c.key));
  const searched = () => {
    const t = q.trim().toLowerCase();
    return t
      ? rows.filter((r) =>
          shownCols.some((c) =>
            String(r[c.key] ?? '')
              .toLowerCase()
              .includes(t),
          ),
        )
      : rows;
  };
  const changed = changedFilters(def, filter, now);
  const notCovered =
    covered && def.subject === 'vehicles'
      ? live.filter((v) => covered.has(v.id)).map((v) => v.callSign)
      : null;

  const picker = (
    <MenuSelect
      label="Select Report"
      value={def.key}
      onChange={choose}
      width={320}
      searchPlaceholder="Search report…"
      options={REPORTS.map((r) => ({
        value: r.key,
        label: r.label,
        icon: r.icon,
        section: r.section,
        disabledReason:
          r.addon && !addonCover.has(r.addon.id) ? `Needs ${r.addon.name}` : undefined,
      }))}
    />
  );

  let body: ReactNode;
  if (error) body = <Note tone="red">{error}</Note>;
  else if (loading) body = <Loading>Building the {def.label.toLowerCase()}…</Loading>;
  else if (!bought && def.addon)
    body = (
      <EmptyState title={`${def.addon.name} is not part of your plan`} icon={def.icon}>
        The {def.label} needs the {def.addon.name} add-on. Your dealer can add it for {companyName}.
      </EmptyState>
    );
  else
    body = (
      <>
        {notCovered && (
          <Note tone="grey">
            {def.addon!.name} covers {notCovered.length} of {live.length} vehicles
            {notCovered.length ? ` (${notCovered.join(', ')})` : ''}. Your dealer can add it to
            more.
          </Note>
        )}
        <DataGrid<ReportRow>
          key={def.key}
          label={def.label}
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          search={q}
          hidden={hidden}
          freeze={freeze}
          empty={def.empty ?? 'Nothing in this period.'}
        />
      </>
    );

  return (
    <Stack dir="col" gap={12} align="stretch">
      <Stack gap={10} wrap>
        {picker}
        <ToolButton
          icon="filter"
          label={changed ? `Report filters (${changed} changed)` : 'Report filters'}
          active={changed > 0}
          onClick={() => setFiltersOpen(true)}
        >
          {changed > 0 ? changed : undefined}
        </ToolButton>
        <div style={{ flex: 1, minWidth: 220 }}>
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder={
              def.subject === 'users' ? `Search ${def.label.toLowerCase()}…` : 'Search vehicle no…'
            }
          />
        </div>
        <ToolButton icon="side" active={freeze} onClick={() => setFreeze(!freeze)}>
          Freeze Columns
        </ToolButton>
        <ColumnChooser columns={def.columns} hidden={hidden} onChange={setHidden} />
        <ToolButton
          icon="download"
          label="Download as CSV"
          onClick={() =>
            downloadCsv(
              `${def.label} ${showing}`,
              shownCols.map((c) => ({ header: c.header, value: (r: ReportRow) => r[c.key] })),
              searched(),
            )
          }
        />
        <ToolButton icon="printer" label="Print" onClick={() => window.print()} />
      </Stack>
      <Card
        icon={def.icon}
        title={def.label}
        actions={
          bought ? (
            <>
              <Chip tone="amber">Demo activity</Chip>
              <HueChip hue="green" icon="calendar">
                Showing: {showing}
              </HueChip>
            </>
          ) : undefined
        }
      >
        {body}
      </Card>
      {filtersOpen && (
        <ReportFilters
          def={def}
          value={filter}
          vehicles={fleet.vehicles.length ? live : []}
          context={{ users: reportUsers }}
          now={now}
          onClose={() => setFiltersOpen(false)}
          onApply={(f) => {
            setFilter(f);
            setFiltersOpen(false);
          }}
        />
      )}
    </Stack>
  );
}
