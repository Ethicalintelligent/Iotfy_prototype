// IT-0036. The Dashboard's "Real-Time Vehicle Tracking" card: Leaflet map with clustered markers,
// the original's map controls and layer picker, the list view and the "Vehicle Filters" panel.
// Same markup and class names as the original page.
import L from 'leaflet';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, usePortalRoot } from '../smart-track/kit';
import { Avatar, Check, Pill, Seg, fmt } from './controls';
import { WidgetCard, type WidgetHead } from './widgets';

export interface Marker {
  id: string;
  name: string;
  code: string;
  status: string;
  lat: number;
  lng: number;
  location: string;
  metric: string;
  updated: string;
  group?: string;
  attrs: Record<string, string>;
}

export interface FilterField {
  id: string;
  label: string;
  icon: string;
  options: string[];
  placeholder?: string;
}

interface Applied {
  q: string;
  fields: Record<string, string[]>;
  picked: string[] | null;
  statuses: string[] | null;
}
const NONE: Applied = { q: '', fields: {}, picked: null, statuses: null };

const matches = (m: Marker, a: Applied, picked: Set<string> | null) => {
  const q = a.q.trim().toLowerCase();
  return (
    (!q || m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)) &&
    (!picked || picked.has(m.id)) &&
    (!a.statuses?.length || a.statuses.includes(m.status)) &&
    Object.entries(a.fields).every(([k, v]) => !v.length || v.includes(m.attrs[k] ?? ''))
  );
};
const isFiltered = (a: Applied) =>
  a.q.trim() !== '' ||
  a.picked !== null ||
  !!a.statuses?.length ||
  Object.values(a.fields).some((v) => v.length > 0);

/* ------------------------------------------------------------------ card */

