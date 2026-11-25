// Leaflet map of the original pages: the same tile layers, the shared "Map layer" choice
// (remembered in the browser under the original's key) and the layer picker pop-up.
import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { Icon, usePortalRoot } from '../smart-track/kit';

interface Layer {
  id: string;
  name: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxNativeZoom?: number;
  overlays?: string[];
}

const OSM =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO = `${OSM} &copy; <a href="https://carto.com/attributions">CARTO</a>`;
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const google = (l: string) => `https://mt{s}.google.com/vt/lyrs=${l}&x={x}&y={y}&z={z}`;
const GOOGLE = 'Map data &copy; Google';

export const LAYERS: Layer[] = [
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
  },
  {
    id: 'hybrid',
    name: 'Hybrid',
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    attribution: 'Imagery &copy; Esri',
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
  },
  {
    id: 'google-hybrid',
    name: 'Google Hybrid',
    url: google('y'),
    attribution: GOOGLE,
    subdomains: '0123',
    maxNativeZoom: 20,
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

/* The chosen layer, shared by every map on the page and remembered (the original's key). */
const STORE_KEY = 'gp.map.layer';
let current = (() => {
  try {
    return layerById(window.localStorage.getItem(STORE_KEY)).id;
  } catch {
    return LAYERS[0]!.id;
  }
})();
const listeners = new Set<() => void>();
function chooseLayer(id: string) {
  current = layerById(id).id;
  try {
    window.localStorage.setItem(STORE_KEY, current);
  } catch {
    /* private window: keep it for this visit only */
  }
  listeners.forEach((f) => f());
}
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};
const useLayer = () => layerById(useSyncExternalStore(subscribe, () => current));

/** Where a new map starts (the original's default: Riyadh). */
export const DEFAULT_VIEW: [number, number] = [24.7136, 46.6753];

/** Creates a Leaflet map in the given element, with the chosen tile layer. */
export function useLeaflet(el: RefObject<HTMLDivElement>, zoom = 11) {
  const layer = useLayer();
  const map = useRef<L.Map | null>(null);
  const tiles = useRef<L.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView(
      DEFAULT_VIEW,
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
  return { map, ready };
}

/** Address of one tile of a layer, for the picker's thumbnails. */
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
    .replace('{s}', (subdomains ?? 'abc')[0]!)
    .replace('{r}', '')
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
}

/** The "Map layers" button of the map's control column, with its pop-up of layers. */
export function LayersButton({ map }: { map: RefObject<L.Map | null> }) {
  const layer = useLayer();
  const portal = usePortalRoot();
  const btn = useRef<HTMLButtonElement | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Record<string, number> | null>(null);
  const [view, setView] = useState<{ center: [number, number]; zoom: number }>({
    center: [0, 0],
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
    chooseLayer(id);
    setPos(null);
    btn.current?.focus();
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => toggle(e.currentTarget)}
        aria-label={`Map layer: ${layer.name}`}
        title="Map layers"
        aria-haspopup="menu"
        aria-expanded={!!pos}
      >
        <Icon name="Layers" size={15} />
      </button>
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
                  aria-checked={l.id === layer.id}
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
          </div>,
          portal,
        )}
    </>
  );
}
