// IT-0037. Tracking › Grid View, built in React to the approved Grid View design (the admin's
// Vehicle-Grid-View-standalone.html + PDF): status pills (IT-0053, was a dropdown), vehicle search,
// filter, sort and grid/list in the IoTIFY
// header row (HeaderSlot, the recorded exception in this product's CLAUDE.md), compact vehicle cards
// that flip to their sensors, list view, Vehicle Filters drawer, 12 per page.
// Vehicles, operators, people, groups and geofences come from Neon through @iotify/data; status,
// speed, location, indicators, sensors, alerts and last update are the design's demo activity
// applied to those vehicles (demo.ts), labelled "Demo data" (root CLAUDE.md §8).
import { useEffect, useMemo, useRef, useState } from 'react';
import { HeaderSlot, type ScreenContext } from '@iotify/app-kit';
import { ViewControls, type Menu } from './Controls';
import { StatusPills, type PillKey } from '../shared/StatusPills';
import { withDemoActivity } from './demo';
import { FilterPanel, type Choice, type FilterOptions } from './FilterPanel';
import { Pagination } from './Pagination';
import { useFleetData } from './useFleetData';
import { useThemedTooltips } from './useThemedTooltips';
import { VehicleCard, type CardAction } from './VehicleCard';
import { VehicleList } from './VehicleList';
import { PAGE_TEXT, PageFrame } from './PageFrame';
import {
  activeCountOf,
  DEFAULT_FILTERS,
  matches,
  PAGE_SIZE,
  sameFilters,
  SORTERS,
  type Filters,
  type SortKey,
  type GridVehicle,
  type StatusChoice,
} from './model';
import './grid-font.css';
import './grid.css';
import '../shared/header-26.css';

const SCOPE = 'st-grid';

/* IT-0053: the header status pills (shared with Map View and Tracking) and Grid View's statuses */
const PILL_STATUS: Record<PillKey, StatusChoice> = {
  all: 'all',
  running: 'Running',
  stopped: 'Stopped',
  idle: 'Idle',
  notrans: 'No Transmit',
  over: 'Overspeed',
  towed: 'Towed',
  ytt: 'Yet to Transmit',
};
const PILL_KEYS = Object.keys(PILL_STATUS) as PillKey[];

/** IT-0053: the header vehicle search looks in number, plate, operator, location, type and group. */
const searchText = (v: GridVehicle) =>
  [v.name, v.plate, v.operator, v.location, v.typeLabel, v.group].join(' ').toLowerCase();

