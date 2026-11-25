// IT-0036. Converted from the original Tracking page (Tracking.html, removed in IT-0037 (git history)): same markup,
// class names, inline styles, texts and behaviour. Component and prop names are readable; short
// local names are kept from the original where they are plain intermediate values.
/* eslint-disable */
import { keepPreviousData, useQueries, useQuery } from '../runtime';
import { GAP_MS, MOVING_KMH, VEHICLE_PROFILE, distanceMeters } from './format';
import { UNTRUSTED_FLAG, historyApi } from './speedometer';

export const historyQuery = (e?: any, t?: any, n?: any, r: any = true) => ({
  queryKey: ['tracking', 'history', e, t.toISOString(), n.toISOString()],
  queryFn: () => historyApi.get(e, t, n),
  enabled: r && !!e && n > t,
  staleTime: 1 / 0,
  gcTime: 5 * 6e4,
});

export function useHistory(e?: any, t?: any, n?: any, r: any = true, i: any = false) {
  return useQuery({
    ...historyQuery(e, t, n, r),
    placeholderData: i ? keepPreviousData : undefined,
  });
}

export function combineHistory(e?: any) {
  return {
    data: e.map((n?: any) => n.data),
    isPending: e.some((n?: any) => n.isPending),
    isError: e.some((n?: any) => n.isError),
    error: e.find((n?: any) => n.error)?.error ?? null,
    refetch: () =>
      e.forEach((n?: any) => {
        if (n.isError) {
          n.refetch();
        }
      }),
  };
}

export function useHistoryDays(e?: any, t?: any) {
  return useQueries({
    queries: t.map((n?: any) => historyQuery(e, n.from, n.to)),
    combine: combineHistory,
  });
}

export const STOP_MIN_MS = 3 * 6e4;

export const MAX_GAP_MS = GAP_MS;

export const round1 = (e?: any) => Math.round(e * 10) / 10;

export const toMinutes = (e?: any) => e / 6e4;

export function bearing(e?: any, t?: any) {
  const n = Math.PI / 180,
    r = Math.sin((t[1] - e[1]) * n) * Math.cos(t[0] * n),
    i =
      Math.cos(e[0] * n) * Math.sin(t[0] * n) -
      Math.sin(e[0] * n) * Math.cos(t[0] * n) * Math.cos((t[1] - e[1]) * n);
  return (Math.atan2(r, i) / n + 360) % 360;
}

export function cleanPoints(e?: any) {
  const t: any = [];
  let n = 0;
  for (const r of e) {
    if (r.flags & UNTRUSTED_FLAG) {
      n++;
      continue;
    }
    const i = Date.parse(r.ts),
      s = t[t.length - 1];
    if (s && i <= s.t) continue;
    const a = r.speed ?? (s ? (distanceMeters(s.at, [r.lat, r.lng]) / ((i - s.t) / 1e3)) * 3.6 : 0);
    t.push({
      t: i,
      at: [r.lat, r.lng],
      speed: a,
      heading: r.heading ?? null,
      ignition: r.ignition ?? null,
    });
  }
  return {
    points: t,
    untrusted: n,
  };
}

export function pathKm(e?: any) {
  let t = 0;
  for (let n = 1; n < e.length; n++) t += distanceMeters(e[n - 1].at, e[n].at);
  return t / 1e3;
}

