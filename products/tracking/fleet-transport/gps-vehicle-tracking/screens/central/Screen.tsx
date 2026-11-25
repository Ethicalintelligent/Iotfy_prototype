// IT-0036. Tracking › Centralized Tracking, rebuilt in React from the owner's page
// (Centralized-Tracking.html, removed in IT-0037 (git history), the reference; root component NJ). Several vehicles on
// one screen: Live / History, status chips, picked-vehicle chips, map layouts (1, 2, 4 or 6 maps),
// vehicle and history filters, replay with playback, drawers and the vehicle overview.
// Vehicles come from Neon (fleet.ts); positions, tracks, telemetry and alerts are the original's
// demo generator applied to those vehicles (demo.ts), labelled "Demo data".
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScreenContext } from '@iotify/app-kit';
import { ErrorState, Icon, Loading, SmartTrackPage } from '../smart-track/kit';
import './central.css';
import './central.fix.css';
import './icons';
import { analyse, daysBetween, isoDay, longDay, replayWindow, type Day } from './analysis';
import { historyPoints, PROFILE } from './demo';
import { AlertsDrawer, DistanceDrawer } from './drawers';
import { useFleetRows, type Row } from './fleet';
import { HistoryFleet, LiveFleet } from './fleetViews';
import {
  DEFAULT_STATUSES,
  HistoryFilter,
  STOP_LIMITS,
  VehicleFilter,
  type FieldValues,
  type HistoryValue,
} from './filters';
import { Overview } from './overview';
import { Confirm, Seg, Share, useToast } from './parts';
import {
  HistoryTile,
  LiveTile,
  MAX_PICKED,
  Slot,
  TONES,
  usePlayback,
  type Item,
  type Span,
} from './tiles';

type Mode = 'live' | 'history';
type Layout = '1' | '2' | '4' | '6';

const STATUS_CHIPS = ['moving', 'stopped', 'idle', 'offline', 'overspeed', 'towed', 'never'];
const CHIP_LABEL: Record<string, string> = { offline: 'No Trans', never: 'YTT' };
const LAYOUTS: { id: Layout; label: string; sub: string; cols: number; rows: number }[] = [
  { id: '1', label: '1 Map', sub: 'Every vehicle on one map', cols: 1, rows: 1 },
  { id: '2', label: '2 Maps', sub: '2 columns', cols: 2, rows: 1 },
  { id: '4', label: '4 Maps', sub: '2 × 2 grid', cols: 2, rows: 2 },
  { id: '6', label: '6 Maps', sub: '3 columns × 2 rows', cols: 3, rows: 2 },
];
const layoutFor = (n: number): Layout => (n <= 2 ? '2' : n <= 4 ? '4' : '6');

interface View {
  tab: Mode;
  layout: Layout;
  ids: string[];
  chip: string;
  focus: string | null;
  from: string | null;
  to: string | null;
  date: string | null;
  stop: number;
  st: string[];
}
const START: View = {
  tab: 'live',
  layout: '1',
  ids: [],
  chip: 'all',
  focus: null,
  from: null,
  to: null,
  date: null,
  stop: 10,
  st: DEFAULT_STATUSES,
};