export function TrackingWidget({
  w,
  markers,
  statuses,
  filterTitle,
  filterFields,
  statusFilter,
  onFilter,
}: {
  w: WidgetHead;
  markers: Marker[];
  statuses: { id: string; label: string; tone: string }[];
  filterTitle: string;
  filterFields: FilterField[];
  statusFilter: string;
  onFilter: (s: string) => void;
}) {
  const [view, setView] = useState('map');
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState<Applied>(NONE);
  // The markers refresh every 5 s (the original's refresh rate), not on every live tick.
  const [shownMarkers, setShownMarkers] = useState(markers);
  const latest = useRef(markers);
  latest.current = markers;
  const idKey = markers.map((m) => m.id).join('|');
  useEffect(() => setShownMarkers(latest.current), [idKey]);
  useEffect(() => {
    const t = setInterval(() => setShownMarkers(latest.current), 5000);
    return () => clearInterval(t);
  }, []);

  const visible = useMemo(() => {
    const picked = applied.picked && new Set(applied.picked);
    return shownMarkers.filter(
      (m) => (statusFilter === 'all' || m.status === statusFilter) && matches(m, applied, picked),
    );
  }, [shownMarkers, statusFilter, applied]);
  const filtered = isFiltered(applied);
  const statusOf = (id: string) =>
    statuses.find((s) => s.id === id) ?? { id, label: id, tone: 'gray' };
  const reset = () => {
    setApplied(NONE);
    onFilter('all');
  };

  return (
    <WidgetCard
      w={w}
      className="td-track"
      actions={
        <>
          <Seg
            label="View"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { id: 'map', icon: 'Map', title: 'Map' },
              { id: 'list', icon: 'List', title: 'List' },
            ]}
          />
          <button
            type="button"
            className={`td-icon-btn td-filter-btn td-track__filter-btn ${filtered || statusFilter !== 'all' ? 'is-active' : ''}`}
            title="Filters"
            aria-label="Filters"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name="Funnel" size={15} />
          </button>
        </>
      }
    >
      {(statusFilter !== 'all' || filtered) && (
        <div className="td-active-filter">
          Showing {visible.length} of {shownMarkers.length}
          {statusFilter !== 'all' && (
            <Pill tone={statusOf(statusFilter).tone}>{statusOf(statusFilter).label}</Pill>
          )}
          <button type="button" className="td-link" onClick={reset}>
            Show all
          </button>
        </div>
      )}
      <div key={view} className={`td-track__view ${view === 'list' ? 'is-list' : ''}`}>
        {view === 'list' ? (
          <div className="td-table-wrap td-track__list" style={{ '--rows': 5 } as CSSProperties}>
            <table className="td-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th className="num">Speed</th>
                  <th>Last update</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((m) => {
                  const s = statusOf(m.status);
                  return (
                    <tr key={m.id}>
                      <td>
                        <span className="td-person">
                          <Avatar name={m.name} tone={s.tone} size={26} />
                          <span>
                            <strong>{m.name}</strong>
                          </span>
                        </span>
                      </td>
                      <td>
                        <Pill tone={s.tone}>{s.label}</Pill>
                      </td>
                      <td>{m.location}</td>
                      <td className="num">{m.metric}</td>
                      <td className="muted">{m.updated}</td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className="td-empty">
                      No vehicles match these filters right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <MarkerMap markers={visible} statuses={statuses} fitKey={w.id} />
        )}
      </div>
      {open && (
        <FilterPanel
          id={w.id}
          title={filterTitle}
          fields={filterFields}
          statuses={statuses}
          markers={shownMarkers}
          applied={applied}
          status={statusFilter}
          onClose={() => setOpen(false)}
          onReset={reset}
          onApply={(a, s) => {
            setApplied(a);
            onFilter(s);
            setOpen(false);
          }}
        />
      )}
    </WidgetCard>
  );
}

/* ------------------------------------------------------------------ map */

interface Layer {
  id: string;
  name: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxNativeZoom?: number;
  dark?: boolean;
  overlays?: string[];
}
const OSM =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO = `${OSM} &copy; <a href="https://carto.com/attributions">CARTO</a>`;
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const google = (l: string) => `https://mt{s}.google.com/vt/lyrs=${l}&x={x}&y={y}&z={z}`;
const GOOGLE = 'Map data &copy; Google';
/** The original's map layers, in its order. */
const LAYERS: Layer[] = [
  {
    id: 'street',
    name: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OSM,
  },
  {
    id: 'satellite',
    name: 'Satellite',
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Imagery &copy; Esri',
    dark: true,
  },
  {
    id: 'hybrid',
    name: 'Hybrid',
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Imagery &copy; Esri',
    dark: true,
    overlays: [
      `${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`,
      `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
    ],
  },
  {
    id: 'voyager',
    name: 'Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: CARTO,
    subdomains: 'abcd',
    maxNativeZoom: 20,
  },
  {
    id: 'light',
    name: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: CARTO,
    subdomains: 'abcd',
    maxNativeZoom: 20,
  },
  {
    id: 'dark',
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: CARTO,
    subdomains: 'abcd',
    maxNativeZoom: 20,
    dark: true,
  },
  {
    id: 'humanitarian',
    name: 'Humanitarian',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: `${OSM}, tiles by HOT`,
  },
  {
    id: 'cycle',
    name: 'Cycle (CyclOSM)',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: `${OSM}, CyclOSM`,
  },
  {
    id: 'topo',
    name: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: `${OSM}, SRTM | &copy; OpenTopoMap (CC-BY-SA)`,
    subdomains: 'abc',
    maxNativeZoom: 17,
  },
  {
    id: 'esri-street',
    name: 'Esri Street',
    url: `${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Tiles &copy; Esri',
  },
  {
    id: 'esri-topo',
    name: 'Esri Topographic',
    url: `${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Tiles &copy; Esri',
  },
  {
    id: 'esri-gray',
    name: 'Esri Light Gray',
    url: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Tiles &copy; Esri',
    maxNativeZoom: 16,
  },
  {
    id: 'natgeo',
    name: 'National Geographic',
    url: `${ESRI}/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Tiles &copy; Esri, National Geographic',
    maxNativeZoom: 16,
  },
  {
    id: 'google-roadmap',
    name: 'Google Maps',
    url: google('m'),
    attribution: GOOGLE,
    subdomains: '0123',
    maxNativeZoom: 20,
  },
  {
    id: 'google-satellite',
    name: 'Google Satellite',
    url: google('s'),
    attribution: GOOGLE,
    subdomains: '0123',
    maxNativeZoom: 20,
    dark: true,
  },
  {
    id: 'google-hybrid',
    name: 'Google Hybrid',
    url: google('y'),
    attribution: GOOGLE,
    subdomains: '0123',
    maxNativeZoom: 20,
    dark: true,
  },
  {
    id: 'google-terrain',
    name: 'Google Terrain',
    url: google('p'),
    attribution: GOOGLE,
    subdomains: '0123',
    maxNativeZoom: 20,
  },
  {
    id: 'google-traffic',
    name: 'Google Traffic',
    url: google('m,traffic'),
    attribution: GOOGLE,
    subdomains: '0123',
    maxNativeZoom: 20,
  },
];
const layerById = (id: string | null | undefined) => LAYERS.find((l) => l.id === id) ?? LAYERS[0]!;
/** The original keeps the chosen layer in the browser, shared by all its maps. */
const LAYER_KEY = 'gp.map.layer';
const savedLayer = () => {
  try {
    return layerById(window.localStorage.getItem(LAYER_KEY)).id;
  } catch {
    return LAYERS[0]!.id;
  }
};

const CLUSTER_BELOW_ZOOM = 16;
const CLUSTER_CELL = 64;

function clusterIcon(tones: string[]) {
  const n = tones.length;
  const size = n < 10 ? 36 : n < 100 ? 42 : 50;
  const counts = new Map<string, number>();
  tones.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
  let at = 0;
  const stops = [...counts].map(([t, c]) => {
    const from = at;
    at += (c / n) * 100;
    return `var(--${t}) ${from.toFixed(2)}% ${at.toFixed(2)}%`;
  });
  return L.divIcon({
    className: 'gp-pin-box',
    html: `<span class="gp-cluster" style="width:${size}px;height:${size}px;background:conic-gradient(${stops.join(',')})"><b>${fmt(n)}</b></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
function tipElement(title: string, sub: string) {
  const el = document.createElement('span');
  el.className = 'gp-tip';
  const b = document.createElement('b');
  b.textContent = title;
  const s = document.createElement('small');
  s.textContent = sub;
  el.append(b, s);
  return el;
}

function MarkerMap({
  markers,
  statuses,
  fitKey,
}: {
  markers: Marker[];
  statuses: { id: string; label: string; tone: string }[];
  fitKey: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.LayerGroup | null>(null);
  const clusters = useRef<L.LayerGroup | null>(null);
  const pins = useRef(new Map<string, L.Marker>());
  const fitted = useRef<string | null>(null);
  const touched = useRef(false);
  const [ready, setReady] = useState(false);
  const [layer, setLayer] = useState(savedLayer);
  const [hosts, setHosts] = useState<Record<string, HTMLElement>>({});
  const toneOf = (status: string) => statuses.find((s) => s.id === status)?.tone ?? 'gray';
  const toneRef = useRef(toneOf);
  toneRef.current = toneOf;
  const statusRef = useRef(new Map<string, string>());
  statusRef.current = new Map(markers.map((m) => [m.id, m.status]));

  const collectHosts = () => {
    const next: Record<string, HTMLElement> = {};
    for (const [id, m] of pins.current) {
      const el = m.getElement();
      if (el) next[id] = el;
    }
    setHosts(next);
  };

  /** The original's clustering: markers in the same 64 px cell (below zoom 16) become one ring. */
  const recluster = () => {
    const m = map.current;
    const group = clusters.current;
    if (!m || !group) return false;
    const zoom = m.getZoom();
    const cells = new Map<string, string[]>();
    if (zoom < CLUSTER_BELOW_ZOOM)
      for (const [id, pin] of pins.current) {
        const p = m.project(pin.getLatLng(), zoom);
        const key = `${Math.floor(p.x / CLUSTER_CELL)}:${Math.floor(p.y / CLUSTER_CELL)}`;
        cells.set(key, [...(cells.get(key) ?? []), id]);
      }
    const hidden = new Set<string>();
    group.clearLayers();
    for (const ids of cells.values()) {
      if (ids.length < 2) continue;
      ids.forEach((id) => hidden.add(id));
      const bounds = L.latLngBounds(ids.map((id) => pins.current.get(id)!.getLatLng()));
      const title = `${fmt(ids.length)} vehicles`;
      L.marker(bounds.getCenter(), {
        icon: clusterIcon(ids.map((id) => toneRef.current(statusRef.current.get(id) ?? ''))),
        keyboard: true,
        title,
        zIndexOffset: 500,
      })
        .bindTooltip(tipElement(title, 'Click to zoom in'), { direction: 'top', offset: [0, -16] })
        .on('click', () => m.fitBounds(bounds.pad(0.3), { maxZoom: CLUSTER_BELOW_ZOOM }))
        .addTo(group);
    }
    let changed = false;
    for (const [id, pin] of pins.current) {
      const on = m.hasLayer(pin);
      if (hidden.has(id) && on) {
        pin.remove();
        changed = true;
      } else if (!hidden.has(id) && !on) {
        pin.addTo(m);
        changed = true;
      }
    }
    return changed;
  };
  const reclusterRef = useRef(recluster);
  reclusterRef.current = recluster;

  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { zoomControl: false, attributionControl: true }).setView(
      [0, 0],
      12,
    );
    map.current = m;
    clusters.current = L.layerGroup().addTo(m);
    const onZoom = () => reclusterRef.current() && collectHosts();
    m.on('zoomend', onZoom);
    // The page frame settles its size after the map is made: until the user moves the map, fit the
    // vehicles again when the size changes (so the first view is the same as the original's).
    const el = box.current;
    const touch = () => (touched.current = true);
    el.addEventListener('pointerdown', touch);
    el.addEventListener('wheel', touch, { passive: true });
    const ro = new ResizeObserver(() => {
      m.invalidateSize();
      if (fitted.current && !touched.current) fitRef.current();
    });
    ro.observe(el);
    setReady(true);
    const own = pins.current;
    return () => {
      ro.disconnect();
      el.removeEventListener('pointerdown', touch);
      el.removeEventListener('wheel', touch);
      m.off('zoomend', onZoom);
      own.clear();
      m.remove();
      map.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    tiles.current?.remove();
    const l = layerById(layer);
    const opts = {
      maxZoom: 19,
      maxNativeZoom: l.maxNativeZoom ?? 19,
      subdomains: l.subdomains ?? 'abc',
    };
    tiles.current = L.layerGroup([
      L.tileLayer(l.url, { ...opts, attribution: l.attribution }),
      ...(l.overlays ?? []).map((u) => L.tileLayer(u, opts)),
    ]).addTo(m);
  }, [layer, ready]);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const ids = new Set<string>();
    let changed = false;
    for (const mk of markers) {
      ids.add(mk.id);
      const pin = pins.current.get(mk.id);
      if (pin) {
        const at = pin.getLatLng();
        if (at.lat !== mk.lat || at.lng !== mk.lng) pin.setLatLng([mk.lat, mk.lng]);
      } else {
        pins.current.set(
          mk.id,
          L.marker([mk.lat, mk.lng], {
            icon: L.divIcon({ className: 'td-avd__pin-box', html: '', iconSize: [30, 30] }),
            keyboard: false,
          }),
        );
        changed = true;
      }
    }
    for (const [id, pin] of pins.current)
      if (!ids.has(id)) {
        pin.remove();
        pins.current.delete(id);
        changed = true;
      }
    if (reclusterRef.current()) changed = true;
    if (changed) collectHosts();
    if (fitted.current !== fitKey && markers.length) {
      fitted.current = fitKey;
      fit();
    }
  }, [markers, ready]);

  const fit = () => {
    const m = map.current;
    if (!m) return;
    m.invalidateSize();
    const pts = markers.map((mk) => [mk.lat, mk.lng] as [number, number]);
    if (pts.length === 1) m.setView(pts[0]!, 15);
    else if (pts.length) {
      const b = L.latLngBounds(pts);
      if (b.isValid()) m.fitBounds(b.pad(0.2), { maxZoom: 15, animate: false });
    }
  };
  const fitRef = useRef(fit);
  fitRef.current = fit;

  const satellite = /satellite|hybrid/.test(layer);
  return (
    <div className={`td-map gp-lmap ${layerById(layer).dark ? 'is-satellite' : ''} `}>
      <div ref={box} className="td-avd__leaflet" />
      {markers.map((mk) => {
        const host = hosts[mk.id];
        const s = statuses.find((x) => x.id === mk.status) ?? { label: mk.status, tone: 'gray' };
        return host
          ? createPortal(
              <span className={`td-marker td-marker--vehicle tone-${s.tone}`} tabIndex={0}>
                <VehicleMarker status={mk.status} />
                <span className="td-marker__tip">
                  <strong>{mk.name}</strong>
                  {s.label} · {mk.metric}
                </span>
              </span>,
              host,
              mk.id,
            )
          : null;
      })}
      <MapControls
        map={map}
        onRecenter={fit}
        satellite={satellite}
        layer={layer}
        onLayer={(id) => {
          try {
            window.localStorage.setItem(LAYER_KEY, id);
          } catch {
            /* private window */
          }
          setLayer(id);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ vehicle marker */

const MARKER_COLOURS: Record<string, string> = {
  running: '#009863',
  stop: '#F90507',
  idle: '#0363FF',
  overspeed: '#F76C09',
  towed: '#07B1B4',
  notrans: '#2B333C',
};
const MARKER_KIND: Record<string, string> = {
  stopped: 'stop',
  idle: 'idle',
  overspeed: 'overspeed',
  towed: 'towed',
  offline: 'notrans',
};

/**
 * The original's vehicle marker: a status-coloured halo and ring around the vehicle picture. The
 * original asks for a picture by plate that does not exist in the page and falls back to a truck
 * badge, so the badge is drawn directly (same look, no failed request).
 */
function VehicleMarker({ status }: { status: string }) {
  const colour = MARKER_COLOURS[MARKER_KIND[status] ?? 'running']!;
  return (
    <span className="td-vmarker" aria-hidden="true">
      <div style={{ position: 'relative', width: 0, height: 0, fontFamily: FONT }}>
        <div
          style={{
            position: 'absolute',
            left: -25,
            top: -25,
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: `${colour}2E`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: -17,
            top: -17,
            width: 34,
            height: 34,
            boxSizing: 'border-box',
            borderRadius: '50%',
            background: '#fff',
            boxShadow: `inset 0 0 0 2.5px ${colour},0 2px 8px rgba(1,29,50,.35)`,
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: colour,
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              textShadow: '0 1px 2px rgba(1,29,50,.35)',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block' }}
            >
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
              <path d="M15 18H9" />
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 8.38A1 1 0 0 0 17.52 8H14" />
              <circle cx="17" cy="18" r="2" />
              <circle cx="7" cy="18" r="2" />
            </svg>
          </span>
        </div>
      </div>
    </span>
  );
}

/* ------------------------------------------------------------------ map controls (inline-styled, as in the original) */

const FONT = "'Instrument Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const SHADOW = '0 3px 10px rgba(2,27,58,.18), 0 1px 3px rgba(2,27,58,.12)';
const LOOK_OFF = { bg: '#FFFFFF', sh: `${SHADOW}, inset 0 0 0 1px #DCE5E1`, fg: '#021B3A' };
const LOOK_ON = { bg: '#E6F7EF', sh: `${SHADOW}, inset 0 0 0 1px #00B368`, fg: '#00B368' };
const LOOK_HOVER = { bg: '#E6F7EF', fg: '#007A47' };

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {children}
    </svg>
  );
}

function CtlButton({
  title,
  on,
  popup,
  expanded,
  onClick,
  children,
}: {
  title: string;
  on: boolean;
  popup?: boolean;
  expanded?: boolean;
  onClick: (el: HTMLButtonElement) => void;
  children: ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const look = on ? LOOK_ON : LOOK_OFF;
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={popup ? undefined : on}
      aria-haspopup={popup ? 'menu' : undefined}
      aria-expanded={popup ? !!expanded : undefined}
      onClick={(e) => onClick(e.currentTarget)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 32,
        height: 32,
        flexShrink: 0,
        boxSizing: 'border-box',
        border: 'none',
        borderRadius: 9,
        display: 'grid',
        placeItems: 'center',
        padding: 0,
        cursor: 'pointer',
        fontFamily: FONT,
        transition:
          'background .15s ease, box-shadow .15s ease, transform .15s ease, color .15s ease',
        background: hover ? LOOK_HOVER.bg : look.bg,
        boxShadow: look.sh,
        color: hover ? LOOK_HOVER.fg : look.fg,
      }}
    >
      {children}
    </button>
  );
}

/** Web-mercator tile under a point, for the layer thumbnails. */
function tileUrl(
  url: string,
  subdomains: string | undefined,
  [lat, lng]: [number, number],
  z: number,
) {
  const n = 2 ** z;
  const r = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  const x = Math.floor((((((lng + 180) % 360) + 360) % 360) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  return url
    .replace('{s}', (subdomains ?? 'abc')[0]!)
    .replace('{r}', '')
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
}

function MapControls({
  map,
  onRecenter,
  satellite,
  layer,
  onLayer,
}: {
  map: React.MutableRefObject<L.Map | null>;
  onRecenter: () => void;
  satellite: boolean;
  layer: string;
  onLayer: (id: string) => void;
}) {
  const portal = usePortalRoot();
  const anchor = useRef<HTMLButtonElement | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CSSProperties | null>(null);
  const [view, setView] = useState<{ center: [number, number]; zoom: number }>({
    center: [0, 0],
    zoom: 3,
  });

  useEffect(() => {
    if (!pos) return;
    const outside = (e: Event) =>
      !menu.current?.contains(e.target as Node) && !anchor.current?.contains(e.target as Node);
    const onDown = (e: Event) => outside(e) && setPos(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPos(null);
        anchor.current?.focus();
      }
    };
    const onResize = () => setPos(null);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', onDown, true);
    window.addEventListener('resize', onResize);
    menu.current?.querySelector<HTMLButtonElement>('[aria-checked=true]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', onDown, true);
      window.removeEventListener('resize', onResize);
    };
  }, [pos]);

  const toggle = (el: HTMLButtonElement) => {
    anchor.current = el;
    if (pos) return setPos(null);
    const m = map.current;
    if (m) {
      const c = m.getCenter();
      setView({ center: [c.lat, c.lng], zoom: Math.max(2, Math.min(13, Math.round(m.getZoom()))) });
    }
    const r = el.getBoundingClientRect();
    const right = r.left + r.width / 2 > window.innerWidth / 2;
    const top = Math.max(8, Math.min(r.top, window.innerHeight - 320));
    setPos({
      top,
      maxHeight: window.innerHeight - top - 8,
      ...(right ? { right: window.innerWidth - r.left + 8 } : { left: r.right + 8 }),
    });
  };

  return (
    <div style={{ display: 'contents' }} onClick={(e) => e.stopPropagation()}>
      <div
        className="gp-mapctl"
        style={{
          position: 'absolute',
          left: 8,
          top: 8,
          zIndex: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          fontFamily: FONT,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <CtlButton title="Zoom in" on={false} onClick={() => map.current?.zoomIn()}>
            <Svg>
              <path d="M12 5v14M5 12h14" />
            </Svg>
          </CtlButton>
          <CtlButton title="Zoom out" on={false} onClick={() => map.current?.zoomOut()}>
            <Svg>
              <path d="M5 12h14" />
            </Svg>
          </CtlButton>
          <CtlButton title="Recenter to default view" on={false} onClick={onRecenter}>
            <Svg>
              <circle cx="12" cy="12" r="6.5" />
              <circle cx="12" cy="12" r="2.2" fill="currentColor" />
              <path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22" />
            </Svg>
          </CtlButton>
          <CtlButton title="Map layers" on={satellite} popup expanded={!!pos} onClick={toggle}>
            <Svg>
              <path d="m12 2 9.5 5-9.5 5-9.5-5L12 2Z" />
              <path d="m2.5 12 9.5 5 9.5-5" />
              <path d="m2.5 17 9.5 5 9.5-5" />
            </Svg>
          </CtlButton>
        </div>
      </div>
      {pos &&
        portal &&
        createPortal(
          <div
            ref={menu}
            className="gp-layers"
            role="menu"
            aria-label="Map layers"
            style={pos}
            onClick={(e) => e.stopPropagation()}
          >
            <strong className="gp-layers__head">Map layer</strong>
            <div className="gp-layers__grid">
              {LAYERS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={l.id === layer}
                  className="gp-layers__item"
                  onClick={() => {
                    onLayer(l.id);
                    setPos(null);
                    anchor.current?.focus();
                  }}
                >
                  <span className="gp-layers__thumb">
                    <img
                      src={tileUrl(
                        l.url,
                        l.subdomains,
                        view.center,
                        Math.min(view.zoom, l.maxNativeZoom ?? 19),
                      )}
                      alt=""
                      loading="lazy"
                    />
                    {l.overlays?.map((o) => (
                      <img
                        key={o}
                        src={tileUrl(o, undefined, view.center, view.zoom)}
                        alt=""
                        loading="lazy"
                      />
                    ))}
                  </span>
                  <span>{l.name}</span>
                </button>
              ))}
            </div>
          </div>,
          portal,
        )}
    </div>
  );
}

/* ------------------------------------------------------------------ "Vehicle Filters" panel */

function FilterPanel({
  id,
  title,
  fields,
  statuses,
  markers,
  applied,
  status,
  onApply,
  onReset,
  onClose,
}: {
  id: string;
  title: string;
  fields: FilterField[];
  statuses: { id: string; label: string; tone: string }[];
  markers: Marker[];
  applied: Applied;
  status: string;
  onApply: (a: Applied, status: string) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<Record<string, string[]>>(applied.fields);
  const [picked, setPicked] = useState<string[]>(
    applied.statuses?.length ? applied.statuses : status === 'all' ? [] : [status],
  );
  const [chosen, setChosen] = useState<Set<string> | null>(
    applied.picked && new Set(applied.picked),
  );
  const groups = useMemo(() => {
    const byGroup = new Map<string, Marker[]>();
    for (const m of markers) {
      const g = m.group || 'All vehicles';
      byGroup.set(g, [...(byGroup.get(g) ?? []), m]);
    }
    return [...byGroup.entries()]
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([g, list]) => ({
        id: g,
        label: g,
        items: list.map((m) => ({ id: m.id, label: m.code || m.name })),
      }));
  }, [markers]);
  const allIds = useMemo(() => markers.map((m) => m.id), [markers]);
  const selected = useMemo(() => chosen ?? new Set(allIds), [chosen, allIds]);
  const noneChosen = allIds.length > 0 && !allIds.some((i) => selected.has(i));
  const resetAll = () => {
    setValues({});
    setPicked([]);
    setChosen(null);
    onReset();
  };
  const row = (key: string, icon: string, label: string, control: ReactNode) => (
    <div key={key} className="td-trkf__row">
      <span className="td-badge tone-brand" aria-hidden="true">
        <Icon name={icon} size={15} />
      </span>
      <label htmlFor={`td-trkf-${id}-${key}`}>{label}</label>
      {control}
    </div>
  );

  return (
    <div
      className="td-trkf   "
      role="dialog"
      aria-modal="false"
      aria-labelledby={`td-trkf-${id}-title`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="td-trkf__head">
        <h3 id={`td-trkf-${id}-title`}>
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
        onSubmit={(e) => {
          e.preventDefault();
          const ids = allIds.filter((i) => selected.has(i));
          const many = picked.length > 1;
          onApply(
            {
              q: '',
              fields: values,
              picked: ids.length === allIds.length ? null : ids,
              statuses: many ? picked : null,
            },
            many ? 'all' : (picked[0] ?? 'all'),
          );
        }}
      >
        <div className="td-trkf__fields">
          {fields.map((f) =>
            row(
              f.id,
              f.icon,
              f.label,
              <MultiSelect
                id={`td-trkf-${id}-${f.id}`}
                value={values[f.id] ?? []}
                placeholder={f.placeholder ?? `Select ${f.label}`}
                searchPlaceholder={`Search ${f.label.toLowerCase()}...`}
                aria-label={f.label}
                disabled={!f.options.length}
                title={f.options.length ? undefined : `No ${f.label.toLowerCase()} recorded yet`}
                onChange={(v) => setValues((cur) => ({ ...cur, [f.id]: v }))}
                options={f.options.map((o) => ({ value: o, label: o }))}
              />,
            ),
          )}
          {row(
            'status',
            'Activity',
            'Vehicle Status',
            <MultiSelect
              id={`td-trkf-${id}-status`}
              value={picked}
              placeholder="Select vehicle Status"
              searchPlaceholder="Search vehicle status..."
              aria-label="Vehicle Status"
              onChange={setPicked}
              options={statuses.map((s) => ({ value: s.id, label: s.label }))}
            />,
          )}
        </div>
        <Tree
          id={`td-trkf-${id}-pick`}
          className="td-trkf__tree"
          label="Vehicles"
          placeholder="Search vehicles..."
          groups={groups}
          selected={selected}
          onChange={(s) => setChosen(allIds.every((i) => s.has(i)) ? null : s)}
        />
        <div className="td-trkf__actions">
          <button type="button" className="td-btn td-btn--ghost" onClick={resetAll}>
            Reset
          </button>
          <button type="submit" className="td-btn td-btn--primary" disabled={noneChosen}>
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}

/** Multi-select dropdown with search, "Select all" and a "Done" footer. */
function MultiSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder,
  disabled,
  title,
  'aria-label': ariaLabel,
}: {
  id: string;
  value: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
}) {
  const portal = usePortalRoot();
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const [q, setQ] = useState('');
  const chosen = new Set(value);
  const label = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const shown = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));
  const shownOn = shown.filter((o) => chosen.has(o.value)).length;
  const open = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const up = below < 320 && r.top - 12 > below;
    setPos({
      ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      left: r.right - 272,
    });
    setQ('');
  };
  const close = (focus = false) => {
    setPos(null);
    if (focus) btn.current?.focus();
  };
  useEffect(() => {
    const el = pop.current;
    if (!pos || !el) return;
    const r = el.getBoundingClientRect();
    if (r.left < 8) el.style.left = '8px';
    else if (r.right > window.innerWidth - 8)
      el.style.left = `${Math.max(8, window.innerWidth - 8 - r.width)}px`;
    const onDown = (e: Event) => {
      if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node))
        close();
    };
    const onResize = () => close();
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('scroll', onDown, true);
    window.addEventListener('resize', onResize);
    el.querySelector<HTMLInputElement>('input[type=search]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('scroll', onDown, true);
      window.removeEventListener('resize', onResize);
    };
  }, [pos]);
  const set = (list: string[]) =>
    onChange(options.map((o) => o.value).filter((v) => list.includes(v)));
  const first = value[0];
  const text =
    first === undefined
      ? placeholder
      : value.length === 1
        ? label(first)
        : `${label(first)} +${value.length - 1}`;
  return (
    <>
      <button
        ref={btn}
        type="button"
        id={id}
        className={['td-ddl', 'td-ddl--block', !value.length && 'is-placeholder', pos && 'is-open']
          .filter(Boolean)
          .join(' ')}
        disabled={disabled}
        title={title ?? (value.length > 1 ? value.map(label).join(', ') : undefined)}
        aria-haspopup="dialog"
        aria-expanded={pos !== null}
        aria-label={ariaLabel}
        onClick={() => (pos ? close() : open())}
        onKeyDown={(e) => {
          if (!pos && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            open();
          }
        }}
      >
        <span className="td-ddl__label">{text}</span>
        <Icon name="ChevronDown" size={15} className="td-ddl__chev" />
      </button>
      {pos &&
        portal &&
        createPortal(
          <div
            ref={pop}
            className="td-msel td-pop__menu--float"
            role="dialog"
            aria-label={ariaLabel}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close(true);
              }
            }}
          >
            <label className="td-pop__search">
              <Icon name="Search" size={14} />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder ?? 'Search…'}
                aria-label={searchPlaceholder ?? 'Search'}
                autoComplete="off"
              />
            </label>
            <div className="td-msel__list">
              {shown.length > 0 && (
                <Check
                  className="td-msel__all"
                  checked={shownOn === shown.length}
                  mixed={shownOn > 0}
                  onChange={(on) => {
                    const ids = shown.map((o) => o.value);
                    set(
                      on ? [...new Set([...value, ...ids])] : value.filter((v) => !ids.includes(v)),
                    );
                  }}
                >
                  <b>Select all</b>
                </Check>
              )}
              {shown.map((o) => (
                <Check
                  key={o.value}
                  checked={chosen.has(o.value)}
                  onChange={(on) =>
                    set(on ? [...value, o.value] : value.filter((v) => v !== o.value))
                  }
                >
                  <span className="td-msel__label" title={o.label}>
                    {o.label}
                  </span>
                </Check>
              ))}
              {!shown.length && <span className="td-msel__none">No results found</span>}
            </div>
            <div className="td-msel__foot">
              <span>{value.length} selected</span>
              <button type="button" className="td-btn td-btn--primary" onClick={() => close(true)}>
                Done
              </button>
            </div>
          </div>,
          portal,
        )}
    </>
  );
}

