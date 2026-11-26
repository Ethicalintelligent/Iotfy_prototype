// IT-0036. The page's two Leaflet maps: the live fleet map and the smaller Nearby map
// (the original's map components, same markup and behaviour).
import L from 'leaflet';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  MapControls,
  cluster,
  fitTo,
  tip,
  useLeafletMap,
  vehicleIcon,
  zoneLayer,
  type ShareInfo,
  type VehicleMarker,
  type ZoneShape,
} from './leaflet';
import type { IndicatorLook } from '../grid/cardLook';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  tone: string;
  title: string;
  sub: string;
  /** IT-0044: Grid View's indicator icons, shown in the marker tooltip. */
  indicators?: IndicatorLook[];
  vehicle: VehicleMarker;
}

export interface Zone {
  id: string;
  label: string;
  shape: ZoneShape;
}

/** The live map: vehicles (clustered when close), geofences, controls and an overlay on top. */
export function LiveMap({
  markers,
  selectedId,
  onSelect,
  height,
  label,
  zones,
  overlay,
  clusterTitle,
  share,
}: {
  markers: MapMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  height: string;
  label: string;
  zones: Zone[];
  overlay?: ReactNode;
  clusterTitle: (n: number) => string;
  share: ShareInfo | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const { map, ready } = useLeafletMap(box);
  const placed = useRef(new Map<string, L.Marker>());
  const tones = useRef(new Map<string, string>());
  const clusters = useRef<L.LayerGroup | null>(null);
  const zoneGroup = useRef<L.FeatureGroup | null>(null);
  const fitted = useRef(false);
  const select = useRef(onSelect);
  select.current = onSelect;
  const recluster = useRef(() => {});
  recluster.current = () => {
    if (map.current && clusters.current)
      cluster(map.current, placed.current, clusters.current, {
        enabled: true,
        alone: (id) => id === selectedId,
        toneOf: (id) => tones.current.get(id),
        title: clusterTitle,
      });
  };

  useEffect(() => {
    const p = placed.current;
    const t = tones.current;
    return () => {
      p.clear();
      t.clear();
      fitted.current = false;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    clusters.current = L.layerGroup().addTo(m);
    const onZoom = () => recluster.current();
    m.on('zoomend', onZoom);
    return () => {
      m.off('zoomend', onZoom);
      clusters.current?.remove();
      clusters.current = null;
    };
  }, [ready, map]);

  useEffect(() => {
    const m = map.current;
    zoneGroup.current?.remove();
    zoneGroup.current = null;
    if (!ready || !m || !zones.length) return;
    const g = L.featureGroup();
    zones.forEach((z) => zoneLayer(z.shape).bindTooltip(tip(z.label), { sticky: true }).addTo(g));
    zoneGroup.current = g.addTo(m);
    g.bringToBack();
  }, [zones, ready, map]);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const seen = new Set<string>();
    for (const k of markers) {
      seen.add(k.id);
      tones.current.set(k.id, k.tone);
      const icon = vehicleIcon(k.vehicle);
      // IT-0041: the selected vehicle sits above the others.
      const z = k.vehicle.selected ? 1000 : 0;
      const existing = placed.current.get(k.id);
      if (existing) {
        existing.setLatLng([k.lat, k.lng]);
        existing.setIcon(icon);
        existing.setZIndexOffset(z);
        existing.setTooltipContent(tip(k.title, k.sub, k.indicators));
      } else {
        const marker = L.marker([k.lat, k.lng], {
          icon,
          keyboard: true,
          title: k.title,
          zIndexOffset: z,
        })
          .bindTooltip(tip(k.title, k.sub, k.indicators), { direction: 'top', offset: [0, -20] })
          .on('click', () => select.current(k.id));
        placed.current.set(k.id, marker);
      }
    }
    for (const [id, mk] of placed.current)
      if (!seen.has(id)) {
        mk.remove();
        placed.current.delete(id);
        tones.current.delete(id);
      }
    if (!fitted.current && markers.length) {
      fitted.current = true;
      fitTo(
        m,
        markers.map((k) => [k.lat, k.lng]),
        15,
      );
    }
    recluster.current();
  }, [markers, selectedId, ready, map]);

  useEffect(() => {
    const mk = selectedId ? placed.current.get(selectedId) : undefined;
    if (mk && map.current) map.current.panTo(mk.getLatLng());
  }, [selectedId, map]);

  const recenter = () => {
    if (map.current && markers.length)
      fitTo(
        map.current,
        markers.map((k) => [k.lat, k.lng]),
        15,
      );
  };

  return (
    <div className="gp-mapbox" style={{ height }} role="region" aria-label={label}>
      <div ref={box} className="gp-mapbox__leaflet" />
      <MapControls map={map} onRecenter={recenter} share={share} />
      {overlay}
    </div>
  );
}

