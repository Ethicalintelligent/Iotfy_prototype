// IT-0036. Reports, rebuilt in React from the owner's page (Reports.html, removed in IT-0037 (git history), the
// reference): the same 24 reports, picker, filters drawer, grid (search, freeze, columns, group by
// drag, column menu, paging), Export CSV and Print. Vehicles, groups, operators, devices, SIMs
// and users come from Neon through @iotify/data; the report figures are the original page's
// demo generator run on those vehicles and users, labelled "Demo data" (root CLAUDE.md §8).
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  useOperators,
  useRoles,
  useVehicleDetails,
} from '@iotify/data';
import {
  useFleetAssets,
  useFleetDevices,
  useFleetGroups,
  useFleetModels,
  useFleetSims,
  useFleetUsers,
} from '../fleet-rows';
import type { ScreenContext } from '@iotify/app-kit';
import { Icon, SmartTrackPage, useScope } from '../smart-track/kit';
import { addDays, formats, startOfDay, todayIn } from './dates';
import { REPORTS, filledParams, initialParams, type Report } from './definitions';
import {
  COMMON_LIMIT,
  runUserReport,
  runVehicleReport,
  type ReportUser,
  type ReportVehicle,
} from './demo';
import { FilterDrawer, type FilterValue, type Scope } from './FilterDrawer';
import { ManageGrid } from './grid/ManageGrid';
import { fitLabels, type Layout, type Row } from './grid/model';
import { ReportPicker } from './ReportPicker';
import { useToast } from './ui';
import './icons';
import './reports.css';
import './reports.fix.css';

const NOUN = { one: 'Vehicle', many: 'Vehicles' };
const CODE_LABEL = 'Vehicle No';
const MAX_DAYS = 31;

/** The vehicles, groups and users the reports run on (Neon). */
function useReportData(companyId: string, assetGroup: string | null) {
  const assets = useFleetAssets(companyId);
  const assetIds = useMemo(() => (assets.data ?? []).map((a) => a.id), [assets.data]);
  const some = { enabled: assetIds.length > 0 };
  const details = useVehicleDetails({ asset_id: assetIds.map(Number) }, some);
  const groups = useFleetGroups(companyId);
  const operators = useOperators({ company_id: Number(companyId) });
  // Devices (their details are columns of core.device) and SIMs of the company (fleet-rows).
  const devices = useFleetDevices(companyId);
  const sims = useFleetSims(companyId);
  const models = useFleetModels();
  const users = useFleetUsers(companyId);
  const roles = useRoles();

  const scope = useMemo(() => {
    if (!assets.data || !groups.data || (assetIds.length && !details.data)) return undefined;
    const all = groups.data.map((g) => ({ id: g.id, name: g.name, parentId: g.parent_id ?? null }));
    // A user limited to a group sees that group and its sub-groups.
    let allowed: Set<string> | null = null;
    if (assetGroup) {
      const top = all.find((g) => g.name === assetGroup);
      allowed = new Set(top ? [top.id] : []);
      for (let grew = true; grew;) {
        grew = false;
        for (const g of all)
          if (g.parentId && allowed.has(g.parentId) && !allowed.has(g.id)) {
            allowed.add(g.id);
            grew = true;
          }
      }
    }
    const isVehicle = new Set((details.data ?? []).map((d) => String(d.asset_id)));
    const byName = new Map(all.map((g) => [g.name, g.id]));
    const vehicles = assets.data
      .filter((a) => isVehicle.has(a.id))
      .map((a) => ({
        id: a.id,
        name: a.plate_serial || a.name || a.id,
        groupId: (a.asset_group && byName.get(a.asset_group)) || null,
      }))
      .filter((a) => !allowed || (a.groupId && allowed.has(a.groupId)))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const groupsShown = allowed ? all.filter((g) => allowed!.has(g.id)) : all;
    return { groups: groupsShown, assets: vehicles } satisfies Scope;
  }, [assets.data, groups.data, details.data, assetIds.length, assetGroup]);

  const vehicles = useMemo((): Map<string, ReportVehicle> => {
    const out = new Map<string, ReportVehicle>();
    if (!scope) return out;
    const groupName = new Map(scope.groups.map((g) => [g.id, g.name]));
    const detail = new Map((details.data ?? []).map((d) => [String(d.asset_id), d] as const));
    const op = new Map((operators.data ?? []).map((o) => [o.id, o]));
    const device = new Map(
      (devices.data ?? []).filter((d) => d.asset_id).map((d) => [d.asset_id!, d] as const),
    );
    const sim = new Map((sims.data ?? []).map((s) => [s.device_unit_id, s]));
    const model = new Map((models.data ?? []).map((m) => [m.id, m]));
    for (const a of scope.assets) {
      const d = detail.get(a.id);
      const o = d?.operator_id ? op.get(d.operator_id) : undefined;
      const unit = device.get(a.id);
      const m = unit?.device_model_id ? model.get(unit.device_model_id) : undefined;
      out.set(a.id, {
        id: a.id,
        name: a.name,
        groupId: a.groupId,
        group: a.groupId ? (groupName.get(a.groupId) ?? null) : null,
        vehicleType: d?.vehicle_type || d?.category || null,
        model: [d?.make, d?.model].filter(Boolean).join(' ') || null,
        operator: o
          ? { name: o.name, contact: o.contact_no, tagId: o.tag_id, branch: o.branch_location }
          : null,
        imei: unit?.imei ?? null,
        simNo: unit ? (sim.get(unit.id)?.number ?? null) : null,
        deviceMake: m?.maker ?? null,
        deviceModel: m?.model ?? null,
        purchaseDate: unit?.purchase_date?.slice(0, 10) ?? null,
      });
    }
    return out;
  }, [
    scope,
    details.data,
    operators.data,
    devices.data,
    sims.data,
    models.data,
  ]);

  const people = useMemo((): ReportUser[] | undefined => {
    if (!users.data) return undefined;
    const roleName = new Map((roles.data ?? []).map((r) => [r.id, r.name]));
    return users.data.map((u) => ({
      id: u.id,
      name: u.name || u.email || u.id,
      role: u.role_id ? roleName.get(u.role_id) : null,
    }));
  }, [users.data, roles.data]);

  const vehicleError = (assets.error ?? groups.error ?? details.error ?? null) as Error | null;
  return {
    scope,
    vehicles,
    users: people,
    vehiclesPending: !scope && !vehicleError,
    vehicleError,
    usersPending: users.isPending,
    usersError: (users.error ?? null) as Error | null,
    retry: () => {
      void assets.refetch();
      void groups.refetch();
      void details.refetch();
      void users.refetch();
    },
  };
}

