// IT-0036. The original page's Leaflet helpers (tile layers, layer picker, map controls, share
// button, vehicle marker, clusters, geofence shapes, tooltips), same markup and inline styles.
import L from 'leaflet';
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { usePortalRoot } from '../smart-track/kit';
import { RIYADH, fmt } from './model';

/* ------------------------------------------------------------------ tile layers */

export interface TileLayerDef {
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
const google = (lyrs: string) => `https://mt{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}`;
const GOOGLE = 'Map data &copy; Google';

export const LAYERS: TileLayerDef[] = [
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

const DEFAULT_LAYER = LAYERS[0]!;
const layerById = (id?: string | null): TileLayerDef =>
  LAYERS.find((l) => l.id === id) ?? DEFAULT_LAYER;
const LAYER_KEY = 'gp.map.layer';

// The chosen layer is shared by every map on the page and remembered in the browser.
let currentLayer = (() => {
  try {
    return layerById(window.localStorage.getItem(LAYER_KEY)).id;
  } catch {
    return DEFAULT_LAYER.id;
  }
})();
const layerListeners = new Set<() => void>();
function setLayer(id: string) {
  currentLayer = layerById(id).id;
  try {
    window.localStorage.setItem(LAYER_KEY, currentLayer);
  } catch {
    /* storage blocked: keep it for this visit */
  }
  layerListeners.forEach((f) => f());
}
const useCurrentLayer = () =>
  layerById(
    useSyncExternalStore(
      (f) => (layerListeners.add(f), () => void layerListeners.delete(f)),
      () => currentLayer,
    ),
  );

/* ------------------------------------------------------------------ map */

/** A Leaflet map in `box`, with the chosen tile layer (the original's map hook). */
export function useLeafletMap(box: RefObject<HTMLDivElement>, zoom = 11) {
  const layer = useCurrentLayer();
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { zoomControl: false, attributionControl: true }).setView(
      RIYADH,
      zoom,
    );
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(box.current);
    setReady(true);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      tiles.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box]);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    tiles.current?.remove();
    const opts = {
      maxZoom: 19,
      maxNativeZoom: layer.maxNativeZoom ?? 19,
      subdomains: layer.subdomains ?? 'abc',
    };
    tiles.current = L.layerGroup([
      L.tileLayer(layer.url, { ...opts, attribution: layer.attribution }),
      ...(layer.overlays ?? []).map((u) => L.tileLayer(u, opts)),
    ]).addTo(m);
  }, [layer, ready]);
  return { map, ready, layer };
}

export function fitTo(map: L.Map, points: [number, number][], maxZoom = 16) {
  if (!points.length) return;
  const b = L.latLngBounds(points);
  if (b.isValid()) map.fitBounds(b.pad(0.2), { maxZoom, animate: false });
}

/** Tooltip content: bold title and an optional second line. */
export function tip(title: string, sub?: string) {
  const el = document.createElement('span');
  el.className = 'gp-tip';
  const b = document.createElement('b');
  b.textContent = title;
  el.append(b);
  if (sub) {
    const s = document.createElement('small');
    s.textContent = sub;
    el.append(s);
  }
  return el;
}

/* ------------------------------------------------------------------ geofences */

export type ZoneShape =
  | { kind: 'CIRCLE'; center: [number, number]; radius: number }
  | { kind: 'POLYGON'; points: [number, number][] };

/** A geofence drawn faintly behind the vehicles. */
export function zoneLayer(shape: ZoneShape, tone = '#7b55e6') {
  const style = { color: tone, weight: 1.5, fillColor: tone, fillOpacity: 0.08 };
  const g = L.featureGroup();
  if (shape.kind === 'CIRCLE') L.circle(shape.center, { ...style, radius: shape.radius }).addTo(g);
  else if (shape.points.length >= 3) L.polygon(shape.points, style).addTo(g);
  else if (shape.points.length) L.polyline(shape.points, { ...style, dashArray: '6 6' }).addTo(g);
  return g;
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
const SHOWS_SPEED = new Set(['running', 'overspeed', 'towed']);
const markerKey = (status: string) => {
  const s = String(status ?? 'running')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return s.startsWith('notrans')
    ? 'notrans'
    : s === 'stopped'
      ? 'stop'
      : s in MARKER_COLOURS
        ? s
        : 'running';
};
const TRUCK_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 8.38A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';
const FONT = "'Instrument Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const esc = (s: string) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export interface VehicleMarker {
  plate: string;
  status: string;
  speed: number;
  img?: string;
  label?: boolean;
  /**
   * IT-0039 (bug sheet 23-11-2026, Map View #1): the selected vehicle's marker is larger, has a
   * thicker ring and a pulsing halo in its status colour, and its label shows the status.
   */
  selected?: boolean;
  /** The status in words, shown in the selected vehicle's label (e.g. "Overspeed"). */
  statusLabel?: string;
}

