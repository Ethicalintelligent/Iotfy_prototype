// IT-0036. Alerts ("Live Alerts"), rebuilt in React from the owner's page
// (Alerts.html, removed in IT-0037 (git history), the reference): same layout, texts, filters and behaviour.
// Vehicles, their details, trackers and operators come from Neon through @iotify/data; alert
// severities from the company's alert_configs where one matches. The alerts themselves and the
// vehicles' live status are the original's demo generator applied to those vehicles (no table
// yet), labelled "Demo data" (root CLAUDE.md §8).
import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { ScreenContext } from '@iotify/app-kit';
import {
  useAlertConfigs,
  useAssetGroups,
  useAssets,
  useDeviceUnits,
  useGeofences,
  useOperators,
  useVehicleDetails,
} from '@iotify/data';
import { Icon, SmartTrackPage, registerIcons } from '../smart-track/kit';
import {
  ALERT_NAMES,
  NEVER,
  alertHistory,
  alertStyle,
  configType,
  severityOf,
  SEVERITY_LABEL,
  startPosition,
  statusOf,
  step,
  type Position,
} from './demo';
import { AlertFilters, DEFAULT_FILTER, SearchBox, windowOf, type AlertFilter } from './filters';
import {
  AlertCard,
  SeverityPill,
  VehicleInfo,
  alertKey,
  coords,
  type AlertRow,
  type VehicleRow,
} from './side';
import { localStamp, today, formatStamp } from './time';
import { vehicleImage } from './vehicle-image';
import { PAGE_ICONS } from './icons';
import './alerts.css';

registerIcons(PAGE_ICONS);

/** The original asks the server for at most 200 alerts; more shows as "(200+)". */
const PAGE_SIZE = 200;
/** The original's live position feed and status clock. */
const FEED_MS = 10_000;
const CLOCK_MS = 5_000;

const km = (n: number | null | undefined) =>
  n == null ? null : `${Math.round(n).toLocaleString('en-IN')} km`;

/** Ids of a group and all its sub-groups (a user limited to a group sees those too). */
function groupAndBelow(
  groups: { name: string; id: string; parent_id?: string | null }[],
  name: string,
) {
  const top = groups.find((g) => g.name === name);
  const names = new Set([name]);
  if (!top) return names;
  const ids = new Set([top.id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const g of groups)
      if (g.parent_id && ids.has(g.parent_id) && !ids.has(g.id)) {
        ids.add(g.id);
        names.add(g.name);
        grew = true;
      }
  }
  return names;
}

/** The company's vehicles (Neon) with their live demo status. */
function useVehicles(companyId: string, assetGroup: string | null) {
  const assets = useAssets({ company_id: companyId });
  const details = useVehicleDetails();
  const devices = useDeviceUnits({ company_id: companyId });
  const operators = useOperators({ company_id: companyId });
  const groups = useAssetGroups({ company_id: companyId });

  const base = useMemo(() => {
    const byAsset = new Map((details.data ?? []).map((d) => [d.asset_id, d]));
    const ops = new Map((operators.data ?? []).map((o) => [o.id, o]));
    const tracked = new Set(
      (devices.data ?? []).filter((d) => d.asset_id).map((d) => d.asset_id as string),
    );
    const allowed = assetGroup ? groupAndBelow(groups.data ?? [], assetGroup) : null;
    return (assets.data ?? [])
      .filter((a) => byAsset.has(a.id))
      .filter((a) => !allowed || (a.asset_group != null && allowed.has(a.asset_group)))
      .map((a) => {
        const d = byAsset.get(a.id)!;
        const op = (d.operator_id && ops.get(d.operator_id)) || null;
        return {
          id: a.id,
          name: a.name ?? a.id,
          plate: a.plate_serial || a.name || a.id,
          model: [d.make, d.model].filter(Boolean).join(' ') || null,
          type: d.vehicle_type ?? null,
          odometer: km(d.odometer_km),
          image: vehicleImage({ category: d.category, make: d.make, model: d.model, name: a.name }),
          limit: d.speed_limit_kmh ?? null,
          tracked: tracked.has(a.id),
          operator: op
            ? { name: op.name, tagId: op.tag_id ?? null, contact: op.contact_no ?? null }
            : null,
        };
      })
      .sort((x, y) => x.name.localeCompare(y.name, undefined, { numeric: true }));
  }, [assets.data, details.data, devices.data, operators.data, groups.data, assetGroup]);

  // Live positions (demo): vehicles with a tracker report; a few move on every 10 s.
  const trackedIds = base
    .filter((v) => v.tracked)
    .map((v) => v.id)
    .join(',');
  const [positions, setPositions] = useState(new Map<string, Position>());
  useEffect(() => {
    const ids = trackedIds ? trackedIds.split(',') : [];
    setPositions(new Map(ids.map((id) => [id, startPosition(id)])));
    const t = setInterval(() => setPositions((p) => step(p)), FEED_MS);
    return () => clearInterval(t);
  }, [trackedIds]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => clearInterval(t);
  }, []);

  const rows: (VehicleRow & { tracked: boolean })[] = useMemo(
    () =>
      base.map((v) => {
        const p = positions.get(v.id);
        return { ...v, status: p ? statusOf(p, now, v.limit) : NEVER };
      }),
    [base, positions, now],
  );
  const all = [assets, details, devices, operators, groups];
  return {
    rows,
    isPending: all.some((q) => q.isPending),
    error: all.find((q) => q.isError)?.error ?? null,
    refetch: () => all.forEach((q) => void q.refetch()),
  };
}

