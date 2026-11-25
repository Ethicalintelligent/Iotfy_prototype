// IT-0036. Converted from the original Tracking page (Tracking.html, removed in IT-0037 (git history)): same markup,
// class names, inline styles, texts and behaviour. Component and prop names are readable; short
// local names are kept from the original where they are plain intermediate values.
/* eslint-disable */
import React, { useMemo } from 'react';
import { useCan, useGroups, useLivePositions, useTrackingAssets } from '../runtime';
import { liveStatus, statusOf, useNow } from './format';

export function useTrackRows(e?: any, t: any = true, n: any = 0) {
  const { assetType: r, assets: i, profile: s, lastSeen: a } = e,
    l = e.noun.one,
    c = useNow(),
    f = useCan('tracking:live:view') && t,
    p = useCan('tracking:asset:view') && t,
    h = useLivePositions(r, f, n),
    A = useTrackingAssets(r, p && !i),
    v = i ?? A,
    y = i ? t : p;
  return {
    rows: useMemo<any>(() => {
      const E = new Map<any, any>(h.positions.map((x?: any) => [x.assetId, x])),
        b: any = [],
        w = new Set<any>();
      for (const x of v.data ?? []) {
        const S = E.get(x.id) ?? null;
        w.add(x.id);
        b.push({
          id: x.id,
          name: x.name,
          asset: x,
          position: S,
          status: S ? liveStatus(S, c, s, a?.(x.id)) : statusOf('never', s),
        });
      }
      for (const x of h.positions)
        w.has(x.assetId) ||
          b.push({
            id: x.assetId,
            name: `${l} ${x.assetId.slice(0, 8)}`,
            asset: null,
            position: x,
            status: liveStatus(x, c, s, a?.(x.assetId)),
          });
      return b.sort((x?: any, S?: any) =>
        x.name.localeCompare(S.name, undefined, {
          numeric: true,
        }),
      );
    }, [h.positions, v.data, c, l, s, a]),
    now: c,
    canLive: f,
    updatedAt: h.dataUpdatedAt,
    flush: h.flush,
    isPending: (f && h.isPending) || (y && v.isPending),
    isError: h.isError || v.isError,
    error: h.error ?? v.error,
    refetch: () => {
      h.refetch();
      v.refetch();
    },
  };
}

export function filterFieldsOf(e?: any) {
  return (e?.fields ?? [])
    .filter((t?: any) => t.options.length)
    .map((t?: any) => ({
      id: t.id,
      label: t.label,
      options: t.options.map((n?: any) => ({
        value: n,
        label: n,
      })),
    }));
}

export const UNGROUPED = '-';

export const SPEED_BANDS: any = [
  ['still', 'Stationary (0 km/h)', 0, 1],
  ['slow', '1–40 km/h', 1, 40],
  ['mid', '40–80 km/h', 40, 80],
  ['fast', '80+ km/h', 80, 1 / 0],
];

export const IGNITION_FIELD: any = {
  id: 'ignition',
  label: 'Ignition',
  options: [
    {
      value: 'on',
      label: 'On',
    },
    {
      value: 'off',
      label: 'Off',
    },
    {
      value: 'unknown',
      label: 'Not reported',
    },
  ],
};

export const SPEED_FIELD: any = {
  id: 'speed',
  label: 'Speed',
  options: SPEED_BANDS.map(([e, t]: any) => ({
    value: e,
    label: t,
  })),
};

export function positionAttrs(e?: any, t?: any) {
  const n = e ? Math.max(0, e.speed ?? 0) : null;
  return {
    group: (e?.groupId ?? t) || UNGROUPED,
    ignition: !e || e.ignition == null ? 'unknown' : e.ignition ? 'on' : 'off',
    speed: n == null ? '' : (SPEED_BANDS.find(([, , i, s]: any) => n >= i && n < s)?.[0] ?? ''),
  };
}

export function matchesFilters(e?: any, t?: any) {
  return Object.entries(t).every(([n, r]: any) => !r || e[n] === r);
}

export const hasFilters = (e?: any) => Object.values(e).some(Boolean);

export function useListFilterFields(e?: any, t: any = []) {
  const n = useGroups(useCan('admin:group:view')),
    r = [...new Set<any>(e.map((s?: any) => s || UNGROUPED))].sort().join('|'),
    i = useMemo<any>(() => {
      const s = r ? r.split('|') : [];
      if (s.length < 2) return null;
      const a = new Map<any, any>((n.data ?? []).map((c?: any) => [c.id, c.name]));
      return {
        id: 'group',
        label: 'Group',
        options: s
          .map((c?: any) => ({
            value: c,
            label: c === UNGROUPED ? 'Ungrouped' : (a.get(c) ?? `Group ${c.slice(0, 8)}`),
          }))
          .sort((c?: any, f?: any) =>
            c.value === UNGROUPED
              ? 1
              : f.value === UNGROUPED
                ? -1
                : c.label.localeCompare(f.label, undefined, {
                    numeric: true,
                  }),
          ),
      };
    }, [r, n.data]);
  return useMemo<any>(() => [...t, ...(i ? [i] : []), IGNITION_FIELD, SPEED_FIELD], [t, i]);
}