/** The original's vehicle marker: plate label, halo and a round badge with the vehicle image. */
export function vehicleMarkerElement(v: VehicleMarker) {
  const key = markerKey(v.status);
  const colour = MARKER_COLOURS[key];
  const speed = SHOWS_SPEED.has(key) ? Math.max(0, Math.round(Number(v.speed) || 0)) : 0;
  const sel = !!v.selected;
  const half = sel ? 22 : 17;
  const state =
    sel && v.statusLabel
      ? `<span style="padding:0 6px;height:16px;display:inline-flex;align-items:center;border-radius:999px;background:${colour};color:#fff;font-size:10px;font-weight:700">${esc(v.statusLabel)}</span>`
      : '';
  const label = v.label
    ? `<div style="position:absolute;left:50%;right:auto;top:auto;bottom:${half + 9}px;transform:translateX(-50%);z-index:1;display:flex;align-items:center;gap:5px;height:${sel ? 26 : 22}px;padding:0 8px;border-radius:6px;background:#fff;white-space:nowrap;box-shadow:0 3px 10px rgba(1,29,50,.22),inset 0 0 0 ${sel ? `2px ${colour}` : '1px #E9ECEF'};font-size:${sel ? 12 : 11}px;font-weight:700;color:#0B1B2B"><span style="width:7px;height:7px;border-radius:50%;background:${colour}"></span>${esc(v.plate)}${state}<span style="font-weight:400;color:#6B7685">${speed} km/h</span></div>`
    : '';
  // Without a vehicle image the original falls back to a truck icon in the status colour.
  const badge = v.img
    ? `<img src="${esc(v.img)}" alt="${esc(v.plate)}" style="width:${sel ? 32 : 26}px;height:${sel ? 24 : 20}px;object-fit:contain;display:block;pointer-events:none">`
    : `<span style="width:${sel ? 30 : 24}px;height:${sel ? 30 : 24}px;border-radius:50%;background:${colour};color:#fff;display:grid;place-items:center;text-shadow:0 1px 2px rgba(1,29,50,.35)">${TRUCK_SVG}</span>`;
  const halo = sel
    ? `<div class="vh-mapview__sel-pulse" style="position:absolute;left:-34px;top:-34px;width:68px;height:68px;border-radius:50%;background:${colour}38;box-shadow:0 0 0 2px ${colour}"></div>`
    : `<div style="position:absolute;left:-25px;top:-25px;width:50px;height:50px;border-radius:50%;background:${colour}2E"></div>`;
  const el = document.createElement('div');
  el.style.cssText = `position:relative;width:0;height:0;font-family:${FONT}`;
  el.innerHTML = `${label}${halo}<div style="position:absolute;left:-${half}px;top:-${half}px;width:${half * 2}px;height:${half * 2}px;box-sizing:border-box;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 ${sel ? 3.5 : 2.5}px ${colour},0 ${sel ? '3px 12px rgba(1,29,50,.45)' : '2px 8px rgba(1,29,50,.35)'};display:grid;place-items:center;overflow:hidden">${badge}</div>`;
  return el;
}

export const vehicleIcon = (v: VehicleMarker) =>
  L.divIcon({ html: vehicleMarkerElement(v), className: '', iconSize: [0, 0] });

/** The same marker inside React (used by the Nearby map's pins). */
export function VehicleMarkerView(v: VehicleMarker) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    ref.current?.replaceChildren(vehicleMarkerElement({ ...v, label: false }));
  }, [v.plate, v.status, v.speed, v.img]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref} className="td-vmarker" aria-hidden="true" />;
}

/* ------------------------------------------------------------------ clusters */

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

/**
 * Groups markers that sit within the same 64 px cell into a coloured donut (below zoom 16).
 * Returns true when markers were added to or removed from the map.
 */
