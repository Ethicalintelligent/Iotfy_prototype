// IT-0036. What the original page got from its app shell (router, react-query, permissions, the
// live socket and its built-in demo API), rebuilt small for the converted page. Vehicles,
// operators and groups come from Neon (Screen.tsx puts them in FleetContext); positions,
// telemetry, history, alerts and operator sign-ins come from demo.ts (labelled demo on screen).
// The converted page (ported/) passes loosely typed demo API data through these stand-ins.
// The stand-ins keep the original's signatures, so some parameters are unused.
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ErrorState } from '../smart-track/kit';
import {
  demoAlerts,
  demoHistory,
  demoOperatorLog,
  demoPositions,
  demoTelemetry,
  subscribeDemo,
  type Position,
} from './demo';

/* ------------------------------------------------------------------ Neon data from the screen */

/** A vehicle in the shape the original page reads (from core.tracked_asset + vehicle_details). */
export interface FleetVehicle {
  id: string;
  name: string;
  plateNo: string | null;
  make: string | null;
  model: string | null;
  category: string | null;
  odometerKm: number | null;
  speedLimitKmh: number | null;
  groupId: string | null;
  deviceId: string | null;
  details: { operatorId?: string; fleetManager?: string; supervisor?: string };
}
export interface FleetOperator {
  id: string;
  name: string;
  tagId: string;
  contactNo: string;
}
export interface Fleet {
  vehicles: FleetVehicle[];
  operators: FleetOperator[];
  groups: { id: string; name: string }[];
  isPending: boolean;
  error: Error | null;
  refetch: () => void;
}
export const FleetContext = createContext<Fleet>({
  vehicles: [],
  operators: [],
  groups: [],
  isPending: true,
  error: null,
  refetch: () => {},
});
const useFleet = () => useContext(FleetContext);

/* ------------------------------------------------------------------ errors and API */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** The original's error box. */
export function QueryError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <ErrorState
      message={error instanceof Error ? error.message : 'Something went wrong.'}
      onRetry={onRetry}
    />
  );
}

type Query = Record<string, string | number | undefined | null>;
/** The few API routes the page calls, answered from the demo generator. */
export async function api(
  path: string,
  opts: { query?: Query; method?: string; body?: any; signal?: AbortSignal } = {},
): Promise<any> {
  const q = opts.query ?? {};
  const history = /^\/api\/v1\/tracking\/assets\/([^/]+)\/history$/.exec(path);
  if (history) {
    const from = Date.parse(String(q.from ?? ''));
    const to = Date.parse(String(q.to ?? ''));
    if (!(to > from) || to - from > 7 * 864e5)
      throw new ApiError(400, 'BAD_RANGE', 'Range must be positive and at most 7 days');
    return { assetId: history[1], points: demoHistory(history[1]!, from, to), truncated: false };
  }
  if (path === '/api/v1/tracking/alerts') {
    const from = Date.parse(String(q.from ?? '')) || 0;
    const to = Date.parse(String(q.to ?? '')) || Date.now();
    const types = q.type ? String(q.type).split(',').filter(Boolean) : [];
    const ids = q.assetId ? String(q.assetId).split(',').filter(Boolean) : [];
    const all = ids
      .flatMap((id) => demoAlerts(id))
      .filter(
        (a) =>
          Date.parse(a.ts) >= from &&
          Date.parse(a.ts) < to &&
          (!types.length || types.includes(a.type)),
      )
      .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
    const page = Number(q.page ?? 0);
    const size = Math.min(100, Number(q.size ?? 20));
    return { items: all.slice(page * size, page * size + size), page, size, total: all.length };
  }
  if (path === '/api/v1/tracking/reports/VEHICLE_OPERATOR/run') {
    const { assetIds = [], from, to } = opts.body ?? {};
    const id = assetIds[0] as string;
    const operator = operatorNameOf.current(id);
    return { rows: demoOperatorLog(id, operator, Date.parse(from), Date.parse(to)) };
  }
  throw new ApiError(404, 'NOT_FOUND', `No mock for ${opts.method ?? 'GET'} ${path}`);
}
/** Set by the screen: the Neon operator assigned to a vehicle (for the demo sign-in log). */
export const operatorNameOf: { current: (vehicleId: string) => string | null } = {
  current: () => null,
};

/* ------------------------------------------------------------------ react-query, small */