export default function AlertsScreen({ companyId, assetGroup }: ScreenContext) {
  const fleet = useVehicles(companyId, assetGroup);
  const configs = useAlertConfigs({ company_id: companyId });
  const fences = useGeofences({ company_id: companyId });
  const [filter, setFilter] = useState<AlertFilter>(DEFAULT_FILTER);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The demo alert history, made once per day for the vehicles with a tracker.
  const day = today();
  const trackedIds = fleet.rows
    .filter((v) => v.tracked)
    .map((v) => v.id)
    .join(',');
  const fenceNames = (fences.data ?? [])
    .map((f) => f.name)
    .filter(Boolean)
    .join('|');
  const history = useMemo(
    () =>
      alertHistory(
        trackedIds ? trackedIds.split(',') : [],
        fenceNames ? fenceNames.split('|') : [],
        localMidnight(),
      ),
    [trackedIds, fenceNames, day],
  );

  /** Severity set for this vehicle and alert type in Manage › Alert Configuration (Neon). */
  const severity = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of configs.data ?? []) {
      const type = configType(c.alert_type);
      if (type && c.enabled !== false && c.severity) m.set(`${c.asset_id}|${type}`, c.severity);
    }
    return m;
  }, [configs.data]);

  const vehicles = useMemo(() => new Map(fleet.rows.map((v) => [v.id, v])), [fleet.rows]);
  const names = useMemo(() => new Map(ALERT_NAMES.map((t) => [t.id, t.label])), []);
  const loaded = !fleet.isPending && !configs.isPending && !fences.isPending;
  const error = fleet.error ?? configs.error ?? fences.error;

  const { rows: all, more } = useMemo(() => {
    if (!loaded) return { rows: [] as AlertRow[], more: false };
    const w = windowOf(filter);
    const inRange = history.filter((a) => {
      const t = Date.parse(a.ts);
      return (
        t >= w.from.getTime() &&
        t < w.to.getTime() &&
        (!filter.vins || filter.vins.has(a.assetId)) &&
        (!filter.types || filter.types.has(a.type))
      );
    });
    const rows = inRange.slice(0, PAGE_SIZE).map((a): AlertRow => {
      const style = alertStyle(a.type);
      const v = vehicles.get(a.assetId);
      return {
        id: a.id,
        at: localStamp(new Date(a.ts)),
        type: a.type,
        label: names.get(a.type) ?? style.label,
        description: a.message || style.about,
        plateNo: v?.plate ?? `Vehicle ${a.assetId.slice(0, 8)}`,
        assetId: a.assetId,
        location: null,
        lat: a.lat,
        lng: a.lng,
        speed: a.speed,
        severity: severity.get(`${a.assetId}|${a.type}`) ?? null,
      };
    });
    return { rows, more: inRange.length > rows.length };
  }, [loaded, filter, history, vehicles, names, severity]);

  const q = query.trim().toLowerCase();
  const rows = q
    ? all.filter((a) => {
        const s = severityOf(a.severity);
        return `${a.plateNo} ${a.label} ${a.description || ''} ${s ? SEVERITY_LABEL[s] : ''}`
          .toLowerCase()
          .includes(q);
      })
    : all;
  const selected = rows.find((a) => alertKey(a) === picked) || rows[0] || null;
  const active = [
    filter.range !== DEFAULT_FILTER.range,
    !!filter.operator,
    filter.vins,
    filter.types,
  ].filter(Boolean).length;
  const empty = loaded
    ? q || active
      ? 'No alerts match these filters.'
      : 'No alerts in this period.'
    : error
      ? ''
      : 'Loading alerts…';

  const filterVehicles = useMemo(
    () => fleet.rows.map((v) => ({ id: v.id, label: v.plate })),
    [fleet.rows],
  );

  return (
    <SmartTrackPage scope="st-alerts">
      <div className="td-alerts">
        <section className="td-card  td-alerts__list ">
          <header className="td-card__head">
            <span className="td-badge td-badge--solid tone-brand">
              <Icon name="Bell" size={16} />
            </span>
            <div className="td-card__titles">
              <h2 className="td-card__title ">{`Live Alerts (${rows.length.toLocaleString()}${more && !q ? '+' : ''})`}</h2>
            </div>
            <div className="td-card__right">
              <span className="td-card__meta">Demo data</span>
              <SearchBox
                id="td-alerts-q"
                value={query}
                onChange={setQuery}
                placeholder="Search plate, operator, type…"
              />
              <div className="td-alerts__filter">
                <button
                  type="button"
                  className="td-btn td-filter-btn td-alerts__filter-btn td-alerts__filter-btn--icon"
                  aria-expanded={filtersOpen}
                  aria-haspopup="dialog"
                  aria-label={active > 0 ? `Filters, ${active} active` : 'Filters'}
                  title="Filters"
                  onClick={() => setFiltersOpen((o) => !o)}
                >
                  <Icon name="Funnel" size={15} />
                  {active > 0 && (
                    <span className="td-alerts__count" aria-hidden="true">
                      {active}
                    </span>
                  )}
                </button>
                {filtersOpen && (
                  <AlertFilters
                    value={filter}
                    vehicles={filterVehicles}
                    alertNames={ALERT_NAMES}
                    onApply={(f) => {
                      setFilter(f);
                      setFiltersOpen(false);
                    }}
                    onClose={() => setFiltersOpen(false)}
                  />
                )}
              </div>
            </div>
          </header>
          <div className="td-card__body ">
            {error && (
              <p className="td-alerts__error" role="status">
                <Icon name="CircleAlert" size={15} />
                {`Could not load alerts: ${error.message}`}
                <button
                  type="button"
                  className="td-link"
                  onClick={() => {
                    fleet.refetch();
                    void configs.refetch();
                    void fences.refetch();
                  }}
                >
                  Retry
                </button>
              </p>
            )}
            <AlertTable
              rows={rows}
              selected={selected}
              onSelect={(a) => setPicked(alertKey(a))}
              empty={empty}
            />
          </div>
        </section>
        <aside className="td-alerts__side">
          {selected ? (
            <>
              <VehicleInfo alert={selected} vehicle={vehicles.get(selected.assetId)} />
              <AlertCard key={alertKey(selected)} alert={selected} />
            </>
          ) : (
            <section className="td-card td-avd td-avd--empty">
              <span className="td-badge td-badge--xl tone-gray">
                <Icon name="Bell" size={22} />
              </span>
              <p>Select an alert to see the vehicle, its operator and where it happened.</p>
            </section>
          )}
        </aside>
      </div>
    </SmartTrackPage>
  );
}

