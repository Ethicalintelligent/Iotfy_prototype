// IT-0036. Converted from the original Tracking page (Tracking.html, removed in IT-0037 (git history)): same markup,
// class names, inline styles, texts and behaviour. Component and prop names are readable; short
// local names are kept from the original where they are plain intermediate values.
/* eslint-disable */
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Loading } from '../../smart-track/kit';
import { Icon } from '../icon';
import { QueryError, useSearchParams } from '../runtime';
import { TICK_MS, ago, profileFor, statusOf, useNow } from './format';
import { TrackHistory } from './history';
import {
  EntityMedia,
  FilterButton,
  ListFilters,
  Pill,
  SearchBox,
  Segmented,
  StatusSelect,
  WidgetCard,
  formatNumber,
} from './kit';
import { LiveTrack } from './live';
import {
  filterFieldsOf,
  hasFilters,
  matchesFilters,
  positionAttrs,
  useListFilterFields,
  useTrackRows,
} from './rows';
import { VehicleFilterPanel, useCentralFilter } from './vehicle-filter';

export const TRACK_TABS: any = [
  {
    id: 'live',
    label: 'Live Track',
    icon: 'Navigation',
  },
  {
    id: 'history',
    label: 'Track History',
    icon: 'Route',
  },
];

export const driverLabel = (e?: any) => (e.name ? `${e.name} (ID: ${e.id || '—'})` : 'Unassigned');

export const mediaRow = (e?: any, t?: any) => {
  return {
    name: t.name,
    thumb: e.profile.thumb,
    image: e.image?.(t),
  };
};

export const NO_GROUP_FIELDS: any = [];

export const NO_MARKERS: any = [];

export function rowMedia(e?: any, t?: any, n?: any, r?: any) {
  const i = <EntityMedia row={mediaRow(e, t)} tone={t.status.tone} size={n} />;
  return r ? r(t.id, i, n) : i;
}

export const subtitleOf = (e?: any, t?: any) => {
  return e.driverOf ? driverLabel(e.driverOf(t.id)) : e.code?.(t);
};

export function VehicleItem({ kind, row, active, onSelect, renderMedia, now }: any) {
  const a = subtitleOf(kind, row),
    l = row.position,
    c =
      l &&
      `Last update: ${ago(l.ts, now)}${row.status.id === 'offline' ? '' : ` · ${formatNumber(Math.round(l.speed ?? 0))} km/h`}`;
  return (
    <button
      type="button"
      className={`td-tpage__item tone-${row.status.tone} ${active ? 'is-active' : ''}`}
      aria-pressed={active}
      onClick={onSelect}
    >
      {rowMedia(kind, row, 30, renderMedia)}
      <span className="td-gv-card__who">
        <strong>{row.name}</strong>
        <small title={a}>{a}</small>
      </span>
      <span className="td-tpage__state" title={c || undefined}>
        <i className="td-dot" />
        {row.status.label}
      </span>
      {kind.listExtra && <span className="td-tpage__extra">{kind.listExtra(row)}</span>}
    </button>
  );
}

export function TrackerHead({ kind, row, tab, onTab, renderMedia, children }: any) {
  return (
    <header className="td-tracker__head">
      {rowMedia(kind, row, 40, renderMedia)}
      <span className="td-gv-card__who">
        <strong>{row.name}</strong>
        <small>{kind.code?.(row)}</small>
      </span>
      <Pill tone={row.status.tone}>{row.status.label}</Pill>
      <span className="td-tracker__tabs">
        <Segmented
          label="Tracking view"
          size="sm"
          value={tab}
          onChange={onTab}
          options={TRACK_TABS}
        />
      </span>
      {children}
    </header>
  );
}

export function TrackBody({ kind, row, tab, date, head }: any) {
  const s = profileFor(kind.profile, row.id),
    a = kind.marker?.(row.id),
    l = kind.vehicleInfo?.(row.id),
    c = kind.filters?.fields.find((g?: any) => g.id === 'operator')?.options;
  return tab === 'history' ? (
    <TrackHistory
      key={row.id}
      row={row}
      profile={s}
      initialDate={date}
      assetType={kind.assetType}
      image={kind.image?.(row)}
      marker={a}
      info={l}
      head={head}
      operators={c}
      operatorLog={kind.operatorLog}
    />
  ) : (
    <LiveTrack
      key={row.id}
      row={row}
      profile={s}
      fields={kind.details?.(row)}
      marker={a}
      info={l}
      hidden={kind.hiddenDetails}
      head={head}
    />
  );
}