export default function CentralizedTrackingScreen({ companyId, assetGroup }: ScreenContext) {
  const fleet = useFleetRows(companyId, assetGroup ?? null);
  const toast = useToast();
  const [v, setV] = useState<View>(START);
  const set = useCallback((p: Partial<View>) => setV((x) => ({ ...x, ...p })), []);
  const [liveFilter, setLiveFilter] = useState(false);
  const [histFilter, setHistFilter] = useState(false);
  const [fields, setFields] = useState<FieldValues>({});
  const [clearing, setClearing] = useState(false);
  const [overview, setOverview] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<'distance' | 'alerts' | null>(null);
  const closeHist = useCallback(() => setHistFilter(false), []);
  const closeLive = useCallback(() => setLiveFilter(false), []);

  const mode = v.tab;
  const picked = v.ids;
  const shownIds = useMemo(() => picked.slice(0, MAX_PICKED), [picked]);
  const today = isoDay(new Date());
  const from = v.from ?? today;
  const to = v.to ?? from;
  const days = useMemo(() => daysBetween(from, to), [from, to]);
  const date = v.date && days.includes(v.date) ? v.date : days[days.length - 1]!;
  const stopLimit = STOP_LIMITS.includes(v.stop) ? v.stop : 10;

  // Each picked vehicle keeps its colour while it stays picked.
  const tones = useRef(new Map<string, string>());
  const toneOf = useMemo(() => {
    const m = new Map([...tones.current].filter(([id]) => shownIds.includes(id)));
    for (const id of shownIds)
      if (!m.has(id)) m.set(id, TONES.find((t) => ![...m.values()].includes(t)) ?? TONES[0]!);
    tones.current = m;
    return m;
  }, [shownIds]);

  const rowsById = useMemo(() => new Map(fleet.rows.map((r) => [r.id, r])), [fleet.rows]);
  const window_ = useMemo(() => replayWindow(date), [date]);
  const histDays = useMemo(() => {
    const m = new Map<string, Day | null>();
    if (mode !== 'history') return m;
    for (const id of shownIds) {
      const r = rowsById.get(id);
      m.set(
        id,
        analyse(historyPoints(id, window_.from.getTime(), window_.to.getTime()), {
          rangeEnd: window_.to.getTime(),
          profile: r?.vehicle.profile ?? PROFILE,
        }),
      );
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, shownIds.join(','), window_, rowsById.size]);
  const spans = useMemo(() => {
    const m = new Map<string, Span>();
    shownIds.forEach((id) => {
      const trips = histDays.get(id)?.trips ?? [];
      if (trips.length) m.set(id, { start: trips[0]!.start, end: trips[trips.length - 1]!.end });
    });
    return m;
  }, [shownIds, histDays]);
  const playOf = usePlayback(spans);

  useEffect(() => setDrawer(null), [mode]);

  if (fleet.isPending)
    return (
      <SmartTrackPage scope="st-central">
        <Loading label="Loading vehicles…" />
      </SmartTrackPage>
    );
  if (fleet.isError && !fleet.rows.length)
    return (
      <SmartTrackPage scope="st-central">
        <ErrorState
          message={fleet.error?.message ?? 'Something went wrong.'}
          onRetry={fleet.refetch}
        />
      </SmartTrackPage>
    );

  const items: Item[] = shownIds.flatMap((id) => {
    const r = rowsById.get(id);
    return r
      ? [{ row: r, tone: toneOf.get(id)!, code: r.vehicle.code, image: r.vehicle.image }]
      : [];
  });
  const inView = picked.length ? picked.flatMap((id) => rowsById.get(id) ?? []) : fleet.rows;
  const byChip = v.chip === 'all' ? inView : inView.filter((r) => r.status.id === v.chip);
  const tiles = Number(v.layout);
  const onGrid = v.layout === '1' ? items : items.slice(0, tiles);
  const onGridByChip = v.chip === 'all' ? onGrid : onGrid.filter((i) => i.row.status.id === v.chip);
  const focusLive = v.focus && byChip.some((r) => r.id === v.focus) ? v.focus : null;
  const focusHist = v.focus && shownIds.includes(v.focus) ? v.focus : (shownIds[0] ?? null);
  const focusedItem = items.find((i) => i.row.id === focusHist) ?? null;
  const focusedDay = focusHist ? (histDays.get(focusHist) ?? null) : null;
  const canClear = picked.length > 0 || v.chip !== 'all' || !!v.focus || v.from !== null;
  const overviewRow = overview ? rowsById.get(overview) : undefined;
  const tileActions = {
    onExpand: setOverview,
    onRemove: (id: string) => set({ ids: picked.filter((x) => x !== id) }),
  };

  const applyHistory = (h: HistoryValue) => {
    set({
      ids: h.ids,
      from: h.from === today ? null : h.from,
      to: h.to === h.from ? null : h.to,
      date: null,
      focus: null,
      stop: h.stopLimit,
      st: h.statuses,
      layout: h.ids.length > 1 && v.layout === '1' ? layoutFor(h.ids.length) : v.layout,
    });
    setHistFilter(false);
    toast.show(
      h.ids.length
        ? `History filter applied · ${h.ids.length} ${h.ids.length === 1 ? 'vehicle' : 'vehicles'}`
        : 'History filter reset',
    );
  };
  const clearAll = () => {
    setFields({});
    set({
      ids: [],
      chip: 'all',
      focus: null,
      from: null,
      to: null,
      date: null,
      stop: 10,
      st: DEFAULT_STATUSES,
    });
    setClearing(false);
    setDrawer(null);
    toast.show('Tracking selection cleared');
  };
  const pickDate = (d: string) => {
    if (!d || d > today) return;
    if (days.includes(d)) set({ date: d === days[days.length - 1] ? null : d });
    else set({ from: d === today ? null : d, to: null, date: null });
  };
  const share = (it: Item) => <Share subject={it.code || it.row.name} mode={mode} />;
  const focusedPlay = focusedItem ? playOf(focusedItem.row.id) : null;

  return (
    <SmartTrackPage scope="st-central">
      <div className={`mt-page vh-multitrack is-${mode} is-layout-${v.layout}`}>
        <div className="td-card mt-bar">
          <span className="mt-bar__tabs">
            <Seg
              label="Tracking mode"
              size="sm"
              value={mode}
              onChange={(t) => {
                set({ tab: t, focus: null });
                setDrawer(null);
                setHistFilter(false);
                setLiveFilter(false);
              }}
              options={[
                { id: 'live', label: 'Live' },
                { id: 'history', label: 'History' },
              ]}
            />
          </span>
          {mode === 'live' && (
            <StatusChips
              rows={inView}
              value={v.chip}
              onChange={(c) => set({ chip: c === 'all' ? 'all' : c, focus: null })}
            />
          )}
          <ul className="mt-chips" aria-label="Picked vehicles">
            {picked.length > MAX_PICKED ? (
              <li className="mt-chip mt-chip--sum">
                <Icon name="Truck" size={13} />
                <span className="mt-chip__pick">
                  <bdi className="mt-chip__name">{picked.length} vehicles</bdi>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    set({ ids: [] });
                    setFields({});
                  }}
                  aria-label="Show every vehicle"
                >
                  <Icon name="X" size={12} />
                </button>
              </li>
            ) : (
              items.map(({ row, tone }) => {
                const shown = onGrid.some((i) => i.row.id === row.id);
                return (
                  <li
                    key={row.id}
                    className={`mt-chip tone-${tone} ${row.id === (mode === 'history' ? focusHist : focusLive) ? 'is-focus' : ''} ${shown ? '' : 'is-off'}`}
                    title={shown ? undefined : `Not on a map in the ${tiles}-map layout`}
                  >
                    <i className="mt-swatch" aria-hidden="true" />
                    <button
                      type="button"
                      className="mt-chip__pick"
                      onClick={() => set({ focus: row.id })}
                      title={`Select ${row.name}`}
                    >
                      <bdi className="mt-chip__name">{row.vehicle.code || row.name}</bdi>
                    </button>
                    <button
                      type="button"
                      onClick={() => set({ ids: picked.filter((x) => x !== row.id) })}
                      aria-label={`Remove ${row.name}`}
                    >
                      <Icon name="X" size={12} />
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          <span className="mt-bar__tools">
            <LayoutPicker value={v.layout} onChange={(l) => set({ layout: l })} />
            <span className="mt-hf-anchor">
              <button
                type="button"
                className={`mt-tool-btn mt-filter-btn ${histFilter || liveFilter || picked.length ? 'is-on' : ''}`}
                aria-haspopup="dialog"
                aria-expanded={histFilter || liveFilter}
                aria-label={picked.length ? `Filters, ${picked.length} vehicles picked` : 'Filters'}
                title={mode === 'history' ? 'History filter' : 'Vehicle filters'}
                onClick={() =>
                  mode === 'history' ? setHistFilter((o) => !o) : setLiveFilter((o) => !o)
                }
              >
                <Icon name="Funnel" size={15} />
                {picked.length > 0 && <em aria-hidden="true">{picked.length}</em>}
              </button>
              {histFilter && mode === 'history' && (
                <HistoryFilter
                  value={{ ids: shownIds, from, to, stopLimit, statuses: v.st }}
                  rows={fleet.rows}
                  onApply={applyHistory}
                  onClose={closeHist}
                />
              )}
              {liveFilter && mode === 'live' && (
                <VehicleFilter
                  rows={fleet.rows}
                  value={{ fields, ids: picked.length ? picked : null }}
                  onClose={closeLive}
                  onApply={(f) => {
                    setFields(f.fields);
                    set({ ids: f.ids ?? [] });
                    toast.show(
                      f.ids
                        ? `Vehicle filter applied · ${f.ids.length} ${f.ids.length === 1 ? 'vehicle' : 'vehicles'}`
                        : 'Showing every vehicle',
                    );
                  }}
                />
              )}
            </span>
            <button
              type="button"
              className="td-btn td-btn--ghost mt-clear"
              disabled={!canClear}
              onClick={() => setClearing(true)}
            >
              <Icon name="RotateCcw" size={14} />
              Clear
            </button>
          </span>
        </div>

        {mode === 'history' && shownIds.length > 0 && (
          <div className="td-play mt-play">
            {days.length > 1 ? (
              <span className="mt-days" role="group" aria-label="Day to replay">
                {days.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`mt-day ${d === date ? 'is-on' : ''}`}
                    aria-pressed={d === date}
                    onClick={() => pickDate(d)}
                  >
                    {new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </button>
                ))}
              </span>
            ) : (
              <span className="mt-day is-on is-static">
                <Icon name="CalendarDays" size={13} />
                {longDay(date)}
              </span>
            )}
            <span className="mt-play__tools">
              <button
                type="button"
                className={`mt-tool-btn ${drawer === 'distance' ? 'is-on' : ''}`}
                disabled={!focusedDay}
                onClick={() => setDrawer('distance')}
                aria-label="Distance and duration"
                title={
                  focusedItem
                    ? `Distance & Duration · ${focusedItem.code || focusedItem.row.name}`
                    : 'Distance & Duration'
                }
              >
                <Icon name="Timer" size={15} />
              </button>
              <button
                type="button"
                className={`mt-tool-btn ${drawer === 'alerts' ? 'is-on' : ''}`}
                disabled={!focusedItem}
                onClick={() => setDrawer('alerts')}
                aria-label="Alerts"
                title={
                  focusedItem ? `Alerts · ${focusedItem.code || focusedItem.row.name}` : 'Alerts'
                }
              >
                <Icon name="Bell" size={15} />
              </button>
              {focusedItem && !focusedPlay?.playing && share(focusedItem)}
            </span>
          </div>
        )}

        <div className={`mt-work td-card ${v.layout === '1' ? 'is-single' : ''}`}>
          <span className="mt-demo-note">Demo data</span>
          {mode === 'history' && !shownIds.length ? (
            <div className="mt-empty">
              <span className="mt-slot__art" aria-hidden="true">
                <Icon name="History" size={28} />
              </span>
              <strong>Pick vehicles to replay their history</strong>
              <small>
                Choose up to {MAX_PICKED} vehicles and up to 7 days in the History filter.
              </small>
              <button
                type="button"
                className="td-btn td-btn--primary"
                onClick={() => setHistFilter(true)}
              >
                <Icon name="Funnel" size={14} />
                Open history filter
              </button>
            </div>
          ) : v.layout === '1' ? (
            mode === 'live' ? (
              <LiveFleet
                rows={byChip}
                focusId={focusLive}
                onFocus={(id) => set({ focus: id })}
                fitKey={`fleet:${v.chip}:${picked.join(',')}`}
                telemetryOf={fleet.telemetry}
                onOverview={setOverview}
              />
            ) : (
              <HistoryFleet
                items={items}
                days={histDays}
                date={date}
                playOf={playOf}
                focusId={focusHist}
                onFocus={(id) => set({ focus: id })}
                statuses={v.st}
                stopLimit={stopLimit}
                telemetryOf={fleet.telemetry}
                actions={(it) => (playOf(it.row.id)?.playing ? null : share(it))}
              />
            )
          ) : (
            <div className={`mt-grid mt-grid--${v.layout}`}>
              {(mode === 'history' ? onGrid : onGridByChip).map((it) =>
                mode === 'history' ? (
                  <HistoryTile
                    key={it.row.id}
                    item={it}
                    profile={it.row.vehicle.profile}
                    date={date}
                    day={histDays.get(it.row.id) ?? null}
                    play={playOf(it.row.id)}
                    actions={tileActions}
                    small={tiles >= 4}
                  />
                ) : (
                  <LiveTile
                    key={it.row.id}
                    item={it}
                    profile={it.row.vehicle.profile}
                    actions={tileActions}
                    small={tiles >= 4}
                  />
                ),
              )}
              {(mode === 'history' || v.chip === 'all') &&
                Array.from(
                  { length: tiles - (mode === 'history' ? onGrid : onGridByChip).length },
                  (_, i) => (
                    <Slot
                      key={`slot-${i}`}
                      place={onGrid.length + i}
                      onPick={() =>
                        mode === 'history' ? setHistFilter(true) : setLiveFilter(true)
                      }
                    />
                  ),
                )}
              {mode === 'live' && v.chip !== 'all' && !onGridByChip.length && (
                <p className="mt-grid__none">
                  None of the picked vehicles is{' '}
                  {v.chip === 'never' ? 'yet to transmit' : 'in this status'} now.
                </p>
              )}
            </div>
          )}
        </div>

        {drawer && focusedItem && (
          <div className="mt-drawer" role="presentation">
            <div className="mt-drawer__scrim" onClick={() => setDrawer(null)} />
            <aside
              className="mt-drawer__panel"
              aria-label={drawer === 'distance' ? 'Distance and duration' : 'Alerts'}
            >
              {drawer === 'distance' && focusedDay && (
                <DistanceDrawer
                  day={focusedDay}
                  row={focusedItem.row}
                  profile={focusedItem.row.vehicle.profile}
                  image={focusedItem.image}
                  date={date}
                  today={today}
                  onDate={pickDate}
                  onClose={() => setDrawer(null)}
                />
              )}
              {drawer === 'alerts' && (
                <AlertsDrawer
                  from={window_.from}
                  to={window_.to}
                  row={focusedItem.row}
                  profile={focusedItem.row.vehicle.profile}
                  image={focusedItem.image}
                  date={date}
                  today={today}
                  onDate={pickDate}
                  onClose={() => setDrawer(null)}
                />
              )}
            </aside>
          </div>
        )}
        {clearing && (
          <Confirm
            title="Clear tracking selection?"
            icon="RotateCcw"
            confirmLabel="Clear all"
            message="This removes every picked vehicle and resets the status filter and the history period."
            onConfirm={clearAll}
            onCancel={() => setClearing(false)}
          />
        )}
        {overviewRow && (
          <Overview
            row={overviewRow}
            tab={mode}
            date={mode === 'history' ? date : undefined}
            operators={[
              ...new Set(
                fleet.rows.map((r) => r.vehicle.operator?.name.trim() ?? '').filter(Boolean),
              ),
            ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))}
            onClose={() => setOverview(null)}
          />
        )}
        {toast.node}
      </div>
    </SmartTrackPage>
  );
}

function StatusChips({
  rows,
  value,
  onChange,
}: {
  rows: Row[];
  value: string;
  onChange: (v: string) => void;
}) {
  const counts = new Map<string, number>();
  rows.forEach((r) => counts.set(r.status.id, (counts.get(r.status.id) ?? 0) + 1));
  const STATUS_INFO: Record<string, { label: string; tone: string }> = {
    moving: { label: 'Running', tone: 'green' },
    stopped: { label: 'Stopped', tone: 'red' },
    idle: { label: 'Idle', tone: 'blue' },
    overspeed: { label: 'Overspeed', tone: 'orange' },
    towed: { label: 'Towed', tone: 'teal' },
    offline: { label: 'No Transmit', tone: 'dark' },
    never: { label: 'Yet to Transmit', tone: 'gray' },
  };
  const chips = [
    { id: 'all', label: 'All', tone: 'gray', n: rows.length },
    ...STATUS_CHIPS.filter((s) => PROFILE.order.includes(s as never)).map((s) => ({
      id: s,
      label: CHIP_LABEL[s] ?? STATUS_INFO[s]!.label,
      tone: STATUS_INFO[s]!.tone,
      n: counts.get(s) ?? 0,
    })),
  ];
  return (
    <div className="mt-stchips" role="group" aria-label="Vehicle status">
      {chips.map((c) => {
        const on = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            className={`mt-stchip tone-${c.tone} ${on ? 'is-on' : ''} ${c.id === 'all' ? 'is-all' : ''}`}
            aria-pressed={on}
            onClick={() => onChange(on && c.id !== 'all' ? 'all' : c.id)}
            title={`${c.label}: ${c.n.toLocaleString()}`}
          >
            {c.id !== 'all' && <i className="td-dot" aria-hidden="true" />}
            <span>{c.label}</span>
            <b>{c.n.toLocaleString()}</b>
          </button>
        );
      })}
    </div>
  );
}