const cache = new Map<string, { data: unknown }>();
export const keepPreviousData = Symbol('keepPreviousData');
interface QueryOptions {
  queryKey: unknown[];
  queryFn: () => Promise<any> | any;
  enabled?: boolean;
  placeholderData?: unknown;
  [other: string]: unknown;
}
export interface QueryResult {
  data: any;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}
function useOne(o: QueryOptions | undefined): QueryResult {
  const key = o ? JSON.stringify(o.queryKey) : '';
  const enabled = !!o && o.enabled !== false;
  const fn = useRef(o?.queryFn);
  fn.current = o?.queryFn;
  const [state, setState] = useState<{
    key: string;
    data: any;
    error: Error | null;
    loading: boolean;
  }>(() => ({
    key,
    data: cache.get(key)?.data,
    error: null,
    loading: false,
  }));
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setState((s) => ({
      key,
      data: cache.get(key)?.data ?? (s.key === key ? s.data : undefined),
      error: null,
      loading: true,
    }));
    Promise.resolve()
      .then(() => fn.current!())
      .then(
        (data) => {
          cache.set(key, { data });
          if (live) setState({ key, data, error: null, loading: false });
        },
        (error: Error) => live && setState({ key, data: undefined, error, loading: false }),
      );
    return () => {
      live = false;
    };
  }, [key, enabled, run]);
  const current = state.key === key;
  const keep = o?.placeholderData === keepPreviousData;
  const data = current ? state.data : (cache.get(key)?.data ?? (keep ? state.data : undefined));
  const refetch = useCallback(() => setRun((n) => n + 1), []);
  return {
    data,
    isPending: data === undefined && !(current && state.error),
    isError: current && !!state.error,
    error: current ? state.error : null,
    refetch,
  };
}
export function useQuery(o: QueryOptions): QueryResult {
  return useOne(o);
}
/** Several queries at once (the list can change length; the original asks per day of a range). */
export function useQueries({
  queries,
  combine,
}: {
  queries: QueryOptions[];
  combine: (r: QueryResult[]) => any;
}) {
  const key = JSON.stringify(queries.map((q) => q.queryKey));
  const [results, setResults] = useState<{ key: string; data: any[]; error: Error | null }>({
    key: '',
    data: [],
    error: null,
  });
  const [run, setRun] = useState(0);
  const fns = useRef(queries);
  fns.current = queries;
  useEffect(() => {
    let live = true;
    Promise.all(fns.current.map((q) => Promise.resolve().then(() => q.queryFn()))).then(
      (data) => live && setResults({ key, data, error: null }),
      (error: Error) => live && setResults({ key, data: [], error }),
    );
    return () => {
      live = false;
    };
  }, [key, run]);
  const done = results.key === key;
  return combine(
    queries.map((_q, i) => ({
      data: done ? results.data[i] : undefined,
      isPending: !done,
      isError: done && !!results.error,
      error: done ? results.error : null,
      refetch: () => setRun((n) => n + 1),
    })),
  );
}

/* ------------------------------------------------------------------ router search params */

/** The page's URL state (?asset, ?tab, ?date), kept in the page (the shell owns the real URL). */
export function useSearchParams(): [
  URLSearchParams,
  (next: URLSearchParams | ((p: URLSearchParams) => URLSearchParams), o?: unknown) => void,
] {
  const [params, setParams] = useState(() => new URLSearchParams());
  const set = useCallback((next: URLSearchParams | ((p: URLSearchParams) => URLSearchParams)) => {
    setParams((p) => (typeof next === 'function' ? next(p) : next));
  }, []);
  return [params, set];
}

/* ------------------------------------------------------------------ permissions, connection */

/** Every tracking permission the page asks for is part of viewing it (nothing here edits data). */
export const useCan = (_permission?: string) => true;
export const useOnline = () => true;
export const useLiveChannels = (_enabled = true) => ({
  data: { positions: ['demo'], alerts: [] as string[] },
});

/** The live socket: position and telemetry messages from the demo feed. */
export function useLiveFeed(topics: string[] | undefined, onMessage: (m: unknown) => void) {
  const cb = useRef(onMessage);
  cb.current = onMessage;
  const on = !!topics?.length;
  useEffect(() => (on ? subscribeDemo((m) => cb.current(m)) : undefined), [on]);
}

/* ------------------------------------------------------------------ data hooks */

