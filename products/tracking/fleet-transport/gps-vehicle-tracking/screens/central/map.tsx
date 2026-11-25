// IT-0036. The original page's Leaflet map (same tile layers, controls, markers, clusters and
// tooltips as Centralized-Tracking.html, removed in IT-0037 (git history)): FleetMap is the original's `dA`.
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { useScope } from '../smart-track/kit';
import type { LatLng } from './analysis';

/* ------------------------------------------------------------------ tile layers */

const OSM =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO = `${OSM} &copy; <a href="https://carto.com/attributions">CARTO</a>`;
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const google = (l: string) => `https://mt{s}.google.com/vt/lyrs=${l}&x={x}&y={y}&z={z}`;
const GOOGLE = 'Map data &copy; Google';

interface TileChoice {
  id: string;
  name: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxNativeZoom?: number;
  dark?: boolean;
  overlays?: string[];
}

const LAYERS: TileChoice[] = [
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
const layerById = (id?: string | null): TileChoice => LAYERS.find((l) => l.id === id) ?? LAYERS[0]!;

/** The chosen map layer, remembered in the browser and shared by every map (as in the original). */
const LAYER_KEY = 'gp.map.layer';
let currentLayer = (() => {
  try {
    return layerById(window.localStorage.getItem(LAYER_KEY)).id;
  } catch {
    return LAYERS[0]!.id;
  }
})();
const layerListeners = new Set<() => void>();
function pickLayer(id: string) {
  currentLayer = layerById(id).id;
  try {
    window.localStorage.setItem(LAYER_KEY, currentLayer);
  } catch {
    /* private mode */
  }
  layerListeners.forEach((l) => l());
}
const useLayer = () =>
  layerById(
    useSyncExternalStore(
      (l) => {
        layerListeners.add(l);
        return () => layerListeners.delete(l);
      },
      () => currentLayer,
    ),
  );

/** Creates the Leaflet map in `el` and keeps the chosen tile layer on it (original: BM). */
export function useLeafletMap(el: RefObject<HTMLDivElement | null>, zoom = 11) {
  const layer = useLayer();
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView(
      [0, 0],
      zoom,
    );
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    setReady(true);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      tiles.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el]);
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

export function fitAll(map: L.Map, pts: LatLng[], maxZoom = 16) {
  const b = pts.length ? L.latLngBounds(pts) : null;
  if (b && b.isValid()) map.fitBounds(b.pad(0.2), { maxZoom, animate: false });
}

/** A marker tooltip: bold title and a small line (original: z1). */
function tip(title: string, sub?: string) {
  const s = document.createElement('span');
  s.className = 'gp-tip';
  const b = document.createElement('b');
  b.textContent = title;
  s.append(b);
  if (sub) {
    const m = document.createElement('small');
    m.textContent = sub;
    s.append(m);
  }
  return s;
}
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/* ------------------------------------------------------------------ marker icons */

const GLYPHS: Record<string, string> = {
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  stop: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M10 16V8h3a2.5 2.5 0 0 1 0 5h-3"/>',
  arrow: '<polygon points="12 2 19 21 12 17 5 21 12 2" fill="currentColor"/>',
  car: '<path d="M5 17h14v-5l-2-5H7l-2 5z"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/>',
  alert: '<path d="M12 8v5"/><path d="M12 16.5v.5"/><circle cx="12" cy="12" r="9"/>',
  dot: '<circle cx="12" cy="12" r="3.5" fill="currentColor"/>',
};