export interface Pin {
  id: string;
  at: [number, number];
  top?: boolean;
  className: string;
  onClick?: () => void;
  children: ReactNode;
}

/** The Nearby map: React-rendered pins, the range circle and a form on top. */
export function PinMap({
  className = '',
  pins,
  lines,
  fit,
  fitKey,
  overlay,
  maxFitZoom = 15,
}: {
  className?: string;
  pins: Pin[];
  lines: { id: string; className: string; points: [number, number][] }[];
  fit: [number, number][];
  fitKey: string;
  overlay?: ReactNode;
  maxFitZoom?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const { map, ready, layer } = useLeafletMap(box, 12);
  const placed = useRef(new Map<string, L.Marker>());
  const clicks = useRef(new Map<string, (() => void) | undefined>());
  const routes = useRef<L.FeatureGroup | null>(null);
  const lastFit = useRef<string | null>(null);
  const [hosts, setHosts] = useState<Record<string, HTMLElement>>({});
  pins.forEach((p) => clicks.current.set(p.id, p.onClick));

  const collectHosts = () => {
    const out: Record<string, HTMLElement> = {};
    for (const [id, mk] of placed.current) {
      const el = mk.getElement();
      if (el) out[id] = el;
    }
    setHosts(out);
  };

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const seen = new Set<string>();
    let changed = false;
    for (const p of pins) {
      seen.add(p.id);
      const mk = placed.current.get(p.id);
      if (mk) {
        const at = mk.getLatLng();
        if (at.lat !== p.at[0] || at.lng !== p.at[1]) mk.setLatLng(p.at);
        if ((mk.options.zIndexOffset ?? 0) !== (p.top ? 1000 : 0))
          mk.setZIndexOffset(p.top ? 1000 : 0);
      } else {
        const nm = L.marker(p.at, {
          icon: L.divIcon({ className: 'td-avd__pin-box', html: '', iconSize: [30, 30] }),
          keyboard: false,
          zIndexOffset: p.top ? 1000 : 0,
        })
          .on('click', () => clicks.current.get(p.id)?.())
          .addTo(m);
        placed.current.set(p.id, nm);
        changed = true;
      }
    }
    for (const [id, mk] of placed.current)
      if (!seen.has(id)) {
        mk.remove();
        placed.current.delete(id);
        changed = true;
      }
    if (changed) collectHosts();
  }, [pins, ready, map]);

  useEffect(() => {
    const p = placed.current;
    return () => {
      p.forEach((mk) => mk.remove());
      p.clear();
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    routes.current?.remove();
    const g = L.featureGroup();
    for (const l of lines)
      if (l.points.length > 1)
        L.polyline(l.points, {
          className: `gp-route ${l.className}`,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(g);
    routes.current = g.addTo(m);
  }, [lines, ready, map]);

  const points = () =>
    fit.length ? fit : [...lines.flatMap((l) => l.points), ...pins.map((p) => p.at)];
  const refit = () => {
    const m = map.current;
    if (!m) return;
    const pts = points();
    if (pts.length === 1) m.setView(pts[0]!, maxFitZoom);
    else fitTo(m, pts, maxFitZoom);
  };
  useEffect(() => {
    if (!ready || lastFit.current === fitKey || !points().length) return;
    lastFit.current = fitKey;
    refit();
  }, [fitKey, pins, lines, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`td-map gp-lmap ${layer.dark ? 'is-satellite' : ''} ${className}`}>
      <div ref={box} className="td-avd__leaflet" />
      {pins.map((p) => {
        const host = hosts[p.id];
        return host
          ? createPortal(
              <span className={`td-marker ${p.className}`} tabIndex={0}>
                {p.children}
              </span>,
              host,
              p.id,
            )
          : null;
      })}
      <MapControls map={map} onRecenter={refit} />
      {overlay}
    </div>
  );
}