export function useVehicles(enabled = true, { telemetry = false } = {}) {
  const fleet = useFleet();
  const data = useMemo(
    () =>
      enabled
        ? fleet.vehicles.map((v) => (telemetry ? { ...v, telemetry: demoTelemetry(v.id) } : v))
        : undefined,
    [fleet.vehicles, enabled, telemetry],
  );
  const byId = useMemo(() => new Map((data ?? []).map((v) => [v.id, v])), [data]);
  return {
    data,
    byId,
    isPending: enabled && fleet.isPending,
    isError: !!fleet.error,
    error: fleet.error,
    complete: !fleet.isPending,
    refetch: fleet.refetch,
  };
}

/** Each vehicle's latest telemetry: first with the vehicle list, then from the live feed. */
export function useTelemetry(vehicles: any[] | undefined, enabled: boolean, _refetch: () => void) {
  const [byId, setById] = useState(() => new Map<string, any>());
  useEffect(() => {
    if (!enabled || !vehicles) return;
    setById((m) => {
      const next = new Map(m);
      for (const v of vehicles) if (v.telemetry && !m.has(v.id)) next.set(v.id, v.telemetry);
      return next;
    });
  }, [vehicles, enabled]);
  useLiveFeed(enabled ? ['demo'] : undefined, (m: any) => {
    if (m?.type !== 'VEHICLE_TELEMETRY' || typeof m.vehicleId !== 'string' || !m.telemetry) return;
    setById((prev) => new Map(prev).set(m.vehicleId, m.telemetry));
  });
  return { byId };
}

export function useOperators(enabled = true) {
  const fleet = useFleet();
  const data = enabled ? fleet.operators : undefined;
  const byId = useMemo(() => new Map((data ?? []).map((o) => [o.id, o])), [data]);
  return {
    data,
    byId,
    isPending: fleet.isPending,
    isError: false,
    error: null,
    refetch: fleet.refetch,
  };
}

export function useGroups(enabled = true) {
  const fleet = useFleet();
  return { data: enabled ? fleet.groups : undefined, isPending: fleet.isPending };
}

/** Assets list of the generic tracking API: unused here (the page passes its vehicles). */
export function useTrackingAssets(_assetType?: string, _enabled = true) {
  return {
    data: undefined,
    byId: new Map(),
    isPending: false,
    isError: false,
    error: null,
    refetch: () => {},
  };
}

/** Live positions of the fleet; feed updates are applied in batches every `interval` ms. */
export function useLivePositions(_assetType?: string, enabled = true, interval = 0) {
  const fleet = useFleet();
  const [positions, setPositions] = useState<Position[]>(() => demoPositions());
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  useEffect(() => {
    setPositions(demoPositions());
  }, [fleet.vehicles]);
  const pending = useRef(new Map<string, Position>());
  const flush = useCallback(() => {
    if (!pending.current.size) return;
    const batch = pending.current;
    pending.current = new Map();
    setPositions((list) => list.map((p) => batch.get(p.assetId) ?? p));
    setUpdatedAt(Date.now());
  }, []);
  useEffect(() => {
    if (!interval || !enabled) return;
    const t = setInterval(flush, interval);
    return () => {
      clearInterval(t);
      flush();
    };
  }, [interval, enabled, flush]);
  useLiveFeed(enabled ? ['demo'] : undefined, (m: any) => {
    if (!m?.assetId) return;
    pending.current.set(m.assetId, m as Position);
    if (!interval) flush();
  });
  return {
    positions,
    flush,
    dataUpdatedAt: updatedAt,
    isPending: false,
    isError: false,
    error: null,
    refetch: () => setPositions(demoPositions()),
  };
}

/**
 * Where the page's pop-ups go: the original put them on document.body; here they go to the
 * page's portal root on the body, which carries the page's style scope (same element as the kit's).
 */
export function portalRoot(scope = 'st-tracking'): HTMLElement {
  let root = document.getElementById(`${scope}-portal`);
  if (!root) {
    root = document.createElement('div');
    root.id = `${scope}-portal`;
    root.className = `${scope} st-portal`;
    root.dataset.st = '';
    root.dataset.theme = 'light';
    document.body.appendChild(root);
  }
  return root;
}

export function DemoProvider({ value, children }: { value: Fleet; children: ReactNode }) {
  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
}