export function analyzeTrack(
  e: any,
  { now = Date.now(), rangeEnd, profile = VEHICLE_PROFILE }: any,
) {
  const { points: i, untrusted: s } = cleanPoints(e),
    a = rangeEnd >= now && i.length > 0 && now - i[i.length - 1].t <= MAX_GAP_MS,
    l = (O?: any) => O.speed >= MOVING_KMH,
    c: any = [];
  let f: any = null;
  for (let O = 0; O < i.length; O++) {
    const C = i[O],
      k = i[O - 1];
    if (f && k && C.t - k.t > MAX_GAP_MS) {
      {
        c.push({
          from: f.from,
          to: f.lastMove,
        });
        f = null;
      }
    }
    if (l(C)) {
      if (f) {
        f.lastMove = O;
      } else {
        f = {
          from: k && C.t - k.t <= MAX_GAP_MS && !l(k) ? O - 1 : O,
          lastMove: O,
        };
      }
    } else {
      if (f && C.t - i[f.lastMove].t >= STOP_MIN_MS) {
        {
          c.push({
            from: f.from,
            to: Math.min(f.lastMove + 1, O),
          });
          f = null;
        }
      }
    }
  }
  const p = f !== null;
  if (f) {
    c.push({
      from: f.from,
      to: i.length - 1,
    });
  }
  const h = c
      .filter((O?: any) => O.to > O.from)
      .map((O?: any, C?: any, k?: any) => {
        const z = i.slice(O.from, O.to + 1),
          B = z[0].t,
          J = z[z.length - 1].t,
          G = pathKm(z),
          $ = (J - B) / 36e5,
          Z = a && p && C === k.length - 1;
        return {
          id: `trip-${B}`,
          index: C + 1,
          start: B,
          end: Z ? Math.max(J, now) : J,
          points: z,
          distanceKm: round1(G),
          maxSpeed: Math.round(Math.max(...z.map((Q?: any) => Q.speed))),
          avgSpeed: $ > 0 ? Math.round(G / $) : 0,
          durationMin: toMinutes(J - B),
          ongoing: Z,
        };
      }),
    A: any = [],
    v = (O?: any, C?: any, k?: any) => {
      const z = i.filter((G?: any) => G.t >= O && G.t <= C),
        B = z[0] ?? i.find((G?: any) => G.t >= O);
      if (!B || C - O < STOP_MIN_MS) return;
      let J = 0;
      for (let G = 1; G < z.length; G++) {
        const $ = z[G].t - z[G - 1].t;
        if ($ <= MAX_GAP_MS && z[G - 1].ignition === true) {
          J += $;
        }
      }
      A.push({
        id: `stop-${O}`,
        start: O,
        end: C,
        at: B.at,
        durationMin: toMinutes(C - O),
        idleMin: toMinutes(J),
        ongoing: k,
      });
    };
  if (i.length) {
    const O = i[0].t,
      C = i[i.length - 1].t;
    if (!h.length) v(O, a ? now : C, a);
    else {
      v(O, h[0].start, false);
      for (let z = 1; z < h.length; z++) v(h[z - 1].end, h[z].start, false);
      const k = h[h.length - 1];
      if (!k.ongoing) {
        v(k.end, a ? now : C, a);
      }
    }
  }
  const y: any = [];
  for (const O of h) {
    y.push({
      id: `${O.id}-start`,
      t: O.start,
      label: `Trip ${O.index} started`,
      icon: 'Play',
      tone: 'green',
      at: O.points[0].at,
    });
    if (!O.ongoing) {
      y.push({
        id: `${O.id}-end`,
        t: O.end,
        label: `Trip ${O.index} ended · ${O.distanceKm} km`,
        icon: 'Flag',
        tone: 'blue',
        at: O.points[O.points.length - 1].at,
      });
    }
  }
  let g = 0;
  for (let O = 1; O < i.length; O++) {
    const C = i[O - 1],
      k = i[O];
    if (profile.overspeed && k.speed > profile.overspeedKmh && C.speed <= profile.overspeedKmh) {
      {
        g++;
        y.push({
          id: `os-${k.t}`,
          t: k.t,
          label: 'Overspeed',
          icon: 'Gauge',
          tone: 'red',
          at: k.at,
          speed: Math.round(k.speed),
        });
      }
    }
    if (C.ignition != null && k.ignition != null && C.ignition !== k.ignition) {
      y.push({
        id: `ign-${k.t}`,
        t: k.t,
        label: k.ignition ? 'Ignition on' : 'Ignition off',
        icon: 'KeyRound',
        tone: k.ignition ? 'green' : 'gray',
        at: k.at,
      });
    }
  }
  y.sort((O?: any, C?: any) => C.t - O.t);
  const E: any = [],
    b = (O?: any) => h.some((C?: any) => O >= C.start && O < C.end);
  for (let O = 1; O < i.length; O++) {
    const C = i[O - 1],
      k = i[O];
    if (k.t - C.t > MAX_GAP_MS) continue;
    const z = b(C.t)
        ? 'moving'
        : C.ignition === false
          ? 'stopped'
          : C.ignition === true
            ? 'idle'
            : profile.ignition
              ? 'stopped'
              : 'idle',
      B = E[E.length - 1];
    if (B && B.status === z && B.end === C.t) {
      B.end = k.t;
    } else {
      E.push({
        status: z,
        start: C.t,
        end: k.t,
      });
    }
  }
  const w = h.reduce((O?: any, C?: any) => O + C.durationMin, 0),
    x = A.reduce((O?: any, C?: any) => O + C.idleMin, 0),
    S = Math.max(0, A.reduce((O?: any, C?: any) => O + C.durationMin, 0) - x),
    W = round1(h.reduce((O?: any, C?: any) => O + C.distanceKm, 0));
  return {
    points: i,
    trips: h,
    stops: A,
    events: y,
    segments: E,
    untrusted: s,
    summary: {
      distanceKm: W,
      trips: h.length,
      runningMin: w,
      idleMin: x,
      stopMin: S,
      maxSpeed: h.length ? Math.max(...h.map((O?: any) => O.maxSpeed)) : 0,
      avgSpeed: w > 0 ? Math.round(W / (w / 60)) : 0,
      overspeed: g,
    },
  };
}