function glyphIcon({
  tone,
  glyph,
  size = 30,
  rotate,
  selected,
  pulse,
}: {
  tone: string;
  glyph: string;
  size?: number;
  rotate?: number | null;
  selected?: boolean;
  pulse?: boolean;
}) {
  const r = rotate == null ? '' : ` style="transform: rotate(${Math.round(rotate)}deg)"`;
  const svg = `<svg viewBox="0 0 24 24" width="${Math.round(size * 0.55)}" height="${Math.round(size * 0.55)}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"${r}>${GLYPHS[glyph]}</svg>`;
  return L.divIcon({
    className: 'gp-pin-box',
    html: `<span class="gp-gpin tone-${tone}${selected ? ' is-selected' : ''}${pulse ? ' is-pulse' : ''}" style="width:${size}px;height:${size}px">${svg}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const TRUCK_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 8.38A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';

/** The fleet map's labelled vehicle pin (original: VH). */
function labelPin(p: {
  tone: string;
  selected?: boolean;
  moving?: boolean;
  label: string;
  image?: string;
}) {
  const img = p.image ? `<img src="${esc(p.image)}" alt="" draggable="false" />` : TRUCK_SVG;
  const cls = `mt-vpin tone-${esc(p.tone)}${p.selected ? ' is-selected' : ''}${p.moving ? ' is-moving' : ''}`;
  return L.divIcon({
    className: 'mt-vpin-box',
    html: `<span class="${cls}"><span class="mt-vpin__label"><i></i>${esc(p.label ?? '')}</span><span class="mt-vpin__ring">${img}</span></span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/* The single-vehicle marker of the tiles (original: v9 › t9/e9, inline styles kept). */
const MARKER_COLOR: Record<string, string> = {
  running: '#009863',
  stop: '#F90507',
  idle: '#0363FF',
  overspeed: '#F76C09',
  towed: '#07B1B4',
  notrans: '#2B333C',
};
const VEHICLE_ICONS = [
  'dumptruck',
  'tanker-truck',
  'concrete-mixer',
  'pickup',
  'van',
  'minibus',
  'sedan',
];
const SMALL_TRUCK =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 8.38A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';

function markerKind(s: string) {
  const k = String(s ?? 'running')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return k.startsWith('notrans')
    ? 'notrans'
    : k === 'stopped'
      ? 'stop'
      : k in MARKER_COLOR
        ? k
        : 'running';
}
function fallbackImage(plate: string) {
  let n = 7;
  for (const c of String(plate || '')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase())
    n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return `/assets/vehicles/${VEHICLE_ICONS[n % VEHICLE_ICONS.length]}.png`;
}

export interface VehicleMarker {
  plate: string;
  status: string;
  speed: number;
  img?: string;
}

export function vehicleMarkerElement(m: VehicleMarker) {
  const k = markerKind(m.status);
  const color = MARKER_COLOR[k];
  const img = m.img || fallbackImage(m.plate);
  const fallback = `<span style="width:24px;height:24px;border-radius:50%;background:${color};color:#fff;display:grid;place-items:center;text-shadow:0 1px 2px rgba(1,29,50,.35)">${SMALL_TRUCK}</span>`;
  const el = document.createElement('div');
  el.style.cssText =
    "position:relative;width:0;height:0;font-family:'Instrument Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  el.innerHTML = `<div style="position:absolute;left:-25px;top:-25px;width:50px;height:50px;border-radius:50%;background:${color}2E"></div><div style="position:absolute;left:-17px;top:-17px;width:34px;height:34px;box-sizing:border-box;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 2.5px ${color},0 2px 8px rgba(1,29,50,.35);display:grid;place-items:center;overflow:hidden"><img src="${esc(img)}" alt="${esc(m.plate)}" style="width:26px;height:20px;object-fit:contain;display:block;pointer-events:none" data-fallback="${esc(fallback)}" onerror="this.outerHTML=this.getAttribute('data-fallback')"></div>`;
  return el;
}
const vehicleIcon = (m: VehicleMarker) =>
  L.divIcon({ html: vehicleMarkerElement(m), className: '', iconSize: [0, 0] });

/* ------------------------------------------------------------------ clusters */

const CLUSTER_MAX_ZOOM = 16;
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
    html: `<span class="gp-cluster" style="width:${size}px;height:${size}px;background:conic-gradient(${stops.join(',')})"><b>${n.toLocaleString()}</b></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Groups markers that overlap at the current zoom into one cluster pin (original: XM). */
function cluster(
  map: L.Map,
  markers: Map<string, L.Marker>,
  group: L.LayerGroup,
  o: {
    enabled: boolean;
    alone: (id: string) => boolean;
    toneOf: (id: string) => string | undefined;
    title: (n: number) => string;
  },
) {
  const z = map.getZoom();
  const cells = new Map<string, string[]>();
  if (o.enabled && z < CLUSTER_MAX_ZOOM)
    for (const [id, mk] of markers) {
      if (o.alone(id)) continue;
      const p = map.project(mk.getLatLng(), z);
      const key = `${Math.floor(p.x / CLUSTER_CELL)}:${Math.floor(p.y / CLUSTER_CELL)}`;
      const c = cells.get(key);
      if (c) c.push(id);
      else cells.set(key, [id]);
    }
  const grouped = new Set<string>();
  group.clearLayers();
  for (const ids of cells.values()) {
    if (ids.length < 2) continue;
    ids.forEach((id) => grouped.add(id));
    const bounds = L.latLngBounds(ids.map((id) => markers.get(id)!.getLatLng()));
    const tones = ids.map((id) => {
      const t = o.toneOf(id);
      return t && /^[a-z]+$/.test(t) ? t : 'gray';
    });
    const title = o.title(ids.length);
    L.marker(bounds.getCenter(), {
      icon: clusterIcon(tones),
      keyboard: true,
      title,
      zIndexOffset: 500,
    })
      .bindTooltip(tip(title, 'Click to zoom in'), { direction: 'top', offset: [0, -16] })
      .on('click', () => map.fitBounds(bounds.pad(0.3), { maxZoom: CLUSTER_MAX_ZOOM }))
      .addTo(group);
  }
  for (const [id, mk] of markers) {
    const on = map.hasLayer(mk);
    if (grouped.has(id) && on) mk.remove();
    else if (!grouped.has(id) && !on) mk.addTo(map);
  }
}

/* ------------------------------------------------------------------ map buttons (inline styles, as in the original) */

export const FONT =
  "'Instrument Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const SIZES: Record<
  number,
  { b: number; r: number; i: number; ti: number; fs: number; cg: number; gap: number; mt: number }
> = {
  36: { b: 36, r: 10, i: 14, ti: 16, fs: 13, cg: 6, gap: 10, mt: 8 },
  32: { b: 32, r: 9, i: 14, ti: 15, fs: 12, cg: 5, gap: 8, mt: 6 },
  28: { b: 28, r: 8, i: 12, ti: 13, fs: 11, cg: 4, gap: 6, mt: 2 },
  24: { b: 24, r: 7, i: 12, ti: 12, fs: 10, cg: 4, gap: 5, mt: 4 },
};
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
export const BTN_ICONS = {
  plus: (s: number) => (
    <Svg size={s}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  minus: (s: number) => (
    <Svg size={s}>
      <path d="M5 12h14" />
    </Svg>
  ),
  recenter: (s: number) => (
    <Svg size={s}>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22" />
    </Svg>
  ),
  layers: (s: number) => (
    <Svg size={s}>
      <path d="m12 2 9.5 5-9.5 5-9.5-5L12 2Z" />
      <path d="m2.5 12 9.5 5 9.5-5" />
      <path d="m2.5 17 9.5 5 9.5-5" />
    </Svg>
  ),
  expand: (s: number) => (
    <Svg size={s}>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </Svg>
  ),
  shrink: (s: number) => (
    <Svg size={s}>
      <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
    </Svg>
  ),
  play: (s: number) => (
    <Svg size={s}>
      <path d="M7 4.5v15l12-7.5-12-7.5Z" />
    </Svg>
  ),
  pause: (s: number) => (
    <Svg size={s}>
      <path d="M8 5v14M16 5v14" />
    </Svg>
  ),
  stop: (s: number) => (
    <Svg size={s}>
      <rect x="5" y="5" width="14" height="14" rx="2.5" />
    </Svg>
  ),
  timer: (s: number) => (
    <Svg size={s}>
      <path d="M10 2h4M12 2v3" />
      <circle cx="13" cy="14" r="7.5" />
      <path d="m13 14 3-3" />
      <path d="M2 12h3M1.5 15.5h4M2.5 19h3.5" />
    </Svg>
  ),
  bell: (s: number) => (
    <Svg size={s}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Svg>
  ),
};

export function MapButton({
  title,
  size,
  on,
  onClick,
  popup,
  expanded,
  children,
}: {
  title: string;
  size: number;
  on?: boolean;
  onClick?: (el: HTMLButtonElement) => void;
  popup?: boolean;
  expanded?: boolean;
  children: ReactNode;
}) {
  const s = SIZES[size]!;
  const [hover, setHover] = useState(false);
  const look = on ? LOOK_ON : LOOK_OFF;
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={popup || on === undefined ? undefined : on}
      aria-haspopup={popup ? 'menu' : undefined}
      aria-expanded={popup ? !!expanded : undefined}
      onClick={(e) => onClick?.(e.currentTarget)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: s.b,
        height: s.b,
        flexShrink: 0,
        boxSizing: 'border-box',
        border: 'none',
        borderRadius: s.r,
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

const CONTROLS_AT: CSSProperties = { position: 'absolute', left: 8, top: 8, zIndex: 4 };

/** Map layer menu (original: qM): thumbnails of every layer, placed beside the button. */
function tileUrl(url: string, subs: string | undefined, [lat, lng]: LatLng, z: number) {
  const n = 2 ** z;
  const r = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  const x = Math.floor((((((lng + 180) % 360) + 360) % 360) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  return url
    .replace('{s}', (subs ?? 'abc')[0]!)
    .replace('{r}', '')
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
}

function useLayersMenu(map: RefObject<L.Map | null>) {
  const current = useLayer();
  const scope = useScope();
  const btn = useRef<HTMLButtonElement | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CSSProperties | null>(null);
  const [view, setView] = useState<{ center: LatLng; zoom: number }>({ center: [0, 0], zoom: 3 });
  useEffect(() => {
    if (!pos) return;
    const outside = (e: Event) =>
      !menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node);
    const down = (e: Event) => outside(e) && setPos(null);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPos(null);
        btn.current?.focus();
      }
    };
    const resize = () => setPos(null);
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('keydown', key);
    document.addEventListener('scroll', down, true);
    window.addEventListener('resize', resize);
    menu.current?.querySelector<HTMLButtonElement>('[aria-checked=true]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('keydown', key);
      document.removeEventListener('scroll', down, true);
      window.removeEventListener('resize', resize);
    };
  }, [pos]);
  const toggle = (el: HTMLButtonElement) => {
    btn.current = el;
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
  const pick = (id: string) => {
    pickLayer(id);
    setPos(null);
    btn.current?.focus();
  };
  const node =
    pos &&
    createPortal(
      <div className={scope} data-st="" data-theme="light">
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
        </div>
      </div>,
      document.body,
    );
  return { current, open: !!pos, toggle, node };
}

export function MapControls({
  map,
  onRecenter,
  size = 32,
  full,
  onFull,
  extra,
}: {
  map: RefObject<L.Map | null>;
  onRecenter: () => void;
  size?: number;
  full?: boolean;
  onFull?: () => void;
  extra?: ReactNode;
}) {
  const layers = useLayersMenu(map);
  const s = SIZES[size]!;
  const sat = /satellite|hybrid/.test(layers.current.id);
  const buttons: {
    title: string;
    icon: ReactNode;
    on?: boolean;
    onClick: (el: HTMLButtonElement) => void;
    popup?: boolean;
    expanded?: boolean;
  }[] = [
    { title: 'Zoom in', icon: BTN_ICONS.plus(s.i), onClick: () => map.current?.zoomIn() },
    { title: 'Zoom out', icon: BTN_ICONS.minus(s.i), onClick: () => map.current?.zoomOut() },
    { title: 'Recenter to default view', icon: BTN_ICONS.recenter(s.i), onClick: onRecenter },
    {
      title: 'Map layers',
      icon: BTN_ICONS.layers(s.i),
      on: sat,
      onClick: layers.toggle,
      popup: true,
      expanded: layers.open,
    },
  ];
  if (onFull)
    buttons.push({
      title: full ? 'Exit fullscreen' : 'Fullscreen',
      icon: (full ? BTN_ICONS.shrink : BTN_ICONS.expand)(s.i),
      on: !!full,
      onClick: onFull,
    });
  return (
    <div style={{ display: 'contents' }} onClick={(e) => e.stopPropagation()}>
      <div
        className="gp-mapctl"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: s.gap,
          fontFamily: FONT,
          ...CONTROLS_AT,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: s.cg }}>
          {buttons.map((b, i) => (
            <MapButton
              key={i}
              title={b.title}
              size={size}
              on={!!b.on}
              onClick={b.onClick}
              popup={b.popup}
              expanded={b.expanded}
            >
              {b.icon}
            </MapButton>
          ))}
          {extra}
        </div>
      </div>
      {layers.node}
    </div>
  );
}

/* ------------------------------------------------------------------ FleetMap */

export interface MapLine {
  id: string;
  tone: string;
  variant: 'done' | 'route';
  points: LatLng[];
}
export interface MapPin {
  id: string;
  at: LatLng;
  title: string;
  sub?: string;
  onClick?: () => void;
  selected?: boolean;
  /** Vehicle marker (tiles). */
  plate?: string;
  status?: string;
  speed?: number;
  img?: string;
  /** Glyph / labelled pins (fleet map). */
  tone?: string;
  heading?: number | null;
  moving?: boolean;
  glyph?: string;
  size?: number;
  label?: string;
  image?: string;
}
const isVehicle = (p: MapPin) => p.plate !== undefined;

function iconFor(p: MapPin): { key: string; make: () => L.DivIcon } {
  if (isVehicle(p))
    return {
      key: `vehicle|${p.plate}|${p.status}|${p.speed}|${p.img ?? ''}|${p.selected}`,
      make: () =>
        vehicleIcon({ plate: p.plate!, status: p.status!, speed: p.speed ?? 0, img: p.img }),
    };
  const arrow = p.moving && p.heading != null;
  const rot = arrow ? Math.round(p.heading! / 5) * 5 : null;
  return {
    key: `${p.tone}|${arrow}|${rot}|${p.selected}|${p.glyph ?? ''}|${p.label ?? ''}|${p.image ?? ''}|${p.moving}`,
    make: () =>
      p.label != null
        ? labelPin({
            tone: p.tone!,
            selected: p.selected,
            moving: p.moving,
            label: p.label,
            image: p.image,
          })
        : p.glyph
          ? glyphIcon({ tone: p.tone!, glyph: p.glyph, size: p.size ?? 22 })
          : glyphIcon({
              tone: p.tone!,
              glyph: arrow ? 'arrow' : 'car',
              size: p.size ?? 32,
              rotate: rot,
              selected: p.selected,
              pulse: p.moving,
            }),
  };
}

const LABELS_FROM_ZOOM = 13;

export function FleetMap({
  lines,
  pins,
  fitKey,
  follow,
  overlay,
  small = false,
  labels = 'always',
  fullscreenOf,
  clustered = false,
  clusterTitle = (n) => `${n} vehicles`,
  firstFitPins = false,
}: {
  lines: MapLine[];
  pins: MapPin[];
  fitKey: string;
  follow?: LatLng | null;
  overlay?: ReactNode;
  small?: boolean;
  labels?: 'always' | 'zoom';
  fullscreenOf?: RefObject<HTMLDivElement | null>;
  clustered?: boolean;
  clusterTitle?: (n: number) => string;
  /** First view on the pins only (the original loads the trail after it has centred on the vehicle). */
  firstFitPins?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const { map, ready, layer } = useLeafletMap(el, 12);
  const [zoom, setZoom] = useState(12);
  const [full, setFull] = useState(false);
  const polys = useRef(new Map<string, { cls: string; poly: L.Polyline }>());
  const markers = useRef(new Map<string, { mk: L.Marker; icon: string; tip: string }>());
  const clicks = useRef(new Map<string, (() => void) | undefined>());
  const clusterLayer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef<string | null>(null);
  const recluster = useRef(() => {});

  recluster.current = () => {
    const m = map.current;
    if (!m || !clusterLayer.current) return;
    const byId = new Map(pins.map((p) => [p.id, p]));
    cluster(m, new Map([...markers.current].map(([id, v]) => [id, v.mk])), clusterLayer.current, {
      enabled: clustered,
      alone: (id) => !!byId.get(id)?.selected,
      toneOf: (id) => {
        const p = byId.get(id);
        return p && !isVehicle(p) ? p.tone : undefined;
      },
      title: clusterTitle,
    });
  };

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    clusterLayer.current = L.layerGroup().addTo(m);
    const onZoom = () => {
      setZoom(m.getZoom());
      recluster.current();
    };
    onZoom();
    m.on('zoomend', onZoom);
    return () => {
      m.off('zoomend', onZoom);
      clusterLayer.current?.remove();
      clusterLayer.current = null;
    };
  }, [ready, map]);

  useEffect(() => {
    if (!fullscreenOf) return;
    const on = () => {
      setFull(document.fullscreenElement === fullscreenOf.current);
      setTimeout(() => map.current?.invalidateSize(), 50);
    };
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, [fullscreenOf, map]);
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void fullscreenOf?.current?.requestFullscreen?.();
  };

  pins.forEach((p) => clicks.current.set(p.id, p.onClick));

  useEffect(() => {
    if (!ready) return;
    const pl = polys.current;
    const mk = markers.current;
    return () => {
      pl.clear();
      mk.clear();
      fitted.current = null;
    };
  }, [ready]);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const seen = new Set<string>();
    for (const line of lines) {
      if (line.points.length < 2) continue;
      seen.add(line.id);
      const cls = `mt-route tone-${line.tone} is-${line.variant}`;
      const had = polys.current.get(line.id);
      if (had && had.cls === cls) {
        had.poly.setLatLngs(line.points);
        continue;
      }
      had?.poly.remove();
      polys.current.set(line.id, {
        cls,
        poly: L.polyline(line.points, {
          className: cls,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(m),
      });
    }
    for (const [id, { poly }] of polys.current)
      if (!seen.has(id)) {
        poly.remove();
        polys.current.delete(id);
      }
    for (const { poly, cls } of polys.current.values())
      if (cls.endsWith('is-done')) poly.bringToFront();
  }, [lines, ready, map]);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const seen = new Set<string>();
    for (const p of pins) {
      seen.add(p.id);
      const { key, make } = iconFor(p);
      const tipKey = `${p.title}|${p.sub}`;
      const had = markers.current.get(p.id);
      if (!had) {
        const mk = L.marker(p.at, {
          icon: make(),
          keyboard: false,
          zIndexOffset: p.selected ? 1000 : 0,
        })
          .bindTooltip(tip(p.title, p.sub), {
            direction: 'top',
            offset: [0, isVehicle(p) ? -20 : -16],
          })
          .on('click', () => clicks.current.get(p.id)?.());
        markers.current.set(p.id, { mk, icon: key, tip: tipKey });
        continue;
      }
      had.mk.setLatLng(p.at);
      if (had.icon !== key) {
        had.mk.setIcon(make());
        had.mk.setZIndexOffset(p.selected ? 1000 : 0);
        had.icon = key;
      }
      if (had.tip !== tipKey) {
        had.mk.setTooltipContent(tip(p.title, p.sub));
        had.tip = tipKey;
      }
    }
    for (const [id, { mk }] of markers.current)
      if (!seen.has(id)) {
        mk.remove();
        markers.current.delete(id);
      }
    recluster.current();
  }, [pins, clustered, ready, map]);

  const allPoints = () => [...lines.flatMap((l) => l.points), ...pins.map((p) => p.at)];
  const recenter = (pinsOnly = false) => {
    const m = map.current;
    const pts = pinsOnly ? pins.map((p) => p.at) : allPoints();
    if (!m || !pts.length) return;
    if (pts.length === 1) m.setView(pts[0]!, 15);
    else fitAll(m, pts, 15);
  };
  useEffect(() => {
    if (!ready || fitted.current === fitKey) return;
    if (allPoints().length) {
      fitted.current = fitKey;
      recenter(firstFitPins);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, lines, pins, ready]);

  const fLat = follow?.[0];
  const fLng = follow?.[1];
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || fLat == null || fLng == null) return;
    if (!m.getBounds().pad(-0.15).contains([fLat, fLng])) m.panTo([fLat, fLng], { animate: true });
  }, [fLat, fLng, ready, map]);

  return (
    <div
      className={`td-map gp-lmap mt-map mt-map--controls ${labels === 'always' || zoom >= LABELS_FROM_ZOOM ? 'is-labels' : ''} ${layer.dark ? 'is-satellite' : ''}`}
    >
      <div ref={el} className="td-avd__leaflet" />
      <MapControls
        map={map}
        onRecenter={() => recenter()}
        size={small ? 24 : 32}
        full={fullscreenOf ? full : undefined}
        onFull={fullscreenOf ? toggleFull : undefined}
      />
      {overlay}
    </div>
  );
}