const distinct = (xs: string[]) =>
  [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
function counted(values: string[]): Choice[] {
  return distinct(values).map((v) => ({
    value: v,
    label: v,
    count: values.filter((x) => x === v).length,
  }));
}

const MESSAGE = {
  padding: '48px 16px',
  textAlign: 'center',
  color: '#6B7685',
  fontSize: 13,
} as const;
const LINK_BUTTON = {
  border: 'none',
  background: 'transparent',
  color: '#0E7F5E',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  textDecoration: 'underline',
  cursor: 'pointer',
} as const;

export default function GridScreen({ companyId, assetGroup, onNavigate }: ScreenContext) {
  const data = useFleetData(companyId, assetGroup);
  const [now] = useState(() => Date.now());
  const vehicles = useMemo(
    () => withDemoActivity(data.vehicles, data.fencesOf, now),
    [data.vehicles, data.fencesOf, now],
  );

  const [status, setStatus] = useState<StatusChoice>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<SortKey>('no');
  const [page, setPage] = useState(0);
  const [menu, setMenu] = useState<Menu>(null);
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [justFlipped, setJustFlipped] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const toTop = useRef(false);

  useThemedTooltips(`.${SCOPE}`);

  // Esc closes the open menu or the filter drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles.filter((v) => matches(v, applied) && (!q || searchText(v).includes(q)));
  }, [vehicles, applied, query]);
  const counts = useMemo(() => {
    const c: Partial<Record<StatusChoice, number>> = {};
    for (const v of base) c[v.status] = (c[v.status] ?? 0) + 1;
    return c;
  }, [base]);
  const list = useMemo(
    () =>
      (status === 'all' ? base : base.filter((v) => v.status === status))
        .slice()
        .sort(SORTERS[sort]),
    [base, status, sort],
  );
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const shownPage = Math.min(page, pageCount - 1);
  const rows = list.slice(shownPage * PAGE_SIZE, shownPage * PAGE_SIZE + PAGE_SIZE);
  const activeCount = activeCountOf(applied);

  // Status, sort and page changes start the grid at the top.
  useEffect(() => {
    if (toTop.current && scroller.current) scroller.current.scrollTop = 0;
    toTop.current = false;
  });

  const options: FilterOptions = useMemo(
    () => ({
      managers: distinct(vehicles.map((v) => v.fleetManager)),
      supervisors: distinct(vehicles.map((v) => v.supervisor)),
      operators: distinct(vehicles.map((v) => v.operator).filter((o) => o !== 'Not Assigned')),
      geofences: data.fences.map((f) => ({ value: f.id, label: f.name })),
      vehicleTypes: counted(vehicles.map((v) => v.typeLabel)),
      groups: counted(vehicles.map((v) => v.group)),
      fleets: distinct(vehicles.map((v) => v.group)).map((name) => ({
        name,
        plates: vehicles.filter((v) => v.group === name).map((v) => v.plate),
      })).concat(
        // vehicles in no group: listed after the fleets, without a fleet row
        vehicles.some((v) => !v.group)
          ? [{ name: '', plates: vehicles.filter((v) => !v.group).map((v) => v.plate) }]
          : [],
      ),
    }),
    [vehicles, data.fences],
  );

  const jumpTo = (apply: () => void) => {
    toTop.current = true;
    apply();
  };
  const openMenu = (m: Menu) => setMenu(m);
  const clearAll = () => {
    setStatus('all');
    setQuery('');
    setApplied(DEFAULT_FILTERS);
    setDraft(DEFAULT_FILTERS);
    setPage(0);
  };
  const runAction = (a: CardAction) => {
    if (onNavigate) onNavigate(a.page);
    else setToast(`${a.label} opens ${a.page} in the IoTIFY app`);
  };

  // The header controls carry the page's style scope; the scope's page rules (height, background,
  // overflow: hidden) must not apply to them, or their menus would be cut off.
  const headerScope = { className: SCOPE, 'data-st': '' };
  const headerBox = {
    ...PAGE_TEXT,
    position: 'relative',
    height: 'auto',
    overflow: 'visible',
    background: 'transparent',
    alignItems: 'center',
    zIndex: 20,
  } as const;

  let content;
  if (data.isPending) content = <div style={MESSAGE}>Loading vehicles…</div>;
  else if (data.error && !data.vehicles.length)
    content = (
      <div style={MESSAGE}>
        {data.error.message}{' '}
        <button type="button" onClick={data.refetch} style={LINK_BUTTON}>
          Retry
        </button>
      </div>
    );
  else if (!list.length)
    content = (
      <div style={MESSAGE}>
        {vehicles.length ? 'No vehicles match these filters. ' : 'No vehicles yet. '}
        {vehicles.length > 0 && (
          <button type="button" onClick={clearAll} style={LINK_BUTTON}>
            Clear filters
          </button>
        )}
      </div>
    );
  else if (view === 'grid')
    content = (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: 8,
          alignItems: 'start',
          padding: 0,
        }}
      >
        {rows.map((v) => (
          <VehicleCard
            key={v.id}
            vehicle={v}
            flipped={!!flipped[v.id]}
            justFlipped={justFlipped === v.id}
            onFlip={() => {
              setFlipped({ ...flipped, [v.id]: !flipped[v.id] });
              setJustFlipped(v.id);
            }}
            onFlipShown={() => setJustFlipped(null)}
            onAction={runAction}
          />
        ))}
      </div>
    );
  else content = <VehicleList vehicles={rows} />;

  return (
    <PageFrame scope={SCOPE}>
      <HeaderSlot side="left">
        <section
          aria-label="Status filter"
          {...headerScope}
          style={{ ...headerBox, display: 'flex' }}
        >
          <StatusPills
            page="grid"
            active={PILL_KEYS.find((k) => PILL_STATUS[k] === status) ?? 'all'}
            counts={Object.fromEntries(
              PILL_KEYS.map((k) => [k, k === 'all' ? base.length : (counts[PILL_STATUS[k]] ?? 0)]),
            )}
            onPick={(k) =>
              jumpTo(() => {
                setStatus(PILL_STATUS[k]);
                setPage(0);
                setMenu(null);
              })
            }
          />
        </section>
      </HeaderSlot>
      <HeaderSlot side="right">
        <section
          aria-label="View controls"
          {...headerScope}
          style={{ ...headerBox, display: 'flex', gap: 8 }}
        >
          <ViewControls
            menu={menu}
            query={query}
            onQuery={(q) =>
              jumpTo(() => {
                setQuery(q);
                setPage(0);
              })
            }
            activeCount={activeCount}
            sort={sort}
            view={view}
            onMenu={openMenu}
            onSort={(k) =>
              jumpTo(() => {
                setSort(k);
                setPage(0);
                setMenu(null);
              })
            }
            onView={setView}
          />
        </section>
      </HeaderSlot>

      <div
        style={{
          height: '100%',
          boxSizing: 'border-box',
          // IT-0053: 10px from the 26px header controls (7px above the header row's edge) to the cards
          padding: '3px 8px 8px',
          display: 'flex',
          gap: 8,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* vehicles panel (+ filter drawer spanning its full height on the right) */}
          <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
            <section
              aria-label="Vehicles"
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                ref={scroller}
                className="vgv-scroll"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  margin: '-3px -8px -3px -3px',
                  padding: '3px 8px 3px 3px',
                }}
              >
                {content}
              </div>
              {list.length > 0 && (
                <Pagination
                  page={shownPage}
                  pageCount={pageCount}
                  total={list.length}
                  onPage={(i) => jumpTo(() => setPage(i))}
                />
              )}
            </section>
            {menu === 'filter' && (
              <FilterPanel
                draft={draft}
                applied={applied}
                options={options}
                onDraft={(patch) => setDraft({ ...draft, ...patch })}
                onReset={() => {
                  setDraft(DEFAULT_FILTERS);
                  setApplied(DEFAULT_FILTERS);
                  setPage(0);
                }}
                onSubmit={() => {
                  if (sameFilters(draft, applied)) return;
                  setApplied(draft);
                  setPage(0);
                }}
                onClose={() => setMenu(null)}
              />
            )}
          </div>
        </div>
      </div>
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 20,
            transform: 'translateX(-50%)',
            animation: 'vgvToast .2s ease-out',
            zIndex: 50,
            padding: '10px 14px',
            borderRadius: 10,
            background: '#0B1B2B',
            color: '#fff',
            fontSize: 12.5,
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(1,29,50,.25)',
          }}
        >
          {toast}
        </div>
      )}
    </PageFrame>
  );
}