function AlertTable({
  rows,
  selected,
  onSelect,
  empty,
}: {
  rows: AlertRow[];
  selected: AlertRow | null;
  onSelect: (a: AlertRow) => void;
  empty: string;
}) {
  const choose = (e: MouseEvent | KeyboardEvent, a: AlertRow) => {
    if (e.type === 'click' || ('key' in e && (e.key === 'Enter' || e.key === ' '))) {
      e.preventDefault();
      onSelect(a);
    }
  };
  return (
    <div className="td-alerts__table">
      <table className="td-alerts__grid">
        <thead>
          <tr>
            <th>Plate Number</th>
            <th>Alert Name</th>
            <th>Severity</th>
            <th>Description</th>
            <th>Date &amp; Time</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const style = alertStyle(a.type);
            const on = alertKey(selected) === alertKey(a);
            const where = a.location || coords(a);
            return (
              <tr
                key={alertKey(a)}
                className={`tone-${style.tone} ${on ? 'is-active' : ''}`}
                tabIndex={0}
                aria-selected={on}
                onClick={(e) => choose(e, a)}
                onKeyDown={(e) => choose(e, a)}
              >
                <td className="td-alerts__plate">{a.plateNo}</td>
                <td>
                  <span className="td-alerts__type">
                    <span className="td-badge td-badge--solid td-alerts__icon">
                      <Icon name={style.icon} size={13} />
                    </span>
                    {a.label}
                  </span>
                </td>
                <td className="td-alerts__sev">
                  {severityOf(a.severity) ? <SeverityPill value={a.severity} /> : '—'}
                </td>
                <td className="td-alerts__desc" title={a.description || ''}>
                  {a.description || '—'}
                </td>
                <td className="td-alerts__time">{formatStamp(a.at)}</td>
                <td className="td-alerts__loc" title={where || ''}>
                  {where || '—'}
                </td>
              </tr>
            );
          })}
          {!rows.length && empty && (
            <tr>
              <td colSpan={6} className="td-empty">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** The original's demo history starts from the browser's own midnight (not the company's). */
function localMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
