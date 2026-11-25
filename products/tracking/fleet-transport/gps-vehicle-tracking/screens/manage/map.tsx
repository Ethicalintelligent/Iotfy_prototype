// IT-0036. The Manage page's Leaflet maps (geofence picker, Geo Configuration, Geo Association):
// the same tile layers, layer picker with previews (remembered in gp.map.layer), zoom / recentre
// buttons and zone drawing as the original page.
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import L from 'leaflet';
import { Icon } from '../smart-track/kit';
import { Portal } from './ui';

const OSM =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO = `${OSM} &copy; <a href="https://carto.com/attributions">CARTO</a>`;
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const google = (l: string) => `https://mt{s}.google.com/vt/lyrs=${l}&x={x}&y={y}&z={z}`;
const GOOGLE = 'Map data &copy; Google';

export interface TileSpec {
  id: string;
  name: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxNativeZoom?: number;
  dark?: boolean;
  overlays?: string[];
}
export const LAYERS: TileSpec[] = [
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
const layerById = (id?: string | null) => LAYERS.find((l) => l.id === id) ?? LAYERS[0]!;

/** The page's home position (Riyadh, as set by the original page). */
export const HOME: [number, number] = [24.7136, 46.6753];

// The chosen map layer is shared by every map and remembered (same key as the original).
const KEY = 'gp.map.layer';
let chosen = (() => {
  try {
    return layerById(window.localStorage.getItem(KEY)).id;
  } catch {
    return LAYERS[0]!.id;
  }
})();
const listeners = new Set<() => void>();
function choose(id: string) {
  chosen = layerById(id).id;
  try {
    window.localStorage.setItem(KEY, chosen);
  } catch {
    /* private mode: not remembered */
  }
  listeners.forEach((f) => f());
}
const useLayer = () =>
  layerById(
    useSyncExternalStore(
      (f) => {
        listeners.add(f);
        return () => listeners.delete(f);
      },
      () => chosen,
    ),
  );

/** A Leaflet map in a div (original `ev`). */
export function useLeaflet(
  el: RefObject<HTMLDivElement | null>,
  { onClick, zoom = 11 }: { onClick?: (p: [number, number]) => void; zoom?: number } = {},
) {
  const layer = useLayer();
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.LayerGroup | null>(null);
  const click = useRef(onClick);
  click.current = onClick;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView(
      HOME,
      zoom,
    );
    m.on('click', (e: L.LeafletMouseEvent) =>
      click.current?.([+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]),
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
  }, [el]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    tiles.current?.remove();
    const o = {
      maxZoom: 19,
      maxNativeZoom: layer.maxNativeZoom ?? 19,
      subdomains: layer.subdomains ?? 'abc',
    };
    tiles.current = L.layerGroup([
      L.tileLayer(layer.url, { ...o, attribution: layer.attribution }),
      ...(layer.overlays ?? []).map((u) => L.tileLayer(u, o)),
    ]).addTo(m);
  }, [layer, ready]);
  return { map, ready, layer };
}

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

/** The "Map layers" button and its menu of previews (original `iC` / `RB`). */
export function LayerButton({ map }: { map: RefObject<L.Map | null> }) {
  const current = useLayer();
  const btn = useRef<HTMLButtonElement | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Record<string, number> | null>(null);
  const [view, setView] = useState<{ center: [number, number]; zoom: number }>({
    center: HOME,
    zoom: 3,
  });
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
    menu.current?.querySelector<HTMLElement>('[aria-checked=true]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('keydown', key);
      document.removeEventListener('scroll', down, true);
      window.removeEventListener('resize', resize);
    };
  }, [pos]);
  const toggle = (b: HTMLButtonElement) => {
    btn.current = b;
    if (pos) return setPos(null);
    const m = map.current;
    if (m) {
      const c = m.getCenter();
      setView({ center: [c.lat, c.lng], zoom: Math.max(2, Math.min(13, Math.round(m.getZoom()))) });
    }
    const r = b.getBoundingClientRect();
    const right = r.left + r.width / 2 > window.innerWidth / 2;
    const top = Math.max(8, Math.min(r.top, window.innerHeight - 320));
    setPos({
      top,
      maxHeight: window.innerHeight - top - 8,
      ...(right ? { right: window.innerWidth - r.left + 8 } : { left: r.right + 8 }),
    });
  };
  return (
    <>
      <button
        type="button"
        onClick={(e) => toggle(e.currentTarget)}
        aria-label={`Map layer: ${current.name}`}
        title="Map layers"
        aria-haspopup="menu"
        aria-expanded={!!pos}
      >
        <Icon name="Layers" size={15} />
      </button>
      {pos && (
        <Portal>
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
                  onClick={() => {
                    choose(l.id);
                    setPos(null);
                    btn.current?.focus();
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
          </div>
        </Portal>
      )}
    </>
  );
}

/** Zoom in / out / recentre / layers on a map (original `MJ`). */
export function MapControls({ map, fit }: { map: RefObject<L.Map | null>; fit: () => void }) {
  return (
    <div className="td-geo-ctl" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => map.current?.zoomIn()} aria-label="Zoom in">
        <Icon name="Plus" size={15} />
      </button>
      <button type="button" onClick={() => map.current?.zoomOut()} aria-label="Zoom out">
        <Icon name="Minus" size={15} />
      </button>
      <button type="button" onClick={fit} aria-label="Recentre">
        <Icon name="LocateFixed" size={15} />
      </button>
      <LayerButton map={map} />
    </div>
  );
}