export function positionAt(e?: any, t?: any) {
  for (const i of e.trips) {
    if (t < i.start || t > i.end) continue;
    const s = i.points;
    let a = s.findIndex((A?: any) => A.t > t);
    if (a <= 0) {
      a = s.length - 1;
    }
    const l = s[Math.max(0, a - 1)],
      c = s[a],
      f = c.t > l.t ? Math.min(1, Math.max(0, (t - l.t) / (c.t - l.t))) : 1,
      p = [l.at[0] + (c.at[0] - l.at[0]) * f, l.at[1] + (c.at[1] - l.at[1]) * f],
      h = l.at[0] === c.at[0] && l.at[1] === c.at[1] ? c.heading : bearing(l.at, c.at);
    return {
      at: p,
      speed: Math.round(l.speed + (c.speed - l.speed) * f),
      heading: h,
      moving: true,
      trip: i,
    };
  }
  const n = e.stops.find((i?: any) => t >= i.start && t <= i.end);
  if (n)
    return {
      at: n.at,
      speed: 0,
      heading: null,
      moving: false,
      stop: n,
    };
  const r = [...e.points].reverse().find((i?: any) => i.t <= t) ?? e.points[0];
  return {
    at: r?.at ?? [0, 0],
    speed: 0,
    heading: null,
    moving: false,
  };
}

export function ignitionAt(e?: any, t?: any) {
  const n = e.points;
  let r = 0,
    i = n.length - 1,
    s = -1;
  for (; r <= i;) {
    const a = (r + i) >> 1;
    if (n[a].t <= t) {
      {
        s = a;
        r = a + 1;
      }
    } else {
      i = a - 1;
    }
  }
  return s < 0 ? null : n[s].ignition;
}

export function timesUntil(e?: any, t?: any) {
  const n = (l?: any, c?: any) => Math.max(0, Math.min(c, t) - l);
  let r = 0,
    i = 0;
  for (const l of e.trips) r += n(l.start, l.end);
  for (const l of e.stops) i += n(l.start, l.end);
  let s = 0,
    a = 0;
  for (let l = 1; l < e.points.length; l++) {
    const c = e.points[l - 1],
      f = e.points[l];
    if (c.t >= t) break;
    for (; a < e.stops.length && e.stops[a].end < c.t;) a++;
    const p = e.stops[a];
    if (!p) break;
    if (c.t >= p.start && f.t <= p.end && f.t - c.t <= MAX_GAP_MS && c.ignition === true) {
      s += Math.min(f.t, t) - c.t;
    }
  }
  return {
    runningMin: toMinutes(r),
    stoppedMin: toMinutes(Math.max(0, i - s)),
    idleMin: toMinutes(s),
  };
}

export function pathUntil(e?: any, t?: any, n?: any) {
  const r: any = [];
  for (const i of e) {
    if (i.start > t) break;
    for (const s of i.points) {
      if (s.t > t) break;
      r.push(s.at);
    }
    if (t <= i.end) {
      r.push(n);
      break;
    }
  }
  return r;
}