function LayoutPicker({ value, onChange }: { value: Layout; onChange: (l: Layout) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', down);
    window.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      window.removeEventListener('keydown', key);
    };
  }, [open]);
  const cur = LAYOUTS.find((l) => l.id === value)!;
  return (
    <div ref={box} className="mt-layout">
      <button
        type="button"
        className={`mt-tool-btn ${open || value !== '1' ? 'is-on' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Map layout: ${cur.label}`}
        title={`Map layout: ${cur.label}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="LayoutGrid" size={15} />
      </button>
      {open && (
        <div className="mt-layout__menu" role="menu">
          {LAYOUTS.map((l) => {
            const on = l.id === value;
            return (
              <button
                key={l.id}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                className={`mt-layout__item ${on ? 'is-on' : ''}`}
                onClick={() => {
                  onChange(l.id);
                  setOpen(false);
                }}
              >
                <span
                  className="mt-layout__mini"
                  style={{
                    gridTemplateColumns: `repeat(${l.cols}, 1fr)`,
                    gridTemplateRows: `repeat(${l.rows}, 1fr)`,
                  }}
                  aria-hidden="true"
                >
                  {Array.from({ length: l.cols * l.rows }, (_, i) => (
                    <i key={i} />
                  ))}
                </span>
                <span className="mt-layout__text">
                  <strong>{l.label}</strong>
                  <small>{l.sub}</small>
                </span>
                {on && <Icon name="Check" size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