export function cluster(
  map: L.Map,
  markers: Map<string, L.Marker>,
  layer: L.LayerGroup,
  opts: {
    enabled: boolean;
    alone: (id: string) => boolean;
    toneOf: (id: string) => string | undefined;
    title: (n: number) => string;
  },
) {
  const zoom = map.getZoom();
  const cells = new Map<string, string[]>();
  if (opts.enabled && zoom < CLUSTER_BELOW_ZOOM)
    for (const [id, m] of markers) {
      if (opts.alone(id)) continue;
      const p = map.project(m.getLatLng(), zoom);
      const key = `${Math.floor(p.x / CLUSTER_CELL)}:${Math.floor(p.y / CLUSTER_CELL)}`;
      const cell = cells.get(key);
      if (cell) cell.push(id);
      else cells.set(key, [id]);
    }
  const grouped = new Set<string>();
  layer.clearLayers();
  for (const ids of cells.values()) {
    if (ids.length < 2) continue;
    ids.forEach((id) => grouped.add(id));
    const bounds = L.latLngBounds(ids.map((id) => markers.get(id)!.getLatLng()));
    const tones = ids.map((id) => {
      const t = opts.toneOf(id);
      return t && /^[a-z]+$/.test(t) ? t : 'gray';
    });
    const title = opts.title(ids.length);
    L.marker(bounds.getCenter(), {
      icon: clusterIcon(tones),
      keyboard: true,
      title,
      zIndexOffset: 500,
    })
      .bindTooltip(tip(title, 'Click to zoom in'), { direction: 'top', offset: [0, -16] })
      .on('click', () => map.fitBounds(bounds.pad(0.3), { maxZoom: CLUSTER_BELOW_ZOOM }))
      .addTo(layer);
  }
  let changed = false;
  for (const [id, m] of markers) {
    const shown = map.hasLayer(m);
    if (grouped.has(id) && shown) {
      m.remove();
      changed = true;
    } else if (!grouped.has(id) && !shown) {
      m.addTo(map);
      changed = true;
    }
  }
  return changed;
}

/* ------------------------------------------------------------------ controls */

const SIZE = { b: 32, r: 9, i: 14, cg: 5, gap: 8 };
const SHADOW = '0 3px 10px rgba(2,27,58,.18), 0 1px 3px rgba(2,27,58,.12)';
const LOOK_OFF = { bg: '#FFFFFF', sh: `${SHADOW}, inset 0 0 0 1px #DCE5E1`, fg: '#021B3A' };
const LOOK_ON = { bg: '#E6F7EF', sh: `${SHADOW}, inset 0 0 0 1px #00B368`, fg: '#00B368' };
const LOOK_HOVER = { bg: '#E6F7EF', fg: '#007A47' };

function Svg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
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

function ControlButton({
  title,
  on,
  onClick,
  popup,
  expanded,
  children,
}: {
  title: string;
  on: boolean;
  onClick?: (el: HTMLButtonElement) => void;
  popup?: boolean;
  expanded?: boolean;
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
      onClick={(e) => onClick?.(e.currentTarget)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: SIZE.b,
        height: SIZE.b,
        flexShrink: 0,
        boxSizing: 'border-box',
        border: 'none',
        borderRadius: SIZE.r,
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

/** Zoom in / out, recenter, layer picker and (for a selected vehicle) share, top left of the map. */
export function MapControls({
  map,
  onRecenter,
  share,
}: {
  map: RefObject<L.Map | null>;
  onRecenter: () => void;
  share?: ShareInfo | null;
}) {
  const layers = useLayerMenu(map);
  const i = SIZE.i;
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
          gap: SIZE.gap,
          fontFamily: FONT,
        }}
      >
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SIZE.cg }}
        >
          <ControlButton title="Zoom in" on={false} onClick={() => map.current?.zoomIn()}>
            <Svg size={i}>
              <path d="M12 5v14M5 12h14" />
            </Svg>
          </ControlButton>
          <ControlButton title="Zoom out" on={false} onClick={() => map.current?.zoomOut()}>
            <Svg size={i}>
              <path d="M5 12h14" />
            </Svg>
          </ControlButton>
          <ControlButton title="Recenter to default view" on={false} onClick={onRecenter}>
            <Svg size={i}>
              <circle cx="12" cy="12" r="6.5" />
              <circle cx="12" cy="12" r="2.2" fill="currentColor" />
              <path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22" />
            </Svg>
          </ControlButton>
          <ControlButton
            title="Map layers"
            on={/satellite|hybrid/.test(layers.current.id)}
            onClick={layers.toggle}
            popup
            expanded={layers.open}
          >
            <Svg size={i}>
              <path d="m12 2 9.5 5-9.5 5-9.5-5L12 2Z" />
              <path d="m2.5 12 9.5 5 9.5-5" />
              <path d="m2.5 17 9.5 5 9.5-5" />
            </Svg>
          </ControlButton>
          {share && <ShareButton key={share.plate} {...share} />}
        </div>
      </div>
      {layers.menu}
    </div>
  );
}