export function TrackingPage({ kind, renderMedia, mapHeader = false, centralFilter = false }: any) {
  const i = useTrackRows(kind, true, TICK_MS),
    s = useNow(TICK_MS),
    [a, l] = useSearchParams(),
    [c, f] = useState<any>(''),
    [p, h] = useState<any>('all'),
    [A, v] = useState<any>({}),
    [y, g] = useState<any>(false),
    E = useRef<any>(null),
    b = useMemo<any>(() => filterFieldsOf(kind.filters), [kind.filters]),
    w = useListFilterFields(
      i.rows.map((R?: any) => {
        return R.position?.groupId ?? R.asset?.groupId ?? null;
      }),
      NO_GROUP_FIELDS,
    ),
    x = useMemo<any>(() => [...b, ...w], [b, w]),
    S = useCentralFilter(kind, i.rows, w),
    W = a.get('tab') === 'history' ? 'history' : 'live',
    O = a.get('date') ?? undefined,
    C = (R?: any) =>
      l(
        (ue?: any) => {
          const Ce = new URLSearchParams(ue);
          Object.entries(R).forEach(([bt, q]: any) => (q == null ? Ce.delete(bt) : Ce.set(bt, q)));
          return Ce;
        },
        {
          replace: true,
        },
      );
  // IT-0039 (bug sheet 23-11-2026, Track History #2): after the vehicle filters are applied, the
  // page opens the first vehicle that matches them when the open one does not, so the list and
  // the tracked vehicle follow the chosen status (it used to stay on a non-matching vehicle,
  // pinned above the results).
  const shownRef = useRef<any>({ list: [], open: null }),
    filterKey = centralFilter ? JSON.stringify([S.applied, S.status]) : '';
  useEffect(() => {
    const { list, open } = shownRef.current;
    if (!centralFilter || !S.count || !list.length || (open && list.includes(open))) return;
    C({
      asset: list[0].id,
      date: null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);
  if (i.isPending) return <Loading label={`Loading ${kind.noun.many.toLowerCase()}…`} />;
  if (i.isError && !i.rows.length) return <QueryError error={i.error} onRetry={i.refetch} />;
  const k = i.rows,
    z = k.find((R?: any) => R.id === a.get('asset')) ?? k.find((R?: any) => R.position) ?? k[0],
    B = kind.noun.many.toLowerCase(),
    J = c.trim().toLowerCase(),
    G = kind.profile.order,
    $ = new Map<any, any>();
  k.forEach((R?: any) => $.set(R.status.id, ($.get(R.status.id) ?? 0) + 1));
  const Z = [
      {
        id: 'all',
        label: `All statuses (${formatNumber(k.length)})`,
      },
      ...G.map((R?: any) => ({
        id: R,
        label: `${statusOf(R, kind.profile).label} (${formatNumber($.get(R) ?? 0)})`,
      })),
    ],
    Q = (R?: any) => {
      return (
        !J ||
        `${R.name} ${kind.code?.(R) ?? ''} ${kind.driverOf ? subtitleOf(kind, R) : ''}`
          .toLowerCase()
          .includes(J)
      );
    },
    P = k.filter((R?: any) => {
      return (
        (centralFilter
          ? S.keeps(R)
          : (p === 'all' || R.status.id === p) &&
            matchesFilters(
              {
                ...positionAttrs(R.position, R.asset?.groupId),
                ...kind.filters?.attrs(R.id),
              },
              A,
            )) && Q(R)
      );
    }),
    H = Object.values(A).filter(Boolean).length;
  if (!z)
    return (
      <WidgetCard
        widget={{
          id: 'track',
          icon: 'Navigation',
          title: TRACK_TABS.find((R?: any) => R.id === W).label,
        }}
      >
        <p className="td-unavailable">
          {'No '}
          {B}
          {' to track.'}
        </p>
      </WidgetCard>
    );
  shownRef.current = { list: P, open: z };
  const Y = centralFilter && S.count > 0,
    te = centralFilter && !P.includes(z) && Q(z) ? z : null,
    j = kind.filters?.title ?? 'Filters',
    fe = centralFilter
      ? k.map((R?: any) => {
          return {
            id: R.id,
            name: R.name,
            code: kind.code?.(R),
            group: kind.filters?.group?.(R.id),
          };
        })
      : NO_MARKERS,
    Ee = centralFilter && (
      <>
        <span
          className="td-card__meta"
          title="Positions, trips and sensor readings are generated demo activity"
        >
          Demo data
        </span>
        <span ref={E} className="td-tpage__cfbtn">
          <FilterButton
            count={S.count}
            open={S.open}
            onClick={() => S.setOpen((R?: any) => !R)}
            title={j}
          />
        </span>
        {S.open && (
          <VehicleFilterPanel
            id="td-tpage-cf"
            title={j}
            entity={kind.noun.one}
            fields={S.fields}
            statuses={S.statuses}
            markers={fe}
            applied={S.applied}
            status={S.status}
            sections={S.sections}
            anchor={E}
            section={() => {
              return E.current?.closest('.td-tpage__list');
            }}
            onApply={S.apply}
            onReset={S.reset}
            onClose={() => S.setOpen(false)}
          />
        )}
      </>
    );
  return (
    <div className="td-tpage">
      <WidgetCard
        widget={{
          id: 'track-list',
          icon: kind.profile.icons.many,
          title: kind.noun.many,
          meta: centralFilter
            ? Y
              ? `${formatNumber(P.length)} / ${formatNumber(k.length)}`
              : formatNumber(k.length)
            : `${k.length}`,
        }}
        className={`td-tpage__list ${centralFilter ? 'has-cfilter' : ''}`}
        actions={Ee || undefined}
      >
        <SearchBox id="td-tpage-q" value={c} onChange={f} placeholder={`Search ${B}…`} />
        {centralFilter ? (
          Y && (
            <p
              className="td-tpage__filtered"
              title={`Filtered: ${S.values.join(', ')} · ${formatNumber(P.length)} shown`}
            >
              <span>Filtered:</span>
              <b>{S.values.join(', ')}</b>
              <span>
                {'· '}
                {formatNumber(P.length)}
                {' shown'}
              </span>
            </p>
          )
        ) : (
          <>
            <StatusSelect id="td-tpage-status" label="Status" value={p} onChange={h} options={Z} />
            <button
              type="button"
              className={`td-link gp-lfilters__toggle ${hasFilters(A) ? 'is-active' : ''}`}
              aria-expanded={y}
              onClick={() => g((R?: any) => !R)}
            >
              <Icon name="SlidersHorizontal" size={13} />
              {y ? 'Hide filters' : 'More filters'}
              {H ? ` (${H})` : ''}
            </button>
            {y && <ListFilters id="td-tpage-f" stacked={true} fields={x} values={A} onChange={v} />}
          </>
        )}
        <ul className="td-tpage__items">
          {(te ? [te, ...P] : P).map((R?: any) => (
            <li key={R.id}>
              <VehicleItem
                kind={kind}
                row={R}
                active={R.id === z.id}
                onSelect={() =>
                  C({
                    asset: R.id,
                    date: null,
                  })
                }
                renderMedia={renderMedia}
                now={s}
              />
            </li>
          ))}
          {!P.length && (
            <li className="td-trk__none">
              {'No '}
              {B}
              {' match the search or filters.'}
            </li>
          )}
        </ul>
      </WidgetCard>
      {mapHeader ? (
        <section className="td-card td-tpage__main is-split">
          <div className="td-tpage__body">
            <TrackBody
              kind={kind}
              row={z}
              tab={W}
              date={O}
              head={{
                media: rowMedia(kind, z, 30, renderMedia),
                title: kind.code?.(z) ?? z.name,
                tone: z.status.tone,
                status: z.status.label,
                type: kind.typeOf?.(z.id),
                tab: W,
                tabs: TRACK_TABS,
                onTab: (R?: any) =>
                  C({
                    tab: R === 'live' ? null : R,
                    date: null,
                  }),
              }}
            />
          </div>
        </section>
      ) : (
        <section className="td-card td-tpage__main">
          <TrackerHead
            kind={kind}
            row={z}
            tab={W}
            onTab={(R?: any) =>
              C({
                tab: R === 'live' ? null : R,
                date: null,
              })
            }
            renderMedia={renderMedia}
          />
          <div className="td-tpage__body">
            <TrackBody kind={kind} row={z} tab={W} date={O} />
          </div>
        </section>
      )}
    </div>
  );
}