export default function ReportsScreen({ companyId, assetGroup }: ScreenContext) {
  return (
    <SmartTrackPage scope="st-reports">
      <FitHeight>
        <ReportsPage companyId={companyId} assetGroup={assetGroup} />
      </FitHeight>
    </SmartTrackPage>
  );
}

/**
 * The original's `vr-fit` fills the window below its top bar (100dvh minus the bar). Here it
 * fills the window below the IoTIFY header, so its height is measured: the space from its top to
 * the window's bottom, less the page's 10px bottom padding, in the page frame's (zoomed) pixels.
 */
function FitHeight({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = box.current;
      if (!el || !el.offsetWidth) return;
      const zoom = el.getBoundingClientRect().width / el.offsetWidth || 1;
      const space = (window.innerHeight - el.getBoundingClientRect().top) / zoom - 10;
      setHeight(Math.max(480, Math.floor(space)));
    };
    measure();
    // The page frame moves and zooms into place in its own layout pass: measure again then.
    const frame = requestAnimationFrame(measure);
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    if (box.current?.parentElement) ro?.observe(box.current.parentElement);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  return (
    <div ref={box} className="vr-fit" style={height ? { height } : undefined}>
      {children}
    </div>
  );
}

function ReportsPage({ companyId, assetGroup }: { companyId: string; assetGroup: string | null }) {
  const scopeClass = useScope();
  const data = useReportData(companyId, assetGroup);
  const reports = REPORTS;
  const [reportId, setReportId] = useState(reports[0]!.id);
  const report: Report = (reports.find((r) => r.id === reportId) ?? reports[0])!;
  const company = report.scope === 'company';
  const today = todayIn();
  const [quick, setQuick] = useState('Yesterday');
  const [period, setPeriod] = useState({
    from: addDays(today, -6),
    to: today,
    day: addDays(today, -1),
    h24: false,
  });
  const [assets, setAssets] = useState<string[] | null>(null);
  const [paramsById, setParamsById] = useState<Record<string, Record<string, string>>>({});
  const params = paramsById[report.id] ?? initialParams(report.params);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layouts, setLayouts] = useState<Record<string, Layout>>({});
  const [run, setRun] = useState(0);
  const toast = useToast();

  const quickDays = (): [string, string] => {
    switch (quick) {
      case 'Today':
        return [today, today];
      case 'Yesterday':
        return [addDays(today, -1), addDays(today, -1)];
      case 'Last 7 days':
        return [addDays(today, -6), today];
      case 'Last 30 days':
        return [addDays(today, -29), today];
      default:
        return [period.from, period.to];
    }
  };
  const [from, to] = report.noDates
    ? [today, today]
    : report.singleDay
      ? [period.day, period.day]
      : quickDays();
  const filled = useMemo(() => filledParams(params), [params]);
  const fmt = formats(CODE_LABEL, period.h24);
  const showing = from === to ? fmt.day(from) : `${fmt.day(from)} – ${fmt.day(to)}`;

  const columns = useMemo(
    () =>
      fitLabels(
        report.columns(formats(CODE_LABEL, period.h24)),
        document.querySelector(`.${scopeClass}`),
      ),
    [report, period.h24, scopeClass],
  );

  const result = useMemo(() => {
    const start = startOfDay(from).getTime();
    const end = startOfDay(addDays(to, 1)).getTime();
    if (company) {
      if (!data.users) return undefined;
      const all = runUserReport(report.code, companyId, data.users, start, end, filled);
      return { rows: all.slice(0, COMMON_LIMIT), truncated: all.length > COMMON_LIMIT };
    }
    if (!data.scope) return undefined;
    const picked = (assets ?? data.scope.assets.map((a) => a.id)).flatMap(
      (id) => data.vehicles.get(id) ?? [],
    );
    return { rows: runVehicleReport(report.code, picked, start, end, filled), truncated: false };
    // `run` re-runs the report when the same filters are applied again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    company,
    report.code,
    from,
    to,
    filled,
    data.users,
    data.scope,
    data.vehicles,
    assets,
    companyId,
    run,
  ]);

  const rows: Row[] = useMemo(
    () => (result?.rows ?? []).map((r, i) => ({ ...r, __k: String(i) })),
    [result],
  );
  const paramCount = Object.keys(filled).length;
  const onCount = (!company && assets !== null ? assets.length : 0) + paramCount;
  const filtersOn = (!company && assets !== null) || paramCount > 0;
  const emptyText =
    !company && assets?.length === 0
      ? `Pick at least one ${NOUN.one.toLowerCase()} in Filters.`
      : report.noDates
        ? 'No records.'
        : `No records for ${showing}.`;

  return (
    <div className="gp-rpt">
      <ManageGrid
        key={report.id}
        picker={
          <>
            <ReportPicker reports={reports} value={report.id} onChange={setReportId} />
            <button
              type="button"
              className={`td-manage__tool td-filter-btn ${filtersOn ? 'is-on' : ''}`}
              onClick={() => setFiltersOpen(true)}
              title="Filters"
              aria-label={filtersOn ? `Filters, ${onCount} on` : 'Filters'}
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
            >
              <Icon name="Funnel" size={16} />
              {filtersOn && <em>{onCount}</em>}
            </button>
          </>
        }
        title={
          <>
            <div className="gp-rpt__title">
              <Icon name={report.icon} size={16} />
              <h2>{report.label}</h2>
            </div>
            <span className="gp-rpt__demo">Demo data</span>
            {!report.noDates && (
              <span className="gp-rpt__range">
                <Icon name="CalendarDays" size={14} />
                Showing: {showing}
              </span>
            )}
            {result?.truncated && (
              <p className="gp-note tone-amber gp-rpt__trunc">
                <Icon name="TriangleAlert" size={15} />
                <span>
                  More than {COMMON_LIMIT.toLocaleString()} records: only the newest are shown. Pick
                  fewer days.
                </span>
              </p>
            )}
          </>
        }
        rows={rows}
        columns={columns}
        plural={`${report.label} records`}
        searchPlaceholder={
          company ? `Search ${report.label.toLowerCase()}…` : `Search ${CODE_LABEL.toLowerCase()}…`
        }
        loading={company ? data.usersPending : data.vehiclesPending}
        error={company ? data.usersError : data.vehicleError}
        onRetry={data.retry}
        emptyText={emptyText}
        layout={layouts[report.id]}
        onLayout={(l) => setLayouts((all) => ({ ...all, [report.id]: l }))}
      >
        {filtersOpen && (
          <FilterDrawer
            value={{
              ...period,
              ...(report.singleDay || report.noDates ? {} : { from, to }),
              assets,
              params,
            }}
            onClose={() => setFiltersOpen(false)}
            scope={data.scope}
            scopeError={data.vehicleError}
            onRetry={data.retry}
            noun={NOUN}
            singleDay={!!report.singleDay}
            today={today}
            maxDays={MAX_DAYS}
            reportLabel={report.label}
            paramDefs={report.params}
            noAssets={company}
            noDates={report.noDates}
            onApply={(v: FilterValue) => {
              const { params: next, assets: picked, ...dates } = v;
              const datesChanged = report.singleDay
                ? dates.day !== period.day
                : dates.from !== from || dates.to !== to;
              setPeriod(dates);
              setAssets(picked);
              setParamsById((all) => ({ ...all, [report.id]: next }));
              if (!report.singleDay && !report.noDates && (dates.from !== from || dates.to !== to))
                setQuick('Custom');
              if (!datesChanged) setRun((n) => n + 1);
              setFiltersOpen(false);
              toast.show('Report updated with the selected filters.');
            }}
          />
        )}
        {toast.node}
      </ManageGrid>
    </div>
  );
}