/* ------------------------------------------------------------------ layer picker */

/** Tile URL of the tile under a point, for the layer thumbnails. */
function tileUrl(
  url: string,
  subdomains: string | undefined,
  [lat, lng]: [number, number],
  z: number,
) {
  const n = 2 ** z;
  const rad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  const x = Math.floor((((((lng + 180) % 360) + 360) % 360) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return url
    .replace('{s}', (subdomains ?? 'abc').charAt(0))
    .replace('{r}', '')
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
}

function useLayerMenu(map: RefObject<L.Map | null>) {
  const current = useCurrentLayer();
  const portal = usePortalRoot();
  const trigger = useRef<HTMLButtonElement | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Record<string, number> | null>(null);
  const [view, setView] = useState<{ center: [number, number]; zoom: number }>({
    center: RIYADH,
    zoom: 3,
  });

  useEffect(() => {
    if (!pos) return;
    const outside = (e: Event) =>
      !menu.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node);
    const onDown = (e: Event) => outside(e) && setPos(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPos(null);
        trigger.current?.focus();
      }
    };
    const onResize = () => setPos(null);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', onDown, true);
    window.addEventListener('resize', onResize);
    menu.current?.querySelector<HTMLElement>('[aria-checked=true]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', onDown, true);
      window.removeEventListener('resize', onResize);
    };
  }, [pos]);

  const toggle = (el: HTMLButtonElement) => {
    trigger.current = el;
    if (pos) {
      setPos(null);
      return;
    }
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
  const pick = (id: string) => {
    setLayer(id);
    setPos(null);
    trigger.current?.focus();
  };

  const el =
    pos && portal
      ? createPortal(
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
                  aria-checked={l.id === current.id}
                  className="gp-layers__item"
                  onClick={() => pick(l.id)}
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
                    {l.overlays?.map((u) => (
                      <img
                        key={u}
                        src={tileUrl(u, undefined, view.center, view.zoom)}
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
        )
      : null;
  return { current, open: !!pos, toggle, menu: el };
}

/* ------------------------------------------------------------------ share */

export interface ShareInfo {
  plate: string;
  lat: number;
  lng: number;
  statusLine: string;
}

const SHARE_OFF = {
  bg: '#FFFFFF',
  sh: '0 3px 10px rgba(2,27,58,.18), 0 1px 3px rgba(2,27,58,.12), inset 0 0 0 1px #DCE5E1',
  fg: '#021B3A',
};
const SHARE_ON = {
  bg: 'var(--eit-active-gradient)',
  sh: '0 0 0 1.5px #03AD86, 0 0 10px rgba(3,173,134,.45)',
  fg: '#FFFFFF',
};

function Glyph({ s, w = 2, children }: { s: number; w?: number; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={s}
      height={s}
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Share a selected vehicle's location (WhatsApp, e-mail, SMS, Telegram, copy link). */
function ShareButton({ plate, lat, lng, statusLine }: ShareInfo) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const link = `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
  const text = ['EIT Track · ' + plate, statusLine].filter(Boolean).join('\n');
  const enc = encodeURIComponent;
  const urls = {
    whatsapp: 'https://wa.me/?text=' + enc(text + '\n' + link),
    email: 'mailto:?subject=' + enc('EIT Track · ' + plate) + '&body=' + enc(text + '\n' + link),
    sms: 'sms:?&body=' + enc(text + '\n' + link),
    telegram: 'https://t.me/share/url?url=' + enc(link) + '&text=' + enc(text),
  };
  const copy = () => {
    const done = () => {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text + '\n' + link).then(done, done);
    else done();
  };
  const look = open ? SHARE_ON : SHARE_OFF;
  const close = () => setOpen(false);
  const target = (href: string, bg: string, label: string, icon: ReactNode, blank: boolean) => (
    <a
      href={href}
      target={blank ? '_blank' : undefined}
      rel={blank ? 'noopener' : undefined}
      onClick={close}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        textDecoration: 'none',
        color: '#021B3A',
        fontSize: 9.5,
        fontWeight: 600,
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: bg,
          color: '#FFFFFF',
        }}
      >
        {icon}
      </span>
      {label}
    </a>
  );
  return (
    <div style={{ position: 'relative', width: 32, height: 32, fontFamily: FONT }}>
      <button
        type="button"
        title="Share"
        aria-label="Share"
        aria-pressed={open}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
          setCopied(false);
        }}
        style={{
          width: 32,
          height: 32,
          boxSizing: 'border-box',
          border: 'none',
          borderRadius: 10,
          display: 'grid',
          placeItems: 'center',
          padding: 0,
          cursor: 'pointer',
          background: look.bg,
          boxShadow: look.sh,
          color: look.fg,
          transition: 'background .15s ease, box-shadow .15s ease',
        }}
      >
        <Glyph s={14}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
        </Glyph>
      </button>
      {open && (
        <>
          <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
          <div
            role="dialog"
            aria-label={'Share ' + plate}
            style={{
              position: 'absolute',
              top: 0,
              zIndex: 6,
              width: 232,
              boxSizing: 'border-box',
              padding: 12,
              left: 'calc(100% + 8px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: '#FFFFFF',
              borderRadius: 10,
              boxShadow:
                '0 12px 32px rgba(2,27,58,.24), 0 2px 6px rgba(2,27,58,.12), inset 0 0 0 1px #DCE5E1',
              color: '#021B3A',
              fontSize: 11,
              lineHeight: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}
              >
                <span style={{ fontSize: 12, fontWeight: 700 }}>Share tracking</span>
                <span
                  style={{
                    fontSize: 10,
                    color: '#5B6676',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {plate}
                </span>
              </div>
              <button
                type="button"
                onClick={close}
                title="Close"
                aria-label="Close share"
                style={{
                  width: 22,
                  height: 22,
                  flexShrink: 0,
                  border: 'none',
                  borderRadius: 6,
                  padding: 0,
                  display: 'grid',
                  placeItems: 'center',
                  background: '#F2F4F6',
                  color: '#3D4A5C',
                  cursor: 'pointer',
                }}
              >
                <Glyph s={12} w={2.5}>
                  <path d="M6 6l12 12M18 6L6 18" />
                </Glyph>
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 4px 4px 8px',
                borderRadius: 8,
                background: '#F5F7F9',
                boxShadow: 'inset 0 0 0 1px #E3E6EA',
              }}
            >
              <span
                title={link}
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 10,
                  color: '#3D4A5C',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {link}
              </span>
              <button
                type="button"
                onClick={copy}
                style={{
                  flexShrink: 0,
                  height: 24,
                  padding: '0 10px',
                  border: 'none',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 10,
                  fontWeight: 700,
                  background: copied ? '#E6F7EF' : '#021B3A',
                  color: copied ? '#007A47' : '#FFFFFF',
                }}
              >
                <Glyph s={11} w={2.6}>
                  <rect x="9" y="9" width="12" height="12" rx="2" />
                  <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                </Glyph>
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {target(
                urls.whatsapp,
                '#25D366',
                'WhatsApp',
                <Glyph s={18}>
                  <path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.3l-4.5 1.2Z" />
                  <path d="M9 8.5c0 3.3 3.2 6.5 6.5 6.5l1-1.6-2-1-1 .9c-1-.4-2.4-1.8-2.8-2.8l.9-1-1-2L9 8.5Z" />
                </Glyph>,
                true,
              )}
              {target(
                urls.email,
                '#EA4335',
                'Email',
                <Glyph s={17}>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </Glyph>,
                false,
              )}
              {target(
                urls.sms,
                '#2B7BFF',
                'SMS',
                <Glyph s={17}>
                  <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />
                </Glyph>,
                false,
              )}
              {target(
                urls.telegram,
                '#229ED9',
                'Telegram',
                <Glyph s={17}>
                  <path d="M21 4L3 11l6 2 2 6 3-4 5 4 2-15Z" />
                  <path d="M9 13l8-6" />
                </Glyph>,
                true,
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