/** Vehicles grouped by group, with search, "Select All" and collapsible groups. */
function Tree({
  id,
  label,
  placeholder,
  groups,
  selected,
  onChange,
  className = '',
}: {
  id: string;
  label: string;
  placeholder: string;
  groups: { id: string; label: string; items: { id: string; label: string }[] }[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
  className?: string;
}) {
  const [q, setQ] = useState('');
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const needle = q.trim().toLowerCase();
  const every = groups.flatMap((g) => g.items.map((i) => i.id));
  const list = groups
    .map((g) => ({
      ...g,
      items:
        !needle || g.label.toLowerCase().includes(needle)
          ? g.items
          : g.items.filter((i) => i.label.toLowerCase().includes(needle)),
    }))
    .filter((g) => g.items.length);
  const count = (ids: string[]) => ids.filter((i) => selected.has(i)).length;
  const set = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    ids.forEach((i) => (on ? next.add(i) : next.delete(i)));
    onChange(next);
  };
  const shownIds = list.flatMap((g) => g.items.map((i) => i.id));
  const shownOn = count(shownIds);
  return (
    <fieldset className={`td-afilter__field td-afilter__tree ${className}`}>
      <legend className="td-sr">{label}</legend>
      <label className="td-gv__search">
        <Icon name="Search" size={15} />
        <input
          id={`${id}-q`}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
      </label>
      <div className="td-afilter__list">
        {shownIds.length > 0 && (
          <Check
            className="is-all"
            checked={shownOn === shownIds.length}
            mixed={shownOn > 0}
            onChange={(on) => set(shownIds, on)}
          >
            <b>Select All</b>
          </Check>
        )}
        {list.map((g) => {
          const ids = g.items.map((i) => i.id);
          const on = count(ids);
          const expanded = !!needle || !closed[g.id];
          return (
            <div key={g.id} className="td-afilter__group">
              <div className="td-afilter__group-head">
                <button
                  type="button"
                  className="td-afilter__twist"
                  aria-expanded={expanded}
                  aria-label={`${expanded ? 'Collapse' : 'Expand'} ${g.label}`}
                  onClick={() => setClosed((c) => ({ ...c, [g.id]: !c[g.id] }))}
                >
                  <Icon name={expanded ? 'ChevronDown' : 'ChevronRight'} size={13} />
                </button>
                <Check checked={on === ids.length} mixed={on > 0} onChange={(v) => set(ids, v)}>
                  <b>{g.label}</b>
                </Check>
                <small>{g.items.length}</small>
              </div>
              {expanded &&
                g.items.map((i) => (
                  <Check
                    key={i.id}
                    className="is-leaf"
                    checked={selected.has(i.id)}
                    onChange={(v) => set([i.id], v)}
                  >
                    {i.label}
                  </Check>
                ))}
            </div>
          );
        })}
        {!shownIds.length && (
          <p className="td-afilter__none">
            {needle ? `Nothing matches “${q}”.` : 'Nothing to choose from.'}
          </p>
        )}
      </div>
      {every.length > 0 && count(every) === 0 && (
        <small className="td-afilter__warn">Pick at least one.</small>
      )}
    </fieldset>
  );
}
