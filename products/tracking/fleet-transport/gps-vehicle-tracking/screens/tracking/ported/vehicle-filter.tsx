// IT-0036. Converted from the original Tracking page (Tracking.html, removed in IT-0037 (git history)): same markup,
// class names, inline styles, texts and behaviour. Component and prop names are readable; short
// local names are kept from the original where they are plain intermediate values.
/* eslint-disable */
import { portalRoot } from '../runtime';
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { NO_EXTRAS } from '../../shared/gridExtras';
import { DeviceLocationExtras, PeopleExtras, SensorExtras } from '../extra-filters';
import { createPortal } from 'react-dom';
import { Icon } from '../icon';
import { statusOf } from './format';
import {
  FLOAT_MENU_CLASS,
  MultiSelect,
  TreeChecklist,
  formatNumber,
  identity,
  usePopover,
} from './kit';
import { positionAttrs } from './rows';

export const NO_QUERY = '';

export const STATUS_FIELD = 'status';

export const EMPTY_FILTER: any = {
  q: '',
  fields: {},
  picked: null,
  statuses: null,
};

export const VEHICLES_FIELD = 'vehicles';

export const NO_REF: any = {
  current: null,
};

export function VehiclePicker({ id: e, label, groups, selected, allIds, onChange }: any) {
  const a = useRef<any>(null),
    l = useRef<any>(null),
    [c, f] = useState<any>(null),
    p = allIds.filter((v?: any) => selected.has(v)).length,
    h =
      p === allIds.length
        ? `All ${label.toLowerCase()}s (${formatNumber(p)})`
        : p
          ? `${formatNumber(p)} selected`
          : `Select ${label}`,
    A = () => {
      const v = a.current?.getBoundingClientRect();
      if (!v) return;
      const y = window.innerHeight - v.bottom - 12,
        g = v.top - 12,
        E = y >= 340 || y >= g;
      f({
        left: Math.max(8, Math.min(v.left, document.documentElement.clientWidth - 280)),
        ...(E
          ? {
              top: v.bottom + 4,
            }
          : {
              bottom: window.innerHeight - v.top + 4,
            }),
        maxHeight: Math.max(180, Math.min(420, E ? y : g)),
      });
    };
  useEffect(() => {
    if (!c) return;
    const v = (g?: any) => {
        var b: any, w: any;
        const E = g.target;
        if (
          !((b = l.current) != null && b.contains(E)) &&
          !((w = a.current) != null && w.contains(E))
        ) {
          f(null);
        }
      },
      y = (g?: any) => {
        if (g.key === 'Escape') {
          {
            g.stopPropagation();
            f(null);
          }
        }
      };
    document.addEventListener('pointerdown', v);
    document.addEventListener('keydown', y, true);
    return () => {
      document.removeEventListener('pointerdown', v);
      document.removeEventListener('keydown', y, true);
    };
  }, [c]);
  return (
    <>
      <button
        ref={a}
        type="button"
        id={e}
        className={`td-ddl td-ddl--block ${p === allIds.length ? 'is-placeholder' : ''} ${c ? 'is-open' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={c !== null}
        onClick={() => (c ? f(null) : A())}
      >
        <span className="td-ddl__label">{h}</span>
        <Icon name="ChevronDown" size={15} className="td-ddl__chev" />
      </button>
      {c &&
        createPortal(
          <div
            ref={l}
            className={`td-msel td-msel--tree ${FLOAT_MENU_CLASS}`}
            role="dialog"
            aria-label={label}
            style={
              {
                top: c.top,
                bottom: c.bottom,
                left: c.left,
                maxHeight: c.maxHeight,
                ...identity({
                  '--tree-list-max': `${c.maxHeight - 104}px`,
                }),
              } as any
            }
          >
            <TreeChecklist
              id={`${e}-tree`}
              hideLabel={true}
              label={`${label}s`}
              placeholder={`Search ${label.toLowerCase()}s...`}
              groups={groups}
              selected={selected}
              onChange={onChange}
            />
            <div className="td-msel__foot">
              <span>
                {formatNumber(p)}
                {' selected'}
              </span>
              <button type="button" className="td-btn td-btn--primary" onClick={() => f(null)}>
                Done
              </button>
            </div>
          </div>,
          portalRoot(),
        )}
    </>
  );
}

export function keepsRow(e?: any, t?: any, n: any = t.picked && new Set<any>(t.picked)) {
  var i: any;
  const r = t.q.trim().toLowerCase();
  return (
    (!r || e.name.toLowerCase().includes(r) || (e.code ?? '').toLowerCase().includes(r)) &&
    (!n || n.has(e.id)) &&
    (!((i = t.statuses) != null && i.length) ||
      (e.status !== undefined && t.statuses.includes(e.status))) &&
    Object.entries(t.fields).every(([s, a]: any) => {
      return !a.length || a.includes(e.attrs?.[s] ?? NO_QUERY);
    })
  );
}

export function VehicleFilterPanel({
  id: e,
  title,
  entity,
  fields,
  statuses,
  markers,
  applied,
  status,
  onApply,
  onReset,
  onClose,
  single = false,
  checklist = true,
  sections,
  anchor,
  section,
  extras,
  place,
}: any) {
  var ze: any;
  const E = !!anchor,
    b = usePopover({
      open: E,
      anchor: anchor ?? NO_REF,
      section,
      onClose,
      keep: '.td-msel, .td-pop__menu--float',
    }),
    [w, x] = useState<any>(applied.fields),
    [S, W] = useState<any>(
      (ze = applied.statuses) != null && ze.length
        ? applied.statuses
        : status === 'all'
          ? []
          : [status],
    ),
    [O, C] = useState<any>(applied.picked && new Set<any>(applied.picked)),
    // IT-0053: draft of the added Grid View options (Submit applies, closing discards)
    [xv, xs] = useState<any>(extras?.applied ?? NO_EXTRAS),
    xd = extras && { value: xv, set: xs, geofences: extras.geofences },
    // IT-0053: own placement (`place()` gives top / right / height in window px)
    [pl, setPl] = useState<any>(null),
    k = `${entity.toLowerCase()}s`,
    z = useMemo<any>(() => {
      const se = new Map<any, any>();
      for (const R of markers) {
        const ue = R.group || `All ${k}`;
        se.set(ue, [...(se.get(ue) ?? []), R]);
      }
      return [...se.entries()]
        .sort(([R]: any, [ue]: any) =>
          R.localeCompare(ue, undefined, {
            numeric: true,
          }),
        )
        .map(([R, ue]: any) => ({
          id: R,
          label: R,
          items: ue.map((Ce?: any) => ({
            id: Ce.id,
            label: Ce.code || Ce.name,
          })),
        }));
    }, [markers, k]),
    B = useMemo<any>(() => markers.map((se?: any) => se.id), [markers]),
    J = useMemo<any>(() => O ?? new Set<any>(B), [O, B]),
    G =
      checklist ||
      !!(
        sections != null &&
        sections.some((se?: any) => se.fields.includes(VEHICLES_FIELD)) &&
        B.length
      ),
    $ = G && B.length > 0 && !B.some((se?: any) => J.has(se)),
    Z = () => {
      x({});
      W([]);
      C(null);
      xs(NO_EXTRAS);
      onReset();
    },
    Q = (
      <div key="td-trkf-status" className="td-trkf__row">
        <span className="td-badge tone-brand" aria-hidden="true">
          <Icon name="Activity" size={15} />
        </span>
        <label htmlFor={`td-trkf-${e}-status`}>
          {entity}
          {' Status'}
        </label>
        <MultiSelect
          id={`td-trkf-${e}-status`}
          value={S}
          placeholder={`Select ${entity.toLowerCase()} Status`}
          searchPlaceholder={`Search ${entity.toLowerCase()} status...`}
          aria-label={`${entity} Status`}
          onChange={W}
          options={statuses.map((se?: any) => ({
            value: se.id,
            label: se.label,
          }))}
        />
      </div>
    ),
    P = (se?: any) => (
      <div key={se.id} className="td-trkf__row">
        <span className="td-badge tone-brand" aria-hidden="true">
          {se.icon && <Icon name={se.icon} size={15} />}
        </span>
        <label htmlFor={`td-trkf-${e}-${se.id}`}>{se.label}</label>
        <MultiSelect
          id={`td-trkf-${e}-${se.id}`}
          value={w[se.id] ?? []}
          placeholder={se.placeholder ?? `Select ${se.label}`}
          searchPlaceholder={`Search ${se.label.toLowerCase()}...`}
          aria-label={se.label}
          disabled={!se.options.length}
          title={se.options.length ? undefined : `No ${se.label.toLowerCase()} recorded yet`}
          onChange={(R?: any) =>
            x((ue?: any) => ({
              ...ue,
              [se.id]: R,
            }))
          }
          options={se.options.map((R?: any) => ({
            value: R,
            label: R,
          }))}
        />
      </div>
    ),
    H = (se?: any) => {
      const R = w[se.id]?.[0] ?? '';
      return (
        <div key={se.id} className="td-trkf__toggle">
          <span className="td-trkf__tlabel" id={`td-trkf-${e}-${se.id}`}>
            {se.icon && (
              <span className="td-trkf__ticon tone-brand" aria-hidden="true">
                <Icon name={se.icon} size={12} />
              </span>
            )}
            {se.label}
          </span>
          <div className="td-trkf__seg" role="radiogroup" aria-labelledby={`td-trkf-${e}-${se.id}`}>
            {['', ...se.options].map((Ce?: any) => (
              <button
                key={Ce || 'all'}
                type="button"
                role="radio"
                aria-checked={R === Ce}
                className={R === Ce ? 'is-on' : ''}
                onClick={() =>
                  x((bt?: any) => ({
                    ...bt,
                    [se.id]: Ce ? [Ce] : [],
                  }))
                }
              >
                {Ce || 'All'}
              </button>
            ))}
          </div>
        </div>
      );
    },
    Y = (
      <div key="td-trkf-vehicles" className="td-trkf__row">
        <span className="td-badge tone-brand" aria-hidden="true">
          <Icon name="CarFront" size={15} />
        </span>
        <label htmlFor={`td-trkf-${e}-vehicles`}>{entity}</label>
        <VehiclePicker
          id={`td-trkf-${e}-vehicles`}
          label={entity}
          groups={z}
          selected={J}
          allIds={B}
          onChange={(se?: any) => C(B.every((R?: any) => se.has(R)) ? null : se)}
        />
      </div>
    ),
    te = (se?: any) => (se === STATUS_FIELD ? Q : se === VEHICLES_FIELD ? Y : null),
    j = new Map<any, any>(fields.map((se?: any) => [se.id, se])),
    fe = new Set<any>(sections?.flatMap((se?: any) => se.fields)),
    Ee = checklist && !fe.has(VEHICLES_FIELD);
  useLayoutEffect(() => {
    if (!place) return;
    const h = () => {
      const r = place();
      setPl((o?: any) =>
        r && o && o.top === r.top && o.right === r.right && o.height === r.height ? o : r,
      );
    };
    h();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [place]);
  const Ge = (
      <div
        ref={E ? b.ref : undefined}
        style={
          (E
            ? place
              ? {
                  position: 'fixed',
                  zIndex: 1200,
                  left: 'auto',
                  ...(pl ?? { visibility: 'hidden', top: 0, right: 0 }),
                }
              : b.style
            : undefined) as any
        }
        className={`td-trkf ${place ? 'is-placed' : ''} ${single ? 'is-single' : ''} ${sections ? 'has-sections' : ''} ${sections && Ee ? 'has-tree' : ''} ${E ? 'is-floating' : ''}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby={`td-trkf-${e}-title`}
        onKeyDown={(se?: any) => {
          if (se.key === 'Escape') {
            {
              se.stopPropagation();
              onClose();
            }
          }
        }}
      >
        <div className="td-trkf__head">
          <h3 id={`td-trkf-${e}-title`}>
            <Icon name="Funnel" size={16} /> {title}
          </h3>
          <button
            type="button"
            className="td-icon-btn td-icon-btn--sm"
            onClick={onClose}
            aria-label="Close filters"
          >
            <Icon name="X" size={15} />
          </button>
        </div>
        <form
          className="td-trkf__body"
          onSubmit={(se?: any) => {
            se.preventDefault();
            const R = B.filter((Ce?: any) => J.has(Ce)),
              ue = S.length > 1;
            onApply(
              {
                q: '',
                fields: w,
                picked: !G || R.length === B.length ? null : R,
                statuses: ue ? S : null,
              },
              ue ? 'all' : (S[0] ?? 'all'),
              xv,
            );
          }}
        >
          <div className="td-trkf__fields">
            {sections ? (
              <>
                {sections.map((se?: any) => {
                  const R = se.fields.filter(
                    (ue?: any) =>
                      ue === STATUS_FIELD || (ue === VEHICLES_FIELD && B.length > 0) || j.has(ue),
                  );
                  // IT-0053: the added options go into People and Sensors (shown even when
                  // the section has none of its own), then the Device and Location sections.
                  const xp = !!xd && se.title === 'People',
                    xsn = !!xd && se.title === 'Sensors';
                  return (
                    (R.length > 0 || xp || xsn) && (
                      <React.Fragment key={se.title}>
                        <section
                          className={`td-trkf__sec ${se.toggles ? 'is-toggles' : ''}`}
                          aria-label={se.title}
                        >
                          <h4 className="td-trkf__sechead">{se.title}</h4>
                          {se.toggles ? (
                            <div className="td-trkf__toggles">
                              {R.map((ue?: any) => te(ue) ?? H(j.get(ue)))}
                              {xsn && <SensorExtras id={e} d={xd} />}
                            </div>
                          ) : (
                            R.map((ue?: any) => te(ue) ?? P(j.get(ue)))
                          )}
                          {xp && <PeopleExtras id={e} d={xd} />}
                        </section>
                        {xsn && <DeviceLocationExtras id={e} d={xd} />}
                      </React.Fragment>
                    )
                  );
                })}
                {fields.filter((se?: any) => !fe.has(se.id)).map(P)}
                {!fe.has(STATUS_FIELD) && Q}
              </>
            ) : (
              <>
                {fields.map(P)}
                {Q}
              </>
            )}
          </div>
          {Ee && (
            <TreeChecklist
              id={`td-trkf-${e}-pick`}
              className="td-trkf__tree"
              hideLabel={true}
              label={`${entity}s`}
              placeholder={`Search ${k}...`}
              counts={!!sections}
              groups={z}
              selected={J}
              onChange={(se?: any) => C(B.every((R?: any) => se.has(R)) ? null : se)}
            />
          )}
          <div className="td-trkf__actions">
            <button type="button" className="td-btn td-btn--ghost" onClick={Z}>
              Reset
            </button>
            <button type="submit" className="td-btn td-btn--primary" disabled={$}>
              Submit
            </button>
          </div>
        </form>
      </div>
    );
  return E ? createPortal(Ge, portalRoot()) : Ge;
}

export const SENSOR_TOGGLES: any = [['ignition', 'KeyRound']];

export const TOGGLE_VALUES = new Set<any>(['On', 'Off', 'Open', 'Closed', 'Not reported']);

export function appliedCount(e?: any, t?: any) {
  var n: any;
  return (
    (t !== 'all' || ((n = e.statuses) != null && n.length) ? 1 : 0) +
    Object.values(e.fields).filter((r?: any) => r.length > 0).length +
    (e.picked !== null ? 1 : 0)
  );
}

export function filterValues(e?: any, t?: any, n?: any, r?: any, i?: any) {
  const s = i?.flatMap((f?: any) => f.fields) ?? [],
    a = [
      ...s,
      ...e.map((f?: any) => f.id).filter((f?: any) => !s.includes(f)),
      ...(s.includes(STATUS_FIELD) ? [] : [STATUS_FIELD]),
    ],
    l = new Map<any, any>(e.map((f?: any) => [f.id, f])),
    c = t.picked ? [`${t.picked.length} vehicle${t.picked.length === 1 ? '' : 's'}`] : [];
  return [
    ...a.flatMap((f?: any) => {
      if (f === STATUS_FIELD) return (n !== 'all' ? [n] : (t.statuses ?? [])).map(r);
      if (f === VEHICLES_FIELD) return c;
      const p = l.get(f);
      return p
        ? (t.fields[p.id] ?? []).map((h?: any) => (TOGGLE_VALUES.has(h) ? `${p.label} ${h}` : h))
        : [];
    }),
    ...(s.includes(VEHICLES_FIELD) ? [] : c),
  ];
}

export function toggleFields(e?: any) {
  const t = new Map<any, any>(e.map((n?: any) => [n.id, n]));
  return SENSOR_TOGGLES.flatMap(([n, r]: any) => {
    const i = t.get(n);
    return i
      ? [
          {
            id: n,
            label: i.label,
            icon: r,
            options: i.options.map((s?: any) => s.label),
          },
        ]
      : [];
  });
}

export function useCentralFilter(e?: any, t?: any, n?: any) {
  const [r, i] = useState<any>(EMPTY_FILTER),
    [s, a] = useState<any>('all'),
    [l, c] = useState<any>(false),
    f = useMemo<any>(() => {
      return [...(e.filters?.fields ?? []), ...toggleFields(n)];
    }, [e.filters, n]),
    p = useMemo<any>(
      () =>
        new Map<any, any>(
          n.map((E?: any) => [
            E.id,
            new Map<any, any>(E.options.map((b?: any) => [b.value, b.label])),
          ]),
        ),
      [n],
    ),
    h = useMemo<any>(() => {
      const E = new Map<any, any>();
      t.forEach((b?: any) => E.set(b.status.id, (E.get(b.status.id) ?? 0) + 1));
      return e.profile.order.map((b?: any) => {
        const w = statusOf(b, e.profile);
        return {
          id: b,
          label: `${w.label} (${formatNumber(E.get(b) ?? 0)})`,
          tone: w.tone,
        };
      });
    }, [t, e.profile]),
    A = useCallback(
      (E?: any) => {
        const b = {
          ...Object.fromEntries(
            Object.entries(positionAttrs(E.position, E.asset?.groupId)).map(([S, W]: any) => {
              return [S, p.get(S)?.get(W) ?? ''];
            }),
          ),
          ...e.filters?.attrs(E.id),
        };
        return keepsRow(
          {
            id: E.id,
            name: E.name,
            attrs: b,
            status: E.status.id,
          },
          r,
        );
      },
      [r, p, e.filters],
    ),
    v = useCallback((E?: any) => (s === 'all' || E.status.id === s) && A(E), [s, A]);
  return {
    applied: r,
    status: s,
    setStatus: a,
    open: l,
    setOpen: c,
    fields: f,
    statuses: h,
    sections: e.filters?.sections,
    count: appliedCount(r, s),
    values: filterValues(f, r, s, (E?: any) => statusOf(E, e.profile).label, e.filters?.sections),
    matches: A,
    keeps: v,
    apply: (E?: any, b?: any) => {
      i(E);
      a(b);
      c(false);
    },
    reset: () => {
      i(EMPTY_FILTER);
      a('all');
      c(false);
    },
  };
}