export function fitTo(m: L.Map, layer: L.FeatureGroup | null) {
  const b = layer?.getBounds();
  if (b && b.isValid()) m.fitBounds(b.pad(0.35), { maxZoom: 16, animate: false });
  else m.setView(HOME, 11);
}

/* ------------------------------------------------------------------ zones */

export type ZoneShape = 'circle' | 'freeform' | 'roadmap' | 'landmark';
export interface ZoneGeometry {
  center?: [number, number];
  radius?: number;
  points?: [number, number][];
  point?: [number, number];
}
export const SHAPES: { id: ZoneShape; label: string; icon: string; tone: string }[] = [
  { id: 'circle', label: 'Circle', icon: 'Circle', tone: '#0d6e86' },
  { id: 'freeform', label: 'Freeform', icon: 'Hexagon', tone: '#b08d0c' },
  { id: 'roadmap', label: 'Roadmap', icon: 'Waypoints', tone: '#5b6b7c' },
  { id: 'landmark', label: 'Landmark', icon: 'MapPin', tone: '#e5483d' },
];
export const shapeOf = (id: string) => SHAPES.find((s) => s.id === id) ?? SHAPES[0]!;

export function zoneComplete(shape: ZoneShape, g?: ZoneGeometry): boolean {
  if (!g) return false;
  if (shape === 'circle') return Array.isArray(g.center) && (g.radius ?? 0) > 0;
  if (shape === 'freeform') return (g.points?.length ?? 0) >= 3;
  if (shape === 'roadmap') return (g.points?.length ?? 0) >= 2;
  return Array.isArray(g.point);
}

const pin = (tone: string) =>
  L.divIcon({
    className: 'td-geo-pin',
    html: `<svg width="28" height="36" viewBox="0 0 28 36" aria-hidden="true"><path d="M14 35s11-11.6 11-20.5C25 7.6 20.1 3 14 3S3 7.6 3 14.5C3 23.4 14 35 14 35z" fill="${tone}" stroke="#fff" stroke-width="2"/><circle cx="14" cy="14.5" r="4.2" fill="#fff"/></svg>`,
    iconSize: [28, 36],
    iconAnchor: [14, 35],
  });

/** A zone drawn on a map (original `kJ`). */
export function zoneLayer(
  shape: ZoneShape,
  g: ZoneGeometry | undefined,
  { selected = true, tone }: { selected?: boolean; tone?: string } = {},
) {
  const color = tone ?? shapeOf(shape).tone;
  const style = {
    color,
    weight: selected ? 3 : 2,
    fillColor: color,
    fillOpacity: selected ? 0.22 : 0.12,
  };
  const group = L.featureGroup();
  if (!g) return group;
  if (shape === 'circle' && g.center) {
    L.circle(g.center, { ...style, radius: g.radius || 0 }).addTo(group);
    L.circleMarker(g.center, {
      radius: 5,
      color: '#fff',
      weight: 2,
      fillColor: color,
      fillOpacity: 1,
    }).addTo(group);
  } else if ((shape === 'freeform' || shape === 'roadmap') && g.points?.length) {
    if (shape === 'freeform' && g.points.length >= 3) L.polygon(g.points, style).addTo(group);
    else if (shape === 'freeform')
      L.polyline(g.points, { ...style, dashArray: '6 6' }).addTo(group);
    else {
      L.polyline(g.points, {
        color,
        weight: 16,
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);
      L.polyline(g.points, { color, weight: 3 }).addTo(group);
    }
    if (shape === 'freeform')
      g.points.forEach((p) =>
        L.circleMarker(p, {
          radius: 5,
          color: '#fff',
          weight: 1.5,
          fillColor: color,
          fillOpacity: 1,
        }).addTo(group),
      );
  } else if (shape === 'landmark' && g.point)
    L.marker(g.point, { icon: pin(color), keyboard: false }).addTo(group);
  return group;
}

/* ------------------------------------------------------------------ zone geometry of Geo Configuration */

export type ZoneDraft =
  | { kind: 'CIRCLE'; center: [number, number] | null; radius: number }
  | { kind: 'POLYGON'; points: [number, number][] };
const KIND_TONE = { CIRCLE: '#0d6e86', POLYGON: '#b08d0c' };
export const draftComplete = (d?: ZoneDraft | null) =>
  !d ? false : d.kind === 'CIRCLE' ? d.center != null && d.radius > 0 : d.points.length >= 3;

/** A zone drawn on a map (original `Kh`): weak = dimmed, edit = bigger corner points. */
export function draftLayer(
  d: ZoneDraft,
  {
    tone = KIND_TONE[d.kind],
    edit = false,
    weak = false,
  }: { tone?: string; edit?: boolean; weak?: boolean } = {},
) {
  const style = {
    color: tone,
    weight: weak ? 1.5 : 3,
    fillColor: tone,
    fillOpacity: weak ? 0.08 : 0.2,
  };
  const g = L.featureGroup();
  if (d.kind === 'CIRCLE') {
    if (d.center) {
      L.circle(d.center, { ...style, radius: d.radius }).addTo(g);
      if (!weak)
        L.circleMarker(d.center, {
          radius: 5,
          color: '#fff',
          weight: 2,
          fillColor: tone,
          fillOpacity: 1,
        }).addTo(g);
    }
    return g;
  }
  if (d.points.length) {
    if (d.points.length >= 3) L.polygon(d.points, style).addTo(g);
    else L.polyline(d.points, { ...style, dashArray: '6 6' }).addTo(g);
    if (edit || !weak)
      d.points.forEach((p) =>
        L.circleMarker(p, {
          radius: edit ? 6 : 4,
          color: '#fff',
          weight: 1.5,
          fillColor: tone,
          fillOpacity: 1,
        }).addTo(g),
      );
  }
  return g;
}

/** The map tooltip (original `Ry`). */
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

/** Fit a map to a layer (original `ku`). */
export function fitLayer(m: L.Map, layer: L.FeatureGroup | null, maxZoom = 16) {
  const b = layer?.getBounds();
  if (b && b.isValid()) m.fitBounds(b.pad(0.2), { maxZoom, animate: false });
}

/** Zoom in / out / recentre / layers (original `Bb`). */
export function GeoControls({ map, onFit }: { map: RefObject<L.Map | null>; onFit?: () => void }) {
  return (
    <div className="td-geo-ctl" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => map.current?.zoomIn()}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <Icon name="Plus" size={15} />
      </button>
      <button
        type="button"
        onClick={() => map.current?.zoomOut()}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <Icon name="Minus" size={15} />
      </button>
      {onFit && (
        <button type="button" onClick={onFit} aria-label="Recentre" title="Recentre">
          <Icon name="LocateFixed" size={15} />
        </button>
      )}
      <LayerButton map={map} />
    </div>
  );
}

/** A map showing zones, one selected (original `PD`). */
export function ZonesMap({
  zones,
  selectedId,
  height = 420,
}: {
  zones: { id: string; shape: ZoneDraft; label: string }[];
  selectedId: string | null;
  height?: number | string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const { map, ready } = useLeaflet(el);
  const all = useRef<L.FeatureGroup | null>(null);
  const sel = useRef<L.FeatureGroup | null>(null);
  const fitted = useRef<string | null>(null);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    all.current?.remove();
    const g = L.featureGroup();
    sel.current = null;
    for (const z of zones) {
      const layer = draftLayer(z.shape, { weak: z.id !== selectedId });
      layer.bindTooltip(tip(z.label), { sticky: true });
      layer.addTo(g);
      if (z.id === selectedId) sel.current = layer;
    }
    all.current = g.addTo(m);
    const key = selectedId ?? (zones.length ? 'all' : null);
    if (key && key !== fitted.current) {
      fitted.current = key;
      fitLayer(m, sel.current ?? g);
    }
  }, [zones, selectedId, ready, map]);
  return (
    <div className="gp-mapbox" style={{ height }}>
      <div ref={el} className="gp-mapbox__leaflet" />
      <GeoControls
        map={map}
        onFit={() =>
          map.current &&
          (sel.current ?? all.current) &&
          fitLayer(map.current, sel.current ?? all.current)
        }
      />
    </div>
  );
}
